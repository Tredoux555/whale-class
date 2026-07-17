'use client';

// components/montree/super-admin/GlobalOutreachTab.tsx
// 🌍 Global Outreach — import + browse + status-manage the Jul-6 global scrape.
//
// Reads via /api/montree/super-admin/global-outreach (by_country | contacts |
// export). Imports via the EXISTING /api/montree/super-admin/outreach
// bulk_import contract. Status changes via the EXISTING campaign-manager PATCH.
//
// Internal super-admin tool — English only, dark-forest T tokens, no styled-jsx.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  red: '#fca5a5',
  redSoft: 'rgba(239,68,68,0.12)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const BATCH_TAG = 'global-scrape-jul2026';
const CHUNK = 400;

const STATUS_OPTIONS = ['new', 'drafted', 'sent', 'replied', 'bounced', 'converted', 'dead', 'follow_up', 'contacted'] as const;

const STATUS_COLOR: Record<string, string> = {
  new: 'rgba(255,255,255,0.45)',
  drafted: '#60a5fa',
  sent: T.emeraldDim,
  replied: T.emerald,
  bounced: T.red,
  converted: T.gold,
  dead: 'rgba(255,255,255,0.30)',
  follow_up: '#c084fc',
  contacted: '#93c5fd',
};

interface CountryRow {
  country: string; total: number; with_email: number;
  new: number; drafted: number; sent: number; replied: number;
  bounced: number; converted: number; dead: number; disadvantaged: number;
}
interface Grand {
  total: number; with_email: number; countries: number;
  sent: number; replied: number; disadvantaged: number;
}
interface Contact {
  id: string; org_name: string; email: string | null;
  country: string | null; region: string | null;
  status: string | null; updated_at: string | null;
  // Social channel (migration 289). Absent (undefined) until 289 runs.
  facebook_url?: string | null; instagram_url?: string | null;
  linkedin_url?: string | null; x_url?: string | null;
  social_status?: string | null; social_notes?: string | null;
}

// Social pipeline states + the tap-to-advance ladder.
const SOCIAL_STATUSES = ['none', 'found', 'invited', 'messaged', 'replied', 'connected', 'dead'] as const;
type SocialStatus = (typeof SOCIAL_STATUSES)[number];
// Advancing tap order (dead sits outside the ladder — reached via the ✕ chip).
const SOCIAL_LADDER: SocialStatus[] = ['found', 'invited', 'messaged', 'replied', 'connected'];
const SOCIAL_COLOR: Record<string, string> = {
  none: 'rgba(255,255,255,0.30)',
  found: '#93c5fd',
  invited: '#60a5fa',
  messaged: '#c084fc',
  replied: T.emerald,
  connected: T.gold,
  dead: 'rgba(255,255,255,0.30)',
};
const nextSocial = (cur: string): SocialStatus => {
  const i = SOCIAL_LADDER.indexOf(cur as SocialStatus);
  if (i === -1) return 'invited'; // from 'none'/'dead' → start inviting
  return SOCIAL_LADDER[Math.min(i + 1, SOCIAL_LADDER.length - 1)];
};

// ── quote-aware CSV parser (no deps) ─────────────────────────────────────────
// Returns an array of string[] rows. Handles "" escapes + commas/newlines
// inside quoted fields.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/^﻿/, ''); // strip BOM
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(field); field = ''; }
      else if (ch === '\r') { /* skip; handled at \n */ }
      else if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
      else field += ch;
    }
  }
  // flush trailing field/row (no final newline)
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows.filter(r => r.length > 1 || (r.length === 1 && r[0].trim() !== ''));
}

const isPlaceholder = (v?: string) => !v || v.trim().toLowerCase() === 'not_found';

interface MappedFile {
  fileName: string;
  contacts: Record<string, unknown>[];
  skipped_dup: number;
  skipped_no_name: number;
  error: string | null;
}

