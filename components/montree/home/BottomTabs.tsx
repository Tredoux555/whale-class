// components/montree/home/BottomTabs.tsx
// Home navigation (camera-first, vision plan Jul 2 2026):
//   Today (capture + Ivy) | Journey (moments) | Plan (the week, Shop folded in)
// Tapping the ACTIVE Today tab returns to the capture surface — the parent
// component handles that (onTabChange fires on every tap, including active).
'use client';

import { BIO } from '@/lib/montree/bioluminescent-theme';

export type HomeTab = 'today' | 'journey' | 'plan';

interface BottomTabsProps {
  activeTab: HomeTab;
  onTabChange: (tab: HomeTab) => void;
  journeyBadge?: boolean;
}

export default function BottomTabs({ activeTab, onTabChange, journeyBadge }: BottomTabsProps) {
  const tabs: Array<{ id: HomeTab; label: string; icon: string }> = [
    { id: 'today', label: 'Today', icon: '📷' },
    { id: 'journey', label: 'Journey', icon: '🌱' },
    { id: 'plan', label: 'Plan', icon: '🗓️' },
  ];

  return (
    <div className={`${BIO.bg.surface} border-t ${BIO.border.subtle} flex pb-[env(safe-area-inset-bottom,0px)]`}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex-1 flex flex-col items-center py-3 transition-all duration-200 ${
            activeTab === tab.id ? BIO.text.mint : `${BIO.text.muted} hover:text-white/50`
          }`}
        >
          <span className="text-xl relative">
            {tab.icon}
            {tab.id === 'journey' && journeyBadge && (
              <span className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-[#4ADE80] animate-ping" />
            )}
          </span>
          <span className={`text-[10px] mt-1 font-semibold tracking-wider uppercase ${activeTab === tab.id ? '' : 'opacity-60'}`}>
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
