// Centralized week calculation for story system

/**
 * Get the Monday of the current week as YYYY-MM-DD string
 * Week starts on Monday, ends on Sunday
 */
export function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  // Sunday is 0, so we need to go back 6 days
  // Monday is 1, so we need to go back 0 days
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  
  return monday.toISOString().split('T')[0];
}

/**
 * Get expiration date (7 days from now) as Date object
 */
export function getExpirationDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  return expiresAt;
}

/**
 * Check if a date has passed (is expired)
 */
export function isExpired(date: Date | string): boolean {
  const checkDate = typeof date === 'string' ? new Date(date) : date;
  return checkDate < new Date();
}
