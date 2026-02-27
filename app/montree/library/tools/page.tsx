// /montree/library/tools/page.tsx
// Content Creation Tools - Montree Library
'use client';

import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';

const TOOLS = [
  {
    href: '/montree/library/tools/card-generator',
    icon: '🃏',
    titleKey: 'tools.card_generator',
    descKey: 'tools.card_generator_desc',
    gradient: 'from-emerald-500 to-teal-600',
  },
  {
    href: '/montree/library/tools/flashcard-maker',
    icon: '🎬',
    titleKey: 'tools.video_flashcard',
    descKey: 'tools.video_flashcard_desc',
    gradient: 'from-blue-500 to-cyan-600',
  },
  {
    href: '/montree/library/tools/label-maker',
    icon: '🏷️',
    titleKey: 'tools.label_generator',
    descKey: 'tools.label_generator_desc',
    gradient: 'from-purple-500 to-violet-600',
  },
  {
    href: '/montree/library/tools/vocabulary-flashcards',
    icon: '📸',
    titleKey: 'tools.vocab_flashcard',
    descKey: 'tools.vocab_flashcard_desc',
    gradient: 'from-amber-500 to-orange-600',
  },
  {
    href: '/montree/library/tools/dictionary',
    icon: '📖',
    titleKey: 'tools.my_dictionary',
    descKey: 'tools.my_dictionary_desc',
    gradient: 'from-indigo-500 to-blue-600',
  },
  // Material Generator hidden — subpar quality, code preserved in /montree/library/tools/material-generator
  {
    href: '/montree/library/tools/bingo',
    icon: '🎯',
    titleKey: 'tools.word_bingo',
    descKey: 'tools.word_bingo_desc',
    gradient: 'from-red-500 to-pink-600',
  },
  {
    href: '/montree/library/tools/picture-bingo',
    icon: '🖼️',
    titleKey: 'tools.picture_bingo',
    descKey: 'tools.picture_bingo_desc',
    gradient: 'from-teal-500 to-emerald-600',
  },
];

export default function LibraryToolsPage() {
  const { t } = useI18n();

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <Link href="/montree/library" className="text-emerald-300 text-sm hover:underline">
            ← {t('tools.back_to_library')}
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">
            {t('tools.content_creation')}
          </h1>
          <p className="text-emerald-200 mt-1">
            {t('tools.save_time')}
          </p>
        </div>
      </header>

      {/* Tools Grid */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`flex items-center gap-4 p-5 bg-gradient-to-br ${tool.gradient} rounded-2xl transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]`}
            >
              <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                <span className="text-3xl">{tool.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-bold text-lg">{t(tool.titleKey)}</div>
                <div className="text-white/80 text-sm">{t(tool.descKey)}</div>
              </div>
              <span className="text-white/60 text-xl shrink-0">→</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
