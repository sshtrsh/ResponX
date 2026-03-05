import L from "leaflet";
import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { HotspotZone } from "../utils/hotspotPrediction";
import { RISK_COLORS, TREND_EMOJI } from "../utils/hotspotPrediction";

interface HotspotLayerProps {
  zones: HotspotZone[];
}

export function HotspotLayer({ zones }: HotspotLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || zones.length === 0) return;

    const layers: L.Layer[] = [];

    for (const zone of zones) {
      const color = RISK_COLORS[zone.riskLevel];

      const popupContent = `
              <div style="
                min-width: 192px;         /* 8pt grid: 192 = 24 × 8 */
                font-family: system-ui, sans-serif;
                padding: 4px;             /* inner buffer */
              ">
                <!-- Title: 13px, bold, not uppercase -->
                <div style="
                  font-size: 13px;
                  font-weight: 700;
                  margin-bottom: 8px;     /* 8pt grid */
                  color: #1e293b;
                  line-height: 1.4;
                ">
                  📍 ${zone.label}
                </div>

                <!-- Risk badge + score: tight grouping (8px gap) -->
                <div style="
                  display: flex;
                  align-items: center;
                  gap: 8px;               /* 8pt grid */
                  margin-bottom: 12px;    /* 8pt grid */
                ">
                  <span style="
                    background: ${color};
                    color: #fff;
                    padding: 2px 8px;     /* 8pt grid */
                    border-radius: 999px;
                    font-size: 10px;
                    font-weight: 700;
                    letter-spacing: 0.06em;
                  ">${zone.riskLevel}</span>
                  <span style="font-size: 11px; color: #64748b;">
                    Score: <b>${zone.riskScore}</b>/100
                  </span>
                </div>

                <!-- Data rows: 11px body, key normal weight, value bold -->
                <!-- 8px between rows (proximity rule: same section = tighter) -->
                <table style="
                  font-size: 11px;
                  color: #475569;
                  width: 100%;
                  border-collapse: collapse;
                ">
                  <tr>
                    <td style="padding: 4px 0;">🔥 Top crime</td>
                    <td style="padding: 4px 0; font-weight: 600; text-align: right;">
                      ${zone.dominantIncidentType}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">📅 Last 30 days</td>
                    <td style="padding: 4px 0; font-weight: 600; text-align: right;">
                      ${zone.recentCount} incident${zone.recentCount !== 1 ? "s" : ""}
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 0;">📈 Trend</td>
                    <td style="
                      padding: 4px 0;
                      font-weight: 600;
                      text-align: right;
                      color: ${zone.trend === "rising" ? "#ef4444"
          : zone.trend === "falling" ? "#22c55e"
            : "#64748b"};
                    ">
                      ${TREND_EMOJI[zone.trend]} ${zone.trend.charAt(0).toUpperCase() + zone.trend.slice(1)}
                    </td>
                  </tr>
                </table>

                <!-- Footer: breathing room above, smaller text, muted color -->
                <div style="
                  margin-top: 10px;        /* 8pt grid */
                  padding-top: 8px;        /* 8pt grid */
                  border-top: 1px solid #e2e8f0;
                  font-size: 10px;
                  color: #94a3b8;
                  line-height: 1.4;
                ">
                  Prediction based on weighted historical data
                </div>
              </div>`;

      // LOW = silent 5px dot only — no glow, no label, no large circle
      if (zone.riskLevel === "LOW") {
        const dot = L.circleMarker([zone.lat, zone.lng], {
          radius: 5,                    // 8pt grid: 4px radius = 8px diameter
          color: RISK_COLORS.LOW,
          fillColor: RISK_COLORS.LOW,
          fillOpacity: 0.5,
          weight: 1.5,
        }).addTo(map);
        dot.bindPopup(popupContent, { maxWidth: 220 });
        layers.push(dot);
        continue; // Skip glow, label, large circle for LOW
      }

      // MEDIUM = small circle, no label, subtle glow
      if (zone.riskLevel === "MEDIUM") {
        const circle = L.circle([zone.lat, zone.lng], {
          radius: zone.radius * 0.7,    // Smaller than HIGH/CRITICAL
          color,
          fillColor: color,
          fillOpacity: 0.15,
          weight: 1.5,
          dashArray: "5 5",
        }).addTo(map);
        circle.bindPopup(popupContent, { maxWidth: 220 });
        layers.push(circle);
        continue; // No label for MEDIUM
      }

      // Glow ring — outer, transparent
      const glowRadius = zone.riskLevel === "CRITICAL"
        ? zone.radius * 1.6   // CRITICAL: bigger glow
        : zone.radius * 1.3;  // HIGH: moderate glow

      const glowOpacity = zone.riskLevel === "CRITICAL" ? 0.14 : 0.07;

      const glow = L.circle([zone.lat, zone.lng], {
        radius: glowRadius,
        color,              // ← MUST be `color`, not hardcoded
        fillColor: color,   // ← MUST be `color`, not hardcoded
        fillOpacity: glowOpacity,
        weight: 0,
        className: zone.riskLevel === "CRITICAL" ? "hotspot-critical-pulse" : "",
      }).addTo(map);

      // Main circle
      const circle = L.circle([zone.lat, zone.lng], {
        radius: zone.radius,
        color,
        fillColor: color,
        fillOpacity: zone.riskLevel === "CRITICAL" ? 0.28 : 0.20,
        weight: zone.riskLevel === "CRITICAL" ? 3 : 2.5,    // 8pt grid: 2, 2.5, 3
        dashArray: zone.riskLevel === "CRITICAL"
          ? undefined           // CRITICAL = solid border
          : "10 4",             // HIGH = longer dashes, more visible on dark map
      }).addTo(map);
      circle.bindPopup(popupContent, { maxWidth: 220 });

      // Only HIGH and CRITICAL get floating labels
      if (zone.riskLevel === "HIGH" || zone.riskLevel === "CRITICAL") {
        // Hierarchy Rule: CRITICAL badge is visually heavier than HIGH
        const fontSize = zone.riskLevel === "CRITICAL" ? "11px" : "10px";
        const fontWeight = "800";                  // Always bold for badges
        const paddingY = zone.riskLevel === "CRITICAL" ? "3px" : "2px";  // 8pt grid
        const paddingX = zone.riskLevel === "CRITICAL" ? "10px" : "8px"; // 8pt grid
        const shadow = zone.riskLevel === "CRITICAL"
          ? "0 2px 12px rgba(0,0,0,0.7)"
          : "0 2px 8px rgba(0,0,0,0.5)";

        const icon = L.divIcon({
          className: "",
          html: `
                      <div style="
                        background: ${color};
                        color: #fff;
                        font-size: ${fontSize};
                        font-weight: ${fontWeight};
                        padding: ${paddingY} ${paddingX};
                        border-radius: 999px;
                        white-space: nowrap;
                        box-shadow: ${shadow};
                        border: 1.5px solid rgba(255,255,255,0.30);
                        text-align: center;
                        letter-spacing: 0.06em;
                        pointer-events: none;
                        line-height: 1.4;
                      ">
                        ${zone.riskLevel} ${TREND_EMOJI[zone.trend]}
                      </div>`,
          iconAnchor: [30, 10],  // Centered horizontally, sits just above circle
        });

        const label = L.marker([zone.lat, zone.lng], {
          icon,
          interactive: false,
        }).addTo(map);

        layers.push(glow, circle, label);
      } else {
        layers.push(glow, circle);
      }
    }

    return () => {
      layers.forEach((l) => map.removeLayer(l));
    };
  }, [map, zones]);

  return null;
}
