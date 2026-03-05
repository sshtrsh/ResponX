import { Activity, Bot, MapPin, ShieldAlert, Sparkles, Target, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
    Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import type { HotspotData, TrendData } from "../../../types/stats";
import { calcForecastDelta } from "../utils/calcForecastDelta";
import { MetricCard } from "./MetricCard";

function RiskBar({ risk }: { risk: number }) {
    const [width, setWidth] = useState(0);
    useEffect(() => {
        const timer = setTimeout(() => setWidth(risk), 50);
        return () => clearTimeout(timer);
    }, [risk]);

    return (
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-2">
            <div
                className={`h-full rounded-full transition-all duration-1000 ${risk > 50 ? "bg-red-500" : "bg-amber-500"}`}
                style={{ width: `${width}%` }}
            ></div>
        </div>
    );
}

interface PredictiveTabProps {
    stats: { total: number };
    hotspots: HotspotData[];
    peakDay: string;
    aiInsight: { message: string };
    predictionAccuracy: string | null;
    forecast: { forecast: TrendData[]; total: number };
    trendData: TrendData[];
    clusterLoading: boolean;
}

export function PredictiveTab({ stats, hotspots, peakDay, aiInsight, predictionAccuracy, forecast, trendData, clusterLoading }: PredictiveTabProps) {
    // Merge historical + forecast into one chart dataset
    const forecastChart = useMemo(() => {
        // Take the last 14 days of historical data as context
        const historical = trendData.slice(-14).map((d) => ({
            date: d.date,
            actual: d.count,
            forecast: null as number | null,
        }));

        // Bridge: last historical point connects to first forecast point
        const forecastData = forecast.forecast.map((d) => ({
            date: d.date,
            actual: null as number | null,
            forecast: d.count,
        }));

        // Add a bridge point so the lines connect
        if (historical.length > 0 && forecastData.length > 0) {
            const lastHistorical = historical[historical.length - 1];
            forecastData[0] = {
                ...forecastData[0],
                actual: lastHistorical.actual, // overlap point
            };
        }

        return [...historical, ...forecastData];
    }, [trendData, forecast]);

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <MetricCard icon={Sparkles} label="Next Week Forecast" value={forecast.total > 0 ? forecast.total : "Calculating..."} trend={forecast.total > 0 ? "up" : undefined} trendValue={forecast.total > 0 ? calcForecastDelta(stats.total, forecast.total) : undefined} color="purple" />
                <MetricCard
                    icon={Target}
                    label={
                        <span className="flex items-center gap-2">
                            Prediction Accuracy
                            <span className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0.5 rounded font-bold">BETA</span>
                        </span>
                    }
                    value={
                        <div className="flex flex-col">
                            <span>{predictionAccuracy ?? "Insufficient data"}</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-1 leading-tight">
                                Gathering baseline data for accuracy scoring.
                            </span>
                        </div>
                    }
                    color="blue"
                />
                <MetricCard icon={ShieldAlert} label="Active Zones" value={hotspots.length} color="red" />
                <MetricCard icon={Zap} label="Peak Day Forecast" value={peakDay} color="amber" />
            </div>

            {/* Forecast Chart */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-bold text-slate-900">
                        Trend + 7-Day Forecast
                    </h3>
                    <div className="flex items-center gap-4 text-xs font-medium">
                        <span className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5 bg-blue-500 rounded"></span>
                            Historical
                        </span>
                        <span className="flex items-center gap-1.5">
                            <span className="w-4 h-0.5 bg-purple-500 rounded" style={{ borderTop: "2px dashed #8b5cf6" }}></span>
                            Forecast
                        </span>
                    </div>
                </div>
                {forecastChart.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px] text-slate-400 text-sm font-medium">
                        Insufficient data for forecasting.
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={280}>
                        <AreaChart data={forecastChart}>
                            <defs>
                                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.15} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip />
                            <Area type="monotone" dataKey="actual" name="Historical" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorActual)" connectNulls={false} />
                            <Area type="monotone" dataKey="forecast" name="Forecast" stroke="#8b5cf6" strokeWidth={2.5} strokeDasharray="6 4" fillOpacity={1} fill="url(#colorForecast)" connectNulls={false} />
                        </AreaChart>
                    </ResponsiveContainer>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* AI Analysis Card */}
                <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-xl p-8 text-white shadow-lg shadow-indigo-200 flex flex-col justify-center">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                            <Bot className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-lg font-bold uppercase tracking-wider text-indigo-100">AI Analysis</h2>
                    </div>
                    <blockquote className="text-sm italic text-indigo-100 border-l-4 border-indigo-300 pl-3 py-1 my-2 bg-indigo-900/40 rounded-r-lg">
                        {aiInsight.message}
                    </blockquote>
                    <div className="mt-8 pt-6 border-t border-white/20 flex gap-6 text-sm text-indigo-100 font-medium">
                        <span className="flex items-center gap-2"><Sparkles size={16} /> Based on {stats.total} data points</span>
                        <span className="flex items-center gap-2"><Activity size={16} /> Real-time analysis</span>
                    </div>
                </div>

                {/* Risk Prediction */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold text-slate-900">Risk Prediction by Area</h3>
                    </div>
                    <div className="space-y-6">
                        {clusterLoading ? (
                            <div className="space-y-4">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="h-10 bg-slate-100 rounded-xl animate-pulse" />
                                ))}
                            </div>
                        ) : hotspots.length === 0 ? (
                            <p className="text-slate-400 italic">No clusters found yet.</p>
                        ) : (
                            hotspots.map((spot, idx) => (
                                <div key={idx}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-400" />
                                            <span className="text-sm font-bold text-slate-700">{spot.name}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500">{spot.count} reports</span>
                                            <span className={`text-sm font-bold ${spot.risk > 50 ? "text-red-600" : "text-amber-600"}`}>
                                                {spot.risk}% Risk
                                            </span>
                                        </div>
                                    </div>
                                    <RiskBar risk={spot.risk} />
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
