'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================
// SHELF DATA
// ============================================

const SHELVES = [
  {
    id: 'shelf1',
    name: 'SHELF 1: PRE-READING',
    subtitle: 'Ages 2.5-3.5 • "Train the ear before the eye"',
    color: 'from-green-500 to-emerald-600',
    bgLight: 'bg-green-50',
    borderColor: 'border-green-500',
    tiers: [
      {
        name: 'Top Tier: Sound Games',
        items: [
          { icon: '🧺', name: 'I-Spy Basket /m/', detail: 'mouse, mug, mitten, moon, map' },
          { icon: '🧺', name: 'I-Spy Basket /s/', detail: 'sun, sock, soap, seal, sand' },
          { icon: '🧺', name: 'I-Spy Basket /a/', detail: 'apple, ant, ax, alligator' },
        ],
        note: 'Rotate 3-6 baskets weekly. Cover all 26 sounds over time.',
        eslTip: 'START with sounds in Mandarin: /m/, /n/, /s/, /l/, /f/. DELAY: /v/, /th/, /r/'
      },
      {
        name: 'Middle Tier: Sandpaper Letters',
        items: [
          { icon: '📦', name: 'Box 1: a-i', detail: 'lowercase only' },
          { icon: '📦', name: 'Box 2: j-r', detail: 'lowercase only' },
          { icon: '📦', name: 'Box 3: s-z', detail: 'lowercase only' },
        ],
        note: 'Vowels on BLUE. Consonants on PINK. Teach by SOUND not alphabet order.',
        eslTip: 'Extra time on: v, th, r, l (phonemes absent in Mandarin)'
      },
      {
        name: 'Bottom Tier: Metal Insets',
        items: [
          { icon: '🔷', name: 'Metal Insets Frame', detail: '10 geometric shapes' },
          { icon: '📝', name: 'Inset Paper Stack', detail: '14cm squares' },
          { icon: '✏️', name: 'Colored Pencils', detail: '3-4 colors in holder' },
        ],
        note: 'Prepares hand for writing. Child traces shapes for pencil control.',
        eslTip: 'Chinese children excel at careful strokes - use this strength!'
      }
    ]
  },
  {
    id: 'shelf2',
    name: 'SHELF 2: ENCODING',
    subtitle: 'Ages 3.5-4.5 • "Writing before reading"',
    color: 'from-blue-500 to-indigo-600',
    bgLight: 'bg-blue-50',
    borderColor: 'border-blue-500',
    tiers: [
      {
        name: 'Top Tier: Moveable Alphabet',
        items: [
          { icon: '🔤', name: 'Large Moveable Alphabet', detail: 'Blue vowels, Red consonants, 5cm+ letters' },
        ],
        note: 'Child builds words they can SAY but cannot yet READ. This is encoding.',
        eslTip: 'This is where reading clicks. Build LOTS of words without reading pressure.'
      },
      {
        name: 'Middle Tier: Object Boxes (Pink Series)',
        items: [
          { icon: '📦', name: 'Short /a/ Box', detail: 'cat, bat, map, hat, bag, pan' },
          { icon: '📦', name: 'Short /e/ Box', detail: 'bed, pen, net, jet, hen, web' },
          { icon: '📦', name: 'Short /i/ Box', detail: 'pig, pin, kit, lip, wig, bib' },
          { icon: '📦', name: 'Short /o/ Box', detail: 'pot, dog, log, mop, box, cot' },
          { icon: '📦', name: 'Short /u/ Box', detail: 'cup, bug, rug, sun, bus, nut' },
        ],
        note: 'CVC = Consonant-Vowel-Consonant. 6-10 miniature objects per box.',
        eslTip: 'Use objects familiar from both cultures - animals, food, household items.'
      },
      {
        name: 'Bottom Tier: Picture-Word Matching',
        items: [
          { icon: '🖼️', name: 'Picture Cards', detail: 'Clear CVC images' },
          { icon: '📄', name: 'Word Cards', detail: 'Matching CVC words' },
          { icon: '🧺', name: 'Matching Basket', detail: 'Activity tray' },
        ],
        note: 'Control card (picture + word) on back for self-correction.',
        eslTip: 'Pictures are more abstract than objects. Ensure vocabulary is known first.'
      }
    ]
  },
  {
    id: 'shelf3',
    name: 'SHELF 3: DECODING',
    subtitle: 'Ages 4.5-6 • "Reading emerges naturally"',
    color: 'from-purple-500 to-violet-600',
    bgLight: 'bg-purple-50',
    borderColor: 'border-purple-500',
    tiers: [
      {
        name: 'Top Tier: Pink Reading Cards',
        items: [
          { icon: '📁', name: 'Pink Word Lists', detail: 'Single CVC words' },
          { icon: '📁', name: 'Pink Phrases', detail: '"a red cat", "the big dog"' },
          { icon: '📁', name: 'Pink Sentences', detail: '"The cat sat on the mat."' },
        ],
        note: 'Progression: Words → Phrases → Sentences → Command Cards → Readers',
        eslTip: 'Articles (the, a, an) don\'t exist in Chinese. Teach explicitly.'
      },
      {
        name: 'Middle Tier: Blue Series (Blends)',
        items: [
          { icon: '📁', name: 'Blend Cards', detail: 'bl, cr, st, fr, sp...' },
          { icon: '📁', name: 'Blue Word Lists', detail: 'stop, frog, clap, trip' },
          { icon: '📁', name: 'Blue Phrases', detail: '"a black crab"' },
        ],
        note: 'Only introduce when Pink is MASTERED. Beginning + Ending blends.',
        eslTip: 'Consonant clusters are VERY hard for Chinese speakers. Go slowly.'
      },
      {
        name: 'Bottom Tier: Sentence Building',
        items: [
          { icon: '⚫', name: 'Grammar Symbols', detail: 'Noun (black), Verb (red), Article (blue)' },
          { icon: '📝', name: 'Sentence Cards', detail: 'Word cards by part of speech' },
          { icon: '📚', name: 'Story Sequencing', detail: 'Picture story cards' },
        ],
        note: 'Child physically builds sentences by arranging colored word cards.',
        eslTip: 'Chinese word order differs. Model correct English order constantly.'
      }
    ]
  }
];

