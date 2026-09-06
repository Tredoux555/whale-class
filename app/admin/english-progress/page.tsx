// app/admin/english-progress/page.tsx
//
// 🛑 RETIRED 2026-09-06 — Tracking Constitution rule 8.
//
// This page was a hand-maintained English "journey" board: a teacher picked
// a stage (Oral → Sound games → Sandpaper letters → Moveable alphabet →
// Pink/Blue/Green) per child, ticked skills, and typed a percentage. It
// POSTed to /api/english-progress — an endpoint that no longer exists in
// this repo — so every save has silently failed for some time, and the
// numbers it displayed were typed rather than observed.
//
// It is retired for the same reason the 128-lesson pointer is: it was a
// SECOND English sequence competing with Dark Phonics, and mastery is not
// something a human types. A letter is finished when its five Dark Phonics
// works are mastered (rules 1 and 7), derived from the progress journal.
//
// The real view is Classroom Overview → English Progress (the ribbon), fed
// by GET /api/montree/dashboard/english-progress. Ticking works happens in
// the tracker, through the one door.

'use client';

import Link from 'next/link';

export default function RetiredEnglishProgressPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', background: '#0F1B14' }}>
      <div style={{ maxWidth: '34rem', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px', padding: '1.75rem' }}>
        <h1 style={{ color: '#F4F1EA', fontSize: '1.15rem', fontWeight: 600, margin: '0 0 0.75rem' }}>
          English progress is now derived
        </h1>
        <p style={{ color: 'rgba(244,241,234,0.72)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 0.75rem' }}>
          This board asked a teacher to type where each child stood in English.
          Mastery is no longer typed: a Dark Phonics book is finished when its
          five works are mastered, and that is read straight from the progress
          journal.
        </p>
        <p style={{ color: 'rgba(244,241,234,0.72)', fontSize: '0.9rem', lineHeight: 1.6, margin: '0 0 1.1rem' }}>
          Retired: mastery is derived from Dark Phonics works (see tracker).
        </p>
        <Link
          href="/montree/dashboard/classroom-overview"
          style={{ color: '#86efac', fontSize: '0.9rem', textDecoration: 'underline' }}
        >
          Open Classroom Overview → English Progress
        </Link>
      </div>
    </div>
  );
}
