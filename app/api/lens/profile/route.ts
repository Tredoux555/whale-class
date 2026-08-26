// GET  /api/lens/profile — her letterhead, title and style preferences.
// PATCH /api/lens/profile — edit them.
//
// 🚨 THE INVITE CODE IS NOT EDITABLE HERE, and is never returned. Rotating the
// credential that is the entire front door is an operator act (one UPDATE, see
// docs/LENS_BUILD_LOG.md), not a field on a settings form that a stolen session
// could use to lock her out of her own account.

import { NextRequest, NextResponse } from 'next/server';
import { lensDb, loadObserver } from '@/lib/lens/db';
import {
  badRequest,
  lensError,
  readJson,
  requireObserver,
  stringArray,
  text,
} from '@/lib/lens/route-helpers';
import { isLensLanguage, type LensStyleProfile } from '@/lib/lens/types';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;
  try {
    const observer = await loadObserver(lensDb(), session.observerId);
    if (!observer) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    return NextResponse.json({ observer });
  } catch (error) {
    return lensError('profile:get', error);
  }
}

/** Only the fields listed here can ever be written from a request body. */
const TEXT_FIELDS = [
  'name',
  'title',
  'credentials',
  'organisation',
  'letterhead_name',
  'letterhead_line1',
  'letterhead_line2',
  'letterhead_email',
  'letterhead_phone',
  'signature_text',
] as const;

function buildStyleProfile(raw: unknown): LensStyleProfile | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const o = raw as Record<string, unknown>;
  const profile: LensStyleProfile = {};
  if (o.sentence_length === 'short' || o.sentence_length === 'medium' || o.sentence_length === 'long') {
    profile.sentence_length = o.sentence_length;
  }
  if (o.formality === 'warm' || o.formality === 'neutral' || o.formality === 'formal') {
    profile.formality = o.formality;
  }
  if (o.directness === 'gentle' || o.directness === 'balanced' || o.directness === 'blunt') {
    profile.directness = o.directness;
  }
  const fav = stringArray(o.favourite_phrases, 20, 120);
  if (fav.length) profile.favourite_phrases = fav;
  const avoid = stringArray(o.avoid_phrases, 20, 120);
  if (avoid.length) profile.avoid_phrases = avoid;
  const notes = text(o.notes, 2000);
  if (notes) profile.notes = notes;
  return profile;
}

export async function PATCH(request: NextRequest) {
  const session = await requireObserver(request);
  if (session instanceof NextResponse) return session;

  const body = await readJson(request);
  if (body instanceof NextResponse) return body;

  const updates: Record<string, unknown> = {};
  for (const field of TEXT_FIELDS) {
    if (!(field in body)) continue;
    const value = text(body[field], field === 'signature_text' ? 500 : 200);
    // `name` is NOT NULL in the schema — an empty name is a mistake, not an
    // instruction to clear it.
    if (field === 'name' && !value) return badRequest('Your name can’t be empty.');
    updates[field] = value;
  }

  if ('default_languages' in body) {
    const langs = stringArray(body.default_languages, 4, 8).filter(isLensLanguage);
    if (langs.length === 0) return badRequest('Pick at least one report language.');
    updates.default_languages = langs;
  }

  if ('style_profile' in body) {
    const profile = buildStyleProfile(body.style_profile);
    // An explicit `{}` means "forget what you learned about my voice", which is
    // a legitimate thing to want and must not be confused with "no change".
    updates.style_profile = profile ?? {};
  }

  if (Object.keys(updates).length === 0) return badRequest('Nothing to update.');

  try {
    const { error } = await lensDb()
      .from('lens_observers')
      .update(updates)
      .eq('id', session.observerId);
    if (error) throw error;
    const observer = await loadObserver(lensDb(), session.observerId);
    return NextResponse.json({ ok: true, observer });
  } catch (error) {
    return lensError('profile:patch', error);
  }
}
