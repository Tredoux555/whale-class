// /montree/library/tools/sentence-match-generator/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n/context';
import CardGenerator from '@/components/card-generator/CardGenerator';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';

/**
 * Sentence Match Picture Generator (library route).
 *
 * Same shared <CardGenerator> as the 3-Part Card Generator — same upload, crop,
 * photo bank, borders, A4 layout, adaptive font sizing. Only the user-facing
 * copy and header gradient differ. Card.label holds a sentence in this context.
 */
export default function LibrarySentenceMatchGeneratorPage() {
  const router = useRouter();
  const { t } = useI18n();

  return (
    <>
      <div className="bg-[#1565c0] px-4 py-2.5 flex items-center justify-between">
        <Link href="/montree/library" className="flex items-center gap-2 group">
          <MontreeLogo size={26} />
          <span className="text-white font-semibold text-sm group-hover:text-blue-200 transition-colors">Library</span>
        </Link>
        <LanguageToggle />
      </div>
      <CardGenerator
        layoutMode="strip"
      headerConfig={{
        title: `📖 ${t('library.sentenceMatchGeneratorTitle')}`,
        subtitle: t('library.sentenceMatchGeneratorSubtitle'),
        gradientStart: '#1565c0',
        gradientEnd: '#42a5f5',
        centered: false,
        showBackButton: true,
        backButtonLabel: `← ${t('library.toolsBack')}`,
        onBackClick: () => router.push('/montree/library/tools'),
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
    </>
  );
}
