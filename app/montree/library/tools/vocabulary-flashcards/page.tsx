// /montree/library/tools/vocabulary-flashcards/page.tsx
// Thin wrapper. All the logic lives in
// components/vocabulary-flashcards/VocabularyFlashcards.tsx so the Picture
// Library hub can embed the same tool as a tab. This route renders it
// standalone — full page chrome, sessionStorage `photoBankExport` intake —
// exactly as it behaved before the extraction.
'use client';

import VocabularyFlashcards from '@/components/vocabulary-flashcards/VocabularyFlashcards';

export default function VocabularyFlashcardsPage() {
  return <VocabularyFlashcards />;
}