// Map parsed CSV rows → outreach contact objects, given the header row.
function mapRows(fileName: string, rows: string[][], defaultCountry: string): MappedFile {
  if (rows.length < 2) return { fileName, contacts: [], skipped_dup: 0, skipped_no_name: 0, error: 'Empty or header-only file' };
  const header = rows[0].map(h => h.trim().toLowerCase());
  const idx = (name: string) => header.indexOf(name);
  // The Facebook-discovery CSVs use `school_name`; the master CSV uses `school`.
  const iCountry = idx('country');
  const iSchool = idx('school') !== -1 ? idx('school') : idx('school_name');
  const iEmail = idx('email') !== -1 ? idx('email') : idx('email_found_incidentally');
  const iRegion = idx('region'), iCity = idx('city'), iPhone = idx('phone');
  const iWebsite = idx('website'), iSource = idx('source'), iType = idx('type');
  const iFlags = idx('flags'), iNotes = idx('notes');
  // Social columns (both master + discovery CSVs; all optional).
  const iFacebook = idx('facebook_url'), iInstagram = idx('instagram_url');
  const iLinkedin = idx('linkedin_url'), iX = idx('x_url');

  if (iSchool === -1) return { fileName, contacts: [], skipped_dup: 0, skipped_no_name: 0, error: 'No "School" / "school_name" column found in header' };
  if (iCountry === -1 && !defaultCountry.trim()) {
    return { fileName, contacts: [], skipped_dup: 0, skipped_no_name: 0, error: 'No "Country" column — set a Default country and retry' };
  }

  const contacts: Record<string, unknown>[] = [];
  let skipped_dup = 0, skipped_no_name = 0;
  const cell = (r: string[], i: number) => (i >= 0 && i < r.length ? r[i].trim() : '');

  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const school = cell(r, iSchool);
    if (!school) { skipped_no_name++; continue; }

    const flags = cell(r, iFlags);
    const notes = cell(r, iNotes);
    const combined = `${flags} ${notes}`.toUpperCase();
    if (combined.includes('DUP_EMAIL')) { skipped_dup++; continue; }

    const rawEmail = cell(r, iEmail);
    const email = isPlaceholder(rawEmail) || !rawEmail.includes('@') ? '' : rawEmail;
    const rawPhone = cell(r, iPhone);
    const rawWebsite = cell(r, iWebsite);
    const region = cell(r, iRegion);
    const city = cell(r, iCity);
    const mxDead = combined.includes('MX_DEAD');

    // Social URLs — placeholder-guarded (not_found/empty → '').
    const clean = (v: string) => (isPlaceholder(v) ? '' : v);
    const facebook_url = clean(cell(r, iFacebook));
    const instagram_url = clean(cell(r, iInstagram));
    const linkedin_url = clean(cell(r, iLinkedin));
    const x_url = clean(cell(r, iX));
    const hasSocial = !!(facebook_url || instagram_url || linkedin_url || x_url);
    // A row discovered on Facebook (no email) enters the social pipeline at
    // 'found'; everything else stays 'none' (backward compatible with the
    // master CSV, which has no social columns → hasSocial=false).
    const social_status = facebook_url && !email ? 'found' : hasSocial ? 'found' : 'none';

    contacts.push({
      org_name: school,
      email,
      region: city ? (region ? `${region} / ${city}` : city) : region,
      phone: isPlaceholder(rawPhone) ? '' : rawPhone,
      website: isPlaceholder(rawWebsite) ? '' : rawWebsite,
      country: cell(r, iCountry) || defaultCountry.trim(),
      source: cell(r, iSource),
      notes: [flags, notes].filter(Boolean).join('; '),
      contact_type: cell(r, iType).toLowerCase() === 'disadvantaged' ? 'disadvantaged_school' : 'individual_school',
      status: 'new',
      email_status: mxDead ? 'invalid' : 'unknown',
      mx_verified: !!email && !mxDead,
      batch_tag: BATCH_TAG,
      // Social fields (migration 289). Only included when the CSV carried any;
      // absent → these keys are omitted so master-CSV imports are unchanged.
      ...(hasSocial ? { facebook_url, instagram_url, linkedin_url, x_url, social_status } : {}),
    });
  }
  return { fileName, contacts, skipped_dup, skipped_no_name, error: null };
}

// ── Facebook-discovery CSV detection + parse ─────────────────────────────────
// Discovery header: school_name,country,facebook_url,fb_activity,instagram_url,
// linkedin_url,x_url,email_found_incidentally,confidence,notes. These rows
// describe schools that ALREADY EXIST as contacts (imported yesterday), so they
// route to `social_enrich` (match + update) rather than bulk_import.
type EnrichRow = {
  school_name: string; country: string;
  facebook_url: string; instagram_url: string; linkedin_url: string; x_url: string;
  social_notes: string; email: string;
};

