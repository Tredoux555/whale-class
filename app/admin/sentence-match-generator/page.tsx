"use client";

import CardGenerator from '@/components/card-generator/CardGenerator';

/**
 * Sentence Match Picture Generator.
 *
 * Reuses the canonical <CardGenerator> component (same upload, crop, photo bank,
 * borders, A4 layout, adaptive font sizing — every pixel-tuned detail) and only
 * overrides the user-facing copy so it reads as a sentence-card tool.
 *
 * The Card.label field stores a sentence in this context. The print-utils
 * `adaptiveLabelFontSize()` helper already shrinks-to-fit and word-wraps,
 * so longer text just flows onto multiple lines inside the label area.
 *
 * Default card size on this route is 12cm — sentences need a bit more room
 * than single words. Teachers can still bump it up via the Card Size dropdown.
 */
export default function AdminSentenceMatchGeneratorPage() {
  return (
    <CardGenerator
      layoutMode="strip"
      headerConfig={{
        title: '📖 Sentence Match Picture Generator',
        subtitle: 'Create three-part sentence cards — sentence to match a picture',
        gradientStart: '#1565c0',
        gradientEnd: '#42a5f5',
        centered: true,
        showBackButton: false,
      }}
      textConfig={{
        bulkTabLabel: '📝 Bulk Sentences',
        bulkInstructions: 'Enter one sentence per line. Sentences will be applied to cards in order.',
        bulkPlaceholder: 'The cat sits on the mat.\nI see a big red dog.\nA bird flies in the sky.\n...',
        bulkButtonLabel: 'Apply Sentences to Cards',
        emptyStateText: 'Upload some images to get started!',
        infoSectionTitle: 'ℹ️ About Sentence Match Cards',
        infoSectionLead: 'Sentence match cards work the same way as Montessori three-part cards — only the label is a full sentence instead of a single word:',
        infoSectionItems: [
          { strong: 'Control Card:', body: 'Picture + sentence together (used for self-checking)' },
          { strong: 'Picture Card:', body: 'Image only (for matching)' },
          { strong: 'Sentence Card:', body: 'Sentence only (for reading practice)' },
        ],
        infoSectionFooter: 'Children match picture cards and sentence cards, then use the control cards to verify their work. This self-correcting format builds reading fluency, comprehension, and confidence with longer text.',
      }}
    />
  );
}
