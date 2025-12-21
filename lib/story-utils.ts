/**
 * Utility functions for the Story application
 */

/**
 * Calculate the Monday (start of week) for a given date
 * @param date - The date to calculate from (defaults to today)
 * @returns ISO date string (YYYY-MM-DD) for the Monday of that week
 */
export function getWeekStartDate(date: Date = new Date()): string {
  const dayOfWeek = date.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Handle Sunday
  const monday = new Date(date);
  monday.setDate(date.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

/**
 * Sanitize user input to prevent XSS attacks
 * @param input - The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
}

/**
 * Validate message content
 * @param message - The message to validate
 * @param maxLength - Maximum length (default: 1000)
 * @returns Validation result
 */
export function validateMessage(message: string, maxLength: number = 1000): { valid: boolean; error?: string } {
  if (!message || typeof message !== 'string') {
    return { valid: false, error: 'Message is required' };
  }

  const trimmed = message.trim();
  
  if (trimmed.length === 0) {
    return { valid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > maxLength) {
    return { valid: false, error: `Message must be less than ${maxLength} characters` };
  }

  return { valid: true };
}

/**
 * Calculate expiration date (7 days from now)
 * @returns Date object for expiration
 */
export function getExpirationDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

