import type { LucideIcon } from "lucide-react";
import {
    Ban,
    CheckCircle2,
    Clock,
    ShieldAlert,
} from "lucide-react";
import type { Priority, Status } from "../../../types/report";

export const getStatusStyle = (
    status: Status
): { color: string; bg: string; icon: LucideIcon; dot: string } => {
    switch (status) {
        case "Verified":
            return {
                color: "text-red-700",
                bg: "bg-red-50 border-red-200",
                icon: ShieldAlert,
                dot: "bg-red-500",
            };
        case "Resolved":
            return {
                color: "text-emerald-700",
                bg: "bg-emerald-50 border-emerald-200",
                icon: CheckCircle2,
                dot: "bg-emerald-500",
            };
        case "Rejected":
            return {
                color: "text-slate-500",
                bg: "bg-slate-100 border-slate-200",
                icon: Ban,
                dot: "bg-slate-400",
            };
        case "Escalated":
            return {
                color: "text-violet-700",
                bg: "bg-violet-50 border-violet-200",
                icon: ShieldAlert,
                dot: "bg-violet-500",
            };
        case "Pending":
        default:
            return {
                color: "text-amber-700",
                bg: "bg-amber-50 border-amber-200",
                icon: Clock,
                dot: "bg-amber-400",
            };
    }
};

export const getPriorityStyle = (priority: Priority) => {
    switch (priority) {
        case "High":
            return {
                label: "HIGH PRIORITY",
                class: "bg-red-600 text-white",
                bar: "bg-red-600",
            };
        case "Medium":
            return {
                label: "MEDIUM PRIORITY",
                class: "bg-orange-500 text-white",
                bar: "bg-orange-500",
            };
        default:
            return {
                label: "LOW PRIORITY",
                class: "bg-slate-400 text-white",
                bar: "bg-slate-400",
            };
    }
};

export const getSopText = (priority: Priority): string => {
    switch (priority) {
        case "High":
            return "CRITICAL: Clear traffic for emergency vehicles. Control crowd distance. Secure area.";
        case "Medium":
            return "MODERATE: Verify incident immediately. Secure area until Police arrive. De-escalate if safe.";
        default:
            return "MINOR: Dispatch Tanod for mediation or warning. Record in Blotter if settled.";
    }
};