function isDiscoveryHeader(rows: string[][]): boolean {
  if (rows.length === 0) return false;
  const h = rows[0].map(c => c.trim().toLowerCase());
  return h.includes('school_name') && h.includes('facebook_url');
}

// Map discovery rows → social_enrich payloads. Placeholder-guarded; a row with
// no school_name is skipped.
function mapDiscoveryRows(rows: string[][], defaultCountry: string): EnrichRow[] {
  if (rows.length < 2) return [];
  const h = rows[0].map(c => c.trim().toLowerCase());
  const idx = (n: string) => h.indexOf(n);
  const iSchool = idx('school_name');
  const iCountry = idx('country');
  const iFb = idx('facebook_url'), iIg = idx('instagram_url');
  const iLi = idx('linkedin_url'), iX = idx('x_url');
  const iEmail = idx('email_found_incidentally') !== -1 ? idx('email_found_incidentally') : idx('email');
  const iNotes = idx('notes');
  const cell = (r: string[], i: number) => (i >= 0 && i < r.length ? r[i].trim() : '');
  const clean = (v: string) => (isPlaceholder(v) ? '' : v);
  const out: EnrichRow[] = [];
  for (let ri = 1; ri < rows.length; ri++) {
    const r = rows[ri];
    const school = cell(r, iSchool);
    if (!school) continue;
    const rawEmail = clean(cell(r, iEmail));
    out.push({
      school_name: school,
      country: cell(r, iCountry) || defaultCountry.trim(),
      facebook_url: clean(cell(r, iFb)),
      instagram_url: clean(cell(r, iIg)),
      linkedin_url: clean(cell(r, iLi)),
      x_url: clean(cell(r, iX)),
      social_notes: clean(cell(r, iNotes)),
      email: rawEmail.includes('@') ? rawEmail : '',
    });
  }
  return out;
}

