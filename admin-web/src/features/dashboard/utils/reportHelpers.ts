import type { Priority, Report, Status, UserRole } from "../../../types/report";

const VALID_STATUSES: Status[] = [
    "Pending",
    "Verified",
    "Escalated",
    "Rejected",
    "Resolved",
    "Under Investigation",
];

const VALID_PRIORITIES: Priority[] = ["High", "Medium", "Low"];

export const isStatus = (value: string): value is Status =>
    VALID_STATUSES.includes(value as Status);

export const isPriority = (value: string): value is Priority =>
    VALID_PRIORITIES.includes(value as Priority);

export const isEditableRole = (role: UserRole): boolean =>
    role === "barangay_admin" || role === "police_admin";

export const getErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "Unexpected error";

export const normalizeReport = (row: Record<string, unknown>): Report => {
    const rowStatus =
        typeof row.status === "string" && isStatus(row.status)
            ? row.status
            : "Pending";
    const rowPriority =
        typeof row.priority === "string" && isPriority(row.priority)
            ? row.priority
            : undefined;

    return {
        id: String(row.id ?? ""),
        incident_type: String(row.incident_type ?? "Unknown"),
        location: String(row.location ?? ""),
        status: rowStatus,
        description: String(row.description ?? ""),
        reporter_name:
            typeof row.reporter_name === "string" ? row.reporter_name : undefined,
        rejection_reason:
            typeof row.rejection_reason === "string"
                ? row.rejection_reason
                : undefined,
        actioned_by:
            typeof row.actioned_by === "string" ? row.actioned_by : undefined,
        image_url: Array.isArray(row.image_url)
            ? (row.image_url as string[])
            : typeof row.image_url === "string"
                ? [row.image_url]
                : undefined,
        created_at: String(row.created_at ?? new Date().toISOString()),
        priority: rowPriority,
    };
};

export const getPriority = (report: Report): Priority => {
    if (report.priority) return report.priority;
    // Match mobile app getPriority() exactly
    if (["Fire", "Medical", "Accident", "Assault", "Homicide", "Kidnapping", "Sexual Assault"].includes(report.incident_type))
        return "High";
    if (["Drugs", "Theft", "Robbery", "Fraud", "Trespassing"].includes(report.incident_type))
        return "Medium";
    return "Low";
};

export const escapeCsvField = (value?: string): string => {
    if (!value) return '""';
    return `"${value.replace(/"/g, '""').replace(/\n/g, " ")}"`;
};

export const matchesSearch = (report: Report, query: string): boolean => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return true;
    return [report.reporter_name ?? "", report.location ?? "", report.incident_type ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalized);
};
