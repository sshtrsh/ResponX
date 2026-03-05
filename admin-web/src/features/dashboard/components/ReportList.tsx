import { Search } from "lucide-react";
import type { Report, Status } from "../../../types/report";
import { ReportCard } from "./ReportCard";

interface ReportListProps {
    reports: Report[];
    loading: boolean;
    updating: string | null;
    canEdit: boolean;
    userRole: string;
    onStatusChange: (id: string, status: Status) => void;
    onEscalate: (id: string) => void;
    onLoadMore: () => void;
}

export function ReportList({
    reports,
    loading,
    updating,
    canEdit,
    userRole,
    onStatusChange,
    onEscalate,
    onLoadMore,
}: ReportListProps) {
    return (
        <>
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                {loading ? (
                    <div className="space-y-0 divide-y divide-slate-100">
                        {Array.from({ length: 4 }).map((_, idx) => (
                            <div key={idx} className="animate-pulse p-5">
                                <div className="mb-3 flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <div className="h-5 w-20 rounded-lg bg-slate-100" />
                                        <div className="h-5 w-28 rounded-lg bg-slate-100" />
                                    </div>
                                    <div className="h-5 w-24 rounded-lg bg-slate-100" />
                                </div>
                                <div className="mb-2 h-5 w-1/4 rounded bg-slate-100" />
                                <div className="h-4 w-3/4 rounded bg-slate-50" />
                            </div>
                        ))}
                    </div>
                ) : reports.length === 0 ? (
                    <div className="p-16 text-center">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 border border-slate-100">
                            <Search className="h-7 w-7 text-slate-300" />
                        </div>
                        <h3 className="text-base font-bold text-slate-800">No reports found</h3>
                        <p className="mt-1 text-sm text-slate-400">Try adjusting your filter or search term.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-100">
                        {reports.map((report) => (
                            <ReportCard
                                key={report.id}
                                report={report}
                                updating={updating}
                                canEdit={canEdit}
                                userRole={userRole}
                                onStatusChange={onStatusChange}
                                onEscalate={onEscalate}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Load more */}
            {!loading && (
                <div className="mt-5 flex justify-center">
                    <button
                        onClick={onLoadMore}
                        className="rounded-xl border border-slate-200 bg-white px-6 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                        Load More
                    </button>
                </div>
            )}
        </>
    );
}
