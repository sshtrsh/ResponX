import {
    Activity,
    AlertCircle,
    CheckCircle2,
    Clock,
    ShieldAlert,
} from "lucide-react";
import type React from "react";

interface KpiItem {
    label: string;
    value: number;
    icon: React.ElementType;
    accent: string;
    text: string;
    sub: string;
    iconColor: string;
}

interface KpiBarProps {
    totalCount: number;
    pendingCount: number;
    escalatedCount: number;
    resolvedCount: number;
    criticalCount: number;
}

export function KpiBar({ totalCount, pendingCount, escalatedCount, resolvedCount, criticalCount }: KpiBarProps) {
    const items: KpiItem[] = [
        { label: "Total Reports", value: totalCount, icon: Activity, accent: "border-l-slate-400", text: "text-slate-800", sub: "text-slate-500", iconColor: "text-slate-400 bg-slate-100" },
        { label: "Pending", value: pendingCount, icon: Clock, accent: "border-l-amber-400", text: "text-amber-800", sub: "text-amber-500", iconColor: "text-amber-500 bg-amber-50" },
        { label: "Escalated", value: escalatedCount, icon: ShieldAlert, accent: "border-l-violet-500", text: "text-violet-800", sub: "text-violet-500", iconColor: "text-violet-500 bg-violet-50" },
        { label: "Resolved", value: resolvedCount, icon: CheckCircle2, accent: "border-l-emerald-500", text: "text-emerald-800", sub: "text-emerald-500", iconColor: "text-emerald-500 bg-emerald-50" },
        { label: "Critical", value: criticalCount, icon: AlertCircle, accent: "border-l-red-500", text: "text-red-800", sub: "text-red-400", iconColor: "text-red-500 bg-red-50" },
    ];

    return (
        <section className="mb-6 grid grid-cols-5 gap-3">
            {items.map(({ label, value, icon: Icon, accent, text, sub, iconColor }) => (
                <div key={label} className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm border-l-4 ${accent} flex items-center gap-3`}>
                    <div className={`rounded-lg p-2 ${iconColor}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-wider ${sub}`}>{label}</p>
                        <p className={`text-2xl font-extrabold leading-tight ${text}`}>{value}</p>
                    </div>
                </div>
            ))}
        </section>
    );
}
