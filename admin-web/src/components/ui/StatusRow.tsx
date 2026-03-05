interface StatusRowProps {
    label: string;
    count: number;
    color: "red" | "blue" | "emerald" | "slate" | "amber" | "green";
}

const BG_COLORS: Record<string, string> = {
    red: "bg-red-50 text-red-700 border-red-100",
    blue: "bg-blue-50 text-blue-700 border-blue-100",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-100",
    slate: "bg-slate-50 text-slate-700 border-slate-100",
    amber: "bg-amber-50 text-amber-700 border-amber-100",
    green: "bg-green-50 text-green-700 border-green-100",
};

const DOT_COLORS: Record<string, string> = {
    red: "bg-red-500",
    blue: "bg-blue-500",
    emerald: "bg-emerald-500",
    slate: "bg-slate-500",
    amber: "bg-amber-500",
    green: "bg-green-500",
};

export function StatusRow({ label, count, color }: StatusRowProps) {
    return (
        <div className={`flex items-center justify-between p-4 rounded-xl border ${BG_COLORS[color] ?? BG_COLORS.slate}`}>
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${DOT_COLORS[color] ?? DOT_COLORS.slate}`}></div>
                <span className="font-bold text-sm">{label}</span>
            </div>
            <span className="text-lg font-bold">{count}</span>
        </div>
    );
}
