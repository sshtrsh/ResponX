const S = {
  Homicide: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5C8.41 2.5 5.5 5.41 5.5 9c0 2.49 1.38 4.66 3.42 5.82L9 17h6l.08-2.18C17.12 13.66 18.5 11.49 18.5 9c0-3.59-2.91-6.5-6.5-6.5z" fill="white"/><circle cx="9.5" cy="9.2" r="1.3" fill="currentColor"/><circle cx="14.5" cy="9.2" r="1.3" fill="currentColor"/><path d="M9.8 12.2c.4.5 1.2.9 2.2.9s1.8-.4 2.2-.9" stroke="currentColor" stroke-width="1" stroke-linecap="round" fill="none"/><rect x="9" y="17" width="1.8" height="3" rx=".4" fill="white"/><rect x="11.1" y="17" width="1.8" height="2.4" rx=".4" fill="white" opacity=".7"/><rect x="13.2" y="17" width="1.8" height="3" rx=".4" fill="white"/></svg>`,
  Robbery: `<svg viewBox="0 0 24 24" fill="none"><rect x="2.5" y="8.5" width="11" height="4.5" rx="1.2" fill="white"/><rect x="13.5" y="9.8" width="7" height="2" rx=".7" fill="white"/><rect x="4.5" y="13" width="3.5" height="5" rx="1" fill="white" opacity=".85"/><path d="M8 10.8Q9.5 14.5 11.5 12.5" stroke="white" stroke-width="1.1" fill="none" stroke-linecap="round"/><path d="M20.5 8L22.5 10.5L20.5 13" stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><line x1="20.5" y1="8" x2="22" y2="8" stroke="white" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  "Sexual Assault": `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="white" stroke-width="2.2" fill="none"/><line x1="7" y1="7" x2="17" y2="17" stroke="white" stroke-width="2.5" stroke-linecap="round"/><line x1="17" y1="7" x2="7" y2="17" stroke="white" stroke-width="2.5" stroke-linecap="round"/></svg>`,
  Kidnapping: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="5.5" r="2.5" fill="white"/><path d="M8.5 10.5Q8.5 8 12 8Q15.5 8 15.5 10.5L15 14.5L9 14.5Z" fill="white"/><rect x="2.5" y="10.5" width="4.5" height="2.2" rx="1.1" fill="none" stroke="white" stroke-width="1.6"/><rect x="17" y="10.5" width="4.5" height="2.2" rx="1.1" fill="none" stroke="white" stroke-width="1.6"/><path d="M2.5 11.6Q1 11.6 1 13.5Q1 15.2 2.5 15.4L7 15.2" stroke="white" stroke-width="1.4" fill="none" stroke-linecap="round"/><rect x="10.2" y="17" width="3.6" height="4" rx=".6" fill="white"/><path d="M10.5 17Q10.5 15 12 15Q13.5 15 13.5 17" stroke="white" stroke-width="1.3" fill="none"/><line x1="5" y1="3.5" x2="7" y2="6.5" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity=".8"/><line x1="19" y1="3.5" x2="17" y2="6.5" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity=".8"/></svg>`,
  Fire: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2C10 5.5 8 8 8 11C8 13 9 14.5 10.2 15.2C9.6 13.4 10.2 11.5 11.2 11C10.5 13.2 12 14.5 12 16.5C12 18 11 19 10 19.5C11 20 13.2 20 14.2 18.8C15.8 17 15.8 14.8 15 12.8C16.2 14 16.8 15.8 16.2 17.5C17.8 15.8 18.2 13.5 17 11.5C15.8 9.5 14.5 8.5 14.5 8.5C14.5 9.8 14 11.2 13 12C14 9.2 13 5.2 12 2Z" fill="white"/><ellipse cx="12" cy="19.8" rx="3.5" ry=".9" fill="white" opacity=".3"/></svg>`,
  Assault: `<svg viewBox="0 0 24 24" fill="none"><rect x="5.5" y="9.5" width="12" height="7" rx="2.5" fill="white"/><rect x="7" y="7" width="2.2" height="2.5" rx=".8" fill="white"/><rect x="10.9" y="6.5" width="2.2" height="3" rx=".8" fill="white"/><rect x="14.8" y="7" width="2.2" height="2.5" rx=".8" fill="white"/><path d="M5.5 11Q3.5 11 3.5 13Q3.5 15.5 5.5 15.5" stroke="white" stroke-width="2" fill="none" stroke-linecap="round"/><line x1="19.5" y1="7" x2="21.5" y2="5" stroke="white" stroke-width="1.8" stroke-linecap="round"/><line x1="20.5" y1="10" x2="22.5" y2="10" stroke="white" stroke-width="1.8" stroke-linecap="round"/><line x1="19.5" y1="13" x2="21.5" y2="15" stroke="white" stroke-width="1.8" stroke-linecap="round"/></svg>`,
  Drugs: `<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="10.2" width="13" height="3.6" rx="1.2" fill="white"/><rect x="1.5" y="9" width="2" height="6" rx=".7" fill="white"/><rect x="16.5" y="10.8" width="5.5" height="2" rx=".8" fill="white"/><path d="M22 11.2L23.2 10.3" stroke="white" stroke-width="1.2" stroke-linecap="round"/><rect x="3.5" y="10.2" width="5.5" height="3.6" rx="1.2" fill="white" opacity=".35"/><line x1="8" y1="10.2" x2="8" y2="8.5" stroke="white" stroke-width="1.1" opacity=".8" stroke-linecap="round"/><line x1="11" y1="10.2" x2="11" y2="8.2" stroke="white" stroke-width="1.1" opacity=".8" stroke-linecap="round"/><line x1="14" y1="10.2" x2="14" y2="8.5" stroke="white" stroke-width="1.1" opacity=".8" stroke-linecap="round"/></svg>`,
  Accident: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5L22.5 20.5L1.5 20.5Z" fill="white"/><rect x="10.8" y="9.5" width="2.4" height="5.5" rx=".6" fill="currentColor"/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/></svg>`,
  Medical: `<svg viewBox="0 0 24 24" fill="none"><rect x="2" y="9" width="15" height="10" rx="1.5" fill="white"/><path d="M17 12L22 12L22 17L17 17Z" fill="white" opacity=".85"/><path d="M17 12L19.5 9L22 9L22 12Z" fill="white" opacity=".7"/><circle cx="6" cy="19.2" r="1.5" fill="white" stroke="currentColor" stroke-width=".8"/><circle cx="14.5" cy="19.2" r="1.5" fill="white" stroke="currentColor" stroke-width=".8"/><rect x="5" y="11.5" width="5.5" height="5.5" rx=".6" fill="currentColor"/><rect x="7" y="12.7" width="1.5" height="3.2" rx=".3" fill="white"/><rect x="5.9" y="13.7" width="3.7" height="1.5" rx=".3" fill="white"/><rect x="8.5" y="7.5" width="2.5" height="1.8" rx=".8" fill="currentColor"/><rect x="12" y="7.5" width="2.5" height="1.8" rx=".8" fill="currentColor"/></svg>`,
  Theft: `<svg viewBox="0 0 24 24" fill="none"><rect x="8.5" y="10" width="9" height="9" rx="1.5" fill="white"/><path d="M10.5 10Q10.5 7 13 7Q15.5 7 15.5 10" stroke="white" stroke-width="1.6" fill="none" stroke-linecap="round"/><rect x="11.5" y="13.2" width="3" height="2.5" rx=".5" fill="currentColor"/><circle cx="13" cy="14.2" r=".7" fill="white"/><path d="M2 13Q4 11 6.5 12L8.5 13.5" stroke="white" stroke-width="1.8" fill="none" stroke-linecap="round"/><line x1="2.5" y1="10.5" x2="4.5" y2="9.5" stroke="white" stroke-width="1.2" opacity=".7" stroke-linecap="round"/><line x1="1.5" y1="13.5" x2="3.5" y2="13.5" stroke="white" stroke-width="1.2" opacity=".7" stroke-linecap="round"/></svg>`,
  Fraud: `<svg viewBox="0 0 24 24" fill="none"><rect x="1.5" y="7" width="15" height="10" rx="1.8" fill="white"/><rect x="1.5" y="9.8" width="15" height="2.5" fill="white" opacity=".35"/><rect x="3.5" y="13.5" width="3.5" height="2.5" rx=".5" fill="currentColor" opacity=".9"/><line x1="9" y1="13.8" x2="13" y2="13.8" stroke="white" stroke-width="1.1" stroke-linecap="round" opacity=".5"/><line x1="9" y1="15.5" x2="12" y2="15.5" stroke="white" stroke-width="1.1" stroke-linecap="round" opacity=".5"/><circle cx="19.5" cy="8.5" r="4" fill="currentColor"/><circle cx="19.5" cy="8.5" r="3.5" stroke="currentColor" stroke-width="1.8" fill="none"/><line x1="17.5" y1="6.5" x2="21.5" y2="10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="21.5" y1="6.5" x2="17.5" y2="10.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,
  Vandalism: `<svg viewBox="0 0 24 24" fill="none"><rect x="7" y="8.5" width="6" height="12" rx="1.8" fill="white"/><rect x="8" y="5.5" width="4" height="3" rx=".5" fill="white" opacity=".85"/><rect x="9" y="3" width="2" height="2.5" rx=".5" fill="white" opacity=".6"/><rect x="13" y="7.5" width="3.5" height="1.5" rx=".5" fill="white"/><circle cx="17.5" cy="6.5" r=".9" fill="white" opacity=".95"/><circle cx="20" cy="5.2" r=".7" fill="white" opacity=".8"/><circle cx="19" cy="8.8" r=".7" fill="white" opacity=".7"/><circle cx="21.2" cy="7.5" r=".55" fill="white" opacity=".6"/><circle cx="17" cy="10" r=".55" fill="white" opacity=".55"/></svg>`,
  Trespassing: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="white" stroke-width="2.2" fill="none"/><line x1="5.2" y1="5.2" x2="18.8" y2="18.8" stroke="white" stroke-width="2.5" stroke-linecap="round"/><circle cx="12" cy="9" r="2.2" fill="white" opacity=".75"/><path d="M8.5 14.5Q8.5 12 12 12Q15.5 12 15.5 14.5L15 17L9 17Z" fill="white" opacity=".75"/></svg>`,
  Others: `<svg viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9.5" stroke="white" stroke-width="2.2" fill="none"/><path d="M9 9.5C9 7.85 10.35 6.5 12 6.5C13.65 6.5 15 7.85 15 9.5C15 11.5 12 12.5 12 14" stroke="white" stroke-width="2.2" fill="none" stroke-linecap="round"/><circle cx="12" cy="17" r="1.2" fill="white"/></svg>`,
};

