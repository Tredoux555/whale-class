// scripts/outreach-import-v2.mjs
//
// Outreach V2.1 one-time importer (binding contract:
// docs/outreach/PLAN_OUTREACH_V2_1_JUL14.md §3).
//
// Folds the four Jul-12 enrichment/scrape artifacts + the master .md doc + the
// 5 WS1 hub rows into the system-of-record `montree_outreach_contacts`. Every
// step is idempotent and FILL-EMPTY (never overwrites a non-null email/url —
// mirrors the `social_enrich` semantics), matched by lower(trim(org_name)) +
// country.  Re-running produces no new changes.
//
// 🚨 Requires migration 294 to have run (adds segment/verification/etc.). A
// real or --dry-run pass SELECTs the new columns; if 294 hasn't run it 42703s.
//
// Modes:
//   --offline           No DB at all. Parse every source + masterdoc and print
//                       counts. Used for sandbox verification. (masterdoc
//                       absent → warn + skip, never crash.)
//   --dry-run           Connect, load existing rows, compute planned
//                       inserts/updates/skips, print them + totals, write
//                       NOTHING (no DB writes, no report CSV).
//   (no flag)           Connect, apply, write docs/outreach/v2-import-report-
//                       jul14.csv, print totals.
//   --masterdoc <path>  Override the master .md path (default
//                       ~/Downloads/MONTREE_GLOBAL_MONTESSORI_SCHOOLS_MASTER_DATABASE_COMPLETE.md).
//
// Pooler connection follows the repo pattern (seed-global-visual-memory.mjs):
//   host aws-1-ap-southeast-1.pooler.supabase.com:5432, user
//   postgres.dmfncjjtsoxrnvcdnvjq, password from SUPABASE_DB_PASSWORD or the
//   .env.local DATABASE_URL.

import { Client } from 'pg';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.join(__dirname, '..');
const OUTREACH_DIR = path.join(REPO, 'docs', 'outreach');

const OFFLINE = process.argv.includes('--offline');
const DRY_RUN = process.argv.includes('--dry-run');

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null;
}
const MASTERDOC_PATH =
  argValue('--masterdoc') ||
  path.join(os.homedir(), 'Downloads', 'MONTREE_GLOBAL_MONTESSORI_SCHOOLS_MASTER_DATABASE_COMPLETE.md');

const SOURCES = {
  enrich: path.join(OUTREACH_DIR, 'enrichment', 'enrich-emails-jul12.csv'),
  mx: path.join(OUTREACH_DIR, 'enrichment', 'mx-check-jul12.csv'),
  footprint: path.join(OUTREACH_DIR, 'enrichment', 'disadvantaged-footprint-jul12.csv'),
  underpriv: path.join(OUTREACH_DIR, 'underprivileged', 'UNDERPRIV_MASTER_RANKED_JUL12.csv'),
};
const REPORT_PATH = path.join(OUTREACH_DIR, 'v2-import-report-jul14.csv');

// ── tiny helpers ────────────────────────────────────────────────────────────

const norm = (s) => (s == null ? '' : String(s)).trim().toLowerCase();
const key = (org, country) => `${norm(org)}||${norm(country)}`;
const isEmail = (s) => typeof s === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.trim());
const isEmpty = (v) => v == null || String(v).trim() === '';

function emailDomain(email) {
  if (!isEmail(email)) return null;
  return email.trim().toLowerCase().split('@')[1];
}

// Canonical email identity key (lower(trim)). Null for non-emails.
function emailKey(email) {
  return isEmail(email) ? email.trim().toLowerCase() : null;
}

// First non-empty value, trimmed. Null if all empty.
function firstNonEmpty(...vals) {
  for (const v of vals) if (!isEmpty(v)) return String(v).trim();
  return null;
}

// WARN-2 coercion for the underpriv `montessori_related` cell:
//   yes → true, no → false, 'partial'/blank/anything-else → null (leave unset).
function coerceMontessori(raw) {
  const t = norm(raw);
  if (t === 'yes') return true;
  if (t === 'no') return false;
  return null;
}

// Parse a free-text follower estimate to an int ONLY when cleanly numeric
// (optionally a k/m suffix and a "likes"/"followers" word). Messy multi-value
// strings ("FB 137K + 92K …") return null on purpose.
function parseFollowers(raw) {
  if (isEmpty(raw)) return null;
  const s = String(raw).trim();
  const m = s.match(/^([\d,]+)(?:\.(\d+))?\s*([km])?\s*(?:likes|followers|fans)?\.?$/i);
  if (!m) return null;
  let n = parseInt(m[1].replace(/,/g, ''), 10);
  if (!Number.isFinite(n)) return null;
  const frac = m[2] ? parseFloat('0.' + m[2]) : 0;
  const suffix = (m[3] || '').toLowerCase();
  if (suffix === 'k') n = Math.round((n + frac) * 1000);
  else if (suffix === 'm') n = Math.round((n + frac) * 1000000);
  return n;
}

