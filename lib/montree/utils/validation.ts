// lib/montree/utils/validation.ts
// Shared validation utilities for Montree API routes

/**
 * Validates UUID format (v1-5)
 * Accepts both uppercase and lowercase hex characters
 */
export function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

/**
 * Validates ISO date format (YYYY-MM-DD or full ISO string)
 * Returns the Date object if valid, null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Calculates age in years from date of birth
 */
export function calculateAge(dateOfBirth: Date): number {
  const today = new Date();
  const ageYears = (today.getTime() - dateOfBirth.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  return Math.floor(ageYears);
}

/**
 * Validates and calculates age from date of birth string
 * Returns { age: number } if valid, { error: string } if invalid
 */
export function validateAndCalculateAge(dateOfBirthStr: string): { age: number } | { error: string } {
  const birthDate = parseDate(dateOfBirthStr);
  if (!birthDate) {
    return { error: 'Invalid date_of_birth format. Use ISO format (YYYY-MM-DD)' };
  }
  return { age: calculateAge(birthDate) };
}

/**
 * Standard error messages for common validation failures
 */
export const ValidationErrors = {
  INVALID_UUID: (field: string) => `Invalid ${field} format`,
  REQUIRED_FIELD: (field: string) => `${field} is required`,
  NOT_FOUND: (resource: string) => `${resource} not found`,
  NO_FIELDS_TO_UPDATE: 'No valid fields to update',
  INVALID_DATE: 'Invalid date_of_birth format. Use ISO format (YYYY-MM-DD)',
} as const;