export default function GlobalOutreachTab({ sessionToken }: { sessionToken: string }) {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [grand, setGrand] = useState<Grand | null>(null);
  const [loadingAgg, setLoadingAgg] = useState(true);
  const [aggError, setAggError] = useState<string | null>(null);
  const [countryTableOpen, setCountryTableOpen] = useState(false);

  // contacts browser
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);
  const [country, setCountry] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [page, setPage] = useState(0);
  const PER = 50;

  // 🤲 Disadvantaged filter — independent boolean, works in either view.
  const [disadvantagedOnly, setDisadvantagedOnly] = useState(false);

  // 📘 Social view
  const [socialView, setSocialView] = useState(false);
  const [socialStatusFilter, setSocialStatusFilter] = useState('');
  const [socialMigrationPending, setSocialMigrationPending] = useState(false);
  const [socialCounts, setSocialCounts] = useState<Record<string, number> | null>(null);

  // import
  const fileRef = useRef<HTMLInputElement>(null);
  const [defaultCountry, setDefaultCountry] = useState('');
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const authHeaders = useMemo(() => ({ 'x-super-admin-token': sessionToken }), [sessionToken]);

  const loadAgg = useCallback(async () => {
    setLoadingAgg(true);
    try {
      const res = await fetch('/api/montree/super-admin/global-outreach?view=by_country', {
        headers: authHeaders, cache: 'no-store',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setCountries(data.countries || []);
      setGrand(data.grand || null);
      setAggError(null);
    } catch (e) {
      setAggError(e instanceof Error ? e.message : 'Failed to load country aggregates');
    } finally {
      setLoadingAgg(false);
    }
  }, [authHeaders]);

  useEffect(() => { loadAgg(); }, [loadAgg]);

  // debounce search
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 400);
    return () => clearTimeout(t);
  }, [q]);

  const loadContacts = useCallback(async () => {
    setLoadingContacts(true);
    try {
      const params = new URLSearchParams({ view: 'contacts', limit: String(PER), offset: String(page * PER) });
      if (country) params.set('country', country);
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
      if (disadvantagedOnly) params.set('disadvantaged', '1');
      if (socialView) {
        params.set('social', '1');
        if (socialStatusFilter) params.set('social_status', socialStatusFilter);
      } else if (statusFilter) {
        params.set('status', statusFilter);
      }
      const res = await fetch(`/api/montree/super-admin/global-outreach?${params.toString()}`, {
        headers: authHeaders, cache: 'no-store',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setContacts(data.contacts || []);
      setTotal(data.total || 0);
      setSocialMigrationPending(!!data.migration_pending);
      setContactsError(null);
    } catch (e) {
      setContactsError(e instanceof Error ? e.message : 'Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  }, [authHeaders, page, country, statusFilter, debouncedQ, socialView, socialStatusFilter, disadvantagedOnly]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // 📘 Social counter strip — refetched when scope / country / social view changes.
  const loadSocialCounts = useCallback(async () => {
    if (!socialView) return;
    try {
      const params = new URLSearchParams({ view: 'social_counts' });
      if (country) params.set('country', country);
      if (disadvantagedOnly) params.set('disadvantaged', '1');
      const res = await fetch(`/api/montree/super-admin/global-outreach?${params.toString()}`, {
        headers: authHeaders, cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      setSocialCounts(data.counts || null);
      if (data.migration_pending) setSocialMigrationPending(true);
    } catch {
      // non-fatal — counter strip just stays blank
    }
  }, [authHeaders, socialView, country, disadvantagedOnly]);

  useEffect(() => { loadSocialCounts(); }, [loadSocialCounts]);

  // reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [country, statusFilter, debouncedQ, socialView, socialStatusFilter, disadvantagedOnly]);

  const changeStatus = async (id: string, newStatus: string) => {
    const prev = contacts;
    setContacts(cs => cs.map(c => (c.id === id ? { ...c, status: newStatus } : c)));
    try {
      const res = await fetch('/api/montree/super-admin/campaign-manager', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      loadAgg();
    } catch {
      setContacts(prev); // revert
    }
  };

  // Advance / set a contact's SOCIAL status (separate from the email `status`).
  const changeSocial = async (id: string, newStatus: string) => {
    const prev = contacts;
    setContacts(cs => cs.map(c => (c.id === id ? { ...c, social_status: newStatus } : c)));
    try {
      const res = await fetch('/api/montree/super-admin/global-outreach', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...authHeaders },
        body: JSON.stringify({ action: 'set_social', id, social_status: newStatus }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      loadSocialCounts();
    } catch (e) {
      setContacts(prev); // revert
      setContactsError(e instanceof Error ? e.message : 'Failed to update social status');
    }
  };

  const doExport = async () => {
    try {
      const params = new URLSearchParams({ view: 'export' });
      if (country) params.set('country', country);
      if (statusFilter) params.set('status', statusFilter);
      const res = await fetch(`/api/montree/super-admin/global-outreach?${params.toString()}`, {
        headers: authHeaders, cache: 'no-store',
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const urlObj = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = urlObj;
      a.download = 'global-outreach-export.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(urlObj);
    } catch (e) {
      setContactsError(e instanceof Error ? e.message : 'Export failed');
    }
  };

  const onFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setImporting(true);
    setImportLog([]);
    const log = (line: string) => setImportLog(prev => [...prev, line]);
    try {
      for (const file of Array.from(files)) {
        let text: string;
        try {
          text = await file.text();
        } catch (e) {
          log(`✗ ${file.name}: could not read file — ${e instanceof Error ? e.message : 'unknown'}`);
          continue;
        }
        const parsed = parseCsv(text);

        // Facebook-discovery CSV → enrich existing rows (never bulk_import).
        if (isDiscoveryHeader(parsed)) {
          const enrichRows = mapDiscoveryRows(parsed, defaultCountry);
          if (enrichRows.length === 0) {
            log(`• ${file.name}: 0 discovery rows with a school_name`);
            continue;
          }
          log(`🔎 ${file.name}: ${enrichRows.length} discovery rows → enriching existing contacts`);
          let matched = 0, updated = 0, ambiguous = 0;
          const unmatched: string[] = [];
          const eChunks = Math.ceil(enrichRows.length / CHUNK);
          for (let ci = 0; ci < eChunks; ci++) {
            const slice = enrichRows.slice(ci * CHUNK, ci * CHUNK + CHUNK);
            try {
              const res = await fetch('/api/montree/super-admin/global-outreach', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', ...authHeaders },
                body: JSON.stringify({ action: 'social_enrich', rows: slice, batch_tag: BATCH_TAG }),
              });
              if (!res.ok) {
                const d = await res.json().catch(() => ({}));
                throw new Error(d.error || `HTTP ${res.status}`);
              }
              const data = await res.json();
              matched += data.matched || 0;
              updated += data.updated || 0;
              ambiguous += data.ambiguous || 0;
              for (const u of (data.unmatched || [])) unmatched.push(u);
              log(`   chunk ${ci + 1}/${eChunks} → ${data.matched || 0} matched, ${data.updated || 0} updated, ${(data.unmatched || []).length} unmatched, ${data.ambiguous || 0} ambiguous`);
            } catch (e) {
              log(`   chunk ${ci + 1}/${eChunks} FAILED: ${e instanceof Error ? e.message : 'unknown'}`);
            }
          }
          log(`✔ ${file.name}: ${matched} matched, ${updated} updated, ${unmatched.length} unmatched, ${ambiguous} ambiguous`);
          if (unmatched.length) {
            log(`   — unmatched (${unmatched.length}) —`);
            unmatched.forEach(u => log(`     ✗ ${u}`));
          }
          continue;
        }

        const mapped = mapRows(file.name, parsed, defaultCountry);
        if (mapped.error) {
          log(`✗ ${file.name}: ${mapped.error}`);
          continue;
        }
        const n = mapped.contacts.length;
        if (n === 0) {
          log(`• ${file.name}: 0 importable rows (skipped ${mapped.skipped_dup} DUP_EMAIL, ${mapped.skipped_no_name} no-name)`);
          continue;
        }
        log(`▶ ${file.name}: ${n} rows to import (skipped ${mapped.skipped_dup} DUP_EMAIL, ${mapped.skipped_no_name} no-name)`);

        let inserted = 0, duplicates = 0, errors = 0;
        const samples: string[] = [];
        const chunks = Math.ceil(n / CHUNK);
        for (let ci = 0; ci < chunks; ci++) {
          const slice = mapped.contacts.slice(ci * CHUNK, ci * CHUNK + CHUNK);
          try {
            const res = await fetch('/api/montree/super-admin/outreach', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', ...authHeaders },
              body: JSON.stringify({ action: 'bulk_import', contacts: slice, source: 'global_scrape_jul2026' }),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              throw new Error(d.error || `HTTP ${res.status}`);
            }
            const data = await res.json();
            inserted += data.inserted || 0;
            duplicates += data.duplicates || 0;
            errors += data.errors || 0;
            for (const s of (data.error_samples || [])) {
              if (samples.length < 5) samples.push(`${s.code || '?'}: ${s.message}`);
            }
            log(`   chunk ${ci + 1}/${chunks} → +${data.inserted || 0} inserted, ${data.duplicates || 0} dup, ${data.errors || 0} err`);
          } catch (e) {
            log(`   chunk ${ci + 1}/${chunks} FAILED: ${e instanceof Error ? e.message : 'unknown'}`);
          }
        }
        log(`✔ ${file.name}: ${inserted} inserted, ${duplicates} duplicates, ${errors} errors`);
        if (samples.length) samples.forEach(s => log(`   ⚠ ${s}`));
      }
      log('— done —');
      loadAgg();
      loadContacts();
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const cardStyle: React.CSSProperties = { background: T.cardBg, border: T.cardBorder, borderRadius: 14, padding: 16 };
  const inputStyle: React.CSSProperties = {
    background: T.inputBg, border: '1px solid rgba(52,211,153,0.25)', borderRadius: 10,
    color: T.textPrimary, padding: '8px 12px', fontSize: 13, outline: 'none', fontFamily: T.sans,
  };
  const totalPages = Math.max(1, Math.ceil(total / PER));

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      {/* (a) Totals strip */}
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        {grand && [
          { label: 'Total contacts', value: grand.total },
          { label: 'With email', value: grand.with_email },
          { label: 'Countries', value: grand.countries },
          { label: 'Sent', value: grand.sent },
          { label: 'Replied', value: grand.replied },
          { label: '🤲 Disadvantaged', value: grand.disadvantaged },
        ].map(s => (
          <div key={s.label} style={{ ...cardStyle, padding: '10px 16px', minWidth: 120 }}>
            <div style={{ fontSize: 22, fontWeight: 600, color: T.emerald, fontFamily: T.serif }}>{s.value.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: T.textSecondary }}>{s.label}</div>
          </div>
        ))}
      </div>

      {aggError && <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.4)', color: T.red, marginBottom: 16 }}>⚠ {aggError}</div>}

      {/* (e) empty-state hint */}
      {!loadingAgg && !aggError && grand && grand.total === 0 && (
        <div style={{ ...cardStyle, borderColor: 'rgba(232,201,106,0.4)', color: T.gold, marginBottom: 16 }}>
          No contacts yet. Import the master CSV
          (<code>docs/outreach/Montree_Global_Master_Jul2026.csv</code>) using the box below.
        </div>
      )}

      {/* (b) Import card */}
      <div style={{ ...cardStyle, borderColor: 'rgba(232,201,106,0.35)', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.gold, marginBottom: 8 }}>📥 Import CSV</div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
          Master format (with a Country column) or per-country format (no Country — set a default below).
          Rows flagged DUP_EMAIL are skipped client-side; MX_DEAD rows import as email_status=invalid.
          <br />🔎 Facebook-discovery CSVs (a <code>school_name</code> + <code>facebook_url</code> header) are auto-detected
          and ENRICH existing rows (match by name+country) instead of importing.
          <br />🚨 Run migration 287 before importing disadvantaged rows.
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,text/csv"
            multiple
            disabled={importing}
            onChange={e => onFiles(e.target.files)}
            style={{ fontSize: 12, color: T.textSecondary }}
          />
          <input
            type="text"
            placeholder="Default country (per-country files)"
            value={defaultCountry}
            onChange={e => setDefaultCountry(e.target.value)}
            disabled={importing}
            style={{ ...inputStyle, minWidth: 220 }}
          />
          {importing && <span style={{ fontSize: 12, color: T.emerald }}>importing…</span>}
        </div>
        {importLog.length > 0 && (
          <pre style={{
            marginTop: 12, background: T.inputBg, border: '1px solid rgba(52,211,153,0.18)', borderRadius: 10,
            padding: 12, fontSize: 11, color: T.textSecondary, maxHeight: 220, overflow: 'auto', whiteSpace: 'pre-wrap',
          }}>{importLog.join('\n')}</pre>
        )}
      </div>

      {/* (c) Country table — collapsible, default collapsed */}
      <div style={{ ...cardStyle, marginBottom: 16, overflowX: 'auto' }}>
        <div
          onClick={() => setCountryTableOpen(o => !o)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: countryTableOpen ? 10 : 0 }}
        >
          <span style={{ color: T.emerald }}>{countryTableOpen ? '▾' : '▸'}</span>
          <span>🌍 By country</span>
          <span style={{ color: T.textMuted, fontWeight: 400 }}>· {countries.length} {countries.length === 1 ? 'country' : 'countries'}</span>
          {loadingAgg && <span style={{ color: T.textMuted, fontWeight: 400 }}>· loading…</span>}
        </div>
        {countryTableOpen && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ color: T.textMuted, textAlign: 'left' }}>
              <th style={{ padding: '6px 8px' }}>Country</th>
              <th style={{ padding: '6px 8px' }}>Total</th>
              <th style={{ padding: '6px 8px' }}>✉️</th>
              <th style={{ padding: '6px 8px' }}>Sent</th>
              <th style={{ padding: '6px 8px' }}>Replied</th>
              <th style={{ padding: '6px 8px' }}>Conv</th>
              <th style={{ padding: '6px 8px' }}>🤲</th>
            </tr>
          </thead>
          <tbody>
            {countries.map(c => (
              <tr
                key={c.country}
                onClick={() => setCountry(c.country === country ? '' : c.country)}
                style={{ cursor: 'pointer', background: c.country === country ? T.emeraldSoft : 'transparent', borderTop: '1px solid rgba(52,211,153,0.08)' }}
              >
                <td style={{ padding: '6px 8px', color: T.textPrimary }}>{c.country}</td>
                <td style={{ padding: '6px 8px' }}>{c.total}</td>
                <td style={{ padding: '6px 8px' }}>{c.with_email}</td>
                <td style={{ padding: '6px 8px' }}>{c.sent}</td>
                <td style={{ padding: '6px 8px', color: c.replied ? T.emerald : undefined }}>{c.replied}</td>
                <td style={{ padding: '6px 8px', color: c.converted ? T.gold : undefined }}>{c.converted}</td>
                <td style={{ padding: '6px 8px' }}>{c.disadvantaged ? <span style={{ color: T.gold }}>{c.disadvantaged}</span> : '—'}</td>
              </tr>
            ))}
            {!loadingAgg && countries.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 12, color: T.textMuted }}>No countries.</td></tr>
            )}
          </tbody>
        </table>
        )}
      </div>

      {/* (d) Contacts browser */}
      <div style={cardStyle}>
        {/* view toggle: 👥 Email contacts / 📘 Social */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { key: false, label: '👥 Contacts' },
            { key: true, label: '📘 Social' },
          ].map(v => (
            <button
              key={String(v.key)}
              onClick={() => setSocialView(v.key)}
              style={{
                ...inputStyle, cursor: 'pointer',
                background: socialView === v.key ? T.emeraldSoft : T.inputBg,
                color: socialView === v.key ? T.emerald : T.textSecondary,
                borderColor: socialView === v.key ? T.emeraldDim : 'rgba(52,211,153,0.2)',
                fontWeight: socialView === v.key ? 600 : 400,
              }}
            >
              {v.label}
            </button>
          ))}
          <button
            onClick={() => setDisadvantagedOnly(v => !v)}
            style={{
              ...inputStyle, cursor: 'pointer',
              background: disadvantagedOnly ? T.emeraldSoft : T.inputBg,
              color: disadvantagedOnly ? T.emerald : T.textSecondary,
              borderColor: disadvantagedOnly ? T.emeraldDim : 'rgba(52,211,153,0.2)',
              fontWeight: disadvantagedOnly ? 600 : 400,
            }}
          >
            🤲 Disadvantaged
          </button>
          {country && (
            <button
              onClick={() => setCountry('')}
              style={{ ...inputStyle, cursor: 'pointer', color: T.emerald, borderColor: T.emeraldDim }}
            >
              {country} ✕
            </button>
          )}
          {!socialView && (
            <button
              onClick={doExport}
              style={{ ...inputStyle, cursor: 'pointer', color: T.gold, borderColor: 'rgba(232,201,106,0.4)', marginLeft: 'auto' }}
            >
              ⬇ Export CSV
            </button>
          )}
        </div>

        {/* 📘 Social counter strip */}
        {socialView && socialCounts && (
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {([
              { key: 'found', label: 'Found' },
              { key: 'invited', label: 'Invited' },
              { key: 'messaged', label: 'Messaged' },
              { key: 'replied', label: 'Replied' },
              { key: 'connected', label: 'Connected' },
            ] as const).map(s => (
              <div key={s.key} style={{
                background: T.inputBg, border: '1px solid rgba(52,211,153,0.18)', borderRadius: 10,
                padding: '6px 12px', minWidth: 76,
              }}>
                <div style={{ fontSize: 18, fontWeight: 600, color: SOCIAL_COLOR[s.key], fontFamily: T.serif }}>
                  {(socialCounts[s.key] || 0).toLocaleString()}
                </div>
                <div style={{ fontSize: 10, color: T.textSecondary }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* search + filter row */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <input
            type="text"
            placeholder="Search name or email…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ ...inputStyle, minWidth: 220 }}
          />
          {socialView ? (
            <select value={socialStatusFilter} onChange={e => setSocialStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">Any social state</option>
              {SOCIAL_STATUSES.filter(s => s !== 'none').map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          ) : (
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
              <option value="">All statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          )}
        </div>

        {socialView && socialMigrationPending && (
          <div style={{ ...cardStyle, borderColor: 'rgba(232,201,106,0.4)', color: T.gold, marginBottom: 10, fontSize: 12 }}>
            🚨 Social columns not present yet — run <code>migrations/289_social_outreach_tracking.sql</code> in Supabase, then re-import the Facebook-discovery CSVs.
          </div>
        )}

        {contactsError && <div style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>⚠ {contactsError}</div>}

        <div style={{ overflowX: 'auto' }}>
          {socialView ? (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: T.textMuted, textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>School</th>
                  <th style={{ padding: '6px 8px' }}>Country</th>
                  <th style={{ padding: '6px 8px' }}>Links</th>
                  <th style={{ padding: '6px 8px' }}>Social status</th>
                  <th style={{ padding: '6px 8px' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => {
                  const ss = c.social_status || 'none';
                  const links: Array<[string, string | null | undefined]> = [
                    ['FB', c.facebook_url], ['IG', c.instagram_url],
                    ['in', c.linkedin_url], ['X', c.x_url],
                  ];
                  return (
                    <tr key={c.id} style={{ borderTop: '1px solid rgba(52,211,153,0.08)' }}>
                      <td style={{ padding: '6px 8px', color: T.textPrimary }}>{c.org_name}</td>
                      <td style={{ padding: '6px 8px' }}>{c.country || '—'}</td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {links.filter(([, u]) => !!u).map(([label, u]) => (
                            <a
                              key={label} href={u as string} target="_blank" rel="noopener noreferrer"
                              style={{ color: T.emerald, textDecoration: 'none', fontSize: 11, borderBottom: `1px solid ${T.emeraldSoft}` }}
                            >
                              {label} ↗
                            </a>
                          ))}
                          {links.every(([, u]) => !u) && <span style={{ color: T.textMuted }}>—</span>}
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px' }}>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <button
                            onClick={() => changeSocial(c.id, nextSocial(ss))}
                            title="Advance social status"
                            style={{
                              ...inputStyle, padding: '3px 10px', fontSize: 11, cursor: 'pointer',
                              color: SOCIAL_COLOR[ss] || T.textPrimary,
                              borderColor: 'rgba(52,211,153,0.25)', background: T.inputBg,
                            }}
                          >
                            {ss} →
                          </button>
                          {ss !== 'dead' && (
                            <button
                              onClick={() => changeSocial(c.id, 'dead')}
                              title="Mark dead"
                              style={{ ...inputStyle, padding: '3px 8px', fontSize: 11, cursor: 'pointer', color: T.red, borderColor: 'rgba(239,68,68,0.3)' }}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '6px 8px', color: T.textMuted }}>{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}</td>
                    </tr>
                  );
                })}
                {!loadingContacts && contacts.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 12, color: T.textMuted }}>
                    {socialMigrationPending ? 'Run migration 289 to enable social tracking.' : 'No schools with a social profile yet. Import the Facebook-discovery CSVs above.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ color: T.textMuted, textAlign: 'left' }}>
                  <th style={{ padding: '6px 8px' }}>School</th>
                  <th style={{ padding: '6px 8px' }}>Email</th>
                  <th style={{ padding: '6px 8px' }}>Country</th>
                  <th style={{ padding: '6px 8px' }}>Region</th>
                  <th style={{ padding: '6px 8px' }}>Status</th>
                  <th style={{ padding: '6px 8px' }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map(c => (
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(52,211,153,0.08)' }}>
                    <td style={{ padding: '6px 8px', color: T.textPrimary }}>{c.org_name}</td>
                    <td style={{ padding: '6px 8px', color: T.textSecondary }}>{c.email || <span style={{ color: T.textMuted }}>—</span>}</td>
                    <td style={{ padding: '6px 8px' }}>{c.country || '—'}</td>
                    <td style={{ padding: '6px 8px', color: T.textSecondary }}>{c.region || '—'}</td>
                    <td style={{ padding: '6px 8px' }}>
                      <select
                        value={c.status || 'new'}
                        onChange={e => changeStatus(c.id, e.target.value)}
                        style={{
                          ...inputStyle, padding: '3px 6px', fontSize: 11,
                          color: STATUS_COLOR[c.status || 'new'] || T.textPrimary,
                          borderColor: 'rgba(52,211,153,0.2)',
                        }}
                      >
                        {STATUS_OPTIONS.map(s => <option key={s} value={s} style={{ color: '#000' }}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '6px 8px', color: T.textMuted }}>{c.updated_at ? new Date(c.updated_at).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
                {!loadingContacts && contacts.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: 12, color: T.textMuted }}>No contacts match.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 12, fontSize: 12, color: T.textSecondary }}>
          <button
            disabled={page === 0 || loadingContacts}
            onClick={() => setPage(p => Math.max(0, p - 1))}
            style={{ ...inputStyle, cursor: page === 0 ? 'default' : 'pointer', opacity: page === 0 ? 0.4 : 1 }}
          >← Prev</button>
          <span>Page {page + 1} / {totalPages} · {total.toLocaleString()} total {loadingContacts && '· loading…'}</span>
          <button
            disabled={page + 1 >= totalPages || loadingContacts}
            onClick={() => setPage(p => p + 1)}
            style={{ ...inputStyle, cursor: page + 1 >= totalPages ? 'default' : 'pointer', opacity: page + 1 >= totalPages ? 0.4 : 1 }}
          >Next →</button>
        </div>
      </div>
    </div>
  );
}