// clamp(ceil(strength/2), 1, 5)
function responsivenessFromStrength(raw) {
  const st = parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(st)) return null;
  return Math.min(5, Math.max(1, Math.ceil(st / 2)));
}

// ── minimal CSV parser (RFC-4180-ish: quotes, embedded commas + newlines) ────

function parseCsv(text) {
  const rows = [];
  let field = '';
  let record = [];
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      record.push(field); field = '';
    } else if (c === '\r') {
      // swallow; \n handles the break
    } else if (c === '\n') {
      record.push(field); field = '';
      if (record.length > 1 || record[0] !== '') rows.push(record);
      record = [];
    } else field += c;
  }
  if (field !== '' || record.length) { record.push(field); rows.push(record); }
  return rows;
}

function readCsvDict(file) {
  if (!fs.existsSync(file)) return [];
  const rows = parseCsv(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (r.length === 1 && r[0].trim() === '') continue;
    const obj = {};
    header.forEach((h, j) => { obj[h] = r[j] != null ? r[j] : ''; });
    out.push(obj);
  }
  return out;
}

// ── source parsers (pure — used by every mode) ──────────────────────────────

function parseEnrich() { return readCsvDict(SOURCES.enrich); }
function parseFootprint() { return readCsvDict(SOURCES.footprint); }
function parseUnderpriv() { return readCsvDict(SOURCES.underpriv); }

function parseMx() {
  const rows = readCsvDict(SOURCES.mx);
  const dead = new Set();
  const revived = new Set();
  for (const r of rows) {
    const domain = norm(r.domain);
    const status = norm(r.status);
    if (!domain) continue;
    if (status === 'dead' || status === 'dead_confirmed') dead.add(domain);
    else if (status === 'revived') revived.add(domain);
  }
  return { rows: rows.length, dead, revived };
}

