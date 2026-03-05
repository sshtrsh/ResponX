import { format } from "date-fns";
import { Activity, CheckCircle2, MapPin, ShieldAlert, Users } from "lucide-react";
import { StatusRow } from "../../../components/ui/StatusRow";
import type { Report } from "../../../types/report";
import { MetricCard } from "./MetricCard";

interface RealtimeTabProps {
    stats: { active: number; resolved: number; total: number };
    activeReporters: number;
    recentReports: Report[];
    isConnected: boolean;
}

export function RealtimeTab({ stats, activeReporters, recentReports, isConnected }: RealtimeTabProps) {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard icon={Activity} label="Active Reports" value={stats.active} color="blue" />
                <MetricCard icon={Users} label="Active Reporters (24h)" value={activeReporters} color="green" />
                <MetricCard icon={CheckCircle2} label="Resolved Today" value={stats.resolved} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Feed */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Live Incoming Feed</h3>
                        <span className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${isConnected ? 'bg-red-50 text-red-600 animate-pulse' : 'bg-slate-100 text-slate-400'}`}>
                            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-red-600' : 'bg-slate-400'}`}></span>
                            {isConnected ? "Live" : "Connecting..."}
                        </span>
                    </div>
                    <div className="space-y-4">
                        {recentReports.length === 0 ? (
                            <p className="text-slate-400">No reports yet.</p>
                        ) : (
                            recentReports.map((report) => (
                                <div
                                    key={report.id}
                                    className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-3 rounded-full ${report.status === "Verified" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}`}>
                                            {report.status === "Verified" ? <ShieldAlert size={20} /> : <Activity size={20} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-800">{report.incident_type}</p>
                                            <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                                                <MapPin size={10} /> {report.location || "Unknown"}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-bold px-2 py-1 bg-white rounded border border-slate-200 text-slate-600">
                                            {report.status}
                                        </span>
                                        <p className="text-[10px] text-slate-400 mt-1">
                                            {format(new Date(report.created_at), "h:mm a")}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Status Summary */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-6">Current Status</h3>
                    <div className="space-y-3">
                        <StatusRow label="Active" count={stats.active} color="red" />
                        <StatusRow label="Resolved" count={stats.resolved} color="emerald" />
                        <StatusRow label="Total" count={stats.total} color="slate" />
                    </div>
                </div>
            </div>
        </div>
    );
}
