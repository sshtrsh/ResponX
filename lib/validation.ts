
// lib/validation.ts — Zod schemas and validation helpers for ResponX forms
// Each validator returns { success, data?, errors? } for easy UI integration.

import { z } from "zod";

// ---------------------------------------------------------------------------
// Result type
// ---------------------------------------------------------------------------

export type ValidationResult<T> =
  | { success: true; data: T; errors?: undefined }
  | { success: false; data?: undefined; errors: Record<string, string> };

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid email address"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export const RegisterSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Full name is required")
      .min(2, "Full name must be at least 2 characters"),
    email: z
      .string()
      .min(1, "Email is required")
      .email("Please enter a valid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z
      .string()
      .min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ReportSchema = z.object({
  incidentType: z
    .string()
    .min(1, "Please select an incident type"),
  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(1000, "Description must not exceed 1000 characters"),
  latitude: z
    .number()
    .min(-90, "Invalid latitude")
    .max(90, "Invalid latitude"),
  longitude: z
    .number()
    .min(-180, "Invalid longitude")
    .max(180, "Invalid longitude"),
});

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ReportInput = z.infer<typeof ReportSchema>;

// ---------------------------------------------------------------------------
// Helpers — flatten Zod issues into { fieldName: "first error message" }
// ---------------------------------------------------------------------------

function flattenErrors(error: z.ZodError): Record<string, string> {
  const map: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_root";
    // Keep only the first error per field for cleaner UX
    if (!map[key]) {
      map[key] = issue.message;
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Validators
// ---------------------------------------------------------------------------

export function validateLogin(data: unknown): ValidationResult<LoginInput> {
  const result = LoginSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: flattenErrors(result.error) };
}

export function validateRegister(data: unknown): ValidationResult<RegisterInput> {
  const result = RegisterSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: flattenErrors(result.error) };
}

export function validateReport(data: unknown): ValidationResult<ReportInput> {
  const result = ReportSchema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  return { success: false, errors: flattenErrors(result.error) };
}
