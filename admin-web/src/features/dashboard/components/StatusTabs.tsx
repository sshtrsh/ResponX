import type { StatusFilter } from "../../../types/report";

interface StatusTabsProps {
    tabs: StatusFilter[];
    activeTab: StatusFilter;
    onTabChange: (tab: StatusFilter) => void;
    tabCounts: Record<StatusFilter, number>;
}

export function StatusTabs({ tabs, activeTab, onTabChange, tabCounts }: StatusTabsProps) {
    return (
        <div className="mb-5 flex gap-1.5 overflow-x-auto pb-1">
            {tabs.map((tab) => (
                <button
                    key={tab}
                    onClick={() => onTabChange(tab)}
                    className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${activeTab === tab
                        ? "bg-slate-900 text-white shadow-md"
                        : "border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:text-slate-700"
                        }`}
                >
                    {tab}
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${activeTab === tab ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                        }`}>
                        {tabCounts[tab]}
                    </span>
                </button>
            ))}
        </div>
    );
}
