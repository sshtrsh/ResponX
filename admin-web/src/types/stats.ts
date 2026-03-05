// ── Stats-Specific Types ─────────────────────────────────────────────────────

export interface ChartData {
    name: string;
    value: number;
}

export interface TrendData {
    date: string;
    count: number;
}

export interface PeakHourData {
    name: string;
    count: number;
}

export interface HotspotData {
    name: string;
    count: number;
    risk: number;
}
