// lib/errorHandler.ts — Centralized error handling for ResponX
// Provides error categorization and a tuple-based async wrapper to avoid try/catch in components.

import { ZodError } from "zod";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ErrorCategory = "NETWORK" | "AUTH" | "VALIDATION" | "SERVER" | "UNKNOWN";

export interface AppError {
  category: ErrorCategory;
  message: string;
  code: string;
}

// ---------------------------------------------------------------------------
// categorizeError
// ---------------------------------------------------------------------------

/**
 * Inspect any thrown value and return a structured AppError
 * with a user-friendly message, a machine-readable code, and a category.
 */
export function categorizeError(error: unknown): AppError {
  const raw = error instanceof Error ? error.message : String(error ?? "");

  // --- NETWORK ----------------------------------------------------------
  if (
    raw.includes("Network request failed") ||
    raw.includes("Failed to fetch") ||
    raw.includes("ERR_NETWORK") ||
    raw.includes("net::") ||
    raw.includes("ECONNREFUSED") ||
    raw.includes("timeout")
  ) {
    return {
      category: "NETWORK",
      message: "Unable to connect. Please check your internet connection and try again.",
      code: "NETWORK_ERROR",
    };
  }

  // --- AUTH -------------------------------------------------------------
  if (
    raw.includes("Invalid login credentials") ||
    raw.includes("invalid_credentials")
  ) {
    return {
      category: "AUTH",
      message: "Incorrect email or password. Please try again.",
      code: "INVALID_CREDENTIALS",
    };
  }

  if (raw.includes("Email not confirmed")) {
    return {
      category: "AUTH",
      message: "Please verify your email address before signing in.",
      code: "EMAIL_NOT_CONFIRMED",
    };
  }

  if (
    raw.includes("Expired token") ||
    raw.includes("JWT expired") ||
    raw.includes("token is expired")
  ) {
    return {
      category: "AUTH",
      message: "Your session has expired. Please sign in again.",
      code: "TOKEN_EXPIRED",
    };
  }

  if (
    raw.includes("User already registered") ||
    raw.includes("already been registered")
  ) {
    return {
      category: "AUTH",
      message: "An account with this email already exists.",
      code: "USER_EXISTS",
    };
  }

  // --- VALIDATION -------------------------------------------------------
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    return {
      category: "VALIDATION",
      message: firstIssue?.message ?? "Please check your input and try again.",
      code: "VALIDATION_ERROR",
    };
  }

  if (
    raw.includes("violates check constraint") ||
    raw.includes("violates unique constraint") ||
    raw.includes("violates foreign key constraint") ||
    raw.includes("duplicate key")
  ) {
    return {
      category: "VALIDATION",
      message: "A validation rule was violated. Please review your input.",
      code: "CONSTRAINT_VIOLATION",
    };
  }

  // --- SERVER -----------------------------------------------------------
  if (
    raw.includes("500") ||
    raw.includes("Internal Server Error") ||
    raw.includes("502") ||
    raw.includes("503") ||
    raw.includes("Service Unavailable")
  ) {
    return {
      category: "SERVER",
      message: "Our servers are temporarily unavailable. Please try again later.",
      code: "SERVER_ERROR",
    };
  }

  // --- UNKNOWN (fallback) -----------------------------------------------
  return {
    category: "UNKNOWN",
    message: "Something went wrong. Please try again.",
    code: "UNKNOWN_ERROR",
  };
}

// ---------------------------------------------------------------------------
// handleAsyncOperation
// ---------------------------------------------------------------------------

/**
 * Wraps a Promise and returns a Go-style tuple [data, error].
 * Eliminates the need for try/catch blocks in component handlers.
 *
 * Usage:
 *   const [data, err] = await handleAsyncOperation(supabase.auth.signInWithPassword({...}));
 *   if (err) { Alert.alert(err.category, err.message); return; }
 */
export async function handleAsyncOperation<T>(
  promise: Promise<T>,
): Promise<[T | null, AppError | null]> {
  try {
    const data = await promise;
    return [data, null];
  } catch (error) {
    return [null, categorizeError(error)];
  }
}
