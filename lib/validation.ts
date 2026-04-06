// Enterprise-grade input validation using Zod
import { z } from 'zod';

// Email validation schema
export const emailSchema = z.string().email('Invalid email address format');

// Password validation: min 8 chars, at least 1 uppercase, 1 lowercase, 1 number
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one number');

// Phone number validation (Philippines format)
export const phoneSchema = z
  .string()
  .refine(
    (val) => /^(\+63|0)?9\d{9}$/.test(val),
    'Invalid Philippine phone number format'
  );

// Full name validation
export const fullNameSchema = z
  .string()
  .min(2, 'Name must be at least 2 characters')
  .max(100, 'Name must not exceed 100 characters')
  .regex(/^[a-zA-Z\s.'-]+$/, 'Name contains invalid characters');

// Report description validation
export const descriptionSchema = z
  .string()
  .min(10, 'Description must be at least 10 characters')
  .max(2000, 'Description must not exceed 2000 characters');

// Location validation
export const locationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

// Registration form schema
export const registerFormSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  confirmPassword: z.string(),
  fullName: fullNameSchema,
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Login form schema
export const loginFormSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

// Report submission schema
export const reportFormSchema = z.object({
  crimeType: z.string().min(1, 'Incident type is required'),
  description: descriptionSchema,
  location: locationSchema,
  barangay: z.string().min(1, 'Barangay is required'),
  reporterName: z.string().optional(),
  contactNumber: phoneSchema.optional().or(z.literal('')),
  anonymous: z.boolean(),
});

// Helper functions for validation
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const result = passwordSchema.safeParse(password);
  if (!result.success) {
    return { valid: false, errors: result.error.errors.map(e => e.message) };
  }
  return { valid: true, errors: [] };
}

export function validatePhone(phone: string): boolean {
  return phoneSchema.safeParse(phone).success;
}

export type RegisterFormData = z.infer<typeof registerFormSchema>;
export type LoginFormData = z.infer<typeof loginFormSchema>;
export type ReportFormData = z.infer<typeof reportFormSchema>;
