import { format } from "date-fns";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Edit3,
  MapPin,
  MessageCircle,
  ShieldCheck,
  User,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { getEvidenceUrls } from "../lib/evidenceUrl";
import { supabase } from "../lib/supabase";

interface ReportUpdate {
  id: string;
  update_type: string;
  message: string | null;
  image_url: string | null;
  created_at: string;
}

interface ReportModalProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  report: any;
  onClose: () => void;
  onUpdate: () => void; // Refresh the list after update
}

/** Small helper: resolves a storage path to a signed URL and renders it as an <img>. */
function SignedImg({ rawPath, className }: { rawPath: string; className?: string }) {
  const [src, setSrc] = useState<string | null>(null);
  useEffect(() => {
    void getEvidenceUrls(rawPath).then((urls) => setSrc(urls[0] ?? null));
  }, [rawPath]);
  if (!src) return null;
  return (
    <img
      src={src}
      alt="Follow-up photo"
      className={className}
      onClick={() => window.open(src, "_blank", "noopener,noreferrer")}
    />
  );
}

export function ReportModal({ report, onClose, onUpdate }: ReportModalProps) {
  const [updating, setUpdating] = useState(false);
  const [updates, setUpdates] = useState<ReportUpdate[]>([]);
  const [updatesLoading, setUpdatesLoading] = useState(true);
  // Resolved signed URLs for this report's evidence photos
  const [evidenceUrls, setEvidenceUrls] = useState<string[]>([]);
  const [evidenceIdx, setEvidenceIdx] = useState(0);

  // Fetch signed URLs for evidence photos when the modal opens
  useEffect(() => {
    void getEvidenceUrls(report.image_url).then(setEvidenceUrls);
  }, [report.id, report.image_url]);

  useEffect(() => {
    async function fetchUpdates() {
      const { data } = await supabase
        .from("report_updates")
        .select("id, update_type, message, image_url, created_at")
        .eq("report_id", report.id)
        .order("created_at", { ascending: false });
      setUpdates(data || []);
      setUpdatesLoading(false);
    }
    void fetchUpdates();
  }, [report.id]);

  const updateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("reports")
        .update({ status: newStatus })
        .eq("id", report.id);

      if (error) throw error;
      onUpdate(); // Refresh the parent dashboard
      onClose(); // Close the modal
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update status.");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Case #{(report.id ?? "unknown").substring(0, 8)}
            </h2>
            <p className="text-sm text-slate-500">
              Submitted on {report.created_at ? format(new Date(report.created_at), "PPP p") : "—"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 hover:bg-slate-200 rounded-full transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Status Badge */}
          <div className="mb-6 flex justify-center">
            <span
              className={`px-4 py-1.5 rounded-full text-sm font-bold border flex items-center gap-2
              ${report.status === "Verified"
                  ? "bg-blue-100 text-blue-700 border-blue-200"
                  : report.status === "Resolved"
                    ? "bg-green-100 text-green-700 border-green-200"
                    : "bg-yellow-100 text-yellow-700 border-yellow-200"
                }`}
            >
              Current Status: {(report.status ?? "Unknown").toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left Column: Details */}
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Incident Type
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <AlertTriangle className="w-5 h-5 text-slate-700" />
                  <span className="text-lg font-semibold text-slate-800">
                    {report.incident_type}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Location
                </label>
                <div className="flex items-start gap-2 mt-1">
                  <MapPin className="w-5 h-5 text-slate-700 mt-0.5" />
                  <span className="text-slate-700">
                    {report.location || "Coordinates Only"}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 ml-7">
                  {report.latitude}, {report.longitude}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Reporter
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <User className="w-5 h-5 text-slate-700" />
                  <span className="text-slate-700">Anonymous Resident</span>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Description
                </label>
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mt-1 text-slate-700 text-sm leading-relaxed">
                  {report.description}
                </div>
              </div>
            </div>

            {/* Right Column: Evidence Photos */}
            <div>
              <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                Photo Evidence
                {evidenceUrls.length > 1 && (
                  <span className="ml-2 font-normal normal-case text-slate-400">
                    ({evidenceIdx + 1} / {evidenceUrls.length})
                  </span>
                )}
              </label>
              <div className="relative aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center">
                {evidenceUrls.length > 0 ? (
                  <>
                    <img
                      key={evidenceUrls[evidenceIdx]}
                      src={evidenceUrls[evidenceIdx]}
                      alt={`Evidence photo ${evidenceIdx + 1}`}
                      className="w-full h-full object-cover hover:scale-105 transition duration-500 cursor-zoom-in"
                      onClick={() => window.open(evidenceUrls[evidenceIdx], "_blank", "noopener,noreferrer")}
                      onKeyDown={(e) => { if (e.key === "Enter") window.open(evidenceUrls[evidenceIdx], "_blank", "noopener,noreferrer"); }}
                      tabIndex={0}
                      role="button"
                    />
                    {/* Prev/Next nav for multiple photos */}
                    {evidenceUrls.length > 1 && (
                      <>
                        <button
                          onClick={() => setEvidenceIdx((i) => Math.max(0, i - 1))}
                          disabled={evidenceIdx === 0}
                          className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 text-white disabled:opacity-20 hover:bg-black/60 transition"
                          aria-label="Previous photo"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEvidenceIdx((i) => Math.min(evidenceUrls.length - 1, i + 1))}
                          disabled={evidenceIdx === evidenceUrls.length - 1}
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/40 text-white disabled:opacity-20 hover:bg-black/60 transition"
                          aria-label="Next photo"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </>
                ) : report.image_url ? (
                  // Still loading signed URL
                  <div className="text-slate-400 flex flex-col items-center gap-2">
                    <div className="w-6 h-6 border-2 border-slate-300 border-t-blue-500 rounded-full animate-spin" />
                    <span className="text-xs">Loading...</span>
                  </div>
                ) : (
                  <div className="text-slate-400 flex flex-col items-center">
                    <span className="text-sm">No Photo Provided</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Follow-Up History */}
        {!updatesLoading && updates.length > 0 && (
          <div className="px-6 pb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              Resident Updates ({updates.length})
            </h3>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {updates.map((u) => (
                <div
                  key={u.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100"
                >
                  <div className={`p-1.5 rounded-full ${u.update_type === "edit"
                    ? "bg-amber-100 text-amber-600"
                    : "bg-blue-100 text-blue-600"
                    }`}>
                    {u.update_type === "edit" ? (
                      <Edit3 className="w-3.5 h-3.5" />
                    ) : (
                      <MessageCircle className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        {u.update_type === "edit" ? "Edited" : "Follow-Up"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {format(new Date(u.created_at), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {u.message && (
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {u.message}
                      </p>
                    )}
                    {u.image_url && (
                      <SignedImg
                        rawPath={u.image_url}
                        className="mt-2 rounded-md max-h-24 object-cover cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer: Action Buttons */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          {report.status !== "Resolved" && (
            <button
              onClick={() => updateStatus("Resolved")}
              disabled={updating}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-lg font-medium transition flex justify-center items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              Mark Resolved
            </button>
          )}

          {report.status === "Pending" && (
            <button
              onClick={() => updateStatus("Verified")}
              disabled={updating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-lg font-medium transition flex justify-center items-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              Verify Report
            </button>
          )}

          {report.status !== "False Report" && (
            <button
              onClick={() => updateStatus("False Report")}
              disabled={updating}
              className="px-4 py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-medium transition"
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
