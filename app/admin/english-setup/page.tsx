'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ============================================
// SHELF DATA - Physical Classroom Setup
// ============================================

const SHELF_1_DATA = {
  name: 'PRE-READING',
  subtitle: '"Train the ear"',
  ageRange: 'Ages 2.5-3.5',
  color: 'amber',
  headerGradient: 'from-amber-700 to-amber-800',
  tiers: [
    {
      name: 'TOP TIER: SOUND GAMES',
      color: 'green',
      items: [
        { icon: '🧺', name: 'I-Spy /m/', sub: 'mouse, mug, moon, mat, mop, milk', objects: ['mouse', 'mug', 'moon', 'mat', 'mop', 'milk', 'map', 'magnet'] },
        { icon: '🧺', name: 'I-Spy /s/', sub: 'sun, sock, soap, star, snake', objects: ['sun', 'sock', 'soap', 'star', 'snake', 'spoon', 'sponge', 'scissors'] },
        { icon: '🧺', name: 'I-Spy /a/', sub: 'apple, ant, ax, anchor', objects: ['apple', 'ant', 'ax', 'alligator', 'astronaut', 'anchor'] },
        { icon: '🧺', name: 'I-Spy /f/', sub: 'fish, fan, fork, frog, fox', objects: ['fish', 'fan', 'fork', 'frog', 'fox', 'feather', 'flag', 'flower'] },
        { icon: '🧺', name: 'I-Spy /t/', sub: 'top, tent, tiger, tape', objects: ['top', 'tent', 'tiger', 'tape', 'tooth', 'toy', 'table', 'tree'] },
        { icon: '🧺', name: 'I-Spy /p/', sub: 'pen, pig, pot, pin, pan', objects: ['pen', 'pig', 'pot', 'pin', 'pear', 'pan', 'pencil', 'piano'] },
      ]
    },
    {
      name: 'MIDDLE TIER: SANDPAPER LETTERS',
      color: 'pink',
      items: [
        { icon: '✋', name: 'a - i', sub: 'lowercase', letters: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i'] },
        { icon: '✋', name: 'j - r', sub: 'lowercase', letters: ['j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r'] },
        { icon: '✋', name: 's - z', sub: 'lowercase', letters: ['s', 't', 'u', 'v', 'w', 'x', 'y', 'z'] },
      ]
    },
    {
      name: 'BOTTOM TIER: METAL INSETS',
      color: 'blue',
      items: [
        { icon: '💎', name: 'Metal Insets', sub: '10 shapes', details: 'Circle, square, triangle, rectangle, oval, ellipse, quatrefoil, curvilinear triangle, pentagon, trapezoid' },
        { icon: '📄', name: 'Paper', sub: 'inset squares', details: 'Pre-cut squares that fit the metal inset frames' },
        { icon: '✏️', name: 'Pencils', sub: 'colored pencils', details: '12 colors minimum, good quality for control' },
      ]
    }
  ]
};

const SHELF_2_DATA = {
  name: 'ENCODING',
  subtitle: '"Writing before reading"',
  ageRange: 'Ages 3.5-4.5',
  color: 'blue',
  headerGradient: 'from-blue-600 to-indigo-700',
  tiers: [
    {
      name: 'TOP TIER: MOVEABLE ALPHABET',
      color: 'amber',
      items: [
        { icon: '🔤', name: 'Large MA', sub: 'red consonants', details: 'Consonants in RED/PINK - multiple of each letter' },
        { icon: '🔤', name: 'Blue Vowels', sub: 'a, e, i, o, u', details: 'Vowels in BLUE - need many copies (used constantly)' },
        { icon: '🧺', name: 'CVC Objects', sub: 'cat, dog, pen...', objects: ['cat', 'dog', 'pen', 'cup', 'hat', 'pig', 'bed', 'sun', 'mop', 'bus'] },
      ]
    },
    {
      name: 'MIDDLE TIER: WORD BUILDING BOXES',
      color: 'purple',
      items: [
        { icon: '📦', name: 'Short A Box', sub: 'cat, hat, mat, bag, pan', color: '#EF4444', words: ['cat', 'mat', 'sat', 'hat', 'bat', 'rat', 'pan', 'can', 'man', 'fan', 'map', 'bag'] },
        { icon: '📦', name: 'Short E Box', sub: 'bed, pen, hen, net, leg', color: '#F59E0B', words: ['bed', 'red', 'pen', 'hen', 'men', 'ten', 'net', 'wet', 'pet', 'jet', 'leg', 'web'] },
        { icon: '📦', name: 'Short I Box', sub: 'pig, pin, bin, lip, wig', color: '#10B981', words: ['pig', 'big', 'dig', 'wig', 'pin', 'bin', 'fin', 'win', 'sit', 'hit', 'lip', 'zip'] },
        { icon: '📦', name: 'Short O Box', sub: 'dog, pot, mop, box, fox', color: '#3B82F6', words: ['dog', 'log', 'fog', 'pot', 'hot', 'cot', 'mop', 'top', 'hop', 'box', 'fox', 'sock'] },
        { icon: '📦', name: 'Short U Box', sub: 'cup, bug, rug, sun, bus', color: '#8B5CF6', words: ['cup', 'pup', 'bus', 'nut', 'hut', 'cut', 'bug', 'rug', 'hug', 'mug', 'sun', 'run'] },
      ]
    }
  ]
};

const SHELF_3_DATA = {
  name: 'DECODING',
  subtitle: '"Reading emerges naturally"',
  ageRange: 'Ages 4.5-6',
  color: 'green',
  headerGradient: 'from-green-600 to-emerald-700',
  tiers: [
    {
      name: 'TOP TIER: PINK SERIES (CVC)',
      color: 'red',
      bookColor: '📕',
      items: [
        { icon: '📕', name: 'Object Box', sub: 'miniatures + word cards', details: 'Real tiny objects with matching word labels' },
        { icon: '📕', name: 'Picture Cards', sub: 'image + word matching', details: 'Photos with separate word cards to match' },
        { icon: '📕', name: 'Word Lists', sub: 'cat, hat, mat...', details: 'Lists of CVC words sorted by word family' },
        { icon: '📕', name: 'Phrases', sub: '"a fat cat"', details: 'Simple 2-3 word phrases using CVC words' },
        { icon: '📕', name: 'Sentences', sub: '"The cat sat."', details: 'Full sentences using only CVC words' },
        { icon: '📕', name: 'Readers', sub: 'decodable books', details: 'Simple books using only Pink Series words' },
      ]
    },
    {
      name: 'MIDDLE TIER: BLUE SERIES (BLENDS)',
      color: 'blue',
      bookColor: '📘',
      items: [
        { icon: '📘', name: 'Object Box', sub: 'frog, crab, drum...', details: 'Objects with consonant blends' },
        { icon: '📘', name: 'Picture Cards', sub: 'CCVC & CVCC words', details: 'Words like: stop, flag, milk, best' },
        { icon: '📘', name: 'Word Lists', sub: 'blend families', details: 'bl-, br-, cl-, cr-, st-, -nd, -mp, -lk' },
        { icon: '📘', name: 'Phrases', sub: '"a black flag"', details: 'Phrases with blend words' },
        { icon: '📘', name: 'Sentences', sub: '"The frog jumps."', details: 'Sentences with blend words' },
        { icon: '📘', name: 'Readers', sub: 'decodable books', details: 'Books using Pink + Blue Series words' },
      ]
    },
    {
      name: 'BOTTOM TIER: GREEN SERIES (PHONOGRAMS)',
      color: 'emerald',
      bookColor: '📗',
      items: [
        { icon: '📗', name: 'Phonogram Cards', sub: 'ai, ay, ee, ea...', details: 'Sandpaper phonograms on green cards' },
        { icon: '📗', name: 'Object Box', sub: 'rain, tree, boat...', details: 'Objects with long vowel sounds' },
        { icon: '📗', name: 'Word Lists', sub: 'phonogram families', details: 'ai/ay, ee/ea, oa/ow, ou/ow, ar, or, er' },
        { icon: '📗', name: 'Phrases', sub: '"the green tree"', details: 'Phrases with phonogram words' },
        { icon: '📗', name: 'Sentences', sub: '"I see the boat."', details: 'Sentences with phonogram words' },
        { icon: '📗', name: 'Readers', sub: 'decodable books', details: 'Books using all three series' },
      ]
    }
  ]
};

// ============================================
// COMPONENT
// ============================================

export default function EnglishSetupPage() {
  const router = useRouter();
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [expandedShelf, setExpandedShelf] = useState<number | null>(1);

  const toggleShelf = (shelf: number) => {
    setExpandedShelf(expandedShelf === shelf ? null : shelf);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-slate-200">
      {/* Header */}
      <header className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-5xl">🐋</div>
              <div>
                <h1 className="text-3xl font-bold">Tredoux's English Area</h1>
                <p className="text-teal-100">Whale Class • 3 Shelf Setup</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition"
            >
              ← Back
            </button>
          </div>
          
          {/* Flow indicators */}
          <div className="flex justify-center gap-4 mt-4">
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium flex items-center gap-2">
              ← Progression Flow →
            </span>
            <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">
              Ages 2.5 → 6
            </span>
            <Link 
              href="/admin/english-guide"
              className="px-4 py-2 bg-white/30 hover:bg-white/40 rounded-full text-sm font-medium transition"
            >
              📖 Teaching Guide →
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 space-y-4">
        
        {/* SHELF 1: PRE-READING */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button 
            onClick={() => toggleShelf(1)}
            className={`w-full bg-gradient-to-r ${SHELF_1_DATA.headerGradient} text-white p-5 text-center transition-all hover:brightness-110`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">SHELF 1: {SHELF_1_DATA.name}</h2>
                <p className="text-amber-200">{SHELF_1_DATA.ageRange} • {SHELF_1_DATA.subtitle}</p>
              </div>
              <span className="text-3xl">{expandedShelf === 1 ? '▼' : '▶'}</span>
            </div>
          </button>
          
          {expandedShelf === 1 && (
            <div className="p-5 space-y-5">
              {SHELF_1_DATA.tiers.map((tier, tierIdx) => (
                <div key={tierIdx} className={`bg-${tier.color}-50 rounded-xl p-4`}>
                  <h3 className={`text-${tier.color}-700 font-bold text-sm mb-3 uppercase tracking-wide`}>
                    {tier.name}
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    {tier.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => setSelectedItem({ ...item, tier: tier.name })}
                        className={`bg-white rounded-xl p-4 text-center border-2 border-${tier.color}-200 hover:border-${tier.color}-400 hover:shadow-lg transition-all cursor-pointer`}
                      >
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <div className="font-bold text-sm text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SHELF 2: ENCODING */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button 
            onClick={() => toggleShelf(2)}
            className={`w-full bg-gradient-to-r ${SHELF_2_DATA.headerGradient} text-white p-5 text-center transition-all hover:brightness-110`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">SHELF 2: {SHELF_2_DATA.name}</h2>
                <p className="text-blue-200">{SHELF_2_DATA.ageRange} • {SHELF_2_DATA.subtitle}</p>
              </div>
              <span className="text-3xl">{expandedShelf === 2 ? '▼' : '▶'}</span>
            </div>
          </button>
          
          {expandedShelf === 2 && (
            <div className="p-5 space-y-5">
              {SHELF_2_DATA.tiers.map((tier, tierIdx) => (
                <div key={tierIdx} className={`bg-${tier.color}-50 rounded-xl p-4`}>
                  <h3 className={`text-${tier.color}-700 font-bold text-sm mb-3 uppercase tracking-wide`}>
                    {tier.name}
                  </h3>
                  <div className={`grid ${tier.items.length > 3 ? 'grid-cols-5' : 'grid-cols-3'} gap-3`}>
                    {tier.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => setSelectedItem({ ...item, tier: tier.name })}
                        className={`bg-white rounded-xl p-4 text-center border-2 border-${tier.color}-200 hover:border-${tier.color}-400 hover:shadow-lg transition-all cursor-pointer`}
                      >
                        <div className="text-3xl mb-2">{item.icon}</div>
                        <div className="font-bold text-sm text-gray-800">{item.name}</div>
                        <div className="text-xs text-gray-500 mt-1">{item.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* SHELF 3: DECODING */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <button 
            onClick={() => toggleShelf(3)}
            className={`w-full bg-gradient-to-r ${SHELF_3_DATA.headerGradient} text-white p-5 text-center transition-all hover:brightness-110`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h2 className="text-2xl font-bold">SHELF 3: {SHELF_3_DATA.name}</h2>
                <p className="text-green-200">{SHELF_3_DATA.ageRange} • {SHELF_3_DATA.subtitle}</p>
              </div>
              <span className="text-3xl">{expandedShelf === 3 ? '▼' : '▶'}</span>
            </div>
          </button>
          
          {expandedShelf === 3 && (
            <div className="p-5 space-y-5">
              {SHELF_3_DATA.tiers.map((tier, tierIdx) => (
                <div key={tierIdx} className={`bg-${tier.color}-50 rounded-xl p-4`}>
                  <h3 className={`text-${tier.color}-700 font-bold text-sm mb-3 uppercase tracking-wide`}>
                    {tier.name}
                  </h3>
                  <div className="grid grid-cols-6 gap-2">
                    {tier.items.map((item, itemIdx) => (
                      <button
                        key={itemIdx}
                        onClick={() => setSelectedItem({ ...item, tier: tier.name })}
                        className={`bg-white rounded-xl p-3 text-center border-2 border-${tier.color}-200 hover:border-${tier.color}-400 hover:shadow-lg transition-all cursor-pointer`}
                      >
                        <div className="text-2xl mb-1">{item.icon}</div>
                        <div className="font-bold text-xs text-gray-800">{item.name}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Setup Tips */}
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl p-6 border-2 border-yellow-200">
          <h3 className="font-bold text-yellow-800 mb-4 flex items-center gap-2 text-lg">
            <span className="text-2xl">💡</span> Classroom Setup Tips
          </h3>
          <div className="grid md:grid-cols-2 gap-4 text-yellow-700 text-sm">
            <div className="bg-white/60 rounded-xl p-4">
              <h4 className="font-bold mb-2">📍 Shelf Placement</h4>
              <ul className="space-y-1">
                <li>• Shelves at child height (90-120cm)</li>
                <li>• Left to right = reading direction</li>
                <li>• Natural light, not facing windows</li>
              </ul>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <h4 className="font-bold mb-2">🏷️ Labeling</h4>
              <ul className="space-y-1">
                <li>• Photo + word on each container</li>
                <li>• Color-coded by series (Pink/Blue/Green)</li>
                <li>• Outline on shelf where item belongs</li>
              </ul>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <h4 className="font-bold mb-2">🧺 Containers</h4>
              <ul className="space-y-1">
                <li>• Baskets for sound objects</li>
                <li>• Boxes for word building materials</li>
                <li>• Trays for moveable alphabet</li>
              </ul>
            </div>
            <div className="bg-white/60 rounded-xl p-4">
              <h4 className="font-bold mb-2">✅ Work Cycle</h4>
              <ul className="space-y-1">
                <li>• Child chooses work from shelf</li>
                <li>• Works on mat or table</li>
                <li>• Returns to exact spot when done</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-white rounded-2xl p-6 shadow-lg">
          <h3 className="font-bold text-gray-800 mb-4">🔗 Related Tools</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Link href="/admin/english-guide" className="bg-indigo-50 hover:bg-indigo-100 rounded-xl p-4 text-center transition">
              <div className="text-2xl mb-1">📖</div>
              <div className="font-medium text-sm text-indigo-700">Teaching Guide</div>
            </Link>
            <Link href="/admin/card-generator" className="bg-pink-50 hover:bg-pink-100 rounded-xl p-4 text-center transition">
              <div className="text-2xl mb-1">🃏</div>
              <div className="font-medium text-sm text-pink-700">Card Generator</div>
            </Link>
            <Link href="/admin/english-procurement" className="bg-amber-50 hover:bg-amber-100 rounded-xl p-4 text-center transition">
              <div className="text-2xl mb-1">🛒</div>
              <div className="font-medium text-sm text-amber-700">Shopping List</div>
            </Link>
            <Link href="/admin/english-progress" className="bg-green-50 hover:bg-green-100 rounded-xl p-4 text-center transition">
              <div className="text-2xl mb-1">📊</div>
              <div className="font-medium text-sm text-green-700">Student Progress</div>
            </Link>
          </div>
        </div>
      </main>

      {/* Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className="text-4xl">{selectedItem.icon}</span>
                <div>
                  <h3 className="text-xl font-bold text-gray-800">{selectedItem.name}</h3>
                  <p className="text-sm text-gray-500">{selectedItem.tier}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ✕
              </button>
            </div>
            
            {selectedItem.objects && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Objects to Include:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.objects.map((obj: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                      {obj}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedItem.words && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Words in this Box:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.words.map((word: string, idx: number) => (
                    <span 
                      key={idx} 
                      className="px-3 py-1 rounded-full text-sm text-white font-medium"
                      style={{ backgroundColor: selectedItem.color || '#6B7280' }}
                    >
                      {word}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedItem.letters && (
              <div className="mb-4">
                <h4 className="font-medium text-gray-700 mb-2">Letters:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.letters.map((letter: string, idx: number) => (
                    <span key={idx} className="w-10 h-10 flex items-center justify-center bg-pink-100 text-pink-700 rounded-lg text-lg font-bold">
                      {letter}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedItem.details && (
              <div className="p-4 bg-gray-50 rounded-xl text-sm text-gray-700">
                <span className="font-medium">Details: </span>{selectedItem.details}
              </div>
            )}
            
            <button
              onClick={() => setSelectedItem(null)}
              className="mt-4 w-full py-3 bg-teal-500 hover:bg-teal-600 text-white rounded-xl font-medium transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
