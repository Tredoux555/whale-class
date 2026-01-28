// lib/montree/auth.ts
// Session 112: Unified auth utility for Montree
// Single source of truth for session management

export const SESSION_KEY = 'montree_session';

// The shape of data stored in localStorage after login
export interface MontreeSession {
  teacher: {
    id: string;
    name: string;
    role: string;
    email?: string;
    password_set?: boolean;
  };
  school: {
    id: string;
    name: string;
    slug: string;
  };
  classroom: {
    id: string;
    name: string;
    age_group: string;
  } | null;
  loginAt: string;
}

// Get session from localStorage (returns null if not found or invalid)
export function getSession(): MontreeSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(SESSION_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored) as MontreeSession;
    
    // Validate required fields
    if (!session.teacher?.id || !session.school?.id) {
      console.warn('Invalid session structure');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to parse session:', error);
    return null;
  }
}

// Save session to localStorage
export function setSession(session: MontreeSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

// Clear session (logout)
export function clearSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(SESSION_KEY);
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return getSession() !== null;
}

// Get classroom ID (commonly needed)
export function getClassroomId(): string | null {
  const session = getSession();
  return session?.classroom?.id || null;
}

// Get teacher ID
export function getTeacherId(): string | null {
  const session = getSession();
  return session?.teacher?.id || null;
}

// Get school ID
export function getSchoolId(): string | null {
  const session = getSession();
  return session?.school?.id || null;
}
