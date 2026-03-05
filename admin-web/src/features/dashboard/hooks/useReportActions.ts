import { format } from "date-fns";
import { useCallback, useState } from "react";
import toast from "react-hot-toast";
import { supabase } from "../../../lib/supabase";
import type { RejectModalState, Report, Status } from "../../../types/report";
import { escapeCsvField, getErrorMessage } from "../utils/reportHelpers";

interface UseReportActionsOptions {
    updateLocalList: (id: string, updates: Partial<Report>) => void;
    setReports: React.Dispatch<React.SetStateAction<Report[]>>;
    filteredReports: Report[];
    adminName: string;
    adminRole: string;
    /** Jurisdiction of the acting admin (e.g. 'Canlubang'). Used to tag actioned_by. */
    adminJurisdiction?: string;
}

export function useReportActions({
    updateLocalList,
    setReports,
    filteredReports,
    adminName,
    adminRole,
    adminJurisdiction,
}: UseReportActionsOptions) {
    const [updating, setUpdating] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<RejectModalState>({
        isOpen: false,
        reportId: "",
        reason: "",
    });

    // Build a human-readable handler label based on role
    const handlerLabel = adminRole === "barangay_admin" && adminJurisdiction
        ? `${adminName} — Brgy. ${adminJurisdiction}`
        : adminRole === "police_admin" && adminJurisdiction
            ? `${adminName} — ${adminJurisdiction} Police`
            : adminName;

    const handleStatusUpdate = useCallback(
        async (id: string, newStatus: Status) => {
            setUpdating(id);
            try {
                const { error } = await supabase
                    .from("reports")
                    .update({ status: newStatus, actioned_by: handlerLabel })
                    .eq("id", id);
                if (error) throw error;
                updateLocalList(id, { status: newStatus, actioned_by: handlerLabel });
            } catch (error: unknown) {
                toast.error(`Update Failed: ${getErrorMessage(error)}`);
            } finally {
                setUpdating(null);
            }
        },
        [updateLocalList, handlerLabel],
    );

    const onStatusChange = useCallback(
        (id: string, newStatus: Status) => {
            if (newStatus === "Rejected") {
                setRejectModal({ isOpen: true, reportId: id, reason: "" });
            } else {
                void handleStatusUpdate(id, newStatus);
            }
        },
        [handleStatusUpdate],
    );

    const confirmReject = useCallback(async () => {
        if (!rejectModal.reason.trim()) {
            toast.error("Please enter a reason.");
            return;
        }

        setUpdating(rejectModal.reportId);

        try {
            const { error } = await supabase
                .from("reports")
                .update({
                    status: "Rejected",
                    rejection_reason: rejectModal.reason.trim(),
                    actioned_by: handlerLabel,
                })
                .eq("id", rejectModal.reportId);

            if (error) throw error;

            updateLocalList(rejectModal.reportId, {
                status: "Rejected",
                rejection_reason: rejectModal.reason.trim(),
                actioned_by: handlerLabel,
            });
            toast.success("Report rejected successfully.");

            setRejectModal({ isOpen: false, reportId: "", reason: "" });
        } catch (error: unknown) {
            toast.error(`Rejection failed: ${getErrorMessage(error)}`);
        } finally {
            setUpdating(null);
        }
    }, [rejectModal.reason, rejectModal.reportId, updateLocalList, handlerLabel]);

    const confirmDelete = useCallback(async () => {
        if (!window.confirm("Are you sure? This cannot be undone.")) return;

        setUpdating(rejectModal.reportId);

        try {
            const { error } = await supabase
                .from("reports")
                .delete()
                .eq("id", rejectModal.reportId);

            if (error) throw error;

            setReports((prev) => prev.filter((r) => r.id !== rejectModal.reportId));
            toast.success("Report permanently deleted.");

            setRejectModal({ isOpen: false, reportId: "", reason: "" });
        } catch (error: unknown) {
            toast.error(`Delete failed: ${getErrorMessage(error)}`);
        } finally {
            setUpdating(null);
        }
    }, [rejectModal.reportId, setReports]);

    const handleEscalate = useCallback(
        async (id: string) => {
            if (!window.confirm("Forward to Police? Use only for emergencies."))
                return;
            setUpdating(id);
            try {
                const { error } = await supabase
                    .from("reports")
                    .update({ status: "Escalated", actioned_by: handlerLabel })
                    .eq("id", id);
                if (error) throw error;
                toast.success("Report forwarded to Police Dispatch.");
                updateLocalList(id, { status: "Escalated", actioned_by: handlerLabel });
            } catch (error: unknown) {
                toast.error(`Escalation failed: ${getErrorMessage(error)}`);
            } finally {
                setUpdating(null);
            }
        },
        [updateLocalList, handlerLabel],
    );

    const handleExport = useCallback(() => {
        const headers = [
            "ID,Type,Barangay,Location,Priority,Status,Reporter,Date,Description,RejectionReason,Latitude,Longitude",
        ];
        const rows = filteredReports.map(
            (r) =>
                `${escapeCsvField(r.id)},${escapeCsvField(r.incident_type)},${escapeCsvField((r as Report & { barangay?: string }).barangay)},${escapeCsvField(r.location)},${escapeCsvField(r.priority)},${escapeCsvField(r.status)},${escapeCsvField(r.reporter_name || "Anonymous")},${escapeCsvField(r.created_at)},${escapeCsvField(r.description || "")},${escapeCsvField(r.rejection_reason || "")},${escapeCsvField(String(r.latitude ?? ""))},${escapeCsvField(String(r.longitude ?? ""))}`,
        );
        const csvContent =
            "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute(
            "download",
            `barangay_blotter_${format(new Date(), "yyyy-MM-dd")}.csv`,
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }, [filteredReports]);

    return {
        updating,
        rejectModal,
        setRejectModal,
        handleStatusUpdate,
        onStatusChange,
        confirmReject,
        confirmDelete,
        handleEscalate,
        handleExport,
    };
}
