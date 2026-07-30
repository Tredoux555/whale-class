#!/usr/bin/env node
/**
 * extract-sheet.mjs — Montree paper-scan extraction harness (v0.1.0)
 *
 * Runs Claude vision extraction over photographs of handwritten classroom record
 * sheets and writes a structured JSON result + a human-readable markdown report.
 *
 * This is a TEST HARNESS / accuracy workbench, not production code. It exists so we
 * can tune the extraction prompt against real photographed sheets from the Mac
 * terminal, before the production paper-scan feature exists.
 *
 * Lives at:  <repoRoot>/scripts/paper-scan/extract-sheet.mjs
 * Run from:  anywhere inside the repo — paths derive from import.meta.url, not cwd.
 *
 *   node scripts/paper-scan/extract-sheet.mjs sheets/ --compare --roster-file roster.txt
 *
 * Dependencies: @anthropic-ai/sdk (from the repo's node_modules, loaded lazily) + node builtins.
 * macOS `sips` is used for HEIC→JPEG conversion and downscaling.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const SCRIPT_VERSION = '0.1.0';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
// Script lives at <repoRoot>/scripts/paper-scan/ — repo root is two levels up.
// Deliberately NOT process.cwd(): the operator may run this from anywhere.
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];
const SENDABLE_MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
};

// Claude vision sweet spot is ~1.15 megapixels; anything larger just costs tokens.
const MAX_LONG_SIDE = 2000;   // above this we downscale
const TARGET_LONG_SIDE = 1600; // ...to this
const MAX_BASE64_BYTES = 5 * 1024 * 1024;      // hard API limit on the base64 payload
const SAFE_ORIGINAL_BYTES = 4.5 * 1024 * 1024; // fallback ceiling when sips is unavailable

// Estimated USD per MILLION tokens. NOTE: Anthropic pricing drifts — these are
// ESTIMATES for relative comparison between runs, never billing truth.
const PRICES = {
  haiku: { input: 0.80, output: 4.00 },
  sonnet: { input: 3.00, output: 15.00 },
};

const MATCH_CONFIDENT = 0.90;
const MATCH_PROBABLE = 0.80;

// ── small utilities ───────────────────────────────────────────────────

const out = (s = '') => process.stdout.write(s + '\n');
const warn = (s) => process.stderr.write(s + '\n');

function die(msg, code = 1) {
  warn(`\nERROR: ${msg}\n`);
  process.exit(code);
}

/** Run a binary, returning stdout, or null if it failed / doesn't exist. */
function run(bin, args) {
  try {
    return execFileSync(bin, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch {
    return null;
  }
}

const usd = (n) => `$${n.toFixed(4)}`;

/** Strip accents, punctuation and case so "José-M." and "jose m" compare equal. */
function normalizeName(s) {
  return String(s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Escape a value for a markdown table cell (pipes and newlines break tables). */
function cell(v) {
  if (v === null || v === undefined || v === '') return '—';
  return String(v).replace(/\|/g, '\\|').replace(/\s*\n\s*/g, ' ⏎ ').trim();
}

// ── env / API key ─────────────────────────────────────────────────────

/**
 * Read ANTHROPIC_API_KEY from the environment, else from <repoRoot>/.env.local.
 * Tiny line parser: KEY=VALUE, ignores blanks/comments, strips matching quotes.
 * Values are NEVER logged.
 */
function resolveApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

  const envPath = path.join(REPO_ROOT, '.env.local');
  if (fs.existsSync(envPath)) {
    for (const raw of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim().replace(/^export\s+/, '');
      if (key !== 'ANTHROPIC_API_KEY') continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (val) return val;
    }
  }

  die(
    'ANTHROPIC_API_KEY not found.\n' +
    `  Set it in the environment:  export ANTHROPIC_API_KEY=...\n` +
    `  ...or add a line to ${path.join(REPO_ROOT, '.env.local')}:  ANTHROPIC_API_KEY=...`
  );
}

// ── model resolution ──────────────────────────────────────────────────

const MODEL_RE = /claude-[a-z0-9.-]+/;

/** Find the first claude-* id appearing near an identifier in a source file. */
function scanSourceForModel(file, identifier) {
  if (!fs.existsSync(file)) return null;
  let src;
  try { src = fs.readFileSync(file, 'utf8'); } catch { return null; }
  let idx = 0;
  while ((idx = src.indexOf(identifier, idx)) !== -1) {
    // Look at a window starting at the identifier — covers `const X = 'claude-...'`
    // and multi-line definitions alike.
    const m = src.slice(idx, idx + 400).match(MODEL_RE);
    if (m) return m[0];
    idx += identifier.length;
  }
  return null;
}

/**
 * Resolve a model id: CLI flag → env var → repo source auto-detect → hard error.
 * A wrong model id must NEVER be used silently, so there is no hardcoded fallback.
 */
function resolveModelId(tier, flagValue) {
  if (flagValue) return { id: flagValue, source: 'flag' };

  const envVar = tier === 'haiku' ? 'MONTREE_HAIKU_MODEL' : 'MONTREE_SONNET_MODEL';
  if (process.env[envVar]) return { id: process.env[envVar], source: `env ${envVar}` };

  // Repo conventions: HAIKU_MODEL is the haiku pin, AI_MODEL the sonnet/default pin.
  const identifier = tier === 'haiku' ? 'HAIKU_MODEL' : 'AI_MODEL';
  const candidates = [
    path.join(REPO_ROOT, 'lib/montree/ai.ts'),
    path.join(REPO_ROOT, 'lib/montree/billing/resolve-model.ts'),
  ];
  // Shallow scan of lib/montree/*.ts as a last resort (no recursion).
  const libDir = path.join(REPO_ROOT, 'lib/montree');
  if (fs.existsSync(libDir)) {
    try {
      for (const f of fs.readdirSync(libDir).sort()) {
        if (f.endsWith('.ts')) candidates.push(path.join(libDir, f));
      }
    } catch { /* unreadable dir — ignore */ }
  }

  for (const file of candidates) {
    const found = scanSourceForModel(file, identifier);
    if (found) return { id: found, source: `${path.relative(REPO_ROOT, file)} (${identifier})` };
  }

  die(
    `Could not resolve the ${tier} model id.\n` +
    `  Tried: --${tier}-id flag, $${envVar}, and repo source scan for ${identifier}.\n` +
    `  Pass it explicitly, e.g.:  --haiku-id claude-... --sonnet-id claude-...`
  );
}

// ── CLI ───────────────────────────────────────────────────────────────

const HELP = `
extract-sheet.mjs v${SCRIPT_VERSION} — Montree paper-scan extraction harness

USAGE
  node scripts/paper-scan/extract-sheet.mjs <file-or-directory ...> [options]

OPTIONS
  --model haiku|sonnet     Model tier to run (default: haiku)
  --compare                Run BOTH tiers on each sheet + emit a comparison section
  --haiku-id <model-id>    Explicit haiku model id  (else $MONTREE_HAIKU_MODEL, else repo scan)
  --sonnet-id <model-id>   Explicit sonnet model id (else $MONTREE_SONNET_MODEL, else repo scan)
  --roster "A,B,C"         Class roster for fuzzy name matching
  --roster-file <path>     ...or one name per line from a file
  --out <dir>              Output directory (default: alongside each input image)
  --notes "<text>"         Operator context injected into the prompt
  --json-only              Skip the markdown report
  -h, --help               This message

EXAMPLES
  node scripts/paper-scan/extract-sheet.mjs ~/Desktop/sheets/day1.heic
  node scripts/paper-scan/extract-sheet.mjs ~/Desktop/sheets --compare --out /tmp/eval
  node scripts/paper-scan/extract-sheet.mjs sheet.jpg --roster-file whale-roster.txt \\
      --notes "this teacher uses P/W/M codes; sheet is in German"
`;

function parseArgs(argv) {
  const o = {
    inputs: [], model: 'haiku', compare: false,
    haikuId: null, sonnetId: null, roster: null,
    outDir: null, notes: null, jsonOnly: false,
  };
  const need = (i, flag) => {
    if (i + 1 >= argv.length) die(`${flag} requires a value`);
    return argv[i + 1];
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case '-h': case '--help': out(HELP); process.exit(0); break;
      case '--model': o.model = need(i, a); i++; break;
      case '--compare': o.compare = true; break;
      case '--haiku-id': o.haikuId = need(i, a); i++; break;
      case '--sonnet-id': o.sonnetId = need(i, a); i++; break;
      case '--roster': o.roster = need(i, a).split(',').map((s) => s.trim()).filter(Boolean); i++; break;
      case '--roster-file': {
        const p = need(i, a); i++;
        if (!fs.existsSync(p)) die(`Roster file not found: ${p}`);
        o.roster = fs.readFileSync(p, 'utf8').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
        break;
      }
      case '--out': o.outDir = path.resolve(need(i, a)); i++; break;
      case '--notes': o.notes = need(i, a); i++; break;
      case '--json-only': o.jsonOnly = true; break;
      default:
        if (a.startsWith('-')) die(`Unknown option: ${a}\n${HELP}`);
        o.inputs.push(a);
    }
  }

  if (!o.inputs.length) die(`No input files or directories given.\n${HELP}`);
  if (!['haiku', 'sonnet'].includes(o.model)) die(`--model must be haiku or sonnet (got "${o.model}")`);
  return o;
}

/** Expand files + directories (non-recursive, sorted) into a flat image list. */
function collectImages(inputs) {
  const files = [];
  for (const raw of inputs) {
    const p = path.resolve(raw);
    if (!fs.existsSync(p)) die(`Input not found: ${raw}`);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      const found = fs.readdirSync(p).sort()
        .filter((f) => IMAGE_EXTS.includes(path.extname(f).toLowerCase()))
        .map((f) => path.join(p, f));
      if (!found.length) warn(`  (no images in ${raw})`);
      files.push(...found);
    } else if (st.isFile()) {
      if (!IMAGE_EXTS.includes(path.extname(p).toLowerCase())) {
        die(`Not a supported image: ${raw} (accepted: ${IMAGE_EXTS.join(' ')})`);
      }
      files.push(p);
    }
  }
  if (!files.length) die('No images found in the given inputs.');
  return files;
}

// ── image preparation (sips) ──────────────────────────────────────────

const HAS_SIPS = process.platform === 'darwin' && run('sips', ['--version']) !== null;

function sipsDimensions(file) {
  const o = run('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', file]);
  if (!o) return null;
  const w = o.match(/pixelWidth:\s*(\d+)/);
  const h = o.match(/pixelHeight:\s*(\d+)/);
  return w && h ? { w: +w[1], h: +h[1] } : null;
}

