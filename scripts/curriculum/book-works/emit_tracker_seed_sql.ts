// scripts/curriculum/book-works/emit_tracker_seed_sql.ts
//
// Emits the hardcoded VALUES rows for montree_seed_dark_phonics_works() in
// migrations/344_dark_phonics_tracker.sql, generated FROM
// lib/montree/dark-phonics/tracker-works.ts so the migration's seed list and
// the app's TRACKER_LETTERS can never drift apart.
//
// Run with:
//   node --experimental-strip-types scripts/curriculum/book-works/emit_tracker_seed_sql.ts
//
// Paste the output into migration 344's VALUES list (inside
// montree_seed_dark_phonics_works()) whenever TRACKER_LETTERS changes.
// Only LIVE letters are emitted — a 'coming' letter has no published work
// pack, so it has nothing to seed into a classroom's curriculum yet.

import { TRACKER_LETTERS } from '../../../lib/montree/dark-phonics/tracker-works.ts';

function sqlString(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

const liveLetters = TRACKER_LETTERS.filter((l) => l.status === 'live');

const lines: string[] = [];
liveLetters.forEach((letter, i) => {
  const letterOrder = i + 1; // 1-based position among LIVE letters only
  for (const work of letter.works) {
    const workKey = work.id; // 'dp:<letter>:<n>'
    const name = work.name; // '<letter> Dark Phonics work <n>'
    const description = `${work.shortLabel} — ${letter.bookTitle}`;
    const sequence = letterOrder * 10 + work.n;
    lines.push(
      `    (${sqlString(workKey)}, ${sqlString(name)}, ${sqlString(description)}, ${sequence})`
    );
  }
});

console.log(lines.join(',\n') + ';');