const READINESS_INDICATORS = [
  {
    phase: 'Ready for Shelf 2 (Encoding)',
    color: 'bg-blue-500',
    checks: [
      'Identifies beginning sounds consistently',
      'Identifies ending sounds in words',
      'Traces sandpaper letters correctly',
      'Associates most letter sounds with symbols',
      'Shows interest in "writing" words'
    ]
  },
  {
    phase: 'Ready for Shelf 3 (Decoding)',
    color: 'bg-purple-500',
    checks: [
      'Builds CVC words with moveable alphabet',
      'Sounds out words they\'ve built',
      'Matches objects to word cards',
      'Shows interest in environmental print',
      'Blends sounds smoothly (not choppy)'
    ]
  },
  {
    phase: 'Success Looks Like',
    color: 'bg-green-500',
    checks: [
      'Reads CVC words fluently',
      'Reads simple sentences',
      'Picks up books and attempts to read',
      'Writes spontaneously',
      'Enjoys literacy activities'
    ]
  }
];

const ESL_CHALLENGES = [
  { sound: '/v/', challenge: "Doesn't exist in Mandarin", strategy: 'Pair with /f/, exaggerate lip position' },
  { sound: '/θ/ (th)', challenge: "Doesn't exist", strategy: 'Use mirror, show tongue between teeth' },
  { sound: '/r/', challenge: 'Different from Mandarin r', strategy: 'Start with "er" sound they know' },
  { sound: '/l/ vs /r/', challenge: 'Often confused', strategy: 'Explicit contrast activities' },
  { sound: '/b/ vs /p/', challenge: 'Aspiration difference', strategy: 'Feel breath on hand' },
  { sound: 'Final consonants', challenge: 'Often dropped', strategy: 'Emphasize ending sounds' },
];