/** Sniff the real container so we never mislabel the media_type we send. */
function sniffMime(buf, ext) {
  if (buf.length > 12) {
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
    if (buf.toString('latin1', 0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
    if (buf.toString('latin1', 0, 3) === 'GIF') return 'image/gif';
    if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'image/webp';
  }
  return SENDABLE_MIME[ext.toLowerCase()] || null;
}

/** Base64 length without actually encoding — 4 chars per 3 bytes, padded. */
const b64Len = (buf) => Math.ceil(buf.length / 3) * 4;

/**
 * Return { base64, mime, bytes, resized, converted } ready for the API.
 * HEIC/HEIF must be converted (the API rejects it); anything oversized is downscaled.
 */
function prepareImage(file, tmpDir) {
  const ext = path.extname(file).toLowerCase();
  const isHeic = ext === '.heic' || ext === '.heif';
  let converted = false;
  let resized = false;
  let workPath = file;

  if (HAS_SIPS) {
    const dims = sipsDimensions(file);
    const tooBig = dims ? Math.max(dims.w, dims.h) > MAX_LONG_SIDE : false;

    if (isHeic || tooBig) {
      const target = path.join(tmpDir, `${path.basename(file, ext)}.prepared.jpg`);
      const args = ['-s', 'format', 'jpeg']; // normalise to jpeg once we're touching it anyway
      if (tooBig) args.push('-Z', String(TARGET_LONG_SIDE));
      args.push(file, '--out', target);
      if (run('sips', args) !== null && fs.existsSync(target)) {
        workPath = target;
        converted = isHeic;
        resized = tooBig;
      } else if (isHeic) {
        // Throw, don't die: one unreadable file must not abort the rest of the batch.
        throw new Error('sips could not convert this HEIC. Convert it to JPEG manually and retry.');
      }
      // A merely-oversized file that sips failed on falls through and is sent at
      // full size — costs extra tokens, but the size guard below still protects us.
    }
  } else if (isHeic) {
    throw new Error(
      `HEIC is not accepted by the Claude API and macOS \`sips\` is unavailable on this platform ` +
      `(${process.platform}). Convert this file to JPEG first.`
    );
  }

  let buf = fs.readFileSync(workPath);

  // Last-resort shrink: even a 1600px JPEG can exceed the payload cap if it is
  // very noisy. One extra pass at 1200px before giving up.
  if (HAS_SIPS && b64Len(buf) > MAX_BASE64_BYTES) {
    const target = path.join(tmpDir, `${path.basename(file, ext)}.shrunk.jpg`);
    if (run('sips', ['-s', 'format', 'jpeg', '-Z', '1200', workPath, '--out', target]) !== null
        && fs.existsSync(target)) {
      buf = fs.readFileSync(target);
      workPath = target;
      resized = true;
    }
  }

  if (b64Len(buf) > MAX_BASE64_BYTES) {
    throw new Error(
      `image too large for the API even after downscaling (${(buf.length / 1e6).toFixed(1)}MB raw). ` +
      `Re-export it smaller and retry.`
    );
  }
  if (!HAS_SIPS && buf.length > SAFE_ORIGINAL_BYTES) {
    throw new Error(
      `image is ${(buf.length / 1e6).toFixed(1)}MB and no \`sips\` is available to downscale it ` +
      `(platform ${process.platform}). Resize it below 4.5MB and retry.`
    );
  }

  const mime = sniffMime(buf, path.extname(workPath));
  if (!mime) throw new Error(`unsupported image format for ${path.basename(file)} — send jpeg, png, webp or gif`);

  return { base64: buf.toString('base64'), mime, bytes: buf.length, resized, converted };
}

// ── the extraction call ───────────────────────────────────────────────

const AREA_ENUM = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];
const STATUS_ENUM = ['presented', 'practicing', 'mastered'];

const EXTRACTION_TOOL = {
  name: 'record_sheet_extraction',
  description:
    'Record everything transcribed from this classroom record sheet. Call this exactly once with the complete reading of the page.',
  input_schema: {
    type: 'object',
    properties: {
      sheet_summary: {
        type: 'string',
        description: '2-3 sentences: what kind of document this is, and how legible it is overall.',
      },
      format_description: {
        type: 'string',
        description:
          "The sheet's layout system described precisely: columns and their verbatim headers, row structure, "
          + 'every symbol and shorthand code observed and what it appears to mean, any pre-printed vs handwritten distinction.',
      },
      sheet_date: { type: ['string', 'null'], description: 'Date written on the sheet, exactly as written.' },
      class_or_group_name: { type: ['string', 'null'] },
      teacher_name: { type: ['string', 'null'] },
      children: {
        type: 'array',
        description: 'One object per child appearing on the sheet, in the order they appear.',
        items: {
          type: 'object',
          properties: {
            child_name_raw: { type: 'string', description: 'The name exactly as written, including misspellings.' },
            name_legibility: { type: 'string', enum: ['clear', 'partial', 'guess'] },
            entries: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  work_name_raw: { type: ['string', 'null'], description: 'Work/material name exactly as written.' },
                  area: { type: ['string', 'null'], enum: [...AREA_ENUM, null] },
                  status: { type: ['string', 'null'], enum: [...STATUS_ENUM, null] },
                  time_minutes: { type: ['integer', 'null'] },
                  note: { type: ['string', 'null'], description: 'Any note attached to this entry, original language.' },
                  field_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                },
                required: ['work_name_raw', 'area', 'status', 'time_minutes', 'note', 'field_confidence'],
              },
            },
            general_note: { type: ['string', 'null'], description: 'A note about this child not tied to one work.' },
          },
          required: ['child_name_raw', 'name_legibility', 'entries', 'general_note'],
        },
      },
      unattributed_notes: {
        type: 'array',
        description: 'Observations on the page not clearly tied to any one child.',
        items: { type: 'string' },
      },
      illegible_regions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'Where on the sheet, e.g. "row 4, notes column".' },
            best_guess: { type: ['string', 'null'] },
          },
          required: ['location', 'best_guess'],
        },
      },
      overall_confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
    },
    required: [
      'sheet_summary', 'format_description', 'sheet_date', 'class_or_group_name', 'teacher_name',
      'children', 'unattributed_notes', 'illegible_regions', 'overall_confidence',
    ],
  },
};

