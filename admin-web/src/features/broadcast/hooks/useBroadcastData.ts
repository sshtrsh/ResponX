import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabase";

export interface BroadcastMessage {
    id: string;
    title: string;
    message: string;
    barangay: string;
    author_name: string;
    created_at: string;
    priority: "Normal" | "Urgent" | "Emergency";
}

export interface BroadcastFormData {
    title: string;
    message: string;
    priority: string;
}

interface UseBroadcastDataOptions {
    jurisdiction: string;
    fullName: string;
}

export function useBroadcastData({ jurisdiction, fullName }: UseBroadcastDataOptions) {
    const [announcements, setAnnouncements] = useState<BroadcastMessage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAnnouncements = useCallback(async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from("announcements")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            toast.error("Failed to load announcements: " + error.message);
        } else if (data) {
            setAnnouncements(data as BroadcastMessage[]);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        const runFetch = async () => {
            await fetchAnnouncements();
        };
        void runFetch();
    }, [fetchAnnouncements]);

    const sendAnnouncement = useCallback(
        async (form: BroadcastFormData): Promise<boolean> => {
            const { error } = await supabase.from("announcements").insert({
                barangay: jurisdiction || "City Wide",
                title: form.title,
                message: form.message,
                priority: form.priority,
                author_name: fullName || "Barangay Official",
            });

            if (error) {
                toast.error("Error sending: " + error.message);
                return false;
            }

            toast.success("Broadcast Sent!");
            void fetchAnnouncements();
            return true;
        },
        [fetchAnnouncements, fullName, jurisdiction],
    );

    const deleteAnnouncement = useCallback(
        async (id: string): Promise<void> => {
            if (!confirm("Remove this announcement?")) return;
            const { error } = await supabase
                .from("announcements")
                .delete()
                .eq("id", id);

            if (error) {
                toast.error("Failed to remove announcement: " + error.message);
                return;
            }
            setAnnouncements((prev) => prev.filter((a) => a.id !== id));
        },
        [],
    );

    return { announcements, loading, sendAnnouncement, deleteAnnouncement };
}
