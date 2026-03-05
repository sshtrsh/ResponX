import L from "leaflet";
import "leaflet.heat"; // <--- Import the heatmap plugin
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useState } from "react";
import { LayersControl, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { Sidebar } from "../components/Sidebar";
import { createIncidentIcon } from "../constants/incidentIcons";
import { useAuth } from "../context/AuthContext";
import { HotspotLayer } from "../features/map/components/HotspotLayer";
import { useMapData, type MapReport } from "../features/map/hooks/useMapData";
import { RISK_COLORS, TREND_EMOJI, computeHotspots } from "../features/map/utils/hotspotPrediction";
import { useMapBounds } from "../hooks/useMapBounds";

// Fix Leaflet default icon paths broken by Vite bundling
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// --- CUSTOM HEATMAP COMPONENT ---
// This bridges React state with the Leaflet.heat plugin
function HeatmapLayer({ points }: { points: [number, number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    // @ts-expect-error - Leaflet.heat extends L but Typescript doesn't always know
    const heat = L.heatLayer(points, {
      radius: 25, // How "spread out" the heat is
      blur: 15, // How smooth the gradient is
      maxZoom: 17,
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points]);

  return null;
}

function BoundsFilter({
  reports,
  onFilter,
}: {
  reports: MapReport[];
  onFilter: (visible: MapReport[]) => void;
}) {
  const bounds = useMapBounds();

  useEffect(() => {
    if (!bounds) {
      onFilter(reports);
      return;
    }
    // Add 20% padding around bounds so markers don't pop in/out at edges
    const expanded = bounds.pad(0.2);
    const visible = reports.filter(
      (r) => r.latitude && r.longitude &&
        expanded.contains([r.latitude, r.longitude])
    );
    onFilter(visible);
  }, [bounds, reports, onFilter]);

  return null;
}

// Custom cluster icon — shows count badge
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createClusterIcon = (cluster: any) => {
  const count = cluster.getChildCount();

  // Size scales with count (8pt grid)
  const size = count >= 20 ? 48
    : count >= 10 ? 40
      : 32;

  // Color gets more urgent with count
  const bg = count >= 20 ? "#ef4444"
    : count >= 10 ? "#f97316"
      : "#64748b";

  return L.divIcon({
    html: `
      <div style="
        width: ${size}px;
        height: ${size}px;
        background: ${bg};
        border: 2.5px solid rgba(255,255,255,0.35);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: ${count >= 20 ? "13px" : "11px"};
        font-weight: 800;
        letter-spacing: 0.02em;
        box-shadow: 0 2px 12px rgba(0,0,0,0.5);
      ">${count}</div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

export default function LiveMap() {
  const { role: userRole, jurisdiction: userJurisdiction } = useAuth();
  const [viewMode, setViewMode] = useState<"markers" | "heatmap" | "hybrid">("markers");
  const [showHotspots, setShowHotspots] = useState(true);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [visibleReports, setVisibleReports] = useState<MapReport[]>([]);

  // Filter State
  const [incidentType, setIncidentType] = useState<string>("All");
  const [filterBarangay, setFilterBarangay] = useState<string>("All");
  const [dateRange, setDateRange] = useState<"7" | "14" | "30" | "90" | "all">("30");

  const { reports } = useMapData({
    userRole,
    userJurisdiction: userJurisdiction ?? null,
    incidentType,
    filterBarangay,
    dateRange
  });

  // Unique barangays from reports (for the dropdown)
  const availableBarangays = useMemo(() => {
    const brgys = new Set<string>();
    reports.forEach((r) => {
      if (r.barangay) brgys.add(r.barangay);
      else if (r.location) {
        const parts = r.location.split(",").map(p => p.trim());
        const b = parts[parts.length - 1];
        if (b) brgys.add(b);
      }
    });
    return ["All", ...Array.from(brgys).sort()];
  }, [reports]);

  // Unique incident types for dropdown
  const availableIncidentTypes = useMemo(() => {
    const types = new Set<string>();
    reports.forEach(r => {
      if (r.incident_type) types.add(r.incident_type);
    });
    // Add some common ones even if empty
    ["Fire", "Medical", "Accident", "Assault", "Robbery"].forEach(t => types.add(t));
    return ["All", ...Array.from(types).sort()];
  }, [reports]);
  // 📍 CENTER: Calamba City
  const defaultCenter = [14.2142, 121.1661] as [number, number];

  // --- PREPARE HEATMAP DATA ---
  // Format: [Latitude, Longitude, Intensity (0.0 - 1.0)]
  const heatmapData: [number, number, number][] = useMemo(() =>
    reports.map((r) => [
      r.latitude,
      r.longitude,
      r.status === "Verified" ? 1.0 : 0.5, // Verified incidents burn hotter (Red)
    ]), [reports]);

  // --- HOTSPOT PREDICTION (computed from all loaded reports) ---
  const hotspotZones = useMemo(() => computeHotspots(reports), [reports]);
  const topHotspots = useMemo(() => hotspotZones.slice(0, 5), [hotspotZones]);

  return (
    <div className="flex h-screen bg-slate-900">
      <Sidebar />
      <style>{`
        .custom-leaflet-icon { background: transparent; border: none; }
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.7); }
          70% { box-shadow: 0 0 0 15px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
      `}</style>

      <main className="ml-64 flex-1 relative z-0">
        <ErrorBoundary label="Live Map">
          {/* LEGEND OVERLAY */}
          <div className="absolute top-4 left-16 z-[1000] pointer-events-auto bg-slate-900/90 backdrop-blur text-white px-5 py-4 rounded-xl border border-slate-700 shadow-2xl w-72 transition-all duration-300">
            <div
              className="flex items-center justify-between mb-2 cursor-pointer"
              onClick={() => setIsMinimized(!isMinimized)}
            >
              <h1 className="text-lg font-bold tracking-tight">
                Tactical Command Map
              </h1>
              <button className="text-slate-400 hover:text-white p-1 rounded transition-colors">
                {isMinimized ? "▼" : "▲"}
              </button>
            </div>

            {/* EXPANDABLE CONTENT */}
            {!isMinimized && (
              <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                {/* VIEW MODE TOGGLE */}
                <div className="flex bg-slate-800 p-1 rounded-lg mb-4 mt-2">
                  <button
                    onClick={() => setViewMode("markers")}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === "markers"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      }`}
                  >
                    Markers
                  </button>
                  <button
                    onClick={() => setViewMode("heatmap")}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === "heatmap"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      }`}
                  >
                    Heatmap
                  </button>
                  <button
                    onClick={() => setViewMode("hybrid")}
                    className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all ${viewMode === "hybrid"
                      ? "bg-blue-600 text-white shadow-lg"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-700"
                      }`}
                  >
                    Hybrid
                  </button>
                </div>

                {/* HOTSPOT TOGGLE */}
                <button
                  onClick={() => setShowHotspots((prev) => !prev)}
                  className={`w-full flex justify-between items-center px-3 py-2 rounded-lg text-xs font-bold border transition shadow-sm mb-4 ${showHotspots
                    ? "bg-red-500/20 border-red-500/50 text-red-100"
                    : "bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${showHotspots ? "bg-red-500" : "bg-slate-500"}`} />
                    {showHotspots ? "Hide Hotspots" : "Show Hotspots"}
                  </div>
                  {showHotspots && hotspotZones.length > 0 && (
                    <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px]">
                      {hotspotZones.length}
                    </span>
                  )}
                </button>

                {/* FILTERS */}
                <div className="flex flex-col gap-3 mb-4 pb-4 border-b border-slate-700 text-sm">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Incident Type</label>
                    <select
                      value={incidentType}
                      onChange={(e) => setIncidentType(e.target.value)}
                      className="bg-slate-800 border-none text-white text-sm rounded-lg w-full focus:ring-1 focus:ring-blue-500 py-1.5"
                    >
                      {availableIncidentTypes.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {(!userRole || userRole !== 'barangay_admin') && (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Barangay</label>
                      <select
                        value={filterBarangay}
                        onChange={(e) => setFilterBarangay(e.target.value)}
                        className="bg-slate-800 border-none text-white text-sm rounded-lg w-full focus:ring-1 focus:ring-blue-500 py-1.5"
                      >
                        {availableBarangays.map(b => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Time Range</label>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(e.target.value as "7" | "14" | "30" | "90" | "all")}
                      className="bg-slate-800 border-none text-white text-sm rounded-lg w-full focus:ring-1 focus:ring-blue-500 py-1.5"
                    >
                      <option value="7">Last 7 Days</option>
                      <option value="14">Last 14 Days</option>
                      <option value="30">Last 30 Days</option>
                      <option value="90">Last 90 Days</option>
                      <option value="all">All Time</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-3 text-[10px] font-bold uppercase tracking-wider">
                  {(viewMode === "markers" || viewMode === "hybrid") && (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-600 animate-pulse border border-white/20"></span>
                        Active Threat
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-green-500 border border-white/20"></span>
                        Resolved Case
                      </div>
                    </>
                  )}
                  {(viewMode === "heatmap" || viewMode === "hybrid") && (
                    <div className="flex items-center gap-2 text-orange-400">
                      <div className="w-3 h-3 rounded-full bg-orange-500 blur-sm"></div>
                      Heatmap Density
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* HOTSPOT SUMMARY BAR (Only shows if there are critical/high risk zones + hotspot enabled) */}
          {showHotspots && topHotspots.filter((z) => z.riskLevel === "CRITICAL" || z.riskLevel === "HIGH").length > 0 && (
            <div className="absolute bottom-6 right-6 z-[1000] flex items-center gap-3 px-4 py-3 bg-slate-900/90 backdrop-blur border border-red-500/30 rounded-xl text-sm transition-all animate-in slide-in-from-right-4 shadow-xl">
              <span className="text-red-500 font-bold text-xl">⚠️</span>
              <div className="flex flex-col">
                <span className="text-red-400 font-bold leading-tight">
                  {hotspotZones.filter((z) => z.riskLevel === "CRITICAL").length} Critical,{" "}
                  {hotspotZones.filter((z) => z.riskLevel === "HIGH").length} High-risk
                </span>
                <span className="text-slate-400 text-[10px] leading-tight mt-0.5">
                  Actionable zones detected
                </span>
              </div>
            </div>
          )}

          {/* HOTSPOT LEGEND (Bottom left) */}
          {showHotspots && (
            <div style={{
              position: "absolute",
              bottom: "32px",          // 8pt grid
              left: "16px",            // 8pt grid
              zIndex: 1000,
            }} className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200 shadow-lg pointer-events-none">

              {/* Inner padding: 16px all sides (8pt grid, equal on all sides) */}
              <div className="p-4">

                {/* Section title: small, bold, uppercase, tracked */}
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                  Hotspot Risk
                </p>

                {/* Risk levels: 8px between rows (proximity — same group) */}
                <div className="space-y-2">
                  {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map(level => (
                    <div key={level} className="flex items-center gap-2">
                      {/* Dot: 10px = not 8px, not 12px — 8pt grid allows 10 as midpoint */}
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: RISK_COLORS[level] }}
                      />
                      {/* Label: 11px, medium weight — body hierarchy */}
                      <span className="text-[11px] font-medium text-slate-600">
                        {level}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Separator: 12px above and below (section break, not page break) */}
                <div className="border-t border-slate-100 mt-3 pt-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Trend
                  </p>
                  {/* Trend items: 6px gap (tighter — shorter labels) */}
                  <div className="space-y-1.5">
                    {(["rising", "stable", "falling"] as const).map(t => (
                      <div key={t} className="flex items-center gap-2">
                        <span className="text-[11px]">{TREND_EMOJI[t]}</span>
                        <span className="text-[11px] font-medium text-slate-500 capitalize">
                          {t}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          <MapContainer
            center={defaultCenter}
            zoom={14}
            style={{ height: "100%", width: "100%" }}
          >
            <BoundsFilter reports={reports} onFilter={setVisibleReports} />

            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Tactical (Dark Mode)">
                <TileLayer
                  attribution="&copy; CARTO"
                  url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Street View (Light)">
                <TileLayer
                  attribution="&copy; OpenStreetMap"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* CONDITIONAL LAYERS (Controlled by View Mode Buttons) */}
            {(viewMode === "heatmap" || viewMode === "hybrid") && (
              <HeatmapLayer points={heatmapData} />
            )}

            {/* HOTSPOT PREDICTION OVERLAY — independent toggle */}
            {showHotspots && hotspotZones.length > 0 && (
              <HotspotLayer zones={hotspotZones} />
            )}

            {(viewMode === "markers" || viewMode === "hybrid") && (
              <MarkerClusterGroup
                chunkedLoading
                iconCreateFunction={createClusterIcon}
                maxClusterRadius={60}
                spiderfyOnMaxZoom={true}
                disableClusteringAtZoom={17}
              >
                {visibleReports.map(report => {
                  return (
                    <Marker
                      key={report.id}
                      position={[report.latitude, report.longitude]}
                      icon={createIncidentIcon(report.incident_type, report.status)}
                    >
                      <Popup maxWidth={220}>
                        <div style={{ fontFamily: "system-ui, sans-serif", padding: "4px" }}>
                          {/* Title */}
                          <div style={{
                            fontSize: "13px", fontWeight: 700,
                            color: "#1e293b", marginBottom: "8px"
                          }}>
                            {report.incident_type || "Unknown"}
                          </div>
                          {/* Details */}
                          <table style={{ fontSize: "11px", color: "#475569", width: "100%", borderCollapse: "collapse" }}>
                            <tbody>
                              <tr>
                                <td style={{ padding: "4px 0" }}>📍 Location</td>
                                <td style={{ padding: "4px 0", fontWeight: 600, textAlign: "right" }}>
                                  {report.location || "Unknown"}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: "4px 0" }}>📅 Date</td>
                                <td style={{ padding: "4px 0", fontWeight: 600, textAlign: "right" }}>
                                  {new Date(report.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                              <tr>
                                <td style={{ padding: "4px 0" }}>🏷️ Status</td>
                                <td style={{
                                  padding: "4px 0", fontWeight: 600, textAlign: "right",
                                  color: report.status === "Resolved" ? "#16a34a"
                                    : report.status === "Verified" ? "#dc2626"
                                      : "#d97706"
                                }}>
                                  {report.status}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
              </MarkerClusterGroup>
            )}
          </MapContainer>
        </ErrorBoundary>
      </main>
    </div>
  );
}