const incidents = [
  { name: "Homicide", color: "#dc2626", sev: "c", size: 40 },
  { name: "Robbery", color: "#ef4444", sev: "c", size: 40 },
  { name: "Sexual Assault", color: "#ec4899", sev: "c", size: 40 },
  { name: "Kidnapping", color: "#6366f1", sev: "c", size: 40 },
  { name: "Fire", color: "#ef4444", sev: "c", size: 40 },
  { name: "Assault", color: "#f97316", sev: "h", size: 34 },
  { name: "Drugs", color: "#8b5cf6", sev: "h", size: 34 },
  { name: "Accident", color: "#fb923c", sev: "h", size: 34 },
  { name: "Medical", color: "#22c55e", sev: "h", size: 34 },
  { name: "Theft", color: "#eab308", sev: "m", size: 28 },
  { name: "Fraud", color: "#f59e0b", sev: "m", size: 28 },
  { name: "Vandalism", color: "#3b82f6", sev: "m", size: 28 },
  { name: "Trespassing", color: "#64748b", sev: "l", size: 24 },
  { name: "Others", color: "#94a3b8", sev: "l", size: 24 },
];

import L from "leaflet";



export function createIncidentIcon(incidentType?: string, status?: string) {
  const inc = incidents.find(i => i.name === incidentType) || incidents[incidents.length - 1];
  const pad = Math.round(inc.size * 0.16);

  // Scale down shadows for resolved cases
  const isResolved = status === "Resolved";
  const sh = inc.sev === "c"
    ? (isResolved ? "0 2px 8px rgba(0,0,0,.4),0 0 0 2px rgba(255,255,255,.15)" : "0 4px 18px rgba(0,0,0,.65),0 0 0 2.5px rgba(255,255,255,.22)")
    : inc.sev === "h"
      ? "0 3px 12px rgba(0,0,0,.5),0 0 0 2px rgba(255,255,255,.18)"
      : "0 2px 8px rgba(0,0,0,.4),0 0 0 2px rgba(255,255,255,.15)";

  let pulseHtml = '';
  // Giant outer pulse ONLY for Critical + Active (Verified)
  if (inc.sev === "c" && !isResolved) {
    const pw = inc.size + 14;
    pulseHtml = `<div style="width:${pw}px;height:${pw}px;position:absolute;top:-7px;left:-7px;border-color:${inc.color};border-radius:50%;border:2px solid;animation:incident-pulse 2s ease-out infinite;pointer-events:none;"></div>`;
  }

  // Status Badges at Bottom Right
  let statusBadge = '';
  if (status === "Verified") {
    statusBadge = `<div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;background:#dc2626;border:2px solid rgba(255,255,255,0.8);border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.5);animation:incident-pulse 2s infinite;"></div>`;
  } else if (isResolved) {
    statusBadge = `<div style="position:absolute;bottom:-2px;right:-2px;width:12px;height:12px;background:#22c55e;border:2px solid rgba(255,255,255,0.8);border-radius:50%;box-shadow:0 1px 3px rgba(0,0,0,0.5);"></div>`;
  }

  // @ts-expect-error - S is untyped record but valid
  const svgStr = S[inc.name] || S["Others"];

  // Wrap the icon. If resolved, reduce opacity and apply slight grayscale for visual distinction
  const wrapperStyle = `position:relative;display:flex;align-items:center;justify-content:center;width:${inc.size}px;height:${inc.size}px;${isResolved ? "opacity:0.8;filter:grayscale(60%);" : ""}`;

  const html = `
      <div style="${wrapperStyle}">
        ${pulseHtml}
        <div style="width:${inc.size}px;height:${inc.size}px;background:${inc.color};box-shadow:${sh};padding:${pad}px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid rgba(255,255,255,.28);">
          ${svgStr}
        </div>
        ${statusBadge}
      </div>
    `;

  return L.divIcon({
    html,
    className: "",
    iconSize: [inc.size, inc.size],
    iconAnchor: [inc.size / 2, inc.size / 2],
  });
}
