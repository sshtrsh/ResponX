import { Download, RefreshCw, UserCog } from "lucide-react";

interface DashboardHeaderProps {
    userRole: string;
    userName: string;
    loading: boolean;
    onExport: () => void;
    onRefresh: () => void;
}

export function DashboardHeader({
    userRole,
    userName,
    loading,
    onExport,
    onRefresh,
}: DashboardHeaderProps) {
    return (
        <header className="mb-6 flex items-center justify-between">
            <div>
                <div className="flex items-center gap-3">
                    <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                        Incident Reports
                    </h1>
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Live
                    </span>
                </div>
                <p className="text-sm text-slate-400">Real-time report triage and SOP guidance.</p>
            </div>

            <div className="flex items-center gap-3">
                {/* Role badge */}
                <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-sm ${userRole === "police_admin" ? "border-blue-200 bg-blue-50 text-blue-700"
                    : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}>
                    <UserCog size={14} />
                    <div className="flex flex-col text-left leading-none">
                        <span className="text-[10px] uppercase tracking-wider opacity-60 mb-0.5">
                            {userRole.replace("_", " ")}
                        </span>
                        <span className="text-[12px] font-bold">{userName}</span>
                    </div>
                </div>

                <button
                    onClick={onExport}
                    className="flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-700 shadow-sm"
                >
                    <Download className="h-3.5 w-3.5" />
                    Export CSV
                </button>

                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 shadow-sm"
                >
                    <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                    Refresh
                </button>
            </div>
        </header>
    );
}