// Conservative markdown-table parser. Returns [{org_name,country,website,
// email,facebook_url,raw}]. Skips header/separator/total/region-heading rows
// and non-org-like first cells.
function parseMasterdoc(file) {
  if (!fs.existsSync(file)) {
    return { present: false, rows: [] };
  }
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  const out = [];
  let heading = '';
  const isSep = (cells) => cells.length && cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
  const splitRow = (line) => {
    let t = line.trim();
    if (t.startsWith('|')) t = t.slice(1);
    if (t.endsWith('|')) t = t.slice(0, -1);
    return t.split('|').map((c) => c.trim());
  };
  const isTableLine = (line) => line.trim().startsWith('|');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const h = line.match(/^#{1,6}\s+(.*)$/);
    if (h) { heading = h[1].replace(/[#*`]/g, '').trim(); continue; }
    if (!isTableLine(line)) continue;

    // Collect a contiguous table block.
    const block = [];
    let j = i;
    while (j < lines.length && isTableLine(lines[j])) { block.push(lines[j]); j++; }
    i = j - 1;

    if (block.length < 3) continue; // need header + separator + ≥1 data row
    const headerCells = splitRow(block[0]);
    if (!isSep(splitRow(block[1]))) continue; // require a real separator row

    // Locate columns.
    const lc = headerCells.map((c) => c.toLowerCase());
    const findCol = (...needles) =>
      lc.findIndex((c) => needles.some((n) => c.includes(n)));
    const nameKeywordIdx = findCol('organization', 'organisation', 'org name', 'org', 'school', 'name');
    const countryIdx = findCol('country');
    // Conservative: only treat this as an org table if it has an explicit
    // name/org/school column OR a country column. Aggregate/summary tables
    // (e.g. "Region | Count") have neither → skipped, so region names never
    // leak in as org rows.
    if (nameKeywordIdx < 0 && countryIdx < 0) continue;
    const nameIdx = nameKeywordIdx >= 0 ? nameKeywordIdx : 0;
    const websiteIdx = findCol('website', 'url', 'site');
    const emailIdx = findCol('email', 'e-mail');
    const fbIdx = findCol('facebook', 'fb page', 'fb ');

    for (let k = 2; k < block.length; k++) {
      const cells = splitRow(block[k]);
      if (isSep(cells)) continue;
      const candidate = (cells[nameIdx] || '').replace(/[*`]/g, '').trim();
      if (!candidate) continue;
      const low = candidate.toLowerCase();
      // Reject non-org-like first cells.
      if (/^[\d.,%$\s()+-]+$/.test(candidate)) continue;               // numbers/totals-of-numbers
      if (/^(sub)?total\b/.test(low) || low === 'totals') continue;    // TOTAL rows
      if (low === norm(heading)) continue;                             // region name == section heading
      if (/^n\/?a$/.test(low) || low === '-' || low === '—') continue;

      const country = countryIdx >= 0 && cells[countryIdx] ? cells[countryIdx].trim() : heading;
      const website = websiteIdx >= 0 ? (cells[websiteIdx] || '').trim() : '';
      let email = emailIdx >= 0 ? (cells[emailIdx] || '').trim() : '';
      if (!isEmail(email)) email = '';
      const fb = fbIdx >= 0 ? (cells[fbIdx] || '').trim() : '';

      out.push({
        org_name: candidate,
        country,
        website: website && website !== '-' ? website : '',
        email,
        facebook_url: fb && fb !== '-' ? fb : '',
        raw: block[k].trim(),
      });
    }
  }
  return { present: true, rows: out };
}

// ── the 5 WS1 hubs ──────────────────────────────────────────────────────────

const HUBS = [
  {
    org_name: 'SAMA (South African Montessori Association)',
    country: 'South Africa',
    contact_type: 'multiplier_association',
    warm_path: 'SA home market; SAMA sponsors Zama membership',
  },
  {
    org_name: 'AMI Educateurs sans Frontières',
    country: 'Netherlands',
    contact_type: 'multiplier_association',
    email: 'info@montessori-esf.org',
    warm_path: 'EsF partnership letter sent Jul 7',
  },
  {
    org_name: 'MTCNE / Tim Nee',
    country: 'USA',
    contact_type: 'multiplier_association',
    contact_person: 'Tim Nee',
    email: 'tnee@crec.org',
    contact_role: 'Director',
    warm_path: 'direct; fundraising for Guatemala training',
  },
  {
    org_name: 'FAMM (Fundación Argentina María Montessori)',
    country: 'Argentina',
    contact_type: 'multiplier_association',
    contact_person: 'Marisa Canova de Sioli',
    email: 'marisa@fundacionmontessori.org',
    warm_path: 'WARM — live thread since Apr 2026',
    priority: 'warm',
  },
  {
    org_name: 'North Shore Montessori School',
    country: 'USA',
    contact_type: 'multiplier_association',
    warm_path: '24-yr gateway to Victoria Montessori Uganda',
  },
];

// ── in-memory model (existing rows + inserts) ───────────────────────────────
// Each row: the DB columns we care about + _isNew + _changed (Set) + _index maps.

function makeModel(existingRows) {
  const rows = existingRows.map((r) => ({ ...r, _isNew: false, _changed: new Set() }));
  const byKey = new Map();     // org+country -> row
  const byOrg = new Map();     // org -> [rows]
  const byDomain = new Map();  // email domain -> [rows]
  const byEmail = new Map();   // lower(trim(email)) -> FIRST row with that email
  const reindex = (row) => {
    byKey.set(key(row.org_name, row.country), row);
    const o = norm(row.org_name);
    if (!byOrg.has(o)) byOrg.set(o, []);
    byOrg.get(o).push(row);
    const d = emailDomain(row.email);
    if (d) {
      if (!byDomain.has(d)) byDomain.set(d, []);
      byDomain.get(d).push(row);
    }
    const ek = emailKey(row.email);
    // Only the FIRST row with a given email is the identity holder; later rows
    // sharing that email resolve TO it (shared-email case, e.g. the 4 EsF rows).
    if (ek && !byEmail.has(ek)) byEmail.set(ek, row);
  };
  rows.forEach(reindex);

  // Identity match: exact email FIRST (an email is a hard identity key), then
  // fall back to org+country, then unique org-name (country label drift).
  const findMatch = (org, country, email) => {
    const ek = emailKey(email);
    if (ek && byEmail.has(ek)) return byEmail.get(ek);
    const exact = byKey.get(key(org, country));
    if (exact) return exact;
    const o = byOrg.get(norm(org));
    if (o && o.length === 1) return o[0];
    return null;
  };

  const insert = (fields) => {
    const row = { ...fields, _isNew: true, _changed: new Set(Object.keys(fields)) };
    rows.push(row);
    reindex(row);
    return row;
  };

  // fill-empty a field; record change; returns true if it changed
  const fillEmpty = (row, field, value) => {
    if (isEmpty(value)) return false;
    if (!isEmpty(row[field])) return false;
    row[field] = value;
    if (!row._isNew) row._changed.add(field);
    return true;
  };
  // hard-set a field (used for classification); records change if different
  const setField = (row, field, value) => {
    if (value == null) return false;
    if (row[field] === value) return false;
    row[field] = value;
    if (!row._isNew) row._changed.add(field);
    return true;
  };
  const appendNote = (row, text) => {
    if (isEmpty(text)) return false;
    const cur = row.notes || '';
    if (cur.includes(text)) return false;
    row.notes = cur ? `${cur}; ${text}` : text;
    if (!row._isNew) row._changed.add('notes');
    return true;
  };
  // When a source row resolves to an existing row under a DIFFERENT spelling
  // (only happens on email-identity matches), record the source spelling so no
  // org name is ever lost.
  const noteAlias = (row, sourceOrg) => {
    if (isEmpty(sourceOrg)) return false;
    if (norm(row.org_name) === norm(sourceOrg)) return false;
    return appendNote(row, `also: ${String(sourceOrg).trim()}`);
  };

  return { rows, byDomain, findMatch, insert, fillEmpty, setField, appendNote, noteAlias };
}

// ── the import steps (mutate the model, return action records) ──────────────

const actions = []; // {action, org_name, country, fields_changed}
function record(action, org_name, country, changed) {
  actions.push({ action, org_name, country, fields_changed: (changed || []).join('|') });
}

function stepEnrich(model, data) {
  let updated = 0, skipped = 0, noMatch = 0;
  for (const r of data) {
    const row = model.findMatch(r.org_name, r.country);
    if (!row) { noMatch++; record('skip_no_match', r.org_name, r.country, ['enrich']); continue; }
    const before = row._isNew ? new Set() : new Set(row._changed);
    const setEmail = isEmail(r.found_email) && model.fillEmpty(row, 'email', r.found_email.trim());
    if (setEmail) model.setField(row, 'email_status', 'verified');
    model.fillEmpty(row, 'facebook_url', r.facebook_url);
    if (r.seen_where) model.appendNote(row, `email SEEN: ${r.seen_where}`);
    const changed = row._isNew ? [] : [...row._changed].filter((c) => !before.has(c));
    if (changed.length) { updated++; record('update', row.org_name, row.country, changed); }
    else { skipped++; }
  }
  return { updated, skipped, noMatch };
}

function stepMx(model, mx) {
  let bounced = 0, revived = 0;
  for (const row of model.rows) {
    const d = emailDomain(row.email);
    if (!d) continue;
    if (mx.dead.has(d)) {
      const before = row._isNew ? new Set() : new Set(row._changed);
      const flip = row.email_status !== 'bounced' && model.setField(row, 'email_status', 'bounced');
      const note = model.appendNote(row, 'MX_DEAD jul12');
      const changed = [...row._changed].filter((c) => !before.has(c));
      if ((flip || note) && changed.length) { bounced++; record('update', row.org_name, row.country, changed); }
    } else if (mx.revived.has(d)) {
      if (row.email_status === 'bounced' || row.email_status === 'invalid') {
        const before = new Set(row._changed);
        model.setField(row, 'email_status', 'verified');
        const changed = [...row._changed].filter((c) => !before.has(c));
        if (changed.length) { revived++; record('update', row.org_name, row.country, changed); }
      }
    }
  }
  return { bounced, revived };
}

function stepFootprint(model, data) {
  let updated = 0, skipped = 0, noMatch = 0;
  for (const r of data) {
    const row = model.findMatch(r.org_name, r.country);
    if (!row) { noMatch++; record('skip_no_match', r.org_name, r.country, ['footprint']); continue; }
    const before = row._isNew ? new Set() : new Set(row._changed);
    model.fillEmpty(row, 'facebook_url', r.facebook_url);
    const fol = parseFollowers(r.followers_estimate);
    if (fol != null) model.fillEmpty(row, 'fb_followers', fol);
    model.fillEmpty(row, 'social_checked_date', '2026-07-12');
    const changed = row._isNew ? [] : [...row._changed].filter((c) => !before.has(c));
    if (changed.length) { updated++; record('update', row.org_name, row.country, changed); }
    else skipped++;
  }
  return { updated, skipped, noMatch };
}

function segmentForOrgType(orgType) {
  const t = norm(orgType);
  return (t === 'network' || t === 'foundation') ? 'C_hub_org' : 'B_pilot_partner';
}

function stepUnderpriv(model, data) {
  let inserted = 0, updated = 0, skipped = 0, skippedDup = 0;
  for (const r of data) {
    const isDup = norm(r.dup_of_master) === 'yes';
    const seg = segmentForOrgType(r.org_type);
    const resp = responsivenessFromStrength(r.social_strength);
    const montVerified = coerceMontessori(r.montessori_related); // WARN-2: true/false/null
    const evidence = firstNonEmpty(r.website, r.facebook_url);    // WARN-3
    // Email-first identity match (CRIT-1a); WARN-1: dup rows try match too.
    const row = model.findMatch(r.org_name, r.country, r.email);

    if (row) {
      const before = row._isNew ? new Set() : new Set(row._changed);
      // Preserve the source spelling if this resolved under a different name.
      model.noteAlias(row, r.org_name);
      model.fillEmpty(row, 'website', r.website);
      model.fillEmpty(row, 'email', r.email);
      model.fillEmpty(row, 'facebook_url', r.facebook_url);
      model.fillEmpty(row, 'instagram_url', r.instagram_url);
      // Classification — never downgrade / never clobber a value already set by
      // an authoritative hub row (CRIT-1b: guard covers ALL classification
      // fields, not just verification_status).
      if (isEmpty(row.verification_status) || row.verification_status === 'unverified_from_doc') {
        model.setField(row, 'verification_status', 'partial');
      }
      model.fillEmpty(row, 'segment', seg);
      if (resp != null) model.fillEmpty(row, 'responsiveness_score', resp);
      if (montVerified !== null) model.fillEmpty(row, 'montessori_verified', montVerified);
      // Disadvantaged evidence (all underpriv rows — director eyeballed them Jul-12).
      model.fillEmpty(row, 'disadvantaged_verified', true);
      if (evidence) {
        model.fillEmpty(row, 'disadvantaged_evidence_url', evidence);
        if (row.montessori_verified === true) model.fillEmpty(row, 'montessori_evidence_url', evidence);
      }
      const changed = [...row._changed].filter((c) => !before.has(c));
      if (changed.length) { updated++; record('update', row.org_name, row.country, changed); }
      else skipped++;
    } else if (isDup) {
      // WARN-1: a dup-of-master row with no match must NOT become a new row.
      skippedDup++;
      record('skipped_dup_of_master', r.org_name, r.country, ['dup_of_master']);
    } else {
      const noteBits = [];
      if (r.city) noteBits.push(`city: ${r.city}`);
      if (r.org_type) noteBits.push(`org_type: ${r.org_type}`);
      if (r.notes) noteBits.push(r.notes);
      const fields = {
        org_name: r.org_name.trim(),
        country: (r.country || '').trim(),
        contact_type: 'disadvantaged_school',
        status: 'new',
        segment: seg,
        verification_status: 'partial',
        disadvantaged_verified: true, // WARN-3
        batch_tag: 'underpriv-jul12',
        source: 'underpriv-scrape-jul12',
      };
      if (!isEmpty(r.website)) fields.website = r.website.trim();
      if (isEmail(r.email)) fields.email = r.email.trim();
      if (!isEmpty(r.facebook_url)) fields.facebook_url = r.facebook_url.trim();
      if (!isEmpty(r.instagram_url)) fields.instagram_url = r.instagram_url.trim();
      if (resp != null) fields.responsiveness_score = resp;
      if (montVerified !== null) fields.montessori_verified = montVerified;
      if (evidence) {
        fields.disadvantaged_evidence_url = evidence; // WARN-3
        if (montVerified === true) fields.montessori_evidence_url = evidence;
      }
      if (noteBits.length) fields.notes = noteBits.join(' | ');
      model.insert(fields);
      inserted++;
      record('insert', fields.org_name, fields.country, Object.keys(fields));
    }
  }
  return { inserted, updated, skipped, skippedDup };
}

function stepMasterdoc(model, docRows) {
  let inserted = 0, skippedExisting = 0, skippedDup = 0;
  const seen = new Set();
  for (const r of docRows) {
    // Skip if this org already exists (email identity OR org+country OR unique
    // org-name). Passing the email prevents a masterdoc row that shares an
    // email with a hub/underpriv row from inserting into a 23505 collision.
    if (model.findMatch(r.org_name, r.country, r.email)) { skippedExisting++; continue; }
    const k = key(r.org_name, r.country);
    if (seen.has(k)) { skippedDup++; continue; }
    seen.add(k);
    const fields = {
      org_name: r.org_name.trim(),
      country: (r.country || '').trim(),
      status: 'new',
      verification_status: 'unverified_from_doc',
      segment: null,
      contact_type: 'individual_school',
      batch_tag: 'v2-masterdoc-jul14',
      source: 'v2-masterdoc-jul14',
      notes: `[unverified_from_doc] ${r.raw}`.slice(0, 2000),
    };
    if (!isEmpty(r.website)) fields.website = r.website;
    if (isEmail(r.email)) fields.email = r.email;
    if (!isEmpty(r.facebook_url)) fields.facebook_url = r.facebook_url;
    model.insert(fields);
    inserted++;
    record('insert', fields.org_name, fields.country, Object.keys(fields));
  }
  return { inserted, skippedExisting, skippedDup };
}

function stepHubs(model) {
  let inserted = 0, updated = 0, skipped = 0;
  for (const h of HUBS) {
    const row = model.findMatch(h.org_name, h.country, h.email);
    if (row) {
      const before = row._isNew ? new Set() : new Set(row._changed);
      model.noteAlias(row, h.org_name);
      // authoritative hub classification (overwrite)
      model.setField(row, 'segment', 'C_hub_org');
      model.setField(row, 'verification_status', 'verified');
      // everything else fill-empty (never clobber FAMM's thread history etc.)
      model.fillEmpty(row, 'email', h.email);
      model.fillEmpty(row, 'contact_person', h.contact_person);
      model.fillEmpty(row, 'contact_role', h.contact_role);
      model.fillEmpty(row, 'warm_path', h.warm_path);
      if (h.priority) model.fillEmpty(row, 'priority', h.priority);
      const changed = [...row._changed].filter((c) => !before.has(c));
      if (changed.length) { updated++; record('update', row.org_name, row.country, changed); }
      else skipped++;
    } else {
      const fields = {
        org_name: h.org_name,
        country: h.country,
        contact_type: h.contact_type || 'multiplier_association',
        segment: 'C_hub_org',
        verification_status: 'verified',
        status: 'new',
        source: 'v2-hub-seed-jul14',
        batch_tag: 'v2-hub-jul14',
      };
      if (h.email) fields.email = h.email;
      if (h.contact_person) fields.contact_person = h.contact_person;
      if (h.contact_role) fields.contact_role = h.contact_role;
      if (h.warm_path) fields.warm_path = h.warm_path;
      if (h.priority) fields.priority = h.priority;
      model.insert(fields);
      inserted++;
      record('insert', fields.org_name, fields.country, Object.keys(fields));
    }
  }
  return { inserted, updated, skipped };
}

// ── DB ──────────────────────────────────────────────────────────────────────

function readDbPasswordFromEnvLocal() {
  const env = fs.readFileSync(path.join(REPO, '.env.local'), 'utf8');
  const m = env.match(/DATABASE_URL=postgres:\/\/postgres:([^@]+)@/);
  if (!m) throw new Error('Could not read DB password from .env.local DATABASE_URL');
  return m[1];
}

function makeClient() {
  return new Client({
    host: 'aws-1-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    user: 'postgres.dmfncjjtsoxrnvcdnvjq',
    password: process.env.SUPABASE_DB_PASSWORD || readDbPasswordFromEnvLocal(),
    database: 'postgres',
    ssl: { rejectUnauthorized: false },
  });
}

const SELECT_COLS = [
  'id', 'org_name', 'country', 'email', 'email_status', 'website',
  'facebook_url', 'instagram_url', 'fb_followers', 'ig_followers',
  'social_checked_date', 'notes', 'status', 'contact_type', 'priority',
  'verification_status', 'responsiveness_score', 'segment',
  'montessori_verified', 'montessori_evidence_url', 'disadvantaged_verified',
  'disadvantaged_evidence_url', 'warm_path', 'contact_person', 'contact_role',
  'batch_tag', 'source',
];

const WRITABLE_COLS = SELECT_COLS.filter((c) => c !== 'id');

async function loadExisting(client) {
  const { rows } = await client.query(
    `SELECT ${SELECT_COLS.join(', ')} FROM montree_outreach_contacts`
  );
  return rows;
}

// CRIT-1c: fold a would-be-inserted row into the existing row that owns its
// email. Fill-empty only (never clobber), append the new org spelling to notes,
// log action='merged_by_email' with both spellings. Returns true on success.
async function mergeByEmail(client, row) {
  const { rows: conflict } = await client.query(
    `SELECT ${SELECT_COLS.join(', ')} FROM montree_outreach_contacts WHERE lower(email) = lower($1) LIMIT 1`,
    [row.email.trim()]
  );
  if (!conflict.length) return false; // not an email collision we can resolve
  const target = conflict[0];
  const set = [];
  const vals = [];
  const changed = [];
  for (const c of WRITABLE_COLS) {
    if (c === 'email' || c === 'notes') continue; // email is the key; notes below
    const nv = row[c];
    if (nv === undefined || nv === null || String(nv).trim() === '') continue;
    if (target[c] == null || String(target[c]).trim() === '') {
      vals.push(nv);
      set.push(`${c} = $${vals.length}`);
      changed.push(c);
    }
  }
  // Preserve both org spellings + fold in any new notes.
  let notes = target.notes || '';
  const alias = `also: ${String(row.org_name).trim()}`;
  if (norm(target.org_name) !== norm(row.org_name) && !notes.includes(alias)) {
    notes = notes ? `${notes}; ${alias}` : alias;
  }
  if (row.notes && !notes.includes(row.notes)) {
    notes = notes ? `${notes}; ${row.notes}` : row.notes;
  }
  if (notes !== (target.notes || '')) {
    vals.push(notes);
    set.push(`notes = $${vals.length}`);
    changed.push('notes');
  }
  if (set.length) {
    set.push('updated_at = NOW()');
    vals.push(target.id);
    await client.query(
      `UPDATE montree_outreach_contacts SET ${set.join(', ')} WHERE id = $${vals.length}`,
      vals
    );
  }
  record('merged_by_email', row.org_name, row.country, [`merged_into:${target.org_name}`, ...changed]);
  return true;
}

async function applyRow(client, row) {
  if (row._isNew) {
    const cols = WRITABLE_COLS.filter((c) => row[c] !== undefined && row[c] !== null);
    const vals = cols.map((c) => row[c]);
    const ph = cols.map((_, i) => `$${i + 1}`);
    try {
      await client.query(
        `INSERT INTO montree_outreach_contacts (${cols.join(', ')}) VALUES (${ph.join(', ')})`,
        vals
      );
      return 'inserted';
    } catch (e) {
      // CRIT-1c: a unique-email collision must NOT be silently dropped as a
      // dup. Resolve the conflicting row by email and fold this row into it as
      // a fill-empty UPDATE, preserving both org-name spellings.
      if (e.code === '23505' && isEmail(row.email)) {
        const merged = await mergeByEmail(client, row);
        if (merged) return 'merged';
      }
      throw e;
    }
  }
  const changed = [...row._changed].filter((c) => WRITABLE_COLS.includes(c));
  if (!changed.length) return 'noop';
  const set = changed.map((c, i) => `${c} = $${i + 1}`);
  const vals = changed.map((c) => row[c]);
  vals.push(row.id);
  set.push(`updated_at = NOW()`);
  await client.query(
    `UPDATE montree_outreach_contacts SET ${set.join(', ')} WHERE id = $${vals.length}`,
    vals
  );
  return 'updated';
}

// ── report ──────────────────────────────────────────────────────────────────

function writeReport() {
  const esc = (s) => {
    const v = s == null ? '' : String(s);
    return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
  };
  const lines = ['action,org_name,country,fields_changed'];
  for (const a of actions) {
    lines.push([a.action, a.org_name, a.country, a.fields_changed].map(esc).join(','));
  }
  fs.writeFileSync(REPORT_PATH, lines.join('\n') + '\n', 'utf8');
}

// Run every import step against the model IN CONTRACT ORDER. Hubs run BEFORE
// underpriv (CRIT-1b) so the authoritative hub rows exist first and the
// never-downgrade guard in stepUnderpriv protects them.
function runSteps(model, { enrich, mx, footprint, underpriv, docRows }) {
  const rEnrich = stepEnrich(model, enrich);
  const rMx = stepMx(model, mx);
  const rFoot = stepFootprint(model, footprint);
  const rHubs = stepHubs(model);          // ← before underpriv
  const rUnder = stepUnderpriv(model, underpriv);
  const rDoc = stepMasterdoc(model, docRows);
  return { rEnrich, rMx, rFoot, rHubs, rUnder, rDoc };
}

function printPlannedActions({ rEnrich, rMx, rFoot, rHubs, rUnder, rDoc }) {
  const merged = actions.filter((a) => a.action === 'merged_by_email').length;
  console.log('\n-- planned actions --');
  console.log(`  a. enrich emails   : ${rEnrich.updated} update, ${rEnrich.skipped} skip, ${rEnrich.noMatch} no-match`);
  console.log(`  b. mx sweep        : ${rMx.bounced} → bounced, ${rMx.revived} → revived`);
  console.log(`  c. footprint       : ${rFoot.updated} update, ${rFoot.skipped} skip, ${rFoot.noMatch} no-match`);
  console.log(`  d. hubs (5)        : ${rHubs.inserted} insert, ${rHubs.updated} update, ${rHubs.skipped} skip`);
  console.log(`  e. underpriv (222) : ${rUnder.inserted} insert, ${rUnder.updated} update, ${rUnder.skipped} skip, ${rUnder.skippedDup} skipped_dup_of_master`);
  console.log(`  f. masterdoc       : ${rDoc.inserted} insert, ${rDoc.skippedExisting} already-present, ${rDoc.skippedDup} in-doc-dup`);
  console.log(`  merged_by_email    : ${merged}`);
}

// ── main ──────────────────────────────────────────────────────────────────────

async function main() {
  const mode = OFFLINE ? 'OFFLINE' : DRY_RUN ? 'DRY-RUN' : 'REAL';
  console.log(`\n=== outreach-import-v2  [${mode}] ===`);
  console.log(`masterdoc: ${MASTERDOC_PATH}`);

  // Parse every source (all modes).
  const enrich = parseEnrich();
  const footprint = parseFootprint();
  const underpriv = parseUnderpriv();
  const mx = parseMx();
  const doc = parseMasterdoc(MASTERDOC_PATH);

  console.log('\n-- sources parsed --');
  console.log(`  enrich-emails-jul12.csv       : ${enrich.length} rows (${enrich.filter((r) => isEmail(r.found_email)).length} with a found email)`);
  console.log(`  mx-check-jul12.csv            : ${mx.rows} rows (${mx.dead.size} dead domains, ${mx.revived.size} revived)`);
  console.log(`  disadvantaged-footprint      : ${footprint.length} rows (${footprint.filter((r) => parseFollowers(r.followers_estimate) != null).length} parseable follower counts)`);
  console.log(`  UNDERPRIV_MASTER_RANKED      : ${underpriv.length} rows`);
  if (!doc.present) console.log(`  masterdoc                    : ABSENT (${MASTERDOC_PATH}) — skipping, not an error`);
  else console.log(`  masterdoc                    : ${doc.rows.length} org-like table rows extracted`);
  if (doc.present && doc.rows.length) {
    console.log('    sample extracted:');
    doc.rows.slice(0, 5).forEach((r) => console.log(`      • ${r.org_name}  [${r.country}]`));
  }

  if (OFFLINE) {
    // Run the full pipeline against an EMPTY model (no DB). This exercises the
    // hub-before-underpriv order + email-identity matching so the effect of the
    // fixes is observable offline (some underpriv rows now resolve to hubs by
    // email; dup-of-master rows with no match are skipped).
    actions.length = 0;
    const model = makeModel([]);
    const res = runSteps(model, { enrich, mx, footprint, underpriv, docRows: doc.rows });
    printPlannedActions(res);

    // WARN-2 montessori split over the raw underpriv source.
    let mTrue = 0, mFalse = 0, mNull = 0;
    for (const r of underpriv) {
      const v = coerceMontessori(r.montessori_related);
      if (v === true) mTrue++; else if (v === false) mFalse++; else mNull++;
    }
    console.log('\n-- underpriv montessori_verified split (WARN-2) --');
    console.log(`  true  (yes)              : ${mTrue}`);
    console.log(`  false (no)               : ${mFalse}`);
    console.log(`  null  (partial/blank)    : ${mNull}`);

    // dup_of_master telemetry.
    const dupTotal = underpriv.filter((r) => norm(r.dup_of_master) === 'yes').length;
    console.log('\n-- dup_of_master (WARN-1) --');
    console.log(`  flagged rows             : ${dupTotal}`);
    console.log(`  resolved to a match      : ${dupTotal - res.rUnder.skippedDup}`);
    console.log(`  skipped_dup_of_master    : ${res.rUnder.skippedDup}`);

    // Final segment split across ALL rows written by the run (empty start).
    const segSplit = {};
    for (const row of model.rows) {
      const s = row.segment || '(unset)';
      segSplit[s] = (segSplit[s] || 0) + 1;
    }
    console.log('\n-- resulting segment split (all model rows) --');
    Object.entries(segSplit).sort().forEach(([s, n]) => console.log(`  ${s.padEnd(20)}: ${n}`));

    // Email-resolves: underpriv/masterdoc rows that folded into an earlier row
    // by shared email (visible as an appended "also:" alias note).
    const aliasResolves = model.rows.filter((r) => (r.notes || '').includes('also:')).length;
    console.log('\n-- shared-email resolves (CRIT-1a) --');
    console.log(`  rows carrying an "also:" alias note: ${aliasResolves}`);

    console.log('\nOFFLINE mode: no DB touched, nothing written. Done.\n');
    return;
  }

  // Connect + load existing.
  const client = makeClient();
  await client.connect();
  let existing;
  try {
    existing = await loadExisting(client);
  } catch (e) {
    await client.end();
    if (e.code === '42703') {
      console.error('\nERROR: a V2.1 column is missing — run migration 294 first.');
    }
    throw e;
  }
  console.log(`\nloaded ${existing.length} existing contacts`);

  const model = makeModel(existing);

  // Steps in contract order (hubs before underpriv — CRIT-1b).
  const res = runSteps(model, { enrich, mx, footprint, underpriv, docRows: doc.rows });
  printPlannedActions(res);

  const toWrite = model.rows.filter((r) => r._isNew || r._changed.size);
  console.log(`\n  total rows to write: ${toWrite.length}`);

  if (DRY_RUN) {
    await client.end();
    console.log('\nDRY-RUN: nothing written to DB or report. Done.\n');
    return;
  }

  // Apply.
  let ins = 0, upd = 0, merged = 0, noop = 0;
  for (const row of toWrite) {
    const r = await applyRow(client, row);
    if (r === 'inserted') ins++;
    else if (r === 'updated') upd++;
    else if (r === 'merged') merged++;
    else noop++;
  }
  await client.end();

  writeReport();
  console.log('\n-- applied --');
  console.log(`  inserted: ${ins}  updated: ${upd}  merged_by_email: ${merged}  noop: ${noop}`);
  console.log(`  report:   ${REPORT_PATH}  (${actions.length} action rows)`);
  console.log('\nDone.\n');
}

main().catch((e) => {
  console.error('\nFATAL:', e && e.message ? e.message : e);
  process.exit(1);
});
