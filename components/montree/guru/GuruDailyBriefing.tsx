'use client';

import { useState, useEffect } from 'react';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface GuruDailyBriefingProps {
  childId: string;
  childName: string;
}

export default function GuruDailyBriefing({ childId, childName }: GuruDailyBriefingProps) {
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/montree/guru/daily-plan?child_id=${childId}`);
      if (!res.ok) throw new Error(`Daily plan fetch failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        setPlan(data.plan);
        setExpanded(true);
      } else {
        setError(data.error || 'Could not generate plan');
      }
    } catch {
      setError('Failed to connect');
    } finally {
      setLoading(false);
    }
  };

  // Simple markdown-to-JSX renderer for the plan
  const renderPlan = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, i) => {
      // H2
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-xl font-bold text-[#0D3330] mt-4 mb-2">{line.replace('## ', '')}</h2>;
      }
      // H3
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-lg font-semibold text-[#0D3330] mt-3 mb-1">{line.replace('### ', '')}</h3>;
      }
      // H4
      if (line.startsWith('#### ')) {
        return <h4 key={i} className="text-base font-semibold text-[#164340] mt-2 mb-1">{line.replace('#### ', '')}</h4>;
      }
      // Bold lines
      if (line.startsWith('**') && line.endsWith('**')) {
        return <p key={i} className="font-semibold text-[#0D3330] mt-1">{line.replace(/\*\*/g, '')}</p>;
      }
      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        return <li key={i} className="ml-4 text-[#0D3330]/80 text-sm">{renderInlineBold(line.slice(2))}</li>;
      }
      // Numbered items
      if (/^\d+\.\s/.test(line)) {
        return <li key={i} className="ml-4 text-[#0D3330]/80 text-sm list-decimal">{renderInlineBold(line.replace(/^\d+\.\s/, ''))}</li>;
      }
      // Empty line
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }
      // Regular text
      return <p key={i} className="text-[#0D3330]/80 text-sm">{renderInlineBold(line)}</p>;
    });
  };

  // Handle **bold** within text
  const renderInlineBold = (text: string) => {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-[#0D3330]">{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  return (
    <div className={`${HOME_THEME.cardBg} border ${HOME_THEME.border} rounded-2xl shadow-md overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0D3330] to-[#164340] px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🌿</span>
            <div>
              <h3 className="text-white font-bold text-lg">Today&apos;s Plan</h3>
              <p className="text-white/70 text-xs">Your Montessori guide for {childName}</p>
            </div>
          </div>
          {!plan && !loading && (
            <button
              onClick={fetchPlan}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Generate Plan
            </button>
          )}
          {plan && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="px-3 py-1 bg-white/20 hover:bg-white/30 text-white text-sm rounded-lg transition-colors"
            >
              {expanded ? 'Collapse' : 'Expand'}
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-5 py-8 text-center">
          <div className="animate-pulse text-3xl mb-3">🌱</div>
          <p className="text-[#0D3330]/60 text-sm">Preparing {childName}&apos;s plan for today...</p>
          <p className="text-[#0D3330]/40 text-xs mt-1">Analyzing progress and selecting works</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-5 py-4">
          <p className="text-red-600 text-sm">{error}</p>
          <button onClick={fetchPlan} className="text-[#0D3330] underline text-sm mt-1">Try again</button>
        </div>
      )}

      {/* Plan content */}
      {plan && expanded && (
        <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
          {renderPlan(plan)}
        </div>
      )}

      {/* Collapsed summary */}
      {plan && !expanded && (
        <div className="px-5 py-3">
          <p className="text-[#0D3330]/60 text-sm">
            ✅ Today&apos;s plan is ready — tap Expand to see it
          </p>
        </div>
      )}
    </div>
  );
}
