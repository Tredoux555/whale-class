'use client';

import { useState, useEffect, useRef } from 'react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface TeachingInstructionsProps {
  childId: string;
  workName: string;
  area: string;
}

export default function TeachingInstructions({ childId, workName, area }: TeachingInstructionsProps) {
  const { t } = useI18n();
  const [isOpen, setIsOpen] = useState(false);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);
  const [cached, setCached] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const fetchInstructions = async (regenerate = false) => {
    // Abort any in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(false);

    try {
      const res = await montreeApi('/api/montree/guru/teaching-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, work_name: workName, area, regenerate }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error('Failed to fetch');
      }

      const data = await res.json();
      if (data.success && data.instructions) {
        setInstructions(data.instructions);
        setGeneratedAt(data.generated_at);
        setCached(data.cached || false);
      } else {
        setError(true);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    if (!isOpen && !instructions && !loading) {
      fetchInstructions();
    }
    setIsOpen(!isOpen);
  };

  const handleRegenerate = () => {
    fetchInstructions(true);
  };

  // Simple markdown renderer for the instructions
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('### ')) return <h4 key={i} className="font-bold text-sm text-violet-800 mt-3 mb-1">{line.slice(4)}</h4>;
      if (line.startsWith('## ')) return <h3 key={i} className="font-bold text-sm text-violet-900 mt-4 mb-1">{line.slice(3)}</h3>;
      if (line.startsWith('# ')) return <h2 key={i} className="font-bold text-base text-violet-900 mt-4 mb-2">{line.slice(2)}</h2>;

      // Numbered list
      const numMatch = line.match(/^(\d+)\.\s(.+)/);
      if (numMatch) {
        return (
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-violet-500 font-semibold text-xs min-w-[1.2rem]">{numMatch[1]}.</span>
            <span className="text-sm text-gray-700 leading-relaxed">{renderInline(numMatch[2])}</span>
          </div>
        );
      }

      // Bullet list
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return (
          <div key={i} className="flex gap-2 ml-1 mb-1">
            <span className="text-violet-400 mt-1">•</span>
            <span className="text-sm text-gray-700 leading-relaxed">{renderInline(line.slice(2))}</span>
          </div>
        );
      }

      // Empty line
      if (!line.trim()) return <div key={i} className="h-2" />;

      // Regular paragraph
      return <p key={i} className="text-sm text-gray-700 leading-relaxed mb-1">{renderInline(line)}</p>;
    });
  };

  // Render inline bold/italic
  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-gray-800">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return '';
    }
  };

  return (
    <div className="mt-1">
      {/* Toggle button */}
      <button
        onClick={handleToggle}
        className={`w-full py-2.5 font-bold rounded-xl text-sm flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
          isOpen
            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md'
            : 'bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-700 hover:from-violet-200 hover:to-indigo-200 border border-violet-200'
        }`}
      >
        🧠 {t('guru.teachingInstructions')}
        <span className={`text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
      </button>

      {/* Content area */}
      {isOpen && (
        <div className="mt-2 p-4 bg-gradient-to-b from-violet-50 to-indigo-50 rounded-xl border border-violet-100">
          {loading && (
            <div className="flex items-center gap-2 py-6 justify-center">
              <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-sm text-violet-600">{t('guru.instructionsLoading')}</span>
            </div>
          )}

          {error && !loading && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500 mb-2">{t('guru.instructionsError')}</p>
              <button
                onClick={() => fetchInstructions()}
                className="px-4 py-2 bg-violet-500 text-white text-sm font-semibold rounded-lg hover:bg-violet-600 active:scale-95"
              >
                {t('guru.instructionsRetry')}
              </button>
            </div>
          )}

          {instructions && !loading && (
            <>
              <div className="max-h-[60vh] overflow-y-auto pr-1">
                {renderMarkdown(instructions)}
              </div>
              <div className="flex items-center justify-between mt-3 pt-2 border-t border-violet-200/50">
                <span className="text-xs text-violet-400">
                  {cached ? '⚡ ' : ''}{t('guru.instructionsGenerated').replace('{date}', generatedAt ? formatDate(generatedAt) : '')}
                </span>
                <button
                  onClick={handleRegenerate}
                  className="px-3 py-1 text-xs font-semibold text-violet-600 bg-white/80 rounded-lg border border-violet-200 hover:bg-violet-50 active:scale-95"
                >
                  🔄 {t('guru.instructionsRegenerate')}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
