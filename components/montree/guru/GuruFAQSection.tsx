'use client';

import { useState } from 'react';
import { FAQ_ENTRIES, FAQEntry } from '@/lib/montree/guru/faq-cache';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';

interface GuruFAQSectionProps {
  childAge?: number; // filter by age range if provided
}

export default function GuruFAQSection({ childAge }: GuruFAQSectionProps) {
  const { t } = useI18n();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Filter FAQs by child age if provided
  const filteredFaqs = childAge
    ? FAQ_ENTRIES.filter(faq => {
        return faq.ageRanges.some(range => {
          const [min, max] = range.split('-').map(Number);
          return childAge >= min && childAge <= max;
        });
      })
    : FAQ_ENTRIES;

  // Show first 5 by default, all if expanded
  const visibleFaqs = showAll ? filteredFaqs : filteredFaqs.slice(0, 5);

  const toggle = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id));
  };

  // Simple markdown renderer for FAQ answers
  const renderMarkdown = (text: string) => {
    return text.split('\n\n').map((block, i) => {
      // Bold headers like **Text:**
      if (block.startsWith('**') && block.includes(':**')) {
        const parts = block.split(/\*\*(.*?)\*\*/g);
        return (
          <p key={i} className="mb-3 text-sm leading-relaxed text-gray-700">
            {parts.map((part, j) =>
              j % 2 === 1 ? (
                <strong key={j} className="text-gray-900 font-semibold">{part}</strong>
              ) : (
                <span key={j}>{part}</span>
              )
            )}
          </p>
        );
      }

      // Bullet lists
      if (block.includes('\n-')) {
        const lines = block.split('\n');
        const header = lines[0];
        const items = lines.filter(l => l.startsWith('-'));
        return (
          <div key={i} className="mb-3">
            {header && !header.startsWith('-') && (
              <p className="text-sm font-semibold text-gray-900 mb-1">
                {header.replace(/\*\*/g, '')}
              </p>
            )}
            <ul className="list-disc list-inside space-y-1">
              {items.map((item, j) => (
                <li key={j} className="text-sm text-gray-700 leading-relaxed">
                  {item.replace(/^-\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1')}
                </li>
              ))}
            </ul>
          </div>
        );
      }

      // Regular paragraphs with inline bold
      const parts = block.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="mb-3 text-sm leading-relaxed text-gray-700">
          {parts.map((part, j) =>
            j % 2 === 1 ? (
              <strong key={j} className="text-gray-900 font-semibold">{part}</strong>
            ) : (
              <span key={j}>{part}</span>
            )
          )}
        </p>
      );
    });
  };

  if (filteredFaqs.length === 0) return null;

  return (
    <div className={`${HOME_THEME.card} rounded-2xl p-4`}>
      <h3 className={`text-base font-semibold ${HOME_THEME.textPrimary} mb-3 flex items-center gap-2`}>
        <span>🌿</span>
        <span>{t('guru.commonQuestions')}</span>
      </h3>

      <div className="space-y-2">
        {visibleFaqs.map((faq: FAQEntry) => {
          const isExpanded = expandedId === faq.id;
          return (
            <div
              key={faq.id}
              className={`rounded-xl border transition-all duration-200 ${
                isExpanded
                  ? 'border-emerald-300 bg-white shadow-sm'
                  : 'border-gray-100 bg-white/60 hover:bg-white hover:border-gray-200'
              }`}
            >
              <button
                onClick={() => toggle(faq.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between gap-3"
              >
                <span className={`text-sm font-medium ${HOME_THEME.textPrimary}`}>
                  {faq.question}
                </span>
                <span
                  className={`text-lg transition-transform duration-200 flex-shrink-0 ${
                    isExpanded ? 'rotate-45' : ''
                  }`}
                >
                  +
                </span>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                  {renderMarkdown(faq.answer)}
                  <div className="mt-3 pt-3 border-t border-gray-50">
                    <p className="text-xs text-gray-400">
                      {t('guru.deeperQuestion')}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filteredFaqs.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className={`mt-3 w-full text-center text-sm font-medium ${HOME_THEME.textAccent} py-2`}
        >
          {showAll ? t('guru.showLess') : t('guru.showAll').replace('{count}', filteredFaqs.length.toString())}
        </button>
      )}
    </div>
  );
}
