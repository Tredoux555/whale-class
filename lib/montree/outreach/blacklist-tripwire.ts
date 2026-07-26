// lib/montree/outreach/blacklist-tripwire.ts
// Blacklist signup tripwire.
//
// Tredoux keeps a hard blacklist of orgs that rejected his outreach — their
// montree_outreach_contacts rows carry the literal marker `[BLACKLIST]` in the
// `notes` column. If a blacklisted email (or its domain) ever SIGNS UP for
// Montree, he wants an email heads-up.
//
// 🚨 This is PURE observation. It must NEVER block, slow, or fail a signup.
// The caller invokes it fire-and-forget (no await, or `.catch()`), and the
// function itself swallows every error after logging. There is no code path
// here that can throw back into the signup flow.
//
// Direct Supabase call via the service-role client — no internal HTTP hop.

import type { SupabaseClient } from '@supabase/supabase-js';

// Free-mail providers: a shared-domain match would be meaningless (millions of
// unrelated people share gmail.com). For these, only an EXACT email match
// counts — a specific blacklisted person's own address. Non-free-mail domains
// (a school's own domain) still trigger on any address at that domain.
const FREE_MAIL_DOMAINS = new Set([
  'gmail.com',
  'yahoo.com',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  '163.com',
  'qq.com',
]);

// Escape Postgres LIKE/ILIKE wildcards on any interpolated fragment (repo rule).
function escapeLike(fragment: string): string {
  return fragment.replace(/[%_\\]/g, '\\$&');
}

interface TripwireContext {
  email?: string | null;
  schoolName?: string | null;
  schoolId?: string | null;
  source?: string | null;
}

interface OutreachRow {
  org_name: string | null;
  email: string | null;
  notes: string | null;
}

export async function checkBlacklistTripwire(
  supabase: SupabaseClient,
  { email, schoolName, schoolId, source }: TripwireContext
): Promise<void> {
  try {
    const emailLower = (email || '').trim().toLowerCase();
    if (!emailLower || !emailLower.includes('@')) return;

    const domain = emailLower.split('@')[1] || '';
    if (!domain) return;

    const isFreeMail = FREE_MAIL_DOMAINS.has(domain);

    // Build the blacklist lookup. `[BLACKLIST]` contains only literal chars
    // (`[` / `]` are NOT ILIKE wildcards in Postgres), so the marker pattern is
    // a fixed literal — no escaping needed there.
    let query = supabase
      .from('montree_outreach_contacts')
      .select('org_name, email, notes')
      .ilike('notes', '%[BLACKLIST]%')
      .limit(5);

    if (isFreeMail) {
      // Exact (case-insensitive) email match only — no domain fan-out.
      query = query.ilike('email', escapeLike(emailLower));
    } else {
      // Any blacklisted address at this school's own domain. This ILIKE also
      // covers the exact email, so it subsumes the exact-match case.
      query = query.ilike('email', `%@${escapeLike(domain)}`);
    }

    const { data, error } = await query;
    if (error) {
      console.error('[blacklist-tripwire] lookup failed:', error.message);
      return;
    }
    const rows = (data as OutreachRow[] | null) || [];
    if (rows.length === 0) return; // no blacklist hit — the common case

    // Hit — notify Tredoux (same Resend pattern as /founding/join notify).
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.RESEND_FROM_EMAIL;
    if (!resendKey || !fromEmail) {
      console.warn(
        `[blacklist-tripwire] BLACKLIST HIT for ${emailLower} (school ${schoolId ?? 'unknown'}) but Resend env is missing — no email sent.`
      );
      return;
    }

    const orgName = rows[0]?.org_name || '(unknown org)';
    const matchLines = rows
      .map((r) => {
        const noteSnippet = (r.notes || '').replace(/\s+/g, ' ').trim().slice(0, 300);
        return `  • ${r.org_name || '(no name)'} <${r.email || 'no email'}>\n    notes: ${noteSnippet || '(none)'}`;
      })
      .join('\n');

    const body =
      `⛔ A blacklisted contact just signed up for Montree.\n\n` +
      `New signup:\n` +
      `  School: ${schoolName || '(not provided)'}\n` +
      `  School ID: ${schoolId || '(unknown)'}\n` +
      `  Email: ${emailLower}\n` +
      `  Source: ${source || '(unknown)'}\n` +
      `  Time: ${new Date().toISOString()}\n\n` +
      `Matched blacklist row(s) (${rows.length}):\n${matchLines}\n\n` +
      `These orgs previously rejected outreach and are marked [BLACKLIST] in montree_outreach_contacts.`;

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${resendKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: fromEmail,
        to: 'tredoux555@gmail.com',
        subject: `⛔ Blacklisted contact signed up: ${orgName}`,
        text: body,
      }),
    }).catch((err) => console.error('[blacklist-tripwire] notify email failed:', err));
  } catch (err) {
    // Never throw — the caller is a signup success path.
    console.error('[blacklist-tripwire] threw:', err);
  }
}
