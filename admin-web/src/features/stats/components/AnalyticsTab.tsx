import { CheckCircle2, Filter, GitCompareArrows, MapPinned, SearchX, ShieldAlert, Target, TrendingUp } from "lucide-react";
import { useState, useTransition } from "react";
import {
    Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
    Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { Report } from "../../../types/report";
import type { ChartData, TrendData } from "../../../types/stats";
import { useFilteredAnalytics } from "../hooks/useFilteredAnalytics";
import { CrimeMap } from "./CrimeMap";
import { MetricCard } from "./MetricCard";

const COLORS = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#ef4444", "#64748b"];

function ChartEmptyState({ message = "No incidents reported in this period." }: { message?: string }) {
    return (
        <div className="flex flex-col items-center justify-center h-[300px] text-slate-400">
            <SearchX className="w-8 h-8 mb-2 opacity-30" />
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}

interface AnalyticsTabProps {
    stats: { total: number; active: number; resolved: number; resolutionRate: string };
    trendData: TrendData[];
    typeData: ChartData[];
    aiInsight: { percent: number };
    allReports: Report[];
    timeRange: string;
    onClearTimeRange: () => void;
}

export function AnalyticsTab({ stats, trendData, typeData, aiInsight, allReports, timeRange, onClearTimeRange }: AnalyticsTabProps) {
    const [crimeFilter, setCrimeFilter] = useState("All");
    const [barangayFilter, setBarangayFilter] = useState("All");
    const [compareMode, setCompareMode] = useState(false);
    const [isPending, startTransition] = useTransition();

    const {
        mergedTrend,
        filteredPeakHours,
        filteredTypeData,
        filteredStats,
        incidentTypes,
        barangays,
    } = useFilteredAnalytics(allReports, crimeFilter, barangayFilter, trendData, typeData, stats, timeRange, compareMode);

    const hasActiveFilters = crimeFilter !== "All" || barangayFilter !== "All" || timeRange !== "30";

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Filter Bar & Active Summary */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 flex-wrap">
                    {/* Crime Type Filter */}
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <Filter className="h-4 w-4 text-slate-400" />
                        Incident Type
                    </div>
                    <select
                        value={crimeFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            startTransition(() => { setCrimeFilter(val); });
                        }}
                        className={`bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg outline-none focus:border-blue-500 cursor-pointer shadow-sm ${isPending ? 'opacity-50' : ''}`}
                    >
                        {incidentTypes.map((type) => (
                            <option key={type} value={type}>{type}</option>
                        ))}
                    </select>

                    {/* Barangay Filter */}
                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-600">
                        <MapPinned className="h-4 w-4 text-slate-400" />
                        Barangay
                    </div>
                    <select
                        value={barangayFilter}
                        onChange={(e) => {
                            const val = e.target.value;
                            startTransition(() => { setBarangayFilter(val); });
                        }}
                        className={`bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg outline-none focus:border-blue-500 cursor-pointer shadow-sm max-w-[180px] ${isPending ? 'opacity-50' : ''}`}
                    >
                        {barangays.map((b) => (
                            <option key={b} value={b}>{b}</option>
                        ))}
                    </select>

                    {/* Compare Toggle */}
                    <div className="w-px h-5 bg-slate-200 mx-1"></div>
                    <button
                        onClick={() => setCompareMode(!compareMode)}
                        className={`flex items-center gap-1.5 text-xs font-bold py-2 px-3 rounded-lg border transition ${compareMode
                            ? "bg-blue-50 border-blue-300 text-blue-700"
                            : "bg-slate-50 border-slate-200 text-slate-500 hover:border-slate-300"
                            }`}
                    >
                        <GitCompareArrows className="w-3.5 h-3.5" />
                        Compare
                    </button>
                </div>

                <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                    <span className="text-sm text-slate-600 font-medium whitespace-nowrap">
                        Showing: <span className="font-bold text-slate-900">{crimeFilter === "All" ? "All Crimes" : crimeFilter}</span>
                        {barangayFilter !== "All" && (
                            <><span className="mx-2 text-slate-300">&bull;</span><span className="font-bold text-slate-900">{barangayFilter}</span></>
                        )}
                        <span className="mx-2 text-slate-300">&bull;</span>
                        <span className="font-bold text-slate-900">{timeRange === "all" ? "All Time" : timeRange === "custom" ? "Custom" : `Last ${timeRange} Days`}</span>
                        {compareMode && <span className="mx-2 text-blue-500 font-bold">vs Previous</span>}
                    </span>
                    {hasActiveFilters && (
                        <>
                            <div className="w-px h-4 bg-slate-300"></div>
                            <button
                                onClick={() => {
                                    startTransition(() => {
                                        setCrimeFilter("All");
                                        setBarangayFilter("All");
                                    });
                                    if (timeRange !== "30") onClearTimeRange();
                                    setCompareMode(false);
                                }}
                                disabled={isPending}
                                className="text-xs text-blue-600 font-bold hover:underline whitespace-nowrap disabled:opacity-50"
                            >
                                Clear filters
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard icon={TrendingUp} label="Total Reports" value={filteredStats.total} trend="up" trendValue={aiInsight.percent + "%"} color="blue" />
                <MetricCard icon={ShieldAlert} label="Active Incidents" value={filteredStats.active} color="red" />
                <MetricCard icon={CheckCircle2} label="Solved Cases" value={filteredStats.resolved} color="green" />
                <MetricCard icon={Target} label="Resolution Rate" value={filteredStats.resolutionRate} color="emerald" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Incident Trend */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">
                        Incident Trend
                        {crimeFilter !== "All" && <span className="ml-2 text-sm font-medium text-blue-500">({crimeFilter})</span>}
                        {compareMode && <span className="ml-2 text-sm font-medium text-slate-400">vs Previous Period</span>}
                    </h3>
                    {filteredStats.total === 0 ? (
                        <ChartEmptyState />
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={mergedTrend}>
                                <defs>
                                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Area type="monotone" dataKey="count" name="Current" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorReports)" />
                                {compareMode && (
                                    <Area type="monotone" dataKey="previous" name="Previous" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 4" fillOpacity={0} />
                                )}
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Incident Distribution */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">Incident Distribution</h3>
                    {filteredStats.total === 0 ? (
                        <ChartEmptyState />
                    ) : crimeFilter !== "All" ? (
                        <div className="flex flex-col items-center justify-center h-[300px]">
                            <div className="p-4 bg-blue-50 text-blue-600 rounded-full mb-4">
                                <Filter size={40} />
                            </div>
                            <p className="text-slate-500 font-medium text-center max-w-[200px]">
                                Showing isolated data for {crimeFilter}. Filtered to {filteredStats.total} out of {stats.total} total reports
                                ({Math.round(filteredStats.total / Math.max(stats.total, 1) * 100)}%).
                            </p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie data={filteredTypeData} cx="50%" cy="50%" innerRadius={80} outerRadius={100} paddingAngle={5} dataKey="value">
                                    {filteredTypeData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Peak Hours */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <h3 className="text-lg font-bold text-slate-900 mb-4">
                        Peak Activity Times
                        {crimeFilter !== "All" && <span className="ml-2 text-sm font-medium text-blue-500">({crimeFilter})</span>}
                    </h3>
                    {filteredStats.total === 0 ? (
                        <ChartEmptyState />
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={filteredPeakHours}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip />
                                <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} barSize={50} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Crime Map */}
            <CrimeMap reports={allReports} filterType={crimeFilter} filterBarangay={barangayFilter} />
        </div>
    );
}