function buildPrompt(opts) {
  const parts = [];

  parts.push(
`You are reading a photograph of a Montessori teacher's handwritten classroom record sheet and transcribing it into structured data using the record_sheet_extraction tool.

Teachers design these sheets themselves, so the layout is arbitrary — a grid, a journal page, a checklist, a page torn from a notebook. Read the page on its own terms: work out its system first, then transcribe it.

THE ONE RULE THAT MATTERS: transcribe what is WRITTEN. You are a transcriber, not an interpreter and not a helper. Never invent, complete, correct or "improve" anything on the page. A blank is data — leave it null. Inventing a plausible work name for an illegible scrawl is the single worst failure you can produce here, far worse than admitting you cannot read it.

HOW TO HANDLE UNCERTAINTY
- If a field is unreadable, set it to null and add an entry to illegible_regions with location and, if you have one, a best_guess.
- If a field is readable but you are not sure, transcribe it and set field_confidence to medium or low. Use high only when you genuinely can read it cleanly.
- If a child's name is hard to read, still transcribe your best reading into child_name_raw and set name_legibility to 'partial' or 'guess'. Never drop a child.
- Never translate. Notes stay in the language they were written in.
- Child names go in exactly as written, including misspellings, nicknames and initials. Do not normalise or correct them.

STATUS MARKS — only assign a status when the sheet's own marks or words support it. If the sheet says nothing about status, status is null.
- Triangle convention (near universal in Montessori): one side drawn = presented; two sides = practicing; closed/filled triangle = mastered.
- Letter codes: P = presented, W (or Pr) = working/practicing, M = mastered.
- Tick conventions: a single tick usually means presented; repeated ticks or a circled/highlighted tick often mean practicing or mastered — only read this when the sheet has a legend or the pattern is unambiguous. Otherwise leave status null and put what you saw in the note.
- If the sheet uses a symbol system you cannot decode with confidence, describe it in format_description, put the raw mark in the note, and leave status null.

AMI CONCENTRATION CODES — wd = working distracted, WC = working concentrated, DC = deep concentration. Also (ic)/(sc)/(dc) for choice. These are NOT statuses. Put them in the entry's note (or general_note) verbatim, e.g. "DC".

CURRICULUM AREAS — map to one of: practical_life, sensorial, mathematics, language, cultural. Recognise the usual abbreviations: PL / P.L. / Practical = practical_life; Sens / S = sensorial; Math / M / Maths = mathematics; Lang / L = language; Cult / C / Culture / Geography / Botany / Zoology / History / Science = cultural. If the area is neither written nor obvious from the work name, leave it null — do not infer aggressively.

TIME — times may be written as ranges ("20-30"), clock start/end times ("9:15-9:40"), tallies, or bucket ticks ("<15", "15-30", "30+"). Convert to whole minutes only when unambiguous: a clock range becomes its duration; a numeric range becomes its midpoint. For tallies, bucket ticks or anything ambiguous, leave time_minutes null and record what was written in the note.

FORMAT_DESCRIPTION — be precise and concrete here. Quote column headers verbatim, list every symbol and code you saw with your reading of it, and say what is pre-printed versus handwritten. This field is used to design future record sheets, so detail is valuable.

Anything on the page that is clearly an observation but not tied to a specific child (a footer note, a margin comment about the class) goes in unattributed_notes.

Call record_sheet_extraction exactly once with your complete reading.`
  );

  if (opts.notes) {
    parts.push(`\nOPERATOR CONTEXT (trust this):\n${opts.notes}`);
  }
  if (opts.roster && opts.roster.length) {
    // The roster is a reading aid only — matching happens deterministically afterwards.
    parts.push(
      `\nCLASS ROSTER (reading aid only — these are the children who may appear on this sheet. ` +
      `Use it to read difficult handwriting, but STILL transcribe each name exactly as written on the page, ` +
      `not as spelled here. Do NOT add a child who is not on the sheet):\n${opts.roster.join(', ')}`
    );
  }
  return parts.join('\n');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Pull the forced tool_use payload out of a response, or null if it isn't there / is unusable. */
function readToolResult(msg) {
  const block = (msg?.content || []).find((b) => b.type === 'tool_use' && b.name === EXTRACTION_TOOL.name);
  if (!block || !block.input || typeof block.input !== 'object') return null;
  // A max_tokens truncation can yield a structurally present but incomplete payload.
  if (!Array.isArray(block.input.children)) return null;
  return block.input;
}

/**
 * One extraction call, with a single retry for a refusal / truncation / transient API error.
 * Never throws for API-shaped problems the caller should survive — it throws once, at the end,
 * and the caller records a failure for this sheet and continues the batch.
 */
async function extract(client, { modelId, image, prompt }) {
  let lastErr = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    const text = attempt === 1
      ? prompt
      : prompt + '\n\nYOUR PREVIOUS ATTEMPT DID NOT RETURN A USABLE record_sheet_extraction TOOL CALL. '
        + 'Return the tool call this time, and keep notes concise so the output completes.';

    let msg;
    try {
      msg = await client.messages.create({
        model: modelId,
        max_tokens: 8000,
        temperature: 0, // house rule: every durable extraction call is deterministic
        tools: [EXTRACTION_TOOL],
        tool_choice: { type: 'tool', name: EXTRACTION_TOOL.name },
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mime, data: image.base64 } },
            { type: 'text', text },
          ],
        }],
      });
    } catch (err) {
      lastErr = err;
      const status = err?.status ?? err?.response?.status;
      const transient = status === 429 || (status >= 500 && status < 600) || !status;
      if (attempt === 1 && transient) { await sleep(2500); continue; }
      throw new Error(`API error${status ? ` (${status})` : ''}: ${err?.message || String(err)}`);
    }

    const result = readToolResult(msg);
    if (result) return { result, usage: msg.usage, stopReason: msg.stop_reason };

    lastErr = new Error(
      `model returned no usable tool call (stop_reason: ${msg.stop_reason})` +
      (msg.stop_reason === 'max_tokens' ? ' — output was truncated at max_tokens' : '')
    );
    if (attempt === 1) continue;
  }

  throw lastErr;
}

