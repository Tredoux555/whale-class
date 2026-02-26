// components/montree/guru/GuruOnboardingPicker.tsx
// Multi-select concern picker for first-time Guru onboarding
// "Tell me what matters most for {childName}"
'use client';

import { useState } from 'react';
import { getAllConcerns } from '@/lib/montree/guru/concern-mappings';
import { HOME_THEME } from '@/lib/montree/home-theme';

interface GuruOnboardingPickerProps {
  childId: string;
  childName: string;
  onComplete: (selectedConcerns: string[]) => void;
}

const MAX_CONCERNS = 3;
const concerns = getAllConcerns();

export default function GuruOnboardingPicker({ childId, childName, onComplete }: GuruOnboardingPickerProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const firstName = childName.split(' ')[0];

  const toggleConcern = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(c => c !== id);
      }
      if (prev.length >= MAX_CONCERNS) {
        return prev; // Don't add more than max
      }
      return [...prev, id];
    });
  };

  const handleSubmit = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/montree/guru/concerns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, concerns: selected }),
      });
      const data = await res.json();
      if (data.success) {
        onComplete(selected);
      } else {
        setError(data.error || 'Failed to save');
      }
    } catch {
      setError('Connection failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`min-h-screen ${HOME_THEME.pageBgGradient} flex flex-col`}>
      {/* Header */}
      <div className="px-5 pt-8 pb-4 text-center">
        <div className="text-4xl mb-3">🌿</div>
        <h1 className={`text-xl font-bold ${HOME_THEME.headingText}`}>
          Welcome to {firstName}&apos;s Guide
        </h1>
        <p className={`text-sm ${HOME_THEME.subtleText} mt-2 max-w-xs mx-auto`}>
          Tell me what matters most so I can give you the best guidance for {firstName}
        </p>
      </div>

      {/* Selection counter */}
      <div className="px-5 pb-2">
        <p className={`text-xs text-center ${HOME_THEME.labelText}`}>
          {selected.length === 0 ? (
            `Pick up to ${MAX_CONCERNS} concerns`
          ) : (
            <span>
              <span className="font-semibold text-[#0D3330]">{selected.length}</span>
              {' '}of {MAX_CONCERNS} selected
            </span>
          )}
        </p>
      </div>

      {/* Concern cards grid */}
      <div className="flex-1 px-5 pb-4 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          {concerns.map(concern => {
            const isSelected = selected.includes(concern.id);
            const isMaxed = selected.length >= MAX_CONCERNS && !isSelected;

            return (
              <button
                key={concern.id}
                onClick={() => toggleConcern(concern.id)}
                disabled={isMaxed}
                className={`
                  relative rounded-2xl p-4 text-left transition-all border-2
                  ${isSelected
                    ? 'border-[#0D3330] bg-[#0D3330]/5 shadow-md'
                    : isMaxed
                    ? 'border-[#0D3330]/5 bg-white/50 opacity-50 cursor-not-allowed'
                    : 'border-[#0D3330]/10 bg-white hover:border-[#0D3330]/25 hover:shadow-sm active:scale-[0.97]'
                  }
                `}
              >
                {/* Check mark for selected */}
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#0D3330] flex items-center justify-center">
                    <span className="text-white text-xs">✓</span>
                  </div>
                )}

                <div className="text-2xl mb-2">{concern.icon}</div>
                <div className={`text-sm font-semibold ${HOME_THEME.headingText} leading-tight`}>
                  {concern.title}
                </div>
                <div className={`text-xs ${HOME_THEME.subtleText} mt-1 leading-snug`}>
                  {concern.shortDesc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom action bar */}
      <div className="sticky bottom-0 px-5 py-4 bg-gradient-to-t from-[#FFF8E7] via-[#FFF8E7] to-transparent">
        {error && (
          <p className="text-red-500 text-xs text-center mb-2">{error}</p>
        )}
        <button
          onClick={handleSubmit}
          disabled={selected.length === 0 || saving}
          className={`w-full py-3.5 rounded-xl font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${HOME_THEME.primaryBtn} ${HOME_THEME.primaryBtnShadow}`}
        >
          {saving ? 'Starting...' : selected.length === 0 ? 'Select at least one concern' : "Let's Begin 🌱"}
        </button>
        <button
          onClick={() => onComplete([])}
          className={`w-full mt-2 py-2 text-sm ${HOME_THEME.subtleText} hover:text-[#0D3330]`}
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
