// ── Incident Type Colors ─────────────────────────────────────────────
// Shared between admin-web CrimeMap and mobile app INCIDENT_TYPES.

export const TYPE_COLORS: Record<string, string> = {
    Fire: "#ef4444",
    Medical: "#ef4444",
    Accident: "#f97316",
    Assault: "#f97316",
    Robbery: "#ef4444",
    Homicide: "#dc2626",
    Drugs: "#8b5cf6",
    Theft: "#eab308",
    Vandalism: "#3b82f6",
    Fraud: "#f59e0b",
    "Sexual Assault": "#ec4899",
    Kidnapping: "#6366f1",
    Trespassing: "#64748b",
    Others: "#64748b",
};

const DEFAULT_COLOR = "#3b82f6";

export function getIncidentColor(type: string): string {
    return TYPE_COLORS[type] || DEFAULT_COLOR;
}
