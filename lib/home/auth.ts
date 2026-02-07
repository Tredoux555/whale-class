// lib/home/auth.ts
// Session 155: Home product session management
// Same localStorage pattern as lib/montree/auth.ts

export const HOME_SESSION_KEY = 'home_session';

export interface HomeSession {
  family: {
    id: string;
    name: string;
    email: string;
    plan: string;
  };
  loginAt: string;
}

// Get session from localStorage (returns null if not found or invalid)
export function getHomeSession(): HomeSession | null {
  if (typeof window === 'undefined') return null;

  try {
    const stored = localStorage.getItem(HOME_SESSION_KEY);
    if (!stored) return null;

    const session = JSON.parse(stored) as HomeSession;

    // Validate required fields
    if (!session.family?.id || !session.family?.email) {
      return null;
    }

    return session;
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Failed to parse home session:', err.message);
    }
    return null;
  }
}

// Save session to localStorage
export function setHomeSession(session: HomeSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(HOME_SESSION_KEY, JSON.stringify(session));
}

// Clear session (logout)
export function clearHomeSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(HOME_SESSION_KEY);
}

// Check if user is authenticated
export function isHomeAuthenticated(): boolean {
  return getHomeSession() !== null;
}

// Get family ID (commonly needed)
export function getFamilyId(): string | null {
  const session = getHomeSession();
  return session?.family?.id || null;
}
