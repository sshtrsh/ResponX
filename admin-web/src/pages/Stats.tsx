import { format } from "date-fns";
import { AlertTriangle, Calendar, Download, FileImage, FileSpreadsheet, FileText, Loader2, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import toast from "react-hot-toast";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { AnalyticsTab } from "../features/stats/components/AnalyticsTab";
import { PredictiveTab } from "../features/stats/components/PredictiveTab";
import { RealtimeTab } from "../features/stats/components/RealtimeTab";
import { TabNavigation } from "../features/stats/components/TabNavigation";
import type { CustomRange } from "../features/stats/hooks/useStatsData";
import { useStatsData } from "../features/stats/hooks/useStatsData";
import { useClickOutside } from "../hooks/useClickOutside";
import { exportToCsv, exportToPdf, exportToPng } from "../lib/exportChart";

export default function Stats() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [timeRange, setTimeRange] = useState("30");
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [customRange, setCustomRange] = useState<CustomRange | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pendingRange, setPendingRange] = useState<{ from?: Date; to?: Date }>({});
  const contentRef = useRef<HTMLDivElement>(null);
  const closeExportMenu = useCallback(() => setShowExportMenu(false), []);
  const exportMenuRef = useClickOutside<HTMLDivElement>(closeExportMenu, showExportMenu);

  const {
    loading,
    stats,
    typeData,
    trendData,
    hotspots,
    recentReports,
    peakDay,
    activeReporters,
    allReports,
    aiInsight,
    forecast,
    predictionAccuracy,
    clusterLoading,
    isConnected,
    spikeAlert,
  } = useStatsData(timeRange, customRange);

  const handleExport = async (type: "pdf" | "png") => {
    if (!contentRef.current) return;
    setExporting(true);
    setShowExportMenu(false);

    try {
      const dateStr = format(new Date(), "yyyy-MM-dd");
      const tabName = activeTab.charAt(0).toUpperCase() + activeTab.slice(1);
      const filename = `ResponX_${tabName}_Report_${dateStr}`;

      if (type === "pdf") {
        await exportToPdf(contentRef.current, `${filename}.pdf`);
        toast.success("PDF report downloaded!");
      } else {
        await exportToPng(contentRef.current, `${filename}.png`);
        toast.success("PNG screenshot downloaded!");
      }
    } catch (err) {
      console.error("Export failed:", err);
      toast.error("Export failed. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const handleCsvExport = () => {
    setShowExportMenu(false);
    const dateStr = format(new Date(), "yyyy-MM-dd");
    exportToCsv(allReports, `ResponX_Data_${dateStr}.csv`);
    toast.success("CSV data downloaded!");
  };

  const handleTimeRangeChange = (value: string) => {
    if (value === "custom") {
      setShowDatePicker(true);
    } else {
      setTimeRange(value);
      setCustomRange(null);
      setShowDatePicker(false);
    }
  };

  const applyCustomRange = () => {
    if (pendingRange.from && pendingRange.to) {
      setCustomRange({ from: pendingRange.from, to: pendingRange.to });
      setTimeRange("custom");
      setShowDatePicker(false);
    }
  };

  const timeRangeLabel = timeRange === "custom" && customRange
    ? `${format(customRange.from, "MMM d")} – ${format(customRange.to, "MMM d, yyyy")}`
    : timeRange === "all" ? "All Time" : `Last ${timeRange} Days`;

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans relative">
      <Sidebar />

      <main className="ml-64 flex-1">
        {/* Spike Alert Banner */}
        {spikeAlert.active && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-3 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
            <span className="text-sm font-bold text-amber-800">
              ⚠️ Unusual activity detected — {spikeAlert.count24h} reports in the last 24h
              ({Math.round(spikeAlert.count24h / Math.max(spikeAlert.avgDaily, 1))}× the daily average of {spikeAlert.avgDaily}).
            </span>
          </div>
        )}

        {/* Header */}
        <header className="bg-white px-8 py-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Command Center Intelligence
              </h1>
              <p className="text-slate-500 mt-1">
                Analytics, predictions, and real-time monitoring.
              </p>
            </div>

            <div className="flex gap-4 items-center">
              {/* Time Range Selector */}
              <div className="relative">
                <select
                  value={timeRange === "custom" ? "custom" : timeRange}
                  onChange={(e) => handleTimeRangeChange(e.target.value)}
                  className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-2 px-3 rounded-lg outline-none focus:border-blue-500 cursor-pointer"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 3 Months</option>
                  <option value="all">All Time</option>
                  <option value="custom">Custom Range</option>
                </select>

                {/* Date Picker Popover */}
                {showDatePicker && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-xl shadow-2xl z-[60] p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-bold text-slate-700">Select Date Range</span>
                      <button onClick={() => setShowDatePicker(false)} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    <DayPicker
                      mode="range"
                      selected={pendingRange.from && pendingRange.to ? { from: pendingRange.from, to: pendingRange.to } : undefined}
                      onSelect={(range) => {
                        if (range) {
                          setPendingRange({ from: range.from, to: range.to });
                        }
                      }}
                      disabled={{ after: new Date() }}
                    />
                    <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={applyCustomRange}
                        disabled={!pendingRange.from || !pendingRange.to}
                        className="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-40"
                      >
                        Apply Range
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium text-slate-700">
                <Calendar className="w-4 h-4 text-slate-500" />
                {timeRange === "custom" && customRange
                  ? timeRangeLabel
                  : format(new Date(), "MMMM d, yyyy")}
              </div>

              {/* Export Button */}
              <div className="relative" title="Exports the currently active tab" ref={exportMenuRef}>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={exporting || loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-900 text-white text-sm font-bold rounded-lg hover:bg-blue-800 transition shadow-md disabled:opacity-50"
                >
                  {exporting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  {exporting ? "Exporting..." : "Download Report"}
                </button>

                {showExportMenu && (
                  <div className="absolute right-0 top-full mt-2 bg-white border border-slate-200 rounded-lg shadow-xl z-50 w-48 overflow-hidden">
                    <button
                      onClick={() => { void handleExport("pdf"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition font-medium"
                    >
                      <FileText className="w-4 h-4 text-red-500" />
                      Export as PDF
                    </button>
                    <button
                      onClick={() => { void handleExport("png"); }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition font-medium border-t border-slate-100"
                    >
                      <FileImage className="w-4 h-4 text-blue-500" />
                      Export as PNG
                    </button>
                    <button
                      onClick={handleCsvExport}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 transition font-medium border-t border-slate-100"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      Export as CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <TabNavigation activeTab={activeTab} setActiveTab={setActiveTab} />

        {loading ? (
          <div className="flex flex-col items-center justify-center h-96 text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin mb-4 text-blue-600" />
            <p className="font-medium">Analyzing crime data...</p>
          </div>
        ) : (
          <div ref={contentRef} className="px-8 pb-12 animate-in fade-in duration-500">
            {activeTab === "analytics" && (
              <ErrorBoundary label="Analytics">
                <AnalyticsTab
                  stats={stats}
                  trendData={trendData}
                  typeData={typeData}
                  aiInsight={aiInsight}
                  allReports={allReports}
                  timeRange={timeRange}
                  onClearTimeRange={() => setTimeRange("30")}
                />
              </ErrorBoundary>
            )}

            {activeTab === "predictive" && (
              <ErrorBoundary label="Predictive">
                <PredictiveTab
                  stats={stats}
                  hotspots={hotspots}
                  peakDay={peakDay}
                  aiInsight={aiInsight}
                  predictionAccuracy={predictionAccuracy}
                  forecast={forecast}
                  trendData={trendData}
                  clusterLoading={clusterLoading}
                />
              </ErrorBoundary>
            )}

            {activeTab === "realtime" && (
              <ErrorBoundary label="Real-time">
                <RealtimeTab
                  stats={stats}
                  activeReporters={activeReporters}
                  recentReports={recentReports}
                  isConnected={isConnected}
                />
              </ErrorBoundary>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
