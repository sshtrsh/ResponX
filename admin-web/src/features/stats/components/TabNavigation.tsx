import { Activity, BarChart3, Sparkles } from "lucide-react";

interface TabNavigationProps {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export function TabNavigation({ activeTab, setActiveTab }: TabNavigationProps) {
    const tabs = [
        { id: "analytics", label: "Analytics", icon: BarChart3, description: "Historical trends" },
        { id: "predictive", label: "Predictive", icon: Sparkles, description: "AI Forecasts" },
        { id: "realtime", label: "Real-time Stats", icon: Activity, description: "Live metrics" },
    ];

    return (
        <div className="bg-white border-b border-slate-200 mb-6">
            <div className="px-8 py-2">
                <div className="flex gap-1">
                    {tabs.map((tab) => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`
                  flex items-center gap-3 px-6 py-4 relative transition-all
                  ${isActive ? "text-blue-600" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"}
                `}
                            >
                                <div className={`p-2 rounded-lg ${isActive ? "bg-blue-50" : "bg-slate-100"}`}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <div className="text-left">
                                    <div className="font-bold text-sm">{tab.label}</div>
                                    <div className="text-xs opacity-70">{tab.description}</div>
                                </div>
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full"></div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
