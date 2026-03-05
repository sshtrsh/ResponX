import { useCallback, useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabase";

export interface MapReport {
    id: string;
    latitude: number;
    longitude: number;
    location?: string;
    barangay?: string;
    incident_type?: string;
    status: string;
    created_at: string;
    description?: string;
}

interface UseMapDataOptions {
    userRole: string;
    userJurisdiction: string | null;
    incidentType?: string;
    filterBarangay?: string;
    dateRange?: "7" | "14" | "30" | "90" | "all";
}

export function useMapData({ userRole, userJurisdiction, incidentType, filterBarangay, dateRange = "30" }: UseMapDataOptions) {
    const [reports, setReports] = useState<MapReport[]>([]);
    const [loading, setLoading] = useState(true);
    const pendingUpdates = useRef<MapReport[]>([]);

    const fetchReports = useCallback(async () => {
        let query = supabase
            .from("reports")
            .select("id, latitude, longitude, location, barangay, incident_type, status, created_at, description")
            .in("status", ["Verified", "Resolved"])
            .not("latitude", "is", null);

        // Date filter
        if (dateRange !== "all") {
            const dateFrom = new Date();
            dateFrom.setDate(dateFrom.getDate() - parseInt(dateRange, 10));
            query = query.gte("created_at", dateFrom.toISOString());
        }

        // 🔒 Barangay admins only see reports within their own jurisdiction
        if (userRole === "barangay_admin" && userJurisdiction) {
            query = query.eq("barangay", userJurisdiction);
        } else if (filterBarangay && filterBarangay !== "All") {
            // Dropdown filter for Super/Police admin OR explicit barangay match
            query = query.eq("barangay", filterBarangay);
        }

        // Incident Type Filter
        if (incidentType && incidentType !== "All") {
            query = query.eq("incident_type", incidentType);
        }

        const { data, error } = await query;
        if (error) {
            toast.error("Failed to load map data: " + error.message);
            return;
        }
        if (data) setReports(data as MapReport[]);
        setLoading(false);
    }, [userRole, userJurisdiction, incidentType, filterBarangay, dateRange]);

    useEffect(() => {
        const runFetch = async () => {
            await fetchReports();
        };
        void runFetch();
    }, [fetchReports]);

    // Setup batched real-time subscription
    useEffect(() => {
        const channel = supabase.channel("map:reports")
            .on("postgres_changes", { event: "INSERT", schema: "public", table: "reports" },
                (payload) => {
                    // Buffer new reports instead of immediately updating state
                    pendingUpdates.current.push(payload.new as MapReport);
                }
            )
            .subscribe();

        // Flush buffered updates every 3 seconds — not on every insert
        const interval = setInterval(() => {
            if (pendingUpdates.current.length === 0) return;
            setReports(prev => [...prev, ...pendingUpdates.current]);
            pendingUpdates.current = [];
        }, 3000); // 3s batch window

        return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
        };
    }, []);

    return { reports, loading };
}
