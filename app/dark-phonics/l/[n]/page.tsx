// app/dark-phonics/l/[n]/page.tsx
//
// The lesson deep link — the canonical share URL for one Dark Phonics book.
//
// /dark-phonics/l/5 opens the hub on Play with lesson 5's shelf already open.
// It is the link the share card hands out, the link a video description
// carries, and the only URL under this route with its own OG image.
//
// A number with no book is a 404 rather than a redirect to the hub: a dead
// share link should say it is dead, not silently show something else and make
// the sender think it worked.

import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import HubServer from '@/components/montree/dark-phonics/HubServer';
import { BOOK_WORKS_LESSON_NUMBERS, getBookWorks } from '@/lib/montree/dark-phonics/book-works';
import { lessonPath } from '@/lib/montree/dark-phonics/share';

export const dynamic = 'force-dynamic';

function parseLesson(raw: string): number | null {
  if (!/^\d{1,2}$/.test(raw)) return null;
  const n = Number(raw);
  return BOOK_WORKS_LESSON_NUMBERS.includes(n) ? n : null;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ n: string }>;
}): Promise<Metadata> {
  const { n: raw } = await params;
  const n = parseLesson(raw);
  const lesson = n === null ? null : getBookWorks(n);
  // `n === null` is redundant at runtime (a null n gives a null lesson) and
  // required by the compiler: it is what narrows n to a number below.
  if (n === null || !lesson) return { title: 'Dark Phonics · Montree' };

  const title = `${lesson.bookTitle} — Dark Phonics lesson ${n} · Montree`;
  const description = `Lesson ${n}: the sound "${lesson.letter}". Read ${lesson.bookTitle} page by page, then match, build and trace it. Free to play, no signup.`;

  return {
    title,
    description,
    alternates: { canonical: lessonPath(n) },
    openGraph: {
      type: 'article',
      siteName: 'Montree',
      title,
      description,
      url: lessonPath(n),
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function DarkPhonicsLessonPage({
  params,
  searchParams,
}: {
  params: Promise<{ n: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ n: raw }, sp] = await Promise.all([params, searchParams]);
  const n = parseLesson(raw);
  if (n === null) notFound();

  return <HubServer searchParams={sp} lesson={n} tab="play" />;
}
