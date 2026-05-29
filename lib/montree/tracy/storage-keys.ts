// lib/montree/tracy/storage-keys.ts
//
// Astra's localStorage / sessionStorage key namespacing. Every Astra state
// key is scoped by school_id so logging into different schools on the same
// browser never bleeds conversations between them.
//
// CRITICAL — both the cockpit-wide TracyFloat and the /montree/admin chat
// page read/write through this module. If the keys ever diverge, the two
// surfaces will see different conversations even on the same school. Keep
// this single source of truth.
//
// Schema:
//   montree.admin.agentConvId.<schoolId>           — current conversation id
//   montree.admin.agentConv.<schoolId>.<convId>    — turns array for that conv
//   montree.tracyFloat.hasMet.<schoolId>           — first-meeting flag
//   montree.tracyFloat.greetedSession.<schoolId>   — once-per-session greeted flag
//   montree.tracyFloat.open                        — panel open/closed (UI only,
//                                                    not school-scoped)
//
// Old unscoped keys (montree.admin.agentConvId, montree.admin.agentConv.*,
// montree.tracyFloat.hasMet, ...) are now orphaned. Browser eviction handles
// cleanup over time; explicit migration would just be ceremony.

export interface TracyStorageKeys {
  conversationId: string;
  conversation: (convId: string) => string;
  hasMet: string;
  greetedSession: string;
}

export const TRACY_FLOAT_OPEN_KEY = 'montree.tracyFloat.open';

export function tracyKeys(schoolId: string | null | undefined): TracyStorageKeys {
  // Empty/missing schoolId: degrade to a sentinel so different "no school"
  // states still don't bleed into a real school's conversation. In practice
  // we only call tracyKeys() once a schoolId is known, so this branch is a
  // safety net, not a hot path.
  const sid = (schoolId && String(schoolId).trim()) || '_nokey';
  return {
    conversationId: `montree.admin.agentConvId.${sid}`,
    conversation: (convId: string) => `montree.admin.agentConv.${sid}.${convId}`,
    hasMet: `montree.tracyFloat.hasMet.${sid}`,
    greetedSession: `montree.tracyFloat.greetedSession.${sid}`,
  };
}

export function getSchoolIdFromStorage(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('montree_school');
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.id === 'string' && parsed.id) return parsed.id;
    return null;
  } catch {
    return null;
  }
}
