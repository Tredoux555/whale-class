'use client';

import { useState } from 'react';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface GuruWorkGuideProps {
  workName: string;
  childId: string;
  childAge?: number;
}

export default function GuruWorkGuide({ workName, childId, childAge }: GuruWorkGuideProps) {
  const [guide, setGuide] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [videoTerms, setVideoTerms] = useState<string[]>([]);

  const fetchGuide = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/guru/work-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_name: workName,
          child_id: childId,
          child_age: childAge,
        }),
      });
      if (!res.ok) throw new Error(`Work guide fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setGuide(data.guide);
        setVideoTerms(data.video_terms || []);
        setExpanded(true);
      } else {
        setError(data.error || 'Could not generate guide');
      }
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-to-JSX renderer
  const renderGuide = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-lg font-bold text-[#0D3330] mt-4 mb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-base font-semibold text-[#0D3330] mt-3 mb-1">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('#### ')) {
        return <h4 key={i} className="text-sm font-semibold text-[#164340] mt-2 mb-1">{line.replace('#### ', '')}</h4>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-[#0D3330] mt-1 text-sm">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 text-[#0D3330]/80 text-sm">{renderInlineBold(line.slice(2))}</li>;
      }
      if (/^\d+\.\s/.test(line)) {
        return <li key={i} className="ml-4 text-[#0D3330]/80 text-sm list-decimal">{renderInlineBold(line.replace(/^\d+\.\s/, ''))}</li>;
      }
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      return <p key={i} className="text-[#0D3330]/80 text-sm">{renderInlineBold(line)}</p>;
    });
  };

  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#0D3330]">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  // Not loaded yet — show the button
  if (!guide && !loading && !error) {
    return (
      <button
        onClick={fetchGuide}
        className="w-full py-2.5 bg-gradient-to-r from-[#0D3330] to-[#164340] text-white font-bold rounded-xl text-sm flex items-center justify-center gap-2 hover:from-[#164340] hover:to-[#1a5450] active:scale-95 transition-all shadow-md"
      >
        <span>🌿</span>
        <span>How to Present This</span>
      </button>
    );
  }

  return (
    <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-xl overflow-hidden mt-2`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D3330] to-[#164340] px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">🌿</span>
          <span className="text-white font-semibold text-sm">Presentation Guide</span>
        </div>
        {guide && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-2 py-1 bg-white/20 hover:bg-white/30 text-white text-xs rounded-lg transition-colors"
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-4 py-6 text-center">
          <div className="animate-pulse text-2xl mb-2">🌱</div>
          <p className="text-[#0D3330]/60 text-xs">Preparing your guide for {workName}...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchGuide} className="text-[#0D3330] underline text-sm mt-1">Try again</button>
        </div>
      )}

      {/* Guide content */}
      {guide && expanded && (
        <div className="px-4 py-3 max-h-[50vh] overflow-y-auto">
          {/* Video link if available */}
          {videoTerms.length > 0 && (
            <div className="mb-3 p-2 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-xs font-semibold text-amber-800 mb-1">🎬 Watch first:</p>
              {videoTerms.map((term, i) => (
                <a
                  key={i}
                  href={`https://www.youtube.com/results?search_query=${encodeURIComponent(term)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-amber-700 underline block"
                >
                  Search: &quot;{term}&quot;
                </a>
              ))}
            </div>
          )}
          {renderGuide(guide)}
        </div>
      )}

      {/* Collapsed */}
      {guide && !expanded && (
        <div className="px-4 py-2">
          <p className="text-[#0D3330]/60 text-xs">
            ✅ Guide ready — tap Expand to see it
          </p>
        </div>
      )}
    </div>
  );
}
