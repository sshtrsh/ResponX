import { ArrowDown, ArrowUp } from "lucide-react";
import type React from "react";

interface MetricCardProps {
    icon: React.ElementType;
    label: React.ReactNode;
    value: React.ReactNode;
    trend?: "up" | "down";
    trendValue?: string;
    color?: "blue" | "green" | "red" | "amber" | "purple" | "emerald";
}

export function MetricCard({
    icon: Icon,
    label,
    value,
    trend,
    trendValue,
    color = "blue",
}: MetricCardProps) {
    const colorClasses: Record<string, string> = {
        blue: "bg-blue-50 text-blue-600",
        green: "bg-emerald-50 text-emerald-600",
        red: "bg-red-50 text-red-600",
        amber: "bg-amber-50 text-amber-600",
        purple: "bg-purple-50 text-purple-600",
        emerald: "bg-emerald-50 text-emerald-600",
    };

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between">
            <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]}`}>
                    <Icon className="w-6 h-6" />
                </div>
                {trend && (
                    <div className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${trend === "up" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}>
                        {trend === "up" ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {trendValue}
                    </div>
                )}
            </div>
            <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                <div className="text-3xl font-bold text-slate-900 tracking-tight">{value}</div>
            </div>
        </div>
    );
}
