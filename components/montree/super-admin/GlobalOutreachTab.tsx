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
}

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
  const iCountry = idx('country'), iSchool = idx('school'), iEmail = idx('email');
  const iRegion = idx('region'), iCity = idx('city'), iPhone = idx('phone');
  const iWebsite = idx('website'), iSource = idx('source'), iType = idx('type');
  const iFlags = idx('flags'), iNotes = idx('notes');

  if (iSchool === -1) return { fileName, contacts: [], skipped_dup: 0, skipped_no_name: 0, error: 'No "School" column found in header' };
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
    });
  }
  return { fileName, contacts, skipped_dup, skipped_no_name, error: null };
}

export default function GlobalOutreachTab({ sessionToken }: { sessionToken: string }) {
  const [countries, setCountries] = useState<CountryRow[]>([]);
  const [grand, setGrand] = useState<Grand | null>(null);
  const [loadingAgg, setLoadingAgg] = useState(true);
  const [aggError, setAggError] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

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

  // import
  const fileRef = useRef<HTMLInputElement>(null);
  const [defaultCountry, setDefaultCountry] = useState('');
  const [importing, setImporting] = useState(false);
  const [importLog, setImportLog] = useState<string[]>([]);

  const authHeaders = useMemo(() => ({ 'x-super-admin-token': sessionToken }), [sessionToken]);

  const loadAgg = useCallback(async () => {
    setLoadingAgg(true);
    try {
      const res = await fetch(`/api/montree/super-admin/global-outreach?view=by_country${showAll ? '&all=1' : ''}`, {
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
  }, [authHeaders, showAll]);

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
      if (showAll) params.set('all', '1');
      if (country) params.set('country', country);
      if (statusFilter) params.set('status', statusFilter);
      if (debouncedQ.trim()) params.set('q', debouncedQ.trim());
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
      setContactsError(null);
    } catch (e) {
      setContactsError(e instanceof Error ? e.message : 'Failed to load contacts');
    } finally {
      setLoadingContacts(false);
    }
  }, [authHeaders, page, country, statusFilter, debouncedQ, showAll]);

  useEffect(() => { loadContacts(); }, [loadContacts]);

  // reset to page 0 when filters change
  useEffect(() => { setPage(0); }, [country, statusFilter, debouncedQ, showAll]);

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

  const doExport = async () => {
    try {
      const params = new URLSearchParams({ view: 'export' });
      if (showAll) params.set('all', '1');
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
        <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textSecondary, marginLeft: 'auto', cursor: 'pointer' }}>
          <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} style={{ accentColor: T.emerald }} />
          All contacts (widen beyond this scrape)
        </label>
      </div>

      {aggError && <div style={{ ...cardStyle, borderColor: 'rgba(239,68,68,0.4)', color: T.red, marginBottom: 16 }}>⚠ {aggError}</div>}

      {/* (e) empty-state hint */}
      {!loadingAgg && !aggError && grand && grand.total === 0 && !showAll && (
        <div style={{ ...cardStyle, borderColor: 'rgba(232,201,106,0.4)', color: T.gold, marginBottom: 16 }}>
          No contacts in this scrape yet. Import the master CSV
          (<code>docs/outreach/Montree_Global_Master_Jul2026.csv</code>) using the box below.
        </div>
      )}

      {/* (b) Import card */}
      <div style={{ ...cardStyle, borderColor: 'rgba(232,201,106,0.35)', marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: T.gold, marginBottom: 8 }}>📥 Import CSV</div>
        <div style={{ fontSize: 12, color: T.textSecondary, marginBottom: 10 }}>
          Master format (with a Country column) or per-country format (no Country — set a default below).
          Rows flagged DUP_EMAIL are skipped client-side; MX_DEAD rows import as email_status=invalid.
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

      {/* (c) Country table */}
      <div style={{ ...cardStyle, marginBottom: 16, overflowX: 'auto' }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>🌍 By country {loadingAgg && <span style={{ color: T.textMuted, fontWeight: 400 }}>· loading…</span>}</div>
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
      </div>

      {/* (d) Contacts browser */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 600 }}>👥 Contacts</div>
          <input
            type="text"
            placeholder="Search name or email…"
            value={q}
            onChange={e => setQ(e.target.value)}
            style={{ ...inputStyle, minWidth: 220 }}
          />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={inputStyle}>
            <option value="">All statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          {country && (
            <button
              onClick={() => setCountry('')}
              style={{ ...inputStyle, cursor: 'pointer', color: T.emerald, borderColor: T.emeraldDim }}
            >
              {country} ✕
            </button>
          )}
          <button
            onClick={doExport}
            style={{ ...inputStyle, cursor: 'pointer', color: T.gold, borderColor: 'rgba(232,201,106,0.4)', marginLeft: 'auto' }}
          >
            ⬇ Export CSV
          </button>
        </div>

        {contactsError && <div style={{ color: T.red, fontSize: 12, marginBottom: 10 }}>⚠ {contactsError}</div>}

        <div style={{ overflowX: 'auto' }}>
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
