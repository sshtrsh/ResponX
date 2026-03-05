import { differenceInDays, format, getHours, isAfter, subDays } from "date-fns";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import type { Report } from "../../../types/report";
import type { ChartData, TrendData } from "../../../types/stats";
import { computeMAPE, forecastNextDays } from "../utils/forecasting";
import { useClusterWorker } from "./useClusterWorker";

export interface SpikeAlert {
    active: boolean;
    count24h: number;
    avgDaily: number;
}

export interface CustomRange {
    from: Date;
    to: Date;
}

interface StatsState {
    total: number;
    resolved: number;
    active: number;
    resolutionRate: string;
}

/**
 * Fetches, derives, and subscribes to all stats data for the Stats page.
 * Accepts `timeRange` (number of days as string, or "all") as input.
 */
export function useStatsData(timeRange: string, customRange?: CustomRange | null) {
    const { hotspots, setHotspots, postReports, clusterLoading } = useClusterWorker();

    const [loading, setLoading] = useState(true);
    const [isConnected, setIsConnected] = useState(false);
    const [stats, setStats] = useState<StatsState>({
        total: 0,
        resolved: 0,
        active: 0,
        resolutionRate: "0%",
    });
    const [typeData, setTypeData] = useState<ChartData[]>([]);
    const [trendData, setTrendData] = useState<TrendData[]>([]);
    const [recentReports, setRecentReports] = useState<Report[]>([]);
    const [allReports, setAllReports] = useState<Report[]>([]);
    const [peakDay, setPeakDay] = useState("-");
    const [activeReporters, setActiveReporters] = useState(0);
    const [trendStats, setTrendStats] = useState({ recentCount: 0, pastCount: 0 });

    // Debounce ref: prevents query storm when multiple realtime events fire in quick succession
    // (e.g., an admin bulk-updating statuses triggers one refetch per row, not N parallel ones).
    const refreshDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const debouncedFetchStats = useCallback(() => {
        if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
        refreshDebounceRef.current = setTimeout(() => {
            void fetchStats();
        }, 600);
        // fetchStats is stable via useCallback — safe dep
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchStats = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("reports")
            // Narrow projection — avoids fetching description / image_url (heavy) for the stats page.
            .select("id, status, incident_type, barangay, location, created_at, latitude, longitude")
            // Include ALL statuses — Pending must be counted so freshly
            // submitted reports aren't invisible to analytics and spike detection.
            .order("created_at", { ascending: true });

        if (timeRange === "custom" && customRange) {
            query = query
                .gte("created_at", customRange.from.toISOString())
                .lte("created_at", customRange.to.toISOString());
        } else if (timeRange !== "all") {
            const date = new Date();
            date.setDate(date.getDate() - parseInt(timeRange));
            query = query.gte("created_at", date.toISOString());
        }

        const { data: rawData } = await query;
        const reports = (rawData as Report[]) || [];

        if (reports.length > 0) {
            // 1. Basic KPIs
            const total = reports.length;
            const resolved = reports.filter((r) => r.status === "Resolved").length;
            const active = reports.filter(
                (r) => r.status === "Verified" || r.status === "Under Investigation",
            ).length;
            const rate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "0";
            setStats({ total, resolved, active, resolutionRate: rate + "%" });
            setAllReports(reports);

            // 2. Report Types
            const typeCounts: Record<string, number> = {};
            reports.forEach((r) => {
                const type = r.incident_type || "Unknown";
                typeCounts[type] = (typeCounts[type] || 0) + 1;
            });
            setTypeData(
                Object.keys(typeCounts).map((key) => ({ name: key, value: typeCounts[key] })),
            );

            // 3. Hotspots via cluster worker
            const validReportsForMap = reports.filter((r) => r.latitude && r.longitude);
            if (validReportsForMap.length >= 3) {
                postReports(validReportsForMap);
            } else {
                setHotspots([]);
            }

            // 4. Trend + peak data
            const daysCount = timeRange === "custom" && customRange
                ? Math.max(1, differenceInDays(customRange.to, customRange.from) + 1)
                : timeRange === "all" ? 30 : parseInt(timeRange);
            const targetDays = [...Array(daysCount)].map((_, i) =>
                format(subDays(new Date(), daysCount - 1 - i), "MMM dd"),
            );
            const trendMap: Record<string, number> = {};
            targetDays.forEach((day) => (trendMap[day] = 0));

            let recentCount = 0;
            let pastCount = 0;
            const threeDaysAgo = subDays(new Date(), 3);
            const hourMap = new Array(24).fill(0);
            const dayCounts: Record<string, number> = {
                Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0,
            };
            let reporters24h = 0;

            reports.forEach((r) => {
                const date = new Date(r.created_at);
                const dayStr = format(date, "MMM dd");
                const dayName = format(date, "EEE");

                if (trendMap[dayStr] !== undefined) trendMap[dayStr]++;
                if (isAfter(date, threeDaysAgo)) recentCount++;
                else pastCount++;

                const hour = getHours(date);
                hourMap[hour]++;

                if (dayCounts[dayName] !== undefined) dayCounts[dayName]++;
                if (isAfter(date, subDays(new Date(), 1))) reporters24h++;
            });

            setTrendStats({ recentCount, pastCount });
            setActiveReporters(reporters24h);

            const bestDay = Object.keys(dayCounts).reduce((a, b) =>
                dayCounts[a] > dayCounts[b] ? a : b,
            );
            setPeakDay(total > 0 ? bestDay : "-");
            setTrendData(Object.keys(trendMap).map((k) => ({ date: k, count: trendMap[k] })));

            setRecentReports([...reports].reverse().slice(0, 5));
        }
        setLoading(false);
    }, [timeRange, customRange, postReports, setHotspots]);

    // Fetch on mount/timeRange change + real-time subscription
    useEffect(() => {
        void fetchStats();
        const subscription = supabase
            .channel("stats:reports")
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "reports" },
                (payload) => {
                    // Live: prepend new report to feed immediately (no wait for full refetch)
                    const newReport = payload.new as Report;
                    if (newReport) {
                        setRecentReports((prev) => [newReport, ...prev].slice(0, 10));
                    }
                    // Debounced refresh so multiple rapid inserts coalesce into one query
                    debouncedFetchStats();
                },
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "reports" },
                () => { debouncedFetchStats(); },
            )
            .subscribe((status) => {
                setIsConnected(status === 'SUBSCRIBED');
            });

        return () => {
            if (refreshDebounceRef.current) clearTimeout(refreshDebounceRef.current);
            void subscription.unsubscribe();
            setIsConnected(false);
        };
    }, [fetchStats, debouncedFetchStats]);

    // AI insight derived from data
    const aiInsight = useMemo(() => {
        let trend = "stable";
        let percent = 0;

        if (trendStats.pastCount > 0) {
            const diff = trendStats.recentCount - trendStats.pastCount;
            percent = Math.round((diff / trendStats.pastCount) * 100);
            if (percent > 10) trend = "up";
            if (percent < -10) trend = "down";
        }

        const topCrime = [...typeData].sort((a, b) => b.value - a.value)[0]?.name || "General";
        const topZone = hotspots[0]?.name || "key areas";

        let message = "";
        if (trend === "up")
            message = `Alert: Incidents surged by ${percent}% recently. High probability of ${topCrime} in ${topZone}.`;
        else if (trend === "down")
            message = `Positive Trend: Incidents dropped by ${Math.abs(percent)}%. Patrols are effective in ${topZone}.`;
        else
            message = `Stable: Activity is normal. Continue monitoring ${topZone}.`;

        return { trend, percent, message };
    }, [hotspots, typeData, trendStats]);

    // Forecast derived from trend data
    const forecast = useMemo(() => {
        return forecastNextDays(trendData, 7);
    }, [trendData]);

    // Prediction accuracy via MAPE on historical data
    const predictionAccuracy = useMemo(() => {
        const counts = trendData.map((d) => d.count);
        return computeMAPE(counts);
    }, [trendData]);

    // Spike / anomaly detection
    const spikeAlert: SpikeAlert = useMemo(() => {
        if (allReports.length < 7) return { active: false, count24h: 0, avgDaily: 0 };
        const now = new Date();
        const oneDayAgo = subDays(now, 1);
        const sevenDaysAgo = subDays(now, 7);
        const count24h = allReports.filter((r) => isAfter(new Date(r.created_at), oneDayAgo)).length;
        const count7d = allReports.filter((r) => isAfter(new Date(r.created_at), sevenDaysAgo)).length;
        const avgDaily = count7d / 7;
        // Require avgDaily >= 1 to avoid false positives when weekly average is < 1 report/day
        // (e.g., avgDaily=0.14 would make ANY single report trigger a "spike").
        const isSpike = avgDaily >= 1 && count24h >= 3 * avgDaily;
        return { active: isSpike, count24h, avgDaily: Math.round(avgDaily) };
    }, [allReports]);

    return {
        loading,
        stats,
        typeData,
        trendData,
        hotspots,
        recentReports,
        peakDay,
        activeReporters,
        allReports,
        aiInsight,
        forecast,
        predictionAccuracy,
        clusterLoading,
        isConnected,
        spikeAlert,
    };
}