// ── roster matching — Jaro-Winkler ────────────────────────────────────

function jaro(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const window = Math.max(0, Math.floor(Math.max(a.length, b.length) / 2) - 1);
  const aFlags = new Array(a.length).fill(false);
  const bFlags = new Array(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i++) {
    const lo = Math.max(0, i - window);
    const hi = Math.min(i + window + 1, b.length);
    for (let j = lo; j < hi; j++) {
      if (bFlags[j] || a[i] !== b[j]) continue;
      aFlags[i] = true; bFlags[j] = true; matches++;
      break;
    }
  }
  if (!matches) return 0;

  // Count transpositions among the matched characters.
  let k = 0, transpositions = 0;
  for (let i = 0; i < a.length; i++) {
    if (!aFlags[i]) continue;
    while (!bFlags[k]) k++;
    if (a[i] !== b[k]) transpositions++;
    k++;
  }
  transpositions /= 2;

  return (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3;
}

function jaroWinkler(a, b) {
  const j = jaro(a, b);
  if (j < 0.7) return j; // standard: no prefix bonus for weak matches
  let prefix = 0;
  while (prefix < 4 && prefix < a.length && prefix < b.length && a[prefix] === b[prefix]) prefix++;
  return j + prefix * 0.1 * (1 - j);
}

/** Best roster match for one raw name. Also tries first-token vs first-token ("Amy Liu" ≈ "Amy"). */
function matchRoster(rawName, roster) {
  const a = normalizeName(rawName);
  if (!a) return { matched_name: null, match_score: 0, match_verdict: 'unmatched' };

  let best = { name: null, score: 0 };
  for (const candidate of roster) {
    const b = normalizeName(candidate);
    if (!b) continue;
    const full = jaroWinkler(a, b);
    const first = jaroWinkler(a.split(' ')[0], b.split(' ')[0]);
    // First-name agreement is strong evidence in a class roster, but shouldn't
    // fully outrank a whole-string match — weight it slightly below.
    const score = Math.max(full, first * 0.97);
    if (score > best.score) best = { name: candidate, score };
  }

  const score = Math.round(best.score * 100) / 100;
  const verdict = score >= MATCH_CONFIDENT ? 'confident' : score >= MATCH_PROBABLE ? 'probable' : 'unmatched';
  return { matched_name: verdict === 'unmatched' ? null : best.name, match_score: score, match_verdict: verdict };
}

// ── cost ──────────────────────────────────────────────────────────────

function estimateCost(tier, usage) {
  const p = PRICES[tier];
  if (!p || !usage) return 0;
  const inTok = (usage.input_tokens || 0) + (usage.cache_creation_input_tokens || 0) + (usage.cache_read_input_tokens || 0);
  return (inTok / 1e6) * p.input + ((usage.output_tokens || 0) / 1e6) * p.output;
}

// ── review flags + reporting ──────────────────────────────────────────

/** Everything a human must eyeball before this sheet can be trusted. */
function reviewFlags(run) {
  const flags = [];
  const ex = run.extraction;

  if (ex.overall_confidence === 'low') flags.push('Overall sheet confidence is LOW — review the whole sheet.');

  (ex.children || []).forEach((child, i) => {
    const m = run.roster_matches?.[i];
    const who = child.child_name_raw || '(unnamed)';
    if (child.name_legibility !== 'clear') {
      flags.push(`Name "${who}" read as ${child.name_legibility} — confirm the child.`);
    }
    if (m && m.match_verdict !== 'confident') {
      flags.push(
        m.match_verdict === 'probable'
          ? `"${who}" matched to roster name "${m.matched_name}" at ${m.match_score.toFixed(2)} — confirm.`
          : `"${who}" did not match any roster name (best ${m.match_score.toFixed(2)}).`
      );
    }
    (child.entries || []).forEach((e) => {
      if (e.field_confidence === 'low') {
        flags.push(`${who} · "${e.work_name_raw || '(no work)'}" — LOW confidence fields.`);
      }
    });
  });

  (ex.illegible_regions || []).forEach((r) => {
    flags.push(`Illegible: ${r.location}${r.best_guess ? ` (best guess: "${r.best_guess}")` : ''}`);
  });

  return flags;
}

function countEntries(ex) {
  return (ex.children || []).reduce((n, c) => n + (c.entries?.length || 0), 0);
}

function renderRunSection(run) {
  const ex = run.extraction;
  const L = [];

  L.push(`## ${run.tier} — \`${run.model_id}\``);
  L.push('');
  L.push(`- Overall confidence: **${ex.overall_confidence}**`);
  L.push(`- Children: **${(ex.children || []).length}** · Entries: **${countEntries(ex)}**`);
  L.push(`- Tokens: ${run.usage?.input_tokens ?? '?'} in / ${run.usage?.output_tokens ?? '?'} out · est. cost **${usd(run.cost_estimate_usd)}**`);
  L.push(`- Sheet date: ${cell(ex.sheet_date)} · Class: ${cell(ex.class_or_group_name)} · Teacher: ${cell(ex.teacher_name)}`);
  L.push('');
  L.push('### Sheet summary');
  L.push(ex.sheet_summary || '_(none)_');
  L.push('');
  L.push('### Format description');
  L.push(ex.format_description || '_(none)_');
  L.push('');
  L.push('### Extracted entries');
  L.push('');
  L.push('| Name (raw) | Match | Work | Area | Status | Time | Confidence | Note |');
  L.push('| --- | --- | --- | --- | --- | --- | --- | --- |');

  (ex.children || []).forEach((child, i) => {
    const m = run.roster_matches?.[i];
    const matchCell = !m ? '—'
      : m.match_verdict === 'unmatched' ? `✗ unmatched (${m.match_score.toFixed(2)})`
      : `${m.match_verdict === 'confident' ? '✓' : '≈'} ${m.matched_name} (${m.match_score.toFixed(2)})`;
    const nameCell = `${cell(child.child_name_raw)}${child.name_legibility !== 'clear' ? ` _(${child.name_legibility})_` : ''}`;

    const entries = child.entries?.length ? child.entries : [null];
    entries.forEach((e, k) => {
      const n = k === 0 ? nameCell : '';
      const mm = k === 0 ? matchCell : '';
      if (!e) {
        L.push(`| ${n} | ${mm} | _no entries_ |  |  |  |  | ${cell(child.general_note)} |`);
        return;
      }
      const note = [e.note, k === 0 ? child.general_note : null].filter(Boolean).join(' · ');
      L.push(
        `| ${n} | ${mm} | ${cell(e.work_name_raw)} | ${cell(e.area)} | ${cell(e.status)} | ` +
        `${e.time_minutes == null ? '—' : `${e.time_minutes}m`} | ${cell(e.field_confidence)} | ${cell(note)} |`
      );
    });
  });
  L.push('');

  if (ex.unattributed_notes?.length) {
    L.push('### Unattributed notes');
    ex.unattributed_notes.forEach((n) => L.push(`- ${n}`));
    L.push('');
  }
  if (ex.illegible_regions?.length) {
    L.push('### Illegible regions');
    ex.illegible_regions.forEach((r) => L.push(`- **${r.location}** — best guess: ${r.best_guess ? `"${r.best_guess}"` : '_none_'}`));
    L.push('');
  }

  const flags = reviewFlags(run);
  L.push(`### ⚠ Needs human review (${flags.length})`);
  L.push(flags.length ? flags.map((f) => `- ${f}`).join('\n') : '_Nothing flagged — but spot-check anyway._');
  L.push('');
  return L.join('\n');
}

/** Field-level disagreement between two runs, matched on (child, work). */
function renderComparison(a, b) {
  // Key on (child, work) plus an occurrence counter, so a child who did the same
  // work twice in one day produces two comparable rows instead of silently collapsing.
  const index = (run) => {
    const map = new Map();
    const seen = new Map();
    const put = (child, work, entry) => {
      const base = `${normalizeName(child)}::${normalizeName(work || '')}`;
      const n = (seen.get(base) || 0) + 1;
      seen.set(base, n);
      map.set(n === 1 ? base : `${base}#${n}`, { child, entry });
    };
    (run.extraction.children || []).forEach((c) => {
      if (!c.entries?.length) { put(c.child_name_raw, '', null); return; }
      c.entries.forEach((e) => put(c.child_name_raw, e.work_name_raw, e));
    });
    return map;
  };
  // "no entries at all" and "an entry whose work name was unreadable" are different findings.
  const label = (v) => (!v.entry ? '(no entries)' : v.entry.work_name_raw ?? '(unnamed work)');

  const A = index(a), B = index(b);
  const L = ['## Comparison', ''];
  L.push(`| | ${a.tier} | ${b.tier} |`);
  L.push('| --- | --- | --- |');
  L.push(`| Children | ${(a.extraction.children || []).length} | ${(b.extraction.children || []).length} |`);
  L.push(`| Entries | ${countEntries(a.extraction)} | ${countEntries(b.extraction)} |`);
  L.push(`| Overall confidence | ${a.extraction.overall_confidence} | ${b.extraction.overall_confidence} |`);
  L.push(`| Review flags | ${reviewFlags(a).length} | ${reviewFlags(b).length} |`);
  L.push(`| Est. cost | ${usd(a.cost_estimate_usd)} | ${usd(b.cost_estimate_usd)} |`);
  L.push('');

  const disagreements = [];
  for (const [k, av] of A) {
    const bv = B.get(k);
    if (!bv) { disagreements.push(`- **only in ${a.tier}** — ${av.child} · ${label(av)}`); continue; }
    if (!av.entry || !bv.entry) continue;
    for (const field of ['area', 'status', 'time_minutes']) {
      if (av.entry[field] !== bv.entry[field]) {
        disagreements.push(
          `- **${av.child} · ${av.entry.work_name_raw ?? '(no work)'}** — \`${field}\`: ` +
          `${a.tier}=${JSON.stringify(av.entry[field])} vs ${b.tier}=${JSON.stringify(bv.entry[field])}`
        );
      }
    }
  }
  for (const [k, bv] of B) {
    if (!A.has(k)) disagreements.push(`- **only in ${b.tier}** — ${bv.child} · ${label(bv)}`);
  }

  L.push(`### Field-level disagreements (${disagreements.length})`);
  L.push(disagreements.length ? disagreements.join('\n') : '_The two models agree on every matched field._');
  L.push('');
  return L.join('\n');
}

function renderReport(file, runs, opts) {
  const L = [];
  L.push(`# Paper-scan extraction — ${path.basename(file)}`);
  L.push('');
  L.push(`- File: \`${file}\``);
  L.push(`- Run: ${new Date().toISOString()} · harness v${SCRIPT_VERSION}`);
  L.push(`- Roster: ${opts.roster?.length ? `${opts.roster.length} names` : 'not supplied'}`);
  if (opts.notes) L.push(`- Operator notes: ${opts.notes}`);
  L.push('');
  runs.forEach((r) => { L.push(renderRunSection(r)); L.push('---'); L.push(''); });
  if (runs.length === 2) L.push(renderComparison(runs[0], runs[1]));
  return L.join('\n');
}

// ── per-sheet orchestration ───────────────────────────────────────────

async function processSheet(client, file, tiers, models, opts, tmpDir) {
  const base = path.basename(file, path.extname(file));
  const outDir = opts.outDir || path.dirname(file);
  fs.mkdirSync(outDir, { recursive: true });

  const image = prepareImage(file, tmpDir);
  const prompt = buildPrompt(opts);
  const runs = [];

  for (const tier of tiers) {
    const started = Date.now();
    const { result, usage, stopReason } = await extract(client, {
      modelId: models[tier], image, prompt,
    });

    const rosterMatches = opts.roster
      ? (result.children || []).map((c, i) => ({ index: i, child_name_raw: c.child_name_raw, ...matchRoster(c.child_name_raw, opts.roster) }))
      : null;

    const run = {
      script_version: SCRIPT_VERSION,
      tier,
      model_id: models[tier],
      image: {
        file, bytes_sent: image.bytes, media_type: image.mime,
        resized: image.resized, converted_from_heic: image.converted,
      },
      usage,
      stop_reason: stopReason,
      cost_estimate_usd: estimateCost(tier, usage),
      elapsed_ms: Date.now() - started,
      timestamp: new Date().toISOString(),
      roster_used: Boolean(opts.roster),
      extraction: result,
      roster_matches: rosterMatches,
    };
    runs.push(run);

    const jsonName = tiers.length > 1 ? `${base}.extraction.${tier}.json` : `${base}.extraction.json`;
    fs.writeFileSync(path.join(outDir, jsonName), JSON.stringify(run, null, 2));
  }

  if (!opts.jsonOnly) {
    fs.writeFileSync(path.join(outDir, `${base}.report.md`), renderReport(file, runs, opts));
  }
  return { runs, outDir };
}

// ── main ──────────────────────────────────────────────────────────────

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const files = collectImages(opts.inputs);
  const apiKey = resolveApiKey(); // never printed

  const tiers = opts.compare ? ['haiku', 'sonnet'] : [opts.model];
  const models = {};
  const modelSources = {};
  for (const tier of tiers) {
    const { id, source } = resolveModelId(tier, tier === 'haiku' ? opts.haikuId : opts.sonnetId);
    models[tier] = id;
    modelSources[tier] = source;
  }

  // Loaded here rather than at the top so a missing dependency produces a sentence,
  // not a module-resolution stack trace.
  let Anthropic;
  try {
    ({ default: Anthropic } = await import('@anthropic-ai/sdk'));
  } catch {
    die(
      'Could not load @anthropic-ai/sdk.\n' +
      `  Expected it in the repo's node_modules (repo root: ${REPO_ROOT}).\n` +
      '  Run this script from inside the Montree repo, and make sure `npm install` has been run.'
    );
  }

  const client = new Anthropic({ apiKey, maxRetries: 0, timeout: 180_000 });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'montree-paper-scan-'));
  // Clean the scratch dir on EVERY exit path, including die() and uncaught errors.
  process.on('exit', () => { try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ } });

  out(`\nMontree paper-scan harness v${SCRIPT_VERSION}`);
  out(`  repo root : ${REPO_ROOT}`);
  for (const tier of tiers) out(`  ${tier.padEnd(6)}    : ${models[tier]}   [via ${modelSources[tier]}]`);
  out(`  sheets    : ${files.length}${opts.roster ? ` · roster ${opts.roster.length} names` : ''}`);
  out(`  image prep: ${HAS_SIPS ? 'sips available' : `NO sips (platform ${process.platform}) — originals sent as-is`}`);
  out('');

  let totalCost = 0, totalChildren = 0, totalEntries = 0, totalFlags = 0;
  const failures = [];

  for (const file of files) {
    const name = path.basename(file);
    try {
      const { runs, outDir } = await processSheet(client, file, tiers, models, opts, tmpDir);
      for (const r of runs) {
        const flags = reviewFlags(r).length;
        totalCost += r.cost_estimate_usd;
        totalChildren += (r.extraction.children || []).length;
        totalEntries += countEntries(r.extraction);
        totalFlags += flags;
        out(
          `  ok  ${name}  [${r.tier}]  ${(r.extraction.children || []).length} children · ` +
          `${countEntries(r.extraction)} entries · conf ${r.extraction.overall_confidence} · ` +
          `⚠${flags} · ${usd(r.cost_estimate_usd)} · ${(r.elapsed_ms / 1000).toFixed(1)}s`
        );
      }
      out(`      → ${outDir}`);
    } catch (err) {
      failures.push({ file: name, error: err?.message || String(err) });
      warn(`  FAIL ${name}  ${err?.message || err}`);
    }
  }

  const okSheets = files.length - failures.length;
  out('');
  out('BATCH SUMMARY');
  out(`  sheets ok        : ${okSheets}/${files.length}`);
  out(`  model runs       : ${okSheets * tiers.length}`);
  out(`  children found   : ${totalChildren}`);
  out(`  entries found    : ${totalEntries}`);
  out(`  review flags     : ${totalFlags}`);
  out(`  est. total cost  : ${usd(totalCost)}   (estimate only — prices drift)`);
  if (failures.length) {
    out(`  failures         : ${failures.length}`);
    failures.forEach((f) => out(`    - ${f.file}: ${f.error}`));
  }
  out('');

  // Non-zero exit only when nothing at all succeeded, so a batch with one bad
  // photo still reports success for the rest.
  if (okSheets === 0) process.exit(1);
}

main().catch((err) => {
  warn(`\nUNEXPECTED ERROR: ${err?.stack || err?.message || String(err)}\n`);
  process.exit(1);
});
