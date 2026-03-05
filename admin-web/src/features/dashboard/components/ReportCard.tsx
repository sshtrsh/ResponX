import { format } from "date-fns";
import {
    AlertCircle,
    AlertTriangle,
    ChevronRight,
    Clock,
    RefreshCw,
    UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { getFirstEvidenceUrl } from "../../../lib/evidenceUrl";
import type { Report, Status } from "../../../types/report";
import { getCrimeIcon } from "../utils/crimeIcons";
import { getPriority, isStatus } from "../utils/reportHelpers";
import { getPriorityStyle, getSopText, getStatusStyle } from "../utils/statusStyles";

interface ReportCardProps {
    report: Report;
    updating: string | null;
    canEdit: boolean;
    userRole: string;
    onStatusChange: (id: string, status: Status) => void;
    onEscalate: (id: string) => void;
}

export function ReportCard({
    report,
    updating,
    canEdit,
    userRole,
    onStatusChange,
    onEscalate,
}: ReportCardProps) {
    const statusStyle = getStatusStyle(report.status);
    const StatusIcon = statusStyle.icon;
    const priority = getPriority(report);
    const priorityStyle = getPriorityStyle(priority);
    const isCritical = priority === "High";

    // Resolve evidence thumbnail to a signed URL (private bucket compatible)
    const [signedThumbUrl, setSignedThumbUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!report.image_url || report.image_url.length === 0) return;
        void getFirstEvidenceUrl(report.image_url).then(setSignedThumbUrl);
    }, [report.id, report.image_url]);

    return (
        <div
            className={`group relative p-5 transition-all hover:bg-slate-50 ${isCritical ? "bg-red-50/40" : ""}`}
        >
            {/* Critical accent bar */}
            {isCritical && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500 rounded-l-xl" />
            )}

            {/* Row: Status + Time + Controls */}
            <div className="mb-3 flex items-center justify-between gap-3 pl-3">
                <div className="flex items-center gap-2 flex-wrap">
                    {/* Status badge */}
                    <span className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusStyle.bg} ${statusStyle.color}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${statusStyle.dot}`} />
                        <StatusIcon className="h-3 w-3" />
                        {report.status}
                    </span>

                    {/* Priority badge */}
                    <span className={`rounded-lg px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${priorityStyle.class}`}>
                        {priorityStyle.label}
                    </span>

                    {/* Time */}
                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="h-3 w-3" />
                        {format(new Date(report.created_at), "MMM d, h:mm a")}
                    </span>
                </div>

                {/* Status editor / read-only */}
                <div className="shrink-0">
                    {updating === report.id ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-blue-500">
                            <RefreshCw size={12} className="animate-spin" /> Saving…
                        </span>
                    ) : canEdit ? (
                        <select
                            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 outline-none transition hover:border-slate-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-50 shadow-sm"
                            value={report.status}
                            onChange={(e) => {
                                const s = e.target.value;
                                if (!isStatus(s)) return;
                                onStatusChange(report.id, s);
                            }}
                        >
                            <option value="Pending">Pending</option>
                            <option value="Verified">Verified</option>
                            <option value="Escalated">Escalated</option>
                            <option value="Rejected">Rejected</option>
                            <option value="Resolved">Resolved</option>
                        </select>
                    ) : (
                        <span className="text-[11px] italic text-slate-300">Read-only</span>
                    )}
                </div>
            </div>

            {/* Report body */}
            <div className="pl-3 flex gap-4">
                <div className="flex-1 min-w-0">
                    {/* Incident type */}
                    <div className="mb-1.5 flex items-center gap-2">
                        {getCrimeIcon(report.incident_type)}
                        <h3 className="text-base font-bold text-slate-900 leading-tight">
                            {report.incident_type}
                        </h3>
                    </div>

                    {/* Description */}
                    <p className="mb-3 pl-7 text-sm text-slate-500 leading-relaxed line-clamp-2">
                        {report.description || "No description provided."}
                    </p>

                    {/* Rejection reason */}
                    {report.status === "Rejected" && report.rejection_reason && (
                        <div className="mb-3 ml-7 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                            <span className="font-semibold text-slate-600">Rejection reason: </span>
                            {report.rejection_reason}
                        </div>
                    )}

                    {/* Location + Reporter */}
                    <div className="mb-3 pl-7 flex flex-wrap items-center gap-3 text-xs text-slate-400">
                        <div className="flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-500 font-medium">
                            <AlertCircle className="h-3 w-3 shrink-0" />
                            {report.location || "No location data"}
                        </div>
                        <span>
                            Reported by{" "}
                            <span className="font-semibold text-slate-600">
                                {(report as Report & { is_anonymous?: boolean }).is_anonymous ? "Anonymous" : (report.reporter_name || "Anonymous")}
                            </span>
                        </span>
                        {report.actioned_by && userRole !== "barangay_admin" && (
                            <span className="flex items-center gap-1.5 rounded-md bg-emerald-50 border border-emerald-100 px-2.5 py-1 text-emerald-700 font-semibold text-[11px]">
                                <UserCheck className="h-3 w-3 shrink-0" />
                                Handled by <span className="font-bold">{report.actioned_by}</span>
                            </span>
                        )}
                    </div>

                    {/* SOP Box */}
                    <div className={`ml-7 rounded-xl border p-3.5 ${isCritical
                        ? "border-red-200 bg-red-50"
                        : priority === "Medium"
                            ? "border-orange-200 bg-orange-50"
                            : "border-slate-200 bg-slate-50"
                        }`}>
                        <div className="flex items-center gap-1.5 mb-1">
                            <ChevronRight className={`h-3.5 w-3.5 shrink-0 ${isCritical ? "text-red-500" : priority === "Medium" ? "text-orange-500" : "text-slate-400"}`} />
                            <span className={`text-[10px] font-bold uppercase tracking-widest ${isCritical ? "text-red-600" : priority === "Medium" ? "text-orange-600" : "text-slate-500"}`}>
                                Suggested SOP Action
                            </span>
                        </div>
                        <p className="pl-5 text-xs text-slate-600 leading-relaxed">
                            {getSopText(priority)}
                        </p>
                    </div>

                    {/* Escalate button */}
                    {userRole === "barangay_admin" && (
                        <div className="mt-3 ml-7">
                            <button
                                onClick={() => { void onEscalate(report.id); }}
                                className="flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-bold uppercase tracking-wider text-red-600 transition hover:bg-red-50 hover:border-red-300 shadow-sm"
                            >
                                <AlertTriangle size={12} />
                                Forward to Police
                            </button>
                        </div>
                    )}
                </div>

                {/* Evidence image thumbnail */}
                {report.image_url && report.image_url.length > 0 && (
                    <div className="h-28 w-28 shrink-0 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
                        {signedThumbUrl ? (
                            <img
                                src={signedThumbUrl}
                                alt="Evidence"
                                className="h-full w-full cursor-pointer object-cover transition-transform hover:scale-110"
                                onClick={() => window.open(signedThumbUrl, "_blank")}
                            />
                        ) : (
                            // Shimmer while resolving signed URL
                            <div className="h-full w-full bg-slate-100 animate-pulse" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
