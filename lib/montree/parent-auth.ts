// lib/montree/parent-auth.ts
// Session 116: Parent authentication for Montree

export const PARENT_SESSION_KEY = 'montree_parent_session';

export interface ParentSession {
  parent: {
    id: string;
    name: string;
    email: string;
  };
  school: {
    id: string;
    name: string;
  };
  children: Array<{
    id: string;
    name: string;
    classroom_name: string;
  }>;
  loginAt: string;
}

// Get parent session from localStorage
export function getParentSession(): ParentSession | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(PARENT_SESSION_KEY);
    if (!stored) return null;
    
    const session = JSON.parse(stored) as ParentSession;
    
    if (!session.parent?.id || !session.school?.id) {
      console.warn('Invalid parent session structure');
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to parse parent session:', error);
    return null;
  }
}

// Save parent session
export function setParentSession(session: ParentSession): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PARENT_SESSION_KEY, JSON.stringify(session));
}

// Clear parent session (logout)
export function clearParentSession(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PARENT_SESSION_KEY);
}

// Check if parent is authenticated
export function isParentAuthenticated(): boolean {
  return getParentSession() !== null;
}

// Get parent's children IDs
export function getParentChildIds(): string[] {
  const session = getParentSession();
  return session?.children.map(c => c.id) || [];
}
