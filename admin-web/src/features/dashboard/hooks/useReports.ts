import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useRealtimeSubscription } from "../../../hooks/useRealtimeSubscription";
import { supabase } from "../../../lib/supabase";
import type { Report, StatusFilter } from "../../../types/report";
import { getPriority, matchesSearch, normalizeReport } from "../utils/reportHelpers";

const PAGE_STEP = 50;

interface UseReportsOptions {
    userRole: string;
    userJurisdiction: string | null;
    isUserLoaded: boolean;
}

export function useReports({ userRole, userJurisdiction, isUserLoaded }: UseReportsOptions) {
    const [reports, setReports] = useState<Report[]>([]);
    const [filter, setFilter] = useState<StatusFilter>("All");
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [limit, setLimit] = useState(PAGE_STEP);

    const fetchReports = useCallback(async () => {
        setLoading(true);
        let query = supabase
            .from("reports")
            .select("*")
            .order("created_at", { ascending: false })
            .range(0, limit - 1);

        if (userRole === "barangay_admin" && userJurisdiction) {
            query = query.eq("barangay", userJurisdiction);
        }

        const { data, error } = await query;
        if (error) {
            toast.error(`Failed to load reports: ${error.message}`);
            setLoading(false);
            return;
        }

        const normalizedRows = Array.isArray(data)
            ? data.map((row) => normalizeReport(row as Record<string, unknown>))
            : [];

        setReports(normalizedRows);
        setLoading(false);
    }, [limit, userJurisdiction, userRole]);

    // Initial fetch (and re-fetch when limit/role/jurisdiction changes)
    useEffect(() => {
        if (!isUserLoaded) return;
        // Run asynchronously to avoid synchronous setState warnings in effect
        const runFetch = async () => {
            await fetchReports();
        };
        void runFetch();
    }, [fetchReports, isUserLoaded]);

    // Realtime subscription — uses shared hook with debouncing.
    // Separate from the effect above so changing `limit` doesn't recreate the channel.
    useRealtimeSubscription({
        channelName: "dashboard:reports",
        table: "reports",
        onEvent: fetchReports,
    });

    const updateLocalList = useCallback((id: string, updates: Partial<Report>) => {
        setReports((prev) => prev.map((r) => r.id === id ? { ...r, ...updates } : r));
    }, []);

    const filteredReports = useMemo(() => {
        return reports
            .filter((r) => filter === "All" ? true : r.status === filter)
            .filter((r) => matchesSearch(r, searchTerm));
    }, [reports, filter, searchTerm]);

    // Single-pass KPI + tab counts — avoids 5 separate .filter() calls
    const { kpi, tabCounts } = useMemo(() => {
        const counts = { Pending: 0, Verified: 0, Escalated: 0, Rejected: 0, Resolved: 0, critical: 0 };
        for (const r of reports) {
            if (r.status in counts) counts[r.status as keyof typeof counts]++;
            if (getPriority(r) === "High") counts.critical++;
        }
        return {
            kpi: {
                totalCount: reports.length,
                pendingCount: counts.Pending,
                escalatedCount: counts.Escalated,
                resolvedCount: counts.Resolved,
                criticalCount: counts.critical,
            },
            tabCounts: {
                All: reports.length,
                Pending: counts.Pending,
                Verified: counts.Verified,
                Escalated: counts.Escalated,
                Rejected: counts.Rejected,
                Resolved: counts.Resolved,
            } as Record<StatusFilter, number>,
        };
    }, [reports]);

    const loadMore = useCallback(() => setLimit((l) => l + PAGE_STEP), []);

    return {
        reports,
        setReports,
        filter,
        setFilter,
        loading,
        searchTerm,
        setSearchTerm,
        filteredReports,
        kpi,
        tabCounts,
        fetchReports,
        updateLocalList,
        loadMore,
    };
}
