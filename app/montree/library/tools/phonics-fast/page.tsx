// /montree/library/tools/phonics-fast/page.tsx
// Phonics Fast — Master Hub for all phonics word lists + generators
'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { ALL_PHASES, SIGHT_WORDS, getWordCounts, type PhonicsPhase, type PhonicsWord, type PhonicsWordGroup } from '@/lib/montree/phonics/phonics-data';

type TabId = 'initial' | 'phase2' | 'blue1' | 'blue2' | 'tools';

const TABS: { id: TabId; label: string; emoji: string }[] = [
  { id: 'initial', label: 'Initial Words', emoji: '🟢' },
  { id: 'phase2', label: 'Phase 2 CVC', emoji: '🔵' },
  { id: 'blue1', label: 'Blue 1', emoji: '🟣' },
  { id: 'blue2', label: 'Blue 2', emoji: '💜' },
  { id: 'tools', label: 'Generators', emoji: '🛠️' },
];

const GENERATORS = [
  { href: '/montree/library/tools/phonics-fast/three-part-cards', icon: '🃏', label: '3-Part Cards', desc: 'Auto-generate nomenclature cards from word lists' },
  { href: '/montree/library/tools/phonics-fast/labels', icon: '🏷️', label: 'Labels', desc: 'Print labels for movable alphabet matching' },
  { href: '/montree/library/tools/phonics-fast/command-cards', icon: '📋', label: 'Command Cards', desc: '"Put the cat on the mat" style reading cards' },
  { href: '/montree/library/tools/phonics-fast/dictionary', icon: '📖', label: 'Dictionary', desc: 'My First Dictionary with phonics words' },
  { href: '/montree/library/tools/phonics-fast/bingo', icon: '🎯', label: 'Bingo', desc: 'Picture + Word bingo boards' },
  { href: '/montree/library/tools/phonics-fast/sentence-cards', icon: '📝', label: 'Sentence Cards', desc: 'Simple sentences with picture support' },
  { href: '/montree/library/tools/phonics-fast/stories', icon: '📚', label: 'Short Stories', desc: 'Decodable stories with comprehension pictures' },
];

