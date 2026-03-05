import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { getIncidentColor, TYPE_COLORS } from "../../../constants/incidentTypes";
import type { Report } from "../../../types/report";

// Fix Leaflet default icon paths (Vite doesn't bundle them correctly)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});


/**
 * Forces Leaflet to recalculate tile positions after mount.
 * Fixes the common "grey tiles" glitch when the map container
 * isn't fully visible at initial render time.
 */
function InvalidateSize() {
    const map = useMap();
    useEffect(() => {
        // Small delay to ensure the container has finished its CSS layout
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 200);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
}

/** Automatically pans/zooms to fit all markers */
function FitBounds({ reports }: { reports: Report[] }) {
    const map = useMap();
    useEffect(() => {
        if (reports.length === 0) return;
        const bounds = L.latLngBounds(
            reports.map((r) => [r.latitude!, r.longitude!] as [number, number]),
        );
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    }, [map, reports]);
    return null;
}

interface CrimeMapProps {
    reports: Report[];
    /** Optional: filter to only show one incident type */
    filterType?: string;
    /** Optional: filter to only show one barangay */
    filterBarangay?: string;
}

export function CrimeMap({ reports, filterType, filterBarangay }: CrimeMapProps) {
    const geoReports = useMemo(() => reports.filter((r) => {
        if (!r.latitude || !r.longitude) return false;

        // Filter by incident type
        if (filterType && filterType !== "All" && r.incident_type !== filterType) return false;

        // Filter by barangay
        if (filterBarangay && filterBarangay !== "All") {
            // Check explicit barangay field or check if location includes it
            if (r.barangay) {
                if (r.barangay !== filterBarangay) return false;
            } else if (r.location && !r.location.includes(filterBarangay)) {
                return false;
            }
        }

        return true;
    }), [reports, filterType, filterBarangay]);

    // Default center: Calamba, Laguna (Philippines)
    const defaultCenter: [number, number] = [14.2114, 121.1653];

    // Compute center from data if available
    const center: [number, number] =
        geoReports.length > 0
            ? [
                geoReports.reduce((s, r) => s + (r.latitude ?? 0), 0) / geoReports.length,
                geoReports.reduce((s, r) => s + (r.longitude ?? 0), 0) / geoReports.length,
            ]
            : defaultCenter;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">Crime Hotspot Map</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Reports with coordinates
                    </span>
                    <span className="font-bold text-slate-600">{geoReports.length}</span>
                </div>
            </div>

            <div className="h-[400px] rounded-xl overflow-hidden border border-slate-200 relative">
                {/* MapContainer is always mounted to preserve tile cache and zoom state.
                    Empty state is overlaid on top instead of unmounting the map. */}
                <MapContainer
                    center={center}
                    zoom={13}
                    scrollWheelZoom={true}
                    style={{ height: "100%", width: "100%" }}
                >
                    <InvalidateSize />
                    <FitBounds reports={geoReports} />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <MarkerClusterGroup
                        chunkedLoading
                        maxClusterRadius={40}
                        showCoverageOnHover={false}
                    >
                        {geoReports.map((report) => (
                            <CircleMarker
                                key={report.id}
                                center={[report.latitude!, report.longitude!]}
                                radius={8}
                                pathOptions={{
                                    color: getIncidentColor(report.incident_type),
                                    fillColor: getIncidentColor(report.incident_type),
                                    fillOpacity: 0.7,
                                    weight: 2,
                                }}
                            >
                                <Popup>
                                    <div className="text-xs space-y-1 min-w-[160px]">
                                        <p className="font-bold text-slate-900 text-sm">{report.incident_type}</p>
                                        <p className="text-slate-500">{report.location || "Unknown location"}</p>
                                        <p className="text-slate-400">{new Date(report.created_at).toLocaleDateString()}</p>
                                        <span
                                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${report.status === "Resolved"
                                                ? "bg-emerald-50 text-emerald-600"
                                                : report.status === "Verified"
                                                    ? "bg-red-50 text-red-600"
                                                    : "bg-amber-50 text-amber-600"
                                                }`}
                                        >
                                            {report.status}
                                        </span>
                                    </div>
                                </Popup>
                            </CircleMarker>
                        ))}
                    </MarkerClusterGroup>
                </MapContainer>

                {/* Overlay: shown when no geo-tagged reports match current filter */}
                {geoReports.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 backdrop-blur-sm z-[400] rounded-xl">
                        <p className="text-slate-400 text-sm font-medium">No geo-tagged reports available.</p>
                    </div>
                )}
            </div>

            {/* Legend */}
            {geoReports.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-3">
                    {Object.entries(TYPE_COLORS).map(([type, color]) => {
                        const count = geoReports.filter((r) => r.incident_type === type).length;
                        if (count === 0) return null;
                        return (
                            <span key={type} className="flex items-center gap-1.5 text-[11px] text-slate-500">
                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                                {type} ({count})
                            </span>
                        );
                    })}
                </div>
            )}

            {/* Cluster Styles Injection */}
            <style>
                {`
                    .marker-cluster-small { background-color: rgba(181, 226, 140, 0.6); }
                    .marker-cluster-small div { background-color: rgba(110, 204, 57, 0.6); }
                    .marker-cluster-medium { background-color: rgba(241, 211, 87, 0.6); }
                    .marker-cluster-medium div { background-color: rgba(240, 194, 12, 0.6); }
                    .marker-cluster-large { background-color: rgba(253, 156, 115, 0.6); }
                    .marker-cluster-large div { background-color: rgba(241, 128, 23, 0.6); }
                    .marker-cluster {
                        background-clip: padding-box;
                        border-radius: 20px;
                    }
                    .marker-cluster div {
                        width: 30px;
                        height: 30px;
                        margin-left: 5px;
                        margin-top: 5px;
                        text-align: center;
                        border-radius: 15px;
                        font: 12px "Helvetica Neue", Arial, Helvetica, sans-serif;
                        color: #333;
                        font-weight: bold;
                        line-height: 30px;
                    }
                `}
            </style>
        </div>
    );
}
