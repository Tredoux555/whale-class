// lib/montree/feedback/validate.ts
//
// Hand-rolled input validation. The repo has no zod (checked: not in
// package.json), and adding a dependency for eleven routes would be the tail
// wagging the dog. These are pure functions over `unknown`, so they are unit
// testable and they never trust a body.

import type { PostType, ProblemTemplate } from './types';
import { isFlagReason, isPostStatus, isPostType, isSortKey } from './types';

export const LIMITS = {
  title: { min: 6, max: 140 },
  body: { min: 0, max: 8000 },
  comment: { min: 2, max: 4000 },
  name: { min: 2, max: 40 },
  email: { max: 200 },
  templateField: 2000,
  /** A guest post with more links than this is almost always spam. */
  guestLinks: 2,
} as const;

export interface FieldError {
  field: string;
  message: string;
}

export class ValidationError extends Error {
  readonly errors: FieldError[];
  constructor(errors: FieldError[]) {
    super(errors.map((e) => e.field + ': ' + e.message).join('; '));
    this.name = 'ValidationError';
    this.errors = errors;
  }
}

export function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

// Control characters and the zero-width family. Stripping the zero-width
// joiners matters as much as the control ones: they are how spam smuggles a
// banned word past a filter while it still reads normally to a person.
//
// Built from CODE POINTS, not written as a regex literal, on purpose: a
// character class full of control-character escapes is exactly the line that
// an editor, a copy-paste or a file transfer silently mangles, and the damage
// would not show up until a real post came through wrong.
const ZERO_WIDTH = new Set([0x200b, 0x200c, 0x200d, 0x200e, 0x200f, 0x2028, 0x2029, 0xfeff]);

function isStrippable(code: number, keepNewlines: boolean): boolean {
  if (code === 0x0a) return !keepNewlines;
  if (code === 0x09) return false; // tab survives; clean() collapses it
  if (code <= 0x1f) return true; // C0 controls, carriage return included
  if (code === 0x7f) return true; // DEL
  return ZERO_WIDTH.has(code);
}

function stripControls(input: string, keepNewlines: boolean): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0);
    if (code === undefined) continue;
    if (isStrippable(code, keepNewlines)) {
      // A stripped line break still separates two words.
      if (code === 0x0a || code === 0x0d) out += ' ';
      continue;
    }
    out += ch;
  }
  return out;
}

/** Collapse whitespace, strip control characters, trim. Single-line fields. */
export function clean(value: unknown, max: number): string {
  return stripControls(str(value), false)
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

/** Same, but newlines survive: bodies and comments are written in paragraphs. */
export function cleanMultiline(value: unknown, max: number): string {
  return stripControls(str(value).replace(/\r\n/g, '\n'), true)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{4,}/g, '\n\n\n')
    .trim()
    .slice(0, max);
}

export function countLinks(text: string): number {
  // The alternatives are ordered longest-first and consume the whole link, so
  // "https://x.com" counts once rather than twice (scheme + domain).
  const matches = text.match(
    /\bhttps?:\/\/\S+|\bwww\.\S+|\b[a-z0-9-]+\.(?:com|net|org|cn|xyz|io|co|ru|top)\b/gi,
  );
  return matches ? matches.length : 0;
}

export function isValidEmail(value: string): boolean {
  if (!value || value.length > LIMITS.email.max) return false;
  return /^[^\s@]+@[^\s@.]+\.[^\s@]{2,}$/.test(value);
}

export function isUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

// ── The honeypot ────────────────────────────────────────────────────────────
//
// A field a person never sees and a naive bot always fills. Named `website`
// because that is the name the bots look for, and it costs a human nothing.

export const HONEYPOT_FIELD = 'website';

export function honeypotTripped(body: Record<string, unknown>): boolean {
  const v = body[HONEYPOT_FIELD];
  return typeof v === 'string' && v.trim().length > 0;
}

// ── Composite validators ────────────────────────────────────────────────────

export interface ValidatedPost {
  type: PostType;
  title: string;
  body: string;
  template: ProblemTemplate | null;
  tags: string[];
  screenshotPath: string | null;
  guestName: string | null;
  guestEmail: string | null;
}

