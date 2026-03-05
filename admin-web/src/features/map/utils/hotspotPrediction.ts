import type { MapReport } from "../hooks/useMapData";

// ── Types ──────────────────────────────────────────────────────────────────────

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Trend = "rising" | "stable" | "falling";

export interface HotspotZone {
    key: string;           // barangay name or grid key
    label: string;         // display name
    lat: number;
    lng: number;
    riskScore: number;     // 0 – 100
    riskLevel: RiskLevel;
    dominantIncidentType: string;
    trend: Trend;
    recentCount: number;   // crimes in last 30 days
    radius: number;        // visual radius in metres
}

// ── Constants ──────────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

// Recency decay multipliers
const RECENCY: { maxDays: number; weight: number }[] = [
    { maxDays: 7, weight: 3.0 },
    { maxDays: 30, weight: 2.0 },
    { maxDays: 90, weight: 1.0 },
    { maxDays: Infinity, weight: 0.3 },
];

// Severity multipliers by incident type
const SEVERITY: Record<string, number> = {
    Homicide: 2.5,
    "Sexual Assault": 2.0,
    Kidnapping: 2.0,
    Robbery: 1.8,
    Assault: 1.5,
    Drugs: 1.4,
    Theft: 1.2,
    Fraud: 1.1,
    Vandalism: 0.9,
    Noise: 0.7,
};

function severityWeight(type?: string): number {
    if (!type) return 1.0;
    return SEVERITY[type] ?? 1.0;
}

function recencyWeight(ageMs: number): number {
    const days = ageMs / MS_PER_DAY;
    return RECENCY.find((r) => days <= r.maxDays)?.weight ?? 0.3;
}

function toRiskLevel(score: number): RiskLevel {
    if (score >= 75) return "CRITICAL";
    if (score >= 50) return "HIGH";
    if (score >= 25) return "MEDIUM";
    return "LOW";
}