export default function EnglishSetupPage() {
  const [activeShelf, setActiveShelf] = useState<string | null>(null);
  const [showEslTips, setShowEslTips] = useState(true);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/admin" className="text-amber-200 hover:text-white text-sm mb-2 inline-block">
                ← Back to Admin
              </Link>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                🐋 Tredoux&apos;s English Area Setup
              </h1>
              <p className="text-amber-100 mt-1">3-Shelf System for Whale Class • Ages 2-6 • Chinese ESL</p>
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={showEslTips} 
                  onChange={(e) => setShowEslTips(e.target.checked)}
                  className="rounded"
                />
                Show ESL Tips
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Philosophy Banner */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-xl p-6 mb-8 border border-slate-600">
          <h2 className="text-xl font-bold text-white mb-3">📚 The Philosophy</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-green-500/20 rounded-lg p-4 border border-green-500/30">
              <div className="text-green-400 font-bold">Phase 1: Pre-Reading</div>
              <div className="text-green-200 text-sm">Ages 2.5-3.5 → Ears before eyes</div>
            </div>
            <div className="bg-blue-500/20 rounded-lg p-4 border border-blue-500/30">
              <div className="text-blue-400 font-bold">Phase 2: Encoding</div>
              <div className="text-blue-200 text-sm">Ages 3.5-4.5 → Writing before reading</div>
            </div>
            <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
              <div className="text-purple-400 font-bold">Phase 3: Decoding</div>
              <div className="text-purple-200 text-sm">Ages 4.5-6 → Reading emerges naturally</div>
            </div>
          </div>
        </div>

        {/* Room Layout Diagram */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">🗺️ Room Layout - Top View</h2>
          <div className="bg-amber-50 rounded-lg p-4 max-w-2xl mx-auto">
            <div className="text-center mb-4">
              <div className="inline-block bg-amber-200 px-8 py-2 rounded-t-lg border-2 border-b-0 border-amber-400 font-semibold text-amber-800">
                🚪 ENTRANCE
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div className="bg-green-100 border-2 border-green-500 rounded p-3 text-center">
                <div className="font-bold text-green-800">SHELF 1</div>
                <div className="text-xs text-green-600">Pre-Reading</div>
                <div className="text-lg">📗</div>
              </div>
              <div className="bg-blue-100 border-2 border-blue-500 rounded p-3 text-center">
                <div className="font-bold text-blue-800">SHELF 2</div>
                <div className="text-xs text-blue-600">Encoding</div>
                <div className="text-lg">📘</div>
              </div>
              <div className="bg-purple-100 border-2 border-purple-500 rounded p-3 text-center">
                <div className="font-bold text-purple-800">SHELF 3</div>
                <div className="text-xs text-purple-600">Decoding</div>
                <div className="text-lg">📙</div>
              </div>
            </div>
            
            <div className="text-center text-amber-600 mb-3 text-sm font-medium">
              ← ← ← Progression Flow → → →
            </div>
            
            <div className="bg-orange-100 border-2 border-dashed border-orange-400 rounded-lg p-3 mb-3 text-center">
              <div className="font-semibold text-orange-800">🧘 FLOOR WORK AREA</div>
              <div className="text-xs text-orange-600">Rugs for individual work</div>
            </div>
            
            <div className="bg-yellow-100 border-2 border-yellow-500 rounded-lg p-2 text-center">
              <div className="font-semibold text-yellow-800">📚 READING NOOK</div>
              <div className="text-xs text-yellow-600">Soft seating • Natural light</div>
            </div>
          </div>
        </div>

        {/* Three Shelves */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {SHELVES.map((shelf) => (
            <div 
              key={shelf.id}
              className={`bg-slate-800 rounded-xl overflow-hidden border-2 ${shelf.borderColor} transition-all ${
                activeShelf === shelf.id ? 'ring-4 ring-white/20' : ''
              }`}
            >
              {/* Shelf Header */}
              <div 
                className={`bg-gradient-to-r ${shelf.color} p-4 cursor-pointer`}
                onClick={() => setActiveShelf(activeShelf === shelf.id ? null : shelf.id)}
              >
                <h3 className="text-lg font-bold text-white">{shelf.name}</h3>
                <p className="text-white/80 text-sm">{shelf.subtitle}</p>
              </div>

              {/* Tiers */}
              <div className="p-4 space-y-4">
                {shelf.tiers.map((tier, tierIdx) => (
                  <div key={tierIdx} className="bg-slate-700/50 rounded-lg p-3">
                    <div className="text-xs text-slate-400 uppercase font-semibold mb-2">
                      {tier.name}
                    </div>
                    <div className="space-y-2">
                      {tier.items.map((item, itemIdx) => (
                        <div key={itemIdx} className="flex items-start gap-2 bg-slate-600/50 rounded p-2">
                          <span className="text-xl">{item.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium">{item.name}</div>
                            <div className="text-slate-400 text-xs truncate">{item.detail}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-slate-300 bg-slate-800/50 rounded p-2">
                      💡 {tier.note}
                    </div>
                    {showEslTips && tier.eslTip && (
                      <div className="mt-2 text-xs text-amber-300 bg-amber-500/10 rounded p-2 border border-amber-500/30">
                        🇨🇳 ESL: {tier.eslTip}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Readiness Indicators */}
        <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">✅ Readiness Indicators</h2>
          <div className="grid md:grid-cols-3 gap-4">
            {READINESS_INDICATORS.map((indicator, idx) => (
              <div key={idx} className={`rounded-lg p-4 border-l-4 ${indicator.color} bg-slate-700/50`}>
                <h3 className="font-bold text-white mb-3">{indicator.phase}</h3>
                <ul className="space-y-2">
                  {indicator.checks.map((check, checkIdx) => (
                    <li key={checkIdx} className="flex items-start gap-2 text-sm text-slate-300">
                      <span className="text-green-400 mt-0.5">✓</span>
                      {check}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ESL Challenges Table */}
        {showEslTips && (
          <div className="bg-slate-800 rounded-xl p-6 mb-8 border border-amber-500/30">
            <h2 className="text-xl font-bold text-white mb-4">🇨🇳 ESL Challenges for Chinese Learners</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-600">
                    <th className="text-left py-2 px-3 text-amber-400">Sound</th>
                    <th className="text-left py-2 px-3 text-amber-400">Challenge</th>
                    <th className="text-left py-2 px-3 text-amber-400">Strategy</th>
                  </tr>
                </thead>
                <tbody>
                  {ESL_CHALLENGES.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-700/50">
                      <td className="py-2 px-3 text-white font-mono">{item.sound}</td>
                      <td className="py-2 px-3 text-slate-300">{item.challenge}</td>
                      <td className="py-2 px-3 text-green-300">{item.strategy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Quick Reference */}
        <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
          <h2 className="text-xl font-bold text-white mb-4">📋 Quick Reference: What Goes Where</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-600">
                  <th className="text-left py-2 px-3 text-slate-400">Shelf</th>
                  <th className="text-left py-2 px-3 text-slate-400">Tier</th>
                  <th className="text-left py-2 px-3 text-slate-400">Materials</th>
                </tr>
              </thead>
              <tbody className="text-slate-300">
                <tr className="border-b border-slate-700/50 bg-green-500/10">
                  <td className="py-2 px-3 font-medium text-green-400">1</td>
                  <td className="py-2 px-3">Top</td>
                  <td className="py-2 px-3">I-Spy Sound Baskets (3-6 rotating)</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-green-500/5">
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3">Middle</td>
                  <td className="py-2 px-3">Sandpaper Letters (3 boxes, lowercase)</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-green-500/10">
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3">Bottom</td>
                  <td className="py-2 px-3">Metal Insets + paper + pencils</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-blue-500/10">
                  <td className="py-2 px-3 font-medium text-blue-400">2</td>
                  <td className="py-2 px-3">Top</td>
                  <td className="py-2 px-3">Large Moveable Alphabet</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-blue-500/5">
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3">Middle</td>
                  <td className="py-2 px-3">Object Boxes (5 boxes, CVC by vowel)</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-blue-500/10">
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3">Bottom</td>
                  <td className="py-2 px-3">Picture-Word Matching Cards</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-purple-500/10">
                  <td className="py-2 px-3 font-medium text-purple-400">3</td>
                  <td className="py-2 px-3">Top</td>
                  <td className="py-2 px-3">Pink Reading Cards (words → phrases → sentences)</td>
                </tr>
                <tr className="border-b border-slate-700/50 bg-purple-500/5">
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3">Middle</td>
                  <td className="py-2 px-3">Blue Series (blends)</td>
                </tr>
                <tr className="bg-purple-500/10">
                  <td className="py-2 px-3"></td>
                  <td className="py-2 px-3">Bottom</td>
                  <td className="py-2 px-3">Sentence Building + Grammar Symbols</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-slate-500 text-sm">
          <p>🐋 Whale Class - Making Readers</p>
          <p>Built by Tredoux + Claude</p>
        </div>
      </div>
    </div>
  );
}