export default function PhonicsHubPage() {
  const [activeTab, setActiveTab] = useState<TabId>('initial');
  const counts = getWordCounts();
  const printRef = useRef<HTMLDivElement>(null);

  const currentPhase = ALL_PHASES.find(p => p.id === activeTab);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      {/* Header */}
      <header className="bg-[#0D3330] text-white">
        <div className="max-w-5xl mx-auto px-4 py-6">
          <Link href="/montree/library/tools" className="text-emerald-300 text-sm hover:underline">
            ← Content Creation Tools
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold mt-2">
            Phonics Fast
          </h1>
          <p className="text-emerald-200 mt-1">
            {counts.total} words across 4 phases — complete Montessori phonics progression
          </p>
          <div className="flex gap-3 mt-3 text-sm">
            <span className="bg-emerald-700 px-3 py-1 rounded-full">Initial: {counts.initial}</span>
            <span className="bg-blue-700 px-3 py-1 rounded-full">Phase 2: {counts.phase2}</span>
            <span className="bg-indigo-700 px-3 py-1 rounded-full">Blue 1: {counts.blue1}</span>
            <span className="bg-violet-700 px-3 py-1 rounded-full">Blue 2: {counts.blue2}</span>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#0a2624] overflow-x-auto">
        <div className="max-w-5xl mx-auto px-4 flex gap-0">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-5 py-3 text-sm font-bold whitespace-nowrap border-b-3 transition-colors ${
                activeTab === tab.id
                  ? 'text-emerald-300 border-emerald-400'
                  : 'text-gray-400 border-transparent hover:text-gray-200'
              }`}
              style={{ borderBottomWidth: '3px' }}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === 'tools' ? (
          <ToolsTab />
        ) : currentPhase ? (
          <PhaseTab phase={currentPhase} />
        ) : null}
      </div>
    </div>
  );
}

// =====================================================================
// PHASE TAB — Shows word groups with cards
// =====================================================================

function PhaseTab({ phase }: { phase: PhonicsPhase }) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  return (
    <div>
      {/* Phase header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold" style={{ color: phase.color }}>
          {phase.name}
        </h2>
        <p className="text-gray-600 mt-1">{phase.description}</p>
        <p className="text-sm text-gray-500 mt-1">
          {phase.groups.flatMap(g => g.words).length} words total
        </p>
      </div>

      {/* Word groups */}
      <div className="space-y-4">
        {phase.groups.map(group => (
          <WordGroupCard
            key={group.id}
            group={group}
            phaseColor={phase.color}
            isExpanded={expandedGroup === group.id}
            onToggle={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
          />
        ))}
      </div>

      {/* Quick actions */}
      <div className="mt-8 p-4 bg-gray-50 rounded-xl">
        <h3 className="font-bold text-gray-700 mb-3">Quick Generate for {phase.name}</h3>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/montree/library/tools/phonics-fast/three-part-cards?phase=${phase.id}`}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700"
          >
            🃏 3-Part Cards
          </Link>
          <Link
            href={`/montree/library/tools/phonics-fast/labels?phase=${phase.id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700"
          >
            🏷️ Labels
          </Link>
          <Link
            href={`/montree/library/tools/phonics-fast/command-cards?phase=${phase.id}`}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700"
          >
            📋 Commands
          </Link>
          <Link
            href={`/montree/library/tools/phonics-fast/bingo?phase=${phase.id}`}
            className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-semibold hover:bg-rose-700"
          >
            🎯 Bingo
          </Link>
          <Link
            href={`/montree/library/tools/phonics-fast/sentence-cards?phase=${phase.id}`}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-semibold hover:bg-amber-700"
          >
            📝 Sentences
          </Link>
          <Link
            href={`/montree/library/tools/phonics-fast/stories?phase=${phase.id}`}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700"
          >
            📚 Stories
          </Link>
        </div>
      </div>
    </div>
  );
}

// =====================================================================
// WORD GROUP CARD
// =====================================================================

function WordGroupCard({ group, phaseColor, isExpanded, onToggle }: {
  group: PhonicsWordGroup;
  phaseColor: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div
            className="w-3 h-3 rounded-full shrink-0"
            style={{ backgroundColor: phaseColor }}
          />
          <div className="text-left">
            <div className="font-bold text-gray-800">{group.label}</div>
            <div className="text-sm text-gray-500">{group.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">{group.words.length} words</span>
          <span className="text-gray-400">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Word preview — always show */}
      <div className="px-5 pb-3 flex flex-wrap gap-2">
        {group.words.map(w => (
          <span key={w.word} className="text-sm bg-gray-100 px-3 py-1 rounded-full">
            {w.image} {w.word}
          </span>
        ))}
      </div>

      {/* Expanded detail */}
      {isExpanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {group.words.map(w => (
              <WordCard key={w.word} word={w} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// INDIVIDUAL WORD CARD
// =====================================================================

function WordCard({ word }: { word: PhonicsWord }) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 text-center border border-gray-200">
      <div className="text-3xl mb-1">{word.image}</div>
      <div className="font-bold text-lg" style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        {word.word}
      </div>
      {word.isNoun && (
        <div className="text-xs text-gray-400 mt-1">
          {word.miniature}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// TOOLS TAB — Generator links
// =====================================================================

function ToolsTab() {
  return (
    <div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Content Generators</h2>
      <p className="text-gray-600 mb-6">Auto-generate printable materials from the phonics word lists above.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GENERATORS.map(gen => (
          <Link
            key={gen.href}
            href={gen.href}
            className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-2xl">{gen.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800">{gen.label}</div>
              <div className="text-sm text-gray-500">{gen.desc}</div>
            </div>
            <span className="text-gray-400 shrink-0">→</span>
          </Link>
        ))}
      </div>

      {/* Sight words reference */}
      <div className="mt-8 p-5 bg-amber-50 rounded-xl border border-amber-200">
        <h3 className="font-bold text-amber-800 mb-2">Sight Words Reference</h3>
        <p className="text-sm text-amber-700 mb-3">These high-frequency words appear in sentence cards and stories alongside phonics words.</p>
        <div className="flex flex-wrap gap-2">
          {SIGHT_WORDS.map(w => (
            <span key={w} className="text-sm bg-amber-100 text-amber-800 px-3 py-1 rounded-full font-medium">
              {w}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
