import { Ban, Trash2, X } from "lucide-react";
import type { RejectModalState } from "../../../types/report";

interface RejectModalProps {
    rejectModal: RejectModalState;
    setRejectModal: React.Dispatch<React.SetStateAction<RejectModalState>>;
    onReject: () => void;
    onDelete: () => void;
    isSuperAdmin: boolean;
}

export function RejectModal({
    rejectModal,
    setRejectModal,
    onReject,
    onDelete,
    isSuperAdmin,
}: RejectModalProps) {
    if (!rejectModal.isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h3 className="font-bold text-slate-900">Reject Report</h3>
                        <p className="text-xs text-slate-400 mt-0.5">This will be recorded in audit logs.</p>
                    </div>
                    <button
                        onClick={() => setRejectModal((prev) => ({ ...prev, isOpen: false }))}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <textarea
                        className="mb-5 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100 transition placeholder:text-slate-300"
                        placeholder="e.g., Duplicate report, False alarm…"
                        value={rejectModal.reason}
                        onChange={(e) => setRejectModal((prev) => ({ ...prev, reason: e.target.value }))}
                        autoFocus
                    />

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onReject}
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
                        >
                            <Ban size={15} />
                            Reject & Archive
                        </button>

                        {isSuperAdmin && (
                            <>
                                <div className="relative flex items-center py-1">
                                    <div className="flex-grow border-t border-slate-100" />
                                    <span className="mx-4 text-[10px] font-bold uppercase tracking-widest text-slate-300">Danger Zone</span>
                                    <div className="flex-grow border-t border-slate-100" />
                                </div>
                                <button
                                    onClick={onDelete}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
                                >
                                    <Trash2 size={15} />
                                    Delete Permanently
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
