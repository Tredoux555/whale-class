// lib/montree/parent-emails.ts
// audit-fix (Jun 2026): the three report "send" routes queried a table that
// has NEVER existed (`montree_child_parent_links` with a `parent_email`
// column). The real schema is `montree_parent_children` (parent_id↔child_id)
// joined to `montree_parents` (which holds the email). Because the queries
// failed SILENTLY, reports were saved and marked "sent" while **no parent
// ever received an email**. This helper is the single correct lookup.

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface ParentEmailLink {
  child_id: string;
  parent_email: string;
  relationship: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Resolve the parent email addresses for a set of children.
 * Respects `can_view_reports` (a parent who may not view reports gets no
 * report email) and `is_active` on the parent account.
 */
export async function getParentEmailLinks(
  supabase: SupabaseClient,
  childIds: string[]
): Promise<ParentEmailLink[]> {
  if (!childIds.length) return [];

  const { data: links, error: linkErr } = await supabase
    .from('montree_parent_children')
    .select('child_id, parent_id, relationship, can_view_reports')
    .in('child_id', childIds);

  if (linkErr) {
    console.error('[parent-emails] link lookup failed:', linkErr.message);
    return [];
  }
  const viewable = (links || []).filter((l: any) => l.can_view_reports !== false);
  const parentIds = [...new Set(viewable.map((l: any) => l.parent_id).filter(Boolean))];
  if (!parentIds.length) return [];

  const { data: parents, error: parentErr } = await supabase
    .from('montree_parents')
    .select('id, email, is_active')
    .in('id', parentIds);

  if (parentErr) {
    console.error('[parent-emails] parent lookup failed:', parentErr.message);
    return [];
  }

  const emailById = new Map<string, string>();
  for (const p of parents || []) {
    if (p.is_active !== false && typeof p.email === 'string' && EMAIL_RE.test(p.email)) {
      emailById.set(p.id, p.email.trim().toLowerCase());
    }
  }

  const out: ParentEmailLink[] = [];
  for (const l of viewable) {
    const email = emailById.get(l.parent_id);
    if (email) {
      out.push({ child_id: l.child_id, parent_email: email, relationship: l.relationship || 'parent' });
    }
  }
  return out;
}

/** Convenience: just the unique email list for one child. */
export async function getParentEmailsForChild(
  supabase: SupabaseClient,
  childId: string
): Promise<string[]> {
  const links = await getParentEmailLinks(supabase, [childId]);
  return [...new Set(links.map((l) => l.parent_email))];
}