export function validateNewPost(
  body: Record<string, unknown>,
  opts: { isGuest: boolean; needsGuestIdentity: boolean },
): ValidatedPost {
  const errors: FieldError[] = [];

  const type = body.type;
  if (!isPostType(type)) {
    errors.push({ field: 'type', message: 'must be problem, idea, question or discussion' });
  }

  const title = clean(body.title, LIMITS.title.max);
  if (title.length < LIMITS.title.min) {
    errors.push({ field: 'title', message: 'at least ' + LIMITS.title.min + ' characters' });
  }

  const text = cleanMultiline(body.body, LIMITS.body.max);

  let template: ProblemTemplate | null = null;
  if (type === 'problem') {
    const raw = (body.template ?? {}) as Record<string, unknown>;
    template = {
      what: cleanMultiline(raw.what, LIMITS.templateField) || undefined,
      expected: cleanMultiline(raw.expected, LIMITS.templateField) || undefined,
      where: clean(raw.where, 300) || undefined,
      userAgent: clean(raw.userAgent, 300) || undefined,
      url: clean(raw.url, 500) || undefined,
    };
    if (!template.what && !text) {
      errors.push({ field: 'template.what', message: 'tell us what happened' });
    }
  } else if (!text && type !== 'question') {
    errors.push({ field: 'body', message: 'say a little more' });
  }

  // Guest link budget. A signed-in teacher linking three docs is fine; an
  // anonymous first post carrying four links is not.
  if (opts.isGuest) {
    const links = countLinks(
      title + ' ' + text + ' ' + (template?.what ?? '') + ' ' + (template?.expected ?? ''),
    );
    if (links > LIMITS.guestLinks) {
      errors.push({ field: 'body', message: 'too many links for a first post' });
    }
  }

  let guestName: string | null = null;
  let guestEmail: string | null = null;
  if (opts.needsGuestIdentity) {
    guestName = clean(body.name, LIMITS.name.max);
    guestEmail = clean(body.email, LIMITS.email.max).toLowerCase();
    if (guestName.length < LIMITS.name.min) {
      errors.push({ field: 'name', message: 'tell us what to call you' });
    }
    if (!isValidEmail(guestEmail)) {
      errors.push({ field: 'email', message: 'we need a working address to tell you about replies' });
    }
  }

  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .map((t) => clean(t, 40).toLowerCase())
        .filter((t) => /^[a-z0-9-]{2,40}$/.test(t))
        .slice(0, 5)
    : [];

  const screenshotPath = clean(body.screenshotPath, 300) || null;
  if (screenshotPath && !/^[a-zA-Z0-9._/-]+$/.test(screenshotPath)) {
    errors.push({ field: 'screenshotPath', message: 'not an upload from this board' });
  }

  if (errors.length) throw new ValidationError(errors);

  return {
    type: type as PostType,
    title,
    body: text,
    template,
    tags,
    screenshotPath,
    guestName,
    guestEmail,
  };
}

export interface ValidatedComment {
  body: string;
  quoteOf: string | null;
  guestName: string | null;
  guestEmail: string | null;
}

export function validateComment(
  body: Record<string, unknown>,
  opts: { isGuest: boolean; needsGuestIdentity: boolean },
): ValidatedComment {
  const errors: FieldError[] = [];
  const text = cleanMultiline(body.body, LIMITS.comment.max);
  if (text.length < LIMITS.comment.min) {
    errors.push({ field: 'body', message: 'write something first' });
  }
  if (opts.isGuest && countLinks(text) > LIMITS.guestLinks) {
    errors.push({ field: 'body', message: 'too many links' });
  }

  const quoteOfRaw = clean(body.quoteOf, 64);
  const quoteOf = isUuid(quoteOfRaw) ? quoteOfRaw : null;

  let guestName: string | null = null;
  let guestEmail: string | null = null;
  if (opts.needsGuestIdentity) {
    guestName = clean(body.name, LIMITS.name.max);
    guestEmail = clean(body.email, LIMITS.email.max).toLowerCase();
    if (guestName.length < LIMITS.name.min) {
      errors.push({ field: 'name', message: 'tell us what to call you' });
    }
    if (!isValidEmail(guestEmail)) {
      errors.push({ field: 'email', message: 'we need a working address' });
    }
  }

  if (errors.length) throw new ValidationError(errors);
  return { body: text, quoteOf, guestName, guestEmail };
}

/** Query-string parsing for the list route. Unknown values fall back, never throw. */
export function parseListParams(params: URLSearchParams) {
  const type = params.get('type');
  const status = params.get('status');
  const sort = params.get('sort');
  const limit = Number(params.get('limit'));
  return {
    q: clean(params.get('q'), 120) || undefined,
    type: isPostType(type) ? type : undefined,
    status: isPostStatus(status) ? status : undefined,
    sort: isSortKey(sort) ? sort : undefined,
    cursor: params.get('cursor') || null,
    limit: Number.isFinite(limit) && limit > 0 ? Math.min(50, Math.floor(limit)) : undefined,
  };
}

export { isFlagReason };