function dominantType(group: MapReport[]): string {
    const counts: Record<string, number> = {};
    for (const r of group) {
        const t = r.incident_type ?? "Unknown";
        counts[t] = (counts[t] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Unknown";
}

// --- ALGORITHMS ---

// Simple centroid: finds the densest area within the group rather than a naive average.
// This prevents the centroid landing in empty space between two distinct clusters in a barangay.
function findDenseCentroid(reports: (MapReport & { timeMs: number })[]): { lat: number; lng: number } {
    if (reports.length === 1) return { lat: reports[0].latitude, lng: reports[0].longitude };
    if (reports.length === 2) return {
        lat: (reports[0].latitude + reports[1].latitude) / 2,
        lng: (reports[0].longitude + reports[1].longitude) / 2
    };

    // Find the point with the most neighbors within roughly 500m (0.005 degrees approx)
    let bestPoint = reports[0];
    let maxNeighbors = -1;

    for (const p1 of reports) {
        let neighbors = 0;
        for (const p2 of reports) {
            if (p1 === p2) continue;
            // Very rough distance approx (Euclidean on lat/lng is bad, but fast enough for 500m logic)
            const d = Math.sqrt(Math.pow(p1.latitude - p2.latitude, 2) + Math.pow(p1.longitude - p2.longitude, 2));
            if (d < 0.005) neighbors++;
        }
        if (neighbors > maxNeighbors) {
            maxNeighbors = neighbors;
            bestPoint = p1;
        }
    }

    // Average the coordinates of the dense cluster around the best point
    const cluster = reports.filter(p => {
        const d = Math.sqrt(Math.pow(bestPoint.latitude - p.latitude, 2) + Math.pow(bestPoint.longitude - p.longitude, 2));
        return d < 0.005;
    });

    const sumLat = cluster.reduce((sum, r) => sum + r.latitude, 0);
    const sumLng = cluster.reduce((sum, r) => sum + r.longitude, 0);
    return { lat: sumLat / cluster.length, lng: sumLng / cluster.length };
}

// Trend comparing last 30 days to previous 30 days
function computeTrend(recent: number, prev: number): HotspotZone["trend"] {
    // Noise reduction: if numbers are too small, trend is meaningless
    if (recent < 3 && prev < 3) return "stable";

    if (prev === 0) return recent > 0 ? "rising" : "stable";
    const ratio = recent / prev;
    if (ratio > 1.2) return "rising";
    if (ratio < 0.8) return "falling";
    return "stable";
}

// Bucket a lat/lng into a ~500 m grid key
function gridKey(lat: number, lng: number): string {
    // ~500 m at 14° latitude ≈ 0.0045° per grid cell
    const gLat = Math.round(lat / 0.0045) * 0.0045;
    const gLng = Math.round(lng / 0.0050) * 0.0050;
    return `${gLat.toFixed(4)},${gLng.toFixed(4)}`;
}

// ── Main export ────────────────────────────────────────────────────────────────

/**
 * Compute predicted crime hotspot zones from historical reports.
 * Pure client-side statistical model — no external services required.
 */
export function computeHotspots(reports: MapReport[]): HotspotZone[] {
    if (!reports || reports.length === 0) return [];

    const now = Date.now();
    const reportsWithTime = reports.map(r => ({
        ...r,
        timeMs: new Date(r.created_at).getTime()
    }));

    // Grouping
    // We group by barangay if available. If not, we fall back to a 1km geographic grid.
    const groups = new Map<string, (MapReport & { timeMs: number })[]>();

    reportsWithTime.forEach((r) => {
        const key = r.barangay?.trim()
            ? `brgy:${r.barangay.trim()}`
            : `grid:${gridKey(r.latitude, r.longitude)}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(r);
    });

    // Scoring
    const rawScores: { key: string; label: string; score: number; group: (MapReport & { timeMs: number })[] }[] = [];

    for (const [key, group] of groups.entries()) {
        // Skip isolated single incidents — 1 crime does not make a hotspot
        if (group.length < 2) continue;

        let totalScore = 0;

        group.forEach((r) => {
            const ageMs = now - r.timeMs;
            totalScore += recencyWeight(ageMs) * severityWeight(r.incident_type);
        });
        const label = key.startsWith("brgy:") ? key.slice(5) : "Area";
        rawScores.push({ key, label, score: totalScore, group });
    }

    // Normalise to 0–100
    // We set a baseline max score of 15. This means you need roughly 5 recent
    // severe incidents (e.g. 5 * 3.0 weighting = 15) to hit a 100/100 score.
    // Without this baseline, 1 single incident would be 100/100 if it was the highest in the city.
    const maxScore = Math.max(15, ...rawScores.map((x) => x.score));
    if (maxScore === 0) return [];

    const zones: HotspotZone[] = rawScores
        .map(({ key, label, score, group }) => {
            const normalised = Math.min(100, Math.round((score / maxScore) * 100));

            // Sub-cluster centroid to find the actual dense spot, not the empty field in the middle
            const { lat, lng } = findDenseCentroid(group);

            const recentCount = group.filter(
                (r) => now - r.timeMs <= 30 * MS_PER_DAY
            ).length;

            const prevCount = group.filter(
                (r) => {
                    const d = now - r.timeMs;
                    return d > 30 * MS_PER_DAY && d <= 60 * MS_PER_DAY;
                }
            ).length;

            const trend = computeTrend(recentCount, prevCount);
            const riskLevel = toRiskLevel(normalised);
            // Radius scales with score (200 m LOW → 700 m CRITICAL)
            const radius = 200 + normalised * 5;

            return {
                key,
                label,
                lat,
                lng,
                riskScore: normalised,
                riskLevel,
                dominantIncidentType: dominantType(group),
                trend,
                recentCount,
                radius,
            };
        })
        .sort((a, b) => b.riskScore - a.riskScore);

    // Return top 20 (to keep map readable)
    return zones.slice(0, 20);
}

export const RISK_COLORS: Record<RiskLevel, string> = {
    CRITICAL: "#ef4444",
    HIGH: "#f97316",
    MEDIUM: "#eab308",
    LOW: "#22c55e",
};

export const TREND_EMOJI: Record<Trend, string> = {
    rising: "↑",
    stable: "→",
    falling: "↓",
};
