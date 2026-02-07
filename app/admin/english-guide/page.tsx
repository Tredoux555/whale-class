'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ENGLISH_GUIDE,
  VOCABULARY_PROGRESSION,
  VOCABULARY_BASKETS,
  ISPY_COMPLETE,
  MOVEABLE_ALPHABET_COMPLETE,
  PINK_BOXES
} from './data';
export default function EnglishGuidePage() {
  const router = useRouter();
  const [selectedStage, setSelectedStage] = useState<string | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<number | null>(null);
  const [showVocabGuide, setShowVocabGuide] = useState(false);
  const [activeView, setActiveView] = useState<'guide' | 'ispy' | 'moveable' | 'shelf'>('guide');
  const [expandedPhases, setExpandedPhases] = useState<string[]>([]);
  const [expandedStages, setExpandedStages] = useState<number[]>([]);

  const togglePhase = (phase: string) => {
    setExpandedPhases(prev => prev.includes(phase) ? prev.filter(p => p !== phase) : [...prev, phase]);
  };

  const toggleStage = (stage: number) => {
    setExpandedStages(prev => prev.includes(stage) ? prev.filter(s => s !== stage) : [...prev, stage]);
  };

  const stage = ENGLISH_GUIDE.find(s => s.id === selectedStage);
  const skill = stage && selectedSkill !== null ? stage.skills[selectedSkill] : null;

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-4xl">📖</div>
              <div>
                <h1 className="text-2xl font-bold">English Teaching Guide</h1>
                <p className="text-indigo-100">Montessori Language Journey • How to Teach Each Skill</p>
              </div>
            </div>
            <button
              onClick={() => router.back()}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* View Tabs */}
        <div className="bg-indigo-700/50 px-4 py-2">
          <div className="max-w-6xl mx-auto flex gap-2">
            <button
              onClick={() => setActiveView('guide')}
              className={`px-4 py-2 rounded-lg font-medium transition ${activeView === 'guide' ? 'bg-white text-indigo-600' : 'text-white hover:bg-white/20'}`}
            >
              📖 Teaching Guide
            </button>
            <button
              onClick={() => setActiveView('ispy')}
              className={`px-4 py-2 rounded-lg font-medium transition ${activeView === 'ispy' ? 'bg-white text-purple-600' : 'text-white hover:bg-white/20'}`}
            >
              👂 I-Spy Words
            </button>
            <button
              onClick={() => setActiveView('moveable')}
              className={`px-4 py-2 rounded-lg font-medium transition ${activeView === 'moveable' ? 'bg-white text-amber-600' : 'text-white hover:bg-white/20'}`}
            >
              🔤 Moveable Alphabet
            </button>
            <button
              onClick={() => setActiveView('shelf')}
              className={`px-4 py-2 rounded-lg font-medium transition ${activeView === 'shelf' ? 'bg-white text-teal-600' : 'text-white hover:bg-white/20'}`}
            >
              🗄️ Shelf Setup
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {/* I-SPY COMPLETE WORD LISTS VIEW */}
        {activeView === 'ispy' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">👂 Complete I-Spy Word Lists</h2>
              <p className="text-purple-100">200+ words organized by sound. Click to expand each phase. Start with Phase 1 (Easy) for Chinese ESL learners!</p>
            </div>

            {/* Phase 1: Easy */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => togglePhase('easy')} className="w-full p-4 flex items-center justify-between bg-green-50 hover:bg-green-100 transition">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🟢</span>
                  <div className="text-left">
                    <h3 className="font-bold text-green-700">Phase 1: Easy Sounds (Start Here!)</h3>
                    <p className="text-sm text-green-600">Sounds that exist in Mandarin: /s/, /m/, /f/, /n/, /p/, /t/, /c/, /h/</p>
                  </div>
                </div>
                <span className="text-2xl text-green-500">{expandedPhases.includes('easy') ? '▼' : '▶'}</span>
              </button>
              {expandedPhases.includes('easy') && (
                <div className="p-4 grid gap-3">
                  {ISPY_COMPLETE.phase1_easy.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-green-400 pl-4 py-2 bg-green-50/50 rounded-r-lg">
                      <h4 className="font-bold text-green-700">{item.sound}</h4>
                      <p className="text-xs text-green-600 mb-2">✅ {item.note}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.words.map((word, i) => (
                          <span key={i} className="px-3 py-1 bg-white rounded-full text-sm shadow-sm">{word}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phase 2: Medium */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => togglePhase('medium')} className="w-full p-4 flex items-center justify-between bg-orange-50 hover:bg-orange-100 transition">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🟠</span>
                  <div className="text-left">
                    <h3 className="font-bold text-orange-700">Phase 2: Medium Sounds</h3>
                    <p className="text-sm text-orange-600">Need practice: /b/, /d/, /g/, /j/, /w/, /y/</p>
                  </div>
                </div>
                <span className="text-2xl text-orange-500">{expandedPhases.includes('medium') ? '▼' : '▶'}</span>
              </button>
              {expandedPhases.includes('medium') && (
                <div className="p-4 grid gap-3">
                  {ISPY_COMPLETE.phase2_medium.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-orange-400 pl-4 py-2 bg-orange-50/50 rounded-r-lg">
                      <h4 className="font-bold text-orange-700">{item.sound}</h4>
                      <p className="text-xs text-orange-600 mb-2">⚡ {item.note}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.words.map((word, i) => (
                          <span key={i} className="px-3 py-1 bg-white rounded-full text-sm shadow-sm">{word}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Phase 3: Hard */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => togglePhase('hard')} className="w-full p-4 flex items-center justify-between bg-red-50 hover:bg-red-100 transition">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔴</span>
                  <div className="text-left">
                    <h3 className="font-bold text-red-700">Phase 3: Hard Sounds (ESL Focus!)</h3>
                    <p className="text-sm text-red-600">Don't exist in Mandarin: /v/, /th/, /r/, /l/, /z/, /sh/, /ch/</p>
                  </div>
                </div>
                <span className="text-2xl text-red-500">{expandedPhases.includes('hard') ? '▼' : '▶'}</span>
              </button>
              {expandedPhases.includes('hard') && (
                <div className="p-4 grid gap-3">
                  {ISPY_COMPLETE.phase3_hard.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-red-400 pl-4 py-2 bg-red-50/50 rounded-r-lg">
                      <h4 className="font-bold text-red-700">{item.sound}</h4>
                      <p className="text-xs text-red-600 mb-2 font-medium">{item.eslNote}</p>
                      <div className="flex flex-wrap gap-2">
                        {item.words.map((word, i) => (
                          <span key={i} className="px-3 py-1 bg-white rounded-full text-sm shadow-sm">{word}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vowels */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <button onClick={() => togglePhase('vowels')} className="w-full p-4 flex items-center justify-between bg-blue-50 hover:bg-blue-100 transition">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">🔵</span>
                  <div className="text-left">
                    <h3 className="font-bold text-blue-700">Short Vowels</h3>
                    <p className="text-sm text-blue-600">/a/, /e/, /i/, /o/, /u/ - Essential for CVC words</p>
                  </div>
                </div>
                <span className="text-2xl text-blue-500">{expandedPhases.includes('vowels') ? '▼' : '▶'}</span>
              </button>
              {expandedPhases.includes('vowels') && (
                <div className="p-4 grid gap-3">
                  {ISPY_COMPLETE.vowels.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-blue-400 pl-4 py-2 bg-blue-50/50 rounded-r-lg">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-bold text-blue-700">{item.sound}</h4>
                        <span className="text-2xl">{item.keyPic}</span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">{item.mouthTip}</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {item.words.map((word, i) => (
                          <span key={i} className="px-3 py-1 bg-white rounded-full text-sm shadow-sm">{word}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* MOVEABLE ALPHABET VIEW */}
        {activeView === 'moveable' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white">
              <h2 className="text-2xl font-bold mb-2">🔤 Moveable Alphabet Progressions</h2>
              <p className="text-amber-100">80+ CVC words organized by vowel. Build these words with the Moveable Alphabet BEFORE reading them!</p>
            </div>

            {MOVEABLE_ALPHABET_COMPLETE.map((stage) => (
              <div key={stage.stage} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <button 
                  onClick={() => toggleStage(stage.stage)} 
                  className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition"
                  style={{ backgroundColor: stage.color + '15' }}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: stage.color }}>
                      {stage.stage}
                    </span>
                    <div className="text-left">
                      <h3 className="font-bold" style={{ color: stage.color }}>Stage {stage.stage}: {stage.vowel}</h3>
                      <p className="text-sm text-gray-600">{stage.words.length} words • Click to expand</p>
                    </div>
                  </div>
                  <span className="text-2xl" style={{ color: stage.color }}>{expandedStages.includes(stage.stage) ? '▼' : '▶'}</span>
                </button>
                {expandedStages.includes(stage.stage) && (
                  <div className="p-4 border-t">
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">📝 Words to Build:</h4>
                      <div className="flex flex-wrap gap-2">
                        {stage.words.map((word, i) => (
                          <span key={i} className="px-3 py-2 rounded-lg text-white font-medium" style={{ backgroundColor: stage.color }}>{word}</span>
                        ))}
                      </div>
                    </div>
                    <div className="mb-4">
                      <h4 className="font-medium text-gray-700 mb-2">💬 Practice Phrases:</h4>
                      <div className="flex flex-wrap gap-2">
                        {stage.phrases.map((phrase, i) => (
                          <span key={i} className="px-3 py-2 bg-gray-100 rounded-lg text-gray-700 italic">"{phrase}"</span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-700 mb-2">🧺 Objects to Buy:</h4>
                      <div className="flex flex-wrap gap-2">
                        {stage.objects.map((obj, i) => (
                          <span key={i} className="px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm">{obj}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Pink Series Boxes */}
            <div className="bg-gradient-to-r from-red-400 to-pink-500 rounded-xl p-6 text-white">
              <h2 className="text-xl font-bold mb-4">📕 Pink Series Object Boxes</h2>
              <p className="text-red-100 mb-4">Create 5 boxes, one for each vowel. Each box contains miniature objects + word cards + control cards.</p>
              <div className="grid gap-3 md:grid-cols-5">
                {PINK_BOXES.map((box, idx) => (
                  <div key={idx} className="bg-white/20 backdrop-blur rounded-lg p-3">
                    <h4 className="font-bold text-lg mb-2">Box {idx + 1}: Short /{box.vowel}/</h4>
                    <div className="text-sm space-y-1">
                      {box.objects.map((obj, i) => (
                        <div key={i}>• {obj}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SHELF SETUP VIEW */}
        {activeView === 'shelf' && (
          <div className="space-y-4 print-container">
            {/* Print Styles */}
            <style jsx global>{`
              @media print {
                @page {
                  size: A4 portrait;
                  margin: 0.5cm;
                }
                body {
                  -webkit-print-color-adjust: exact !important;
                  print-color-adjust: exact !important;
                }
                header, .no-print {
                  display: none !important;
                }
                .print-container {
                  transform: scale(0.7);
                  transform-origin: top center;
                  width: 142%;
                  margin-left: -21%;
                }
                .print-container > div {
                  break-inside: avoid;
                  margin-bottom: 8px !important;
                }
                .bg-gradient-to-r {
                  background: linear-gradient(to right, var(--tw-gradient-stops)) !important;
                }
              }
            `}</style>
            {/* Header */}
            <div className="bg-gradient-to-r from-teal-500 to-emerald-600 rounded-xl p-6 text-white text-center relative">
              <button
                onClick={() => window.print()}
                className="absolute top-4 right-4 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg font-medium transition no-print flex items-center gap-2"
              >
                🖨️ Print PDF
              </button>
              <div className="text-5xl mb-2">🌳</div>
              <h2 className="text-3xl font-bold mb-1">Tredoux's English Area</h2>
              <p className="text-teal-100">Whale Class - 3 Shelf Setup</p>
              <div className="flex justify-center gap-3 mt-4">
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">← Progression Flow →</span>
                <span className="px-4 py-2 bg-white/20 rounded-full text-sm font-medium">Ages 2.5 → 6</span>
              </div>
            </div>

            {/* SHELF 1: PRE-READING */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-amber-700 to-amber-800 text-white p-4 text-center">
                <h3 className="text-xl font-bold">SHELF 1: PRE-READING</h3>
                <p className="text-amber-200 text-sm">Ages 2.5-3.5 • "Train the ear"</p>
              </div>
              <div className="p-4 space-y-4">
                {/* Top Tier: Sound Games */}
                <div className="bg-green-50 rounded-lg p-4">
                  <h4 className="text-green-700 font-bold text-sm mb-3">TOP TIER: SOUND GAMES</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-green-200 hover:border-green-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🧺</div>
                      <div className="font-bold text-sm">I-Spy /m/</div>
                      <div className="text-xs text-gray-500">mouse, mug...</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-green-200 hover:border-green-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🧺</div>
                      <div className="font-bold text-sm">I-Spy /s/</div>
                      <div className="text-xs text-gray-500">sun, sock...</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-green-200 hover:border-green-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🧺</div>
                      <div className="font-bold text-sm">I-Spy /a/</div>
                      <div className="text-xs text-gray-500">apple, ant...</div>
                    </div>
                  </div>
                </div>
                {/* Middle Tier: Sandpaper Letters */}
                <div className="bg-pink-50 rounded-lg p-4">
                  <h4 className="text-pink-700 font-bold text-sm mb-3">MIDDLE TIER: SANDPAPER LETTERS</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-pink-200 hover:border-pink-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">✋</div>
                      <div className="font-bold text-sm">a - i</div>
                      <div className="text-xs text-gray-500">lowercase</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-pink-200 hover:border-pink-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">✋</div>
                      <div className="font-bold text-sm">j - r</div>
                      <div className="text-xs text-gray-500">lowercase</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-pink-200 hover:border-pink-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">✋</div>
                      <div className="font-bold text-sm">s - z</div>
                      <div className="text-xs text-gray-500">lowercase</div>
                    </div>
                  </div>
                </div>
                {/* Bottom Tier: Metal Insets */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-blue-700 font-bold text-sm mb-3">BOTTOM TIER: METAL INSETS</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">💎</div>
                      <div className="font-bold text-sm">Metal Insets</div>
                      <div className="text-xs text-gray-500">10 shapes</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📄</div>
                      <div className="font-bold text-sm">Paper</div>
                      <div className="text-xs text-gray-500">inset squares</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">✏️</div>
                      <div className="font-bold text-sm">Pencils</div>
                      <div className="text-xs text-gray-500">colored pencils</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SHELF 2: ENCODING */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 text-center">
                <h3 className="text-xl font-bold">SHELF 2: ENCODING</h3>
                <p className="text-blue-200 text-sm">Ages 3.5-4.5 • "Writing before reading"</p>
              </div>
              <div className="p-4 space-y-4">
                {/* Top Tier: Moveable Alphabet */}
                <div className="bg-amber-50 rounded-lg p-4">
                  <h4 className="text-amber-700 font-bold text-sm mb-3">TOP TIER: MOVEABLE ALPHABET</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-amber-200 hover:border-amber-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🔤</div>
                      <div className="font-bold text-sm">Large MA</div>
                      <div className="text-xs text-gray-500">red consonants</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-amber-200 hover:border-amber-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🔤</div>
                      <div className="font-bold text-sm">Blue Vowels</div>
                      <div className="text-xs text-gray-500">a, e, i, o, u</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-amber-200 hover:border-amber-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🧺</div>
                      <div className="font-bold text-sm">CVC Objects</div>
                      <div className="text-xs text-gray-500">cat, dog, pen...</div>
                    </div>
                  </div>
                </div>
                {/* Middle Tier: Word Building */}
                <div className="bg-purple-50 rounded-lg p-4">
                  <h4 className="text-purple-700 font-bold text-sm mb-3">MIDDLE TIER: WORD BUILDING</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-purple-200 hover:border-purple-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📋</div>
                      <div className="font-bold text-sm">Short A Box</div>
                      <div className="text-xs text-gray-500">cat, hat, mat...</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-purple-200 hover:border-purple-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📋</div>
                      <div className="font-bold text-sm">Short E Box</div>
                      <div className="text-xs text-gray-500">bed, pen, hen...</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-purple-200 hover:border-purple-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📋</div>
                      <div className="font-bold text-sm">Short I/O/U</div>
                      <div className="text-xs text-gray-500">pig, dog, cup...</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* SHELF 3: DECODING */}
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white p-4 text-center">
                <h3 className="text-xl font-bold">SHELF 3: DECODING</h3>
                <p className="text-green-200 text-sm">Ages 4.5-6 • "Reading emerges naturally"</p>
              </div>
              <div className="p-4 space-y-4">
                {/* Top Tier: Pink Series */}
                <div className="bg-red-50 rounded-lg p-4">
                  <h4 className="text-red-700 font-bold text-sm mb-3">TOP TIER: PINK SERIES (CVC)</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-red-200 hover:border-red-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📕</div>
                      <div className="font-bold text-sm">Word Lists</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-red-200 hover:border-red-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🏷️</div>
                      <div className="font-bold text-sm">Phrases</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-red-200 hover:border-red-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📜</div>
                      <div className="font-bold text-sm">Sentences</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-red-200 hover:border-red-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📚</div>
                      <div className="font-bold text-sm">Readers</div>
                    </div>
                  </div>
                </div>
                {/* Middle Tier: Blue Series */}
                <div className="bg-blue-50 rounded-lg p-4">
                  <h4 className="text-blue-700 font-bold text-sm mb-3">MIDDLE TIER: BLUE SERIES (BLENDS)</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📘</div>
                      <div className="font-bold text-sm">Word Lists</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🏷️</div>
                      <div className="font-bold text-sm">Phrases</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📜</div>
                      <div className="font-bold text-sm">Sentences</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-blue-200 hover:border-blue-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📚</div>
                      <div className="font-bold text-sm">Readers</div>
                    </div>
                  </div>
                </div>
                {/* Bottom Tier: Green Series */}
                <div className="bg-emerald-50 rounded-lg p-4">
                  <h4 className="text-emerald-700 font-bold text-sm mb-3">BOTTOM TIER: GREEN SERIES (PHONOGRAMS)</h4>
                  <div className="grid grid-cols-4 gap-3">
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-emerald-200 hover:border-emerald-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📗</div>
                      <div className="font-bold text-sm">Word Lists</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-emerald-200 hover:border-emerald-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">🏷️</div>
                      <div className="font-bold text-sm">Phrases</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-emerald-200 hover:border-emerald-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📜</div>
                      <div className="font-bold text-sm">Sentences</div>
                    </div>
                    <div className="bg-white rounded-lg p-3 text-center border-2 border-emerald-200 hover:border-emerald-400 transition cursor-pointer">
                      <div className="text-2xl mb-1">📚</div>
                      <div className="font-bold text-sm">Readers</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Setup Instructions */}
            <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
              <h3 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
                <span className="text-2xl">💡</span> Setup Instructions
              </h3>
              <ul className="text-yellow-700 space-y-2 text-sm">
                <li>• <strong>3 physical shelves</strong> - Left to right = top to bottom reading direction</li>
                <li>• <strong>Color-coded containers</strong> - Green for sounds, Pink for CVC, Blue for blends, Green for phonograms</li>
                <li>• <strong>Labels on everything</strong> - Children return materials to correct spot</li>
                <li>• <strong>Work mats at child level</strong> - Easy access encourages independence</li>
              </ul>
            </div>
          </div>
        )}

        {/* TEACHING GUIDE VIEW (Original Content) */}
        {activeView === 'guide' && (
          <>
        {/* Stage Selection */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Select Stage</h2>
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {ENGLISH_GUIDE.map((s) => (
              <button
                key={s.id}
                onClick={() => { setSelectedStage(s.id); setSelectedSkill(null); }}
                className={`p-3 rounded-xl text-center transition-all ${
                  selectedStage === s.id
                    ? 'ring-4 ring-offset-2 scale-105'
                    : 'opacity-70 hover:opacity-100 hover:scale-102'
                }`}
                style={{
                  backgroundColor: s.bgColor,
                  ringColor: s.color
                }}
              >
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-xs font-semibold truncate" style={{ color: s.color }}>
                  {s.name.split(' ')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Stage Overview & Skills */}
        {stage && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-4">
            <div className="flex items-start gap-4 mb-4 pb-4 border-b" style={{ borderColor: stage.color }}>
              <div className="text-5xl">{stage.icon}</div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold" style={{ color: stage.color }}>{stage.name}</h2>
                <p className="text-gray-500">{stage.ageRange}</p>
                <p className="text-gray-700 mt-2">{stage.overview}</p>
              </div>
            </div>

            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Skills to Teach</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stage.skills.map((sk, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedSkill(idx)}
                  className={`p-4 rounded-lg text-left transition-all ${
                    selectedSkill === idx
                      ? 'ring-2 ring-offset-1'
                      : 'hover:bg-gray-50'
                  }`}
                  style={{
                    backgroundColor: selectedSkill === idx ? stage.bgColor : 'transparent',
                    ringColor: stage.color
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white`}
                      style={{ backgroundColor: stage.color }}>
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-800">{sk.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Skill Teaching Guide */}
        {skill && stage && (
          <div className="space-y-4">
            {/* How to Teach */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: stage.color }}>
                <span className="text-2xl">🎯</span> How to Teach: {skill.name}
              </h3>
              <ol className="space-y-3">
                {skill.howToTeach.map((step, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: stage.color }}>
                      {idx + 1}
                    </span>
                    <p className="text-gray-700 pt-1">{step}</p>
                  </li>
                ))}
              </ol>
            </div>

            {/* Materials */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-amber-600">
                <span className="text-2xl">📦</span> Materials Needed
              </h3>
              <ul className="space-y-3">
                {skill.materials.map((mat, idx) => (
                  <li key={idx} className="border-l-4 border-amber-200 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      {mat.link ? (
                        <Link href={mat.link} className="text-blue-600 hover:underline font-medium">
                          {mat.name} →
                        </Link>
                      ) : (
                        <span className="font-medium text-gray-800">{mat.name}</span>
                      )}
                    </div>
                    {mat.tip && (
                      <p className="text-sm text-gray-600 mt-1">💡 {mat.tip}</p>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="bg-red-50 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-red-600">
                <span className="text-2xl">🚫</span> Common Mistakes to Avoid
              </h3>
              <ul className="space-y-2">
                {skill.donts.map((dont, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <span className="text-red-800">{dont}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Ready When */}
            <div className="bg-green-50 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-green-600">
                <span className="text-2xl">✅</span> Ready for Next When...
              </h3>
              <p className="text-green-800 font-medium">{skill.readyWhen}</p>
            </div>

            {/* ESL Tip */}
            <div className="bg-blue-50 rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-blue-600">
                <span className="text-2xl">🇨🇳</span> Chinese ESL Tip
              </h3>
              <p className="text-blue-800">{skill.eslTip}</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!selectedStage && (
          <div className="space-y-4">
            {/* Toggle Buttons */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowVocabGuide(false)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                    !showVocabGuide ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📋 First 100 Words
                </button>
                <button
                  onClick={() => setShowVocabGuide(true)}
                  className={`flex-1 py-3 px-4 rounded-lg font-medium transition ${
                    showVocabGuide ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🧺 Shopping Guide
                </button>
              </div>
            </div>

            {/* First 100 Words */}
            {!showVocabGuide && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">📋 First 100 Words Progression</h2>
                  <p className="text-blue-100">Strategic vocabulary that feeds directly into Pink/Blue/Green reading series. Teach these words NOW so children recognize them when they learn to READ.</p>
                </div>

                {VOCABULARY_PROGRESSION.map((phase) => (
                  <div key={phase.phase} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="p-4 border-b" style={{ backgroundColor: phase.color + '15' }}>
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">{phase.icon}</span>
                        <div>
                          <h3 className="font-bold text-lg" style={{ color: phase.color }}>
                            Phase {phase.phase}: {phase.title}
                          </h3>
                          <p className="text-sm text-gray-500">{phase.weeks}</p>
                        </div>
                      </div>
                      <p className="mt-2 text-gray-700">{phase.why}</p>
                    </div>
                    <div className="p-4">
                      <div className="flex flex-wrap gap-2">
                        {phase.words.map((w, idx) => (
                          <span
                            key={idx}
                            className={`px-3 py-1 rounded-full text-sm font-medium ${
                              w.series === 'pink' ? 'bg-red-100 text-red-700' :
                              w.series === 'blue' ? 'bg-blue-100 text-blue-700' :
                              w.series === 'green' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'
                            }`}
                            title={w.type}
                          >
                            {w.word}
                          </span>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-4 text-xs">
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400"></span> Pink (CVC)</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400"></span> Blue (Blends)</span>
                        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400"></span> Green (Phonograms)</span>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
                  <h3 className="font-bold text-yellow-800 mb-2">💡 Teaching Tip</h3>
                  <p className="text-yellow-700">Spend 2-3 weeks per phase. Don't rush! A child who KNOWS 100 words will learn to READ them much faster than one who's seeing words for the first time.</p>
                </div>
              </div>
            )}

            {/* Shopping Guide */}
            {showVocabGuide && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-xl p-6 text-white">
                  <h2 className="text-2xl font-bold mb-2">🧺 Vocabulary Baskets Shopping Guide</h2>
                  <p className="text-amber-100">What to buy and where to find it. Build 6 themed baskets for around ¥250-400 total.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {VOCABULARY_BASKETS.map((basket, idx) => (
                    <div key={idx} className="bg-white rounded-xl shadow-sm overflow-hidden">
                      <div className="p-4 border-b" style={{ backgroundColor: basket.color + '15' }}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{basket.icon}</span>
                            <h3 className="font-bold" style={{ color: basket.color }}>{basket.name}</h3>
                          </div>
                          <span className="text-sm font-medium px-2 py-1 rounded-full bg-white" style={{ color: basket.color }}>
                            {basket.budget}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{basket.whereToBuy}</p>
                        {basket.taobaoLink && (
                          <a 
                            href={basket.taobaoLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 mt-2 px-3 py-1 bg-orange-500 text-white text-xs font-medium rounded-full hover:bg-orange-600 transition"
                          >
                            📍 Search Taobao
                          </a>
                        )}
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          {basket.items.map((item, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <span className="text-gray-400">•</span>
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                          💡 {basket.tip}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="bg-green-50 rounded-xl p-6 border-2 border-green-200">
                  <h3 className="font-bold text-green-800 mb-2">🛒 Quick Start Shopping List</h3>
                  <p className="text-green-700 mb-3">Search these on Taobao for best prices:</p>
                  <ul className="text-green-700 space-y-1 text-sm">
                    <li>• <strong>Safari Ltd TOOBS</strong> - Animal sets (仿真动物模型)</li>
                    <li>• <strong>Wooden play food</strong> - 木制过家家食物</li>
                    <li>• <strong>Dollhouse furniture</strong> - 迷你家具套装</li>
                    <li>• <strong>Doll clothes set</strong> - 娃娃衣服配件</li>
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
          </>
        )}
      </main>
    </div>
  );
}
