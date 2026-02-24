// components/montree/guru/ConcernDetailModal.tsx
// Full-screen modal showing personalized concern guide from the Guru
// Fetches from /api/montree/guru/concern, renders markdown-like response
'use client';

import { useState, useEffect } from 'react';
import { getConcernById } from '@/lib/montree/guru/concern-mappings';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface ConcernDetailModalProps {
  childId: string;
  childName: string;
  concernId: string;
  onClose: () => void;
}

export default function ConcernDetailModal({ childId, childName, concernId, onClose }: ConcernDetailModalProps) {
  const [guide, setGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const concern = getConcernById(concernId);

  useEffect(() => {
    if (!concernId || !childId) return;

    setLoading(true);
    setError(null);

    fetch(`/api/montree/guru/concern?child_id=${childId}&concern_id=${concernId}`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setGuide(data.guide);
        } else {
          setError(data.error || 'Failed to load guide');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Something went wrong. Please try again.');
        setLoading(false);
      });
  }, [childId, concernId]);

  // Simple markdown-to-HTML renderer for the Guru response
  function renderGuide(text: string) {
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.startsWith('## ')) {
        elements.push(
          <h2 key={i} className={`text-xl font-bold ${HOME_THEME.headingText} mt-6 mb-2`}>
            {line.replace('## ', '')}
          </h2>
        );
      } else if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className={`text-lg font-semibold ${HOME_THEME.headingText} mt-5 mb-2`}>
            {line.replace('### ', '')}
          </h3>
        );
      } else if (line.startsWith('#### ')) {
        elements.push(
          <h4 key={i} className={`text-base font-semibold ${HOME_THEME.headingText} mt-4 mb-1`}>
            {line.replace('#### ', '')}
          </h4>
        );
      } else if (line.startsWith('- **') || line.startsWith('- ')) {
        // Bold list item
        const content = line.replace(/^- /, '');
        elements.push(
          <div key={i} className="flex gap-2 ml-2 mb-1.5">
            <span className="text-[#4ADE80] mt-0.5 shrink-0">●</span>
            <span className={`text-sm ${HOME_THEME.headingText} leading-relaxed`}
              dangerouslySetInnerHTML={{ __html: content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
            />
          </div>
        );
      } else if (line.startsWith('**') && line.endsWith('**')) {
        elements.push(
          <p key={i} className={`text-sm font-semibold ${HOME_THEME.headingText} mt-3 mb-1`}>
            {line.replace(/\*\*/g, '')}
          </p>
        );
      } else if (line.trim()) {
        elements.push(
          <p key={i} className={`text-sm ${HOME_THEME.headingText}/80 leading-relaxed mb-2`}
            dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }}
          />
        );
      }
    }

    return elements;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#FFF8E7]">
      {/* Header */}
      <div className={`${HOME_THEME.headerBg} text-white px-4 py-4 flex items-center gap-3 shrink-0`}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          ←
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">{concern?.icon}</span>
            <span className="font-bold text-lg truncate">{concern?.title}</span>
          </div>
          <p className="text-emerald-300 text-sm">Personalized guide for {childName}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-20">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="animate-bounce text-4xl mb-4">🌿</div>
            <p className={`${HOME_THEME.headingText} font-medium`}>
              Creating {childName}&apos;s personalized guide...
            </p>
            <p className={`text-sm ${HOME_THEME.subtleText} mt-1`}>
              This takes a few seconds
            </p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="text-4xl mb-4">😔</div>
            <p className={`${HOME_THEME.headingText} font-medium`}>{error}</p>
            <button
              onClick={() => {
                setLoading(true);
                setError(null);
                fetch(`/api/montree/guru/concern?child_id=${childId}&concern_id=${concernId}`)
                  .then(r => r.json())
                  .then(data => {
                    if (data.success) setGuide(data.guide);
                    else setError(data.error || 'Failed');
                    setLoading(false);
                  })
                  .catch(() => { setError('Failed'); setLoading(false); });
              }}
              className={`mt-4 px-6 py-2 rounded-full ${HOME_THEME.primaryBtn} text-sm font-medium`}
            >
              Try Again
            </button>
          </div>
        )}

        {guide && !loading && (
          <div className={`${HOME_THEME.cardBg} rounded-2xl border ${HOME_THEME.border} p-5`}>
            {renderGuide(guide)}
          </div>
        )}
      </div>
    </div>
  );
}
