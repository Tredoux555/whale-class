// lib/montree/brand-kit/resolve.ts
// ============================================================================
// WHOSE EMBLEM PRINTS ON THIS SHEET — the one rule, in one place.
// ============================================================================
// A school configures a brand kit once and every document in the building
// prints with it. A single classroom may then configure its OWN — a room with
// a whale on the door, a bilingual stream with its own mark, a satellite site
// that shares a legal entity and nothing else. When both exist, the room wins:
// the person who chose the classroom emblem chose it for the sheets that come
// out of that room, and a school-wide default is exactly the thing a default
// is — what you get when nobody said otherwise.
//
// 🚨 "WINS" MEANS *ACTIVE* WINS, NOT "EXISTS" WINS — hence `isBrandKitActive`
// rather than a null check. A classroom kit that is switched off, or that has
// a stored row but nothing in it that would mark paper, is a room that has said
// NOTHING, and a room that has said nothing gets the school's default. That is
// the deliberate reading: "remove this room's emblem" must return the room to
// the building's sheet, not to a blank one, because a school that has bought
// into a theme did not ask for one room to start printing anonymously.
//
// The honest consequence, stated rather than hidden: there is no way to say
// "this ONE room prints plain while the school stays themed". Nothing has asked
// for it, and expressing it would need a third state on the room's kit — a
// stored "opt out" that is neither a theme nor an absence. If it is ever
// wanted, it belongs here as an explicit scope, not as a re-reading of the
// disabled flag, which every other screen already renders as "off".
//
// PURE. No I/O, no React, no locale. The API route reads the two JSONB bags,
// this decides, and the renderer is handed one answer — so the classroom rule
// cannot drift between the index screen, the print screen and the tools.

import { isBrandKitActive, parseBrandKit, type BrandKit } from './types';

/** Which record the printing kit came from. `'none'` = today's plain sheet. */
export type BrandScope = 'classroom' | 'school' | 'none';

export interface ResolvedBrandKit {
  /** The kit to render with, already proven active. `null` → plain paper. */
  kit: BrandKit | null;
  scope: BrandScope;
}

/**
 * Pull a validated kit out of a `settings` JSONB bag (`settings.brand_kit`).
 *
 * 🚨 NEVER THROWS, AND TREATS A NON-OBJECT AS ABSENT. The column is declared
 * JSONB, but a row that comes back as a JSON *string* — a text-typed column
 * somewhere, an older client — must read as "no kit" rather than being indexed
 * character by character. Everything else is `parseBrandKit`'s problem, which
 * is the only sanctioned gate into a BrandKit.
 */
export function readBrandKitFromSettings(settings: unknown): BrandKit | null {
  try {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) return null;
    return parseBrandKit((settings as Record<string, unknown>).brand_kit);
  } catch {
    return null;
  }
}

/**
 * The rule: an ACTIVE classroom kit, else an ACTIVE school kit, else nothing.
 *
 * Both arguments are the RAW stored kits — disabled ones included — because
 * the screens that EDIT a kit need to see an off switch that is off, and only
 * this function is allowed to turn "stored" into "printing".
 */
export function resolveBrandKit(
  classroomKit: BrandKit | null | undefined,
  schoolKit: BrandKit | null | undefined
): ResolvedBrandKit {
  try {
    if (isBrandKitActive(classroomKit)) return { kit: classroomKit, scope: 'classroom' };
    if (isBrandKitActive(schoolKit)) return { kit: schoolKit, scope: 'school' };
    return { kit: null, scope: 'none' };
  } catch {
    // Same posture as parseBrandKit: an unreadable theme prints the plain
    // sheet. It never takes a class document down with it.
    return { kit: null, scope: 'none' };
  }
}
