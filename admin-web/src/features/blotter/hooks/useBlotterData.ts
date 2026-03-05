import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useRealtimeSubscription } from "../../../hooks/useRealtimeSubscription";
import { supabase } from "../../../lib/supabase";

export interface BlotterCase {
    id: string;
    complainant: string;
    respondent: string;
    incident_type: string;
    narrative: string;
    hearing_date: string | null;
    status: string;
    barangay: string;
    filed_by: string | null;
    created_at: string;
}

export interface BlotterFormData {
    complainant: string;
    respondent: string;
    incident_type: string;
    narrative: string;
    hearing_date: string;
}

export const DEFAULT_FORM: BlotterFormData = {
    complainant: "",
    respondent: "",
    incident_type: "Neighborhood Dispute",
    narrative: "",
    hearing_date: "",
};

interface UseBlotterDataOptions {
    activeTab: string;
    userRole: string;
    userJurisdiction: string | null;
    userFullName: string;
    isLoaded: boolean;
}

export function useBlotterData({
    activeTab,
    userRole,
    userJurisdiction,
    userFullName,
    isLoaded,
}: UseBlotterDataOptions) {
    const [cases, setCases] = useState<BlotterCase[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchBlotter = useCallback(async () => {
        if (!isLoaded) return;
        setLoading(true);

        let query = supabase
            .from("blotter")
            .select("*")
            .eq("status", activeTab)
            .order("created_at", { ascending: false });

        if (userJurisdiction && userRole !== "police_admin") {
            query = query.eq("barangay", userJurisdiction);
        }

        const { data, error } = await query;
        if (error) {
            toast.error("Failed to load blotter records: " + error.message);
        } else if (data) {
            setCases(data as BlotterCase[]);
        }
        setLoading(false);
    }, [activeTab, isLoaded, userJurisdiction, userRole]);

    useEffect(() => {
        const runFetch = async () => {
            await fetchBlotter();
        };
        void runFetch();
    }, [fetchBlotter]);

    useRealtimeSubscription({
        channelName: "blotter:cases",
        table: "blotter",
        onEvent: fetchBlotter,
    });

    const submitCase = useCallback(
        async (formData: BlotterFormData): Promise<boolean> => {
            if (!formData.complainant || !formData.respondent) {
                toast.error("Complainant and respondent names are required.");
                return false;
            }

            const { error } = await supabase.from("blotter").insert([
                {
                    ...formData,
                    status: "Scheduled",
                    barangay: userJurisdiction || "Calamba City",
                    filed_by: userFullName,
                },
            ]);

            if (error) {
                toast.error("Error adding case: " + error.message);
                return false;
            }

            toast.success("Case filed successfully!");
            void fetchBlotter();
            return true;
        },
        [fetchBlotter, userFullName, userJurisdiction],
    );

    const updateStatus = useCallback(
        async (id: string, newStatus: string) => {
            if (!confirm(`Mark this case as ${newStatus}?`)) return;
            const { error } = await supabase
                .from("blotter")
                .update({ status: newStatus })
                .eq("id", id);
            if (error) toast.error("Failed to update case status: " + error.message);
            else void fetchBlotter();
        },
        [fetchBlotter],
    );

    const deleteCase = useCallback(
        async (id: string) => {
            if (!confirm("Delete this case permanently?")) return;
            const { error } = await supabase.from("blotter").delete().eq("id", id);
            if (error) toast.error("Failed to delete case: " + error.message);
            else void fetchBlotter();
        },
        [fetchBlotter],
    );

    return { cases, loading, submitCase, updateStatus, deleteCase, DEFAULT_FORM };
}
