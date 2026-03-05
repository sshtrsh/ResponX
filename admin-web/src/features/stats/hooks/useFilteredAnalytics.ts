import { format, getHours, subDays } from "date-fns";
import { useMemo } from "react";
import type { Report } from "../../../types/report";
import type { ChartData, PeakHourData, TrendData } from "../../../types/stats";

interface FilteredAnalyticsResult {
    filtered: Report[];
    filteredTrend: TrendData[];
    comparisonTrend: TrendData[];
    mergedTrend: (TrendData & { previous?: number })[];
    filteredPeakHours: PeakHourData[];
    filteredTypeData: ChartData[];
    filteredStats: {
        total: number;
        active: number;
        resolved: number;
        resolutionRate: string;
    };
    incidentTypes: string[];
    barangays: string[];
}

/**
 * Extracts all heavy filtering / computation logic from AnalyticsTab
 * so the component only handles rendering.
 */
export function useFilteredAnalytics(
    allReports: Report[],
    crimeFilter: string,
    barangayFilter: string,
    trendData: TrendData[],
    typeData: ChartData[],
    stats: { total: number; active: number; resolved: number; resolutionRate: string },
    timeRange: string,
    compareMode: boolean,
): FilteredAnalyticsResult {
    // Unique crime types
    const incidentTypes = useMemo(() => {
        const types = new Set(allReports.map((r) => r.incident_type));
        return ["All", ...Array.from(types).sort()];
    }, [allReports]);

    // Extract barangay names from location field
    const barangays = useMemo(() => {
        const names = new Set<string>();
        allReports.forEach((r) => {
            if (r.location) {
                const parts = r.location.split(",").map((s) => s.trim());
                const brgy = parts[parts.length - 1];
                if (brgy) names.add(brgy);
            }
        });
        return ["All", ...Array.from(names).sort()];
    }, [allReports]);

    // Filtered reports
    const filtered = useMemo(() => {
        let result = allReports;
        if (crimeFilter !== "All") result = result.filter((r) => r.incident_type === crimeFilter);
        if (barangayFilter !== "All") result = result.filter((r) => r.location?.includes(barangayFilter));
        return result;
    }, [allReports, crimeFilter, barangayFilter]);

    // Recompute trend
    const filteredTrend: TrendData[] = useMemo(() => {
        if (crimeFilter === "All" && barangayFilter === "All") return trendData;
        const daysCount = timeRange === "all" ? 30 : timeRange === "custom" ? trendData.length : parseInt(timeRange);
        const targetDays = [...Array(daysCount)].map((_, i) => format(subDays(new Date(), daysCount - 1 - i), "MMM dd"));
        const map: Record<string, number> = {};
        targetDays.forEach((d) => (map[d] = 0));
        filtered.forEach((r) => {
            const d = format(new Date(r.created_at), "MMM dd");
            if (map[d] !== undefined) map[d]++;
        });
        return targetDays.map((d) => ({ date: d, count: map[d] }));
    }, [crimeFilter, barangayFilter, filtered, trendData, timeRange]);

    // Comparison trend (previous period)
    const comparisonTrend: TrendData[] = useMemo(() => {
        if (!compareMode) return [];
        const daysCount = timeRange === "all" || timeRange === "custom" ? trendData.length : parseInt(timeRange);
        const targetDays = [...Array(daysCount)].map((_, i) => format(subDays(new Date(), daysCount - 1 - i), "MMM dd"));
        const map: Record<string, number> = {};
        targetDays.forEach((d) => (map[d] = 0));

        const periodStart = subDays(new Date(), daysCount * 2);
        const periodEnd = subDays(new Date(), daysCount);
        let prevReports = allReports.filter((r) => {
            const d = new Date(r.created_at);
            return d >= periodStart && d < periodEnd;
        });
        if (crimeFilter !== "All") prevReports = prevReports.filter((r) => r.incident_type === crimeFilter);
        if (barangayFilter !== "All") prevReports = prevReports.filter((r) => r.location?.includes(barangayFilter));

        prevReports.forEach((r) => {
            const d = new Date(r.created_at);
            const shifted = new Date(d.getTime() + daysCount * 24 * 60 * 60 * 1000);
            const dayStr = format(shifted, "MMM dd");
            if (map[dayStr] !== undefined) map[dayStr]++;
        });
        return targetDays.map((d) => ({ date: d, count: map[d] }));
    }, [compareMode, allReports, crimeFilter, barangayFilter, timeRange, trendData]);

    // Merged trend for comparison chart
    const mergedTrend = useMemo(() => {
        if (!compareMode) return filteredTrend.map((d) => ({ ...d }));
        return filteredTrend.map((d, i) => ({
            ...d,
            previous: comparisonTrend[i]?.count ?? 0,
        }));
    }, [filteredTrend, comparisonTrend, compareMode]);

    // Peak hours (24-hour buckets)
    const filteredPeakHours: PeakHourData[] = useMemo(() => {
        const hourMap = new Array(24).fill(0);
        filtered.forEach((r) => {
            hourMap[getHours(new Date(r.created_at))]++;
        });
        return hourMap.map((count, hour) => {
            const ampm = hour >= 12 ? "PM" : "AM";
            const displayHour = hour % 12 || 12;
            return { name: `${displayHour}${ampm}`, count };
        });
    }, [filtered]);

    // Type data for pie chart
    const filteredTypeData: ChartData[] = useMemo(() => {
        if (crimeFilter === "All" && barangayFilter === "All") return typeData;
        if (crimeFilter !== "All") return [{ name: crimeFilter, value: filtered.length }];
        const typeCounts: Record<string, number> = {};
        filtered.forEach((r) => {
            typeCounts[r.incident_type] = (typeCounts[r.incident_type] || 0) + 1;
        });
        return Object.keys(typeCounts).map((k) => ({ name: k, value: typeCounts[k] }));
    }, [crimeFilter, barangayFilter, filtered, typeData]);

    // Filtered stats
    const filteredStats = useMemo(() => {
        if (crimeFilter === "All" && barangayFilter === "All") return stats;
        const total = filtered.length;
        const resolved = filtered.filter((r) => r.status === "Resolved").length;
        const active = filtered.filter((r) => r.status === "Verified" || r.status === "Under Investigation").length;
        const rate = total > 0 ? ((resolved / total) * 100).toFixed(1) : "0";
        return { total, active, resolved, resolutionRate: rate + "%" };
    }, [crimeFilter, barangayFilter, filtered, stats]);

    return {
        filtered,
        filteredTrend,
        comparisonTrend,
        mergedTrend,
        filteredPeakHours,
        filteredTypeData,
        filteredStats,
        incidentTypes,
        barangays,
    };
}
