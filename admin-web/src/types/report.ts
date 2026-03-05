// ── Report Domain Types ──────────────────────────────────────────────────────

export type Status =
    | "Pending"
    | "Verified"
    | "Escalated"
    | "Rejected"
    | "Resolved"
    | "Under Investigation";

export type Priority = "High" | "Medium" | "Low";

export type StatusFilter =
    | "All"
    | "Pending"
    | "Verified"
    | "Escalated"
    | "Rejected"
    | "Resolved";

export type UserRole =
    | "super_admin"
    | "barangay_admin"
    | "police_admin"
    | "resident";

export interface Report {
    id: string;
    incident_type: string;
    location: string;
    status: Status;
    /** Optional — not fetched by stats queries to reduce payload size */
    description?: string;
    reporter_name?: string;
    rejection_reason?: string;
    image_url?: string[];
    created_at: string;
    priority?: Priority;
    latitude?: number;
    longitude?: number;
    actioned_by?: string;
    /** Barangay jurisdiction the report was filed under */
    barangay?: string;
}

export interface RejectModalState {
    isOpen: boolean;
    reportId: string;
    reason: string;
}
