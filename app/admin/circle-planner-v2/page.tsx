'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CircleDayV2 {
  day: string;
  dayLabel: string;
  targetWord: string;
  targetPhrase: string;
  gesture: string;
  isBookDay: boolean;
  songBlock: {
    duration: string;
    steps: string[];
  };
  bookBlock?: {
    title: string;
    duration: string;
    before: string;
    during: string;
    after: string;
  };
  activityBlock: {
    name: string;
    duration: string;
    steps: string[];
    tip: string;
  };
}

interface CircleWeekV2 {
  id: string;
  weekOf: string;
  theme: string;
  themeIcon: string;
  color: string;
  colorLight: string;
  song: string;
  songNote: string;
  vocabulary: { word: string; gesture: string }[];
  phrase: string;
  books: { title: string; day: string }[];
  materials: string[];
  days: CircleDayV2[];
}

// ─── Earth Day Week Data ─────────────────────────────────────────────────────

const EARTH_DAY_WEEK: CircleWeekV2 = {
  id: 'earth-day-pollution',
  weekOf: '2026-04-20',
  theme: 'Earth Day & Pollution',
  themeIcon: '🌍',
  color: '#16a34a',
  colorLight: '#f0fdf4',
  song: 'Happy Earth Day',
  songNote: 'Sung every day. Add actions: clap on "Earth", stomp on "Day", spin on "happy"',
  vocabulary: [
    { word: 'dirty', gesture: '🤢 Hold nose, wave hand' },
    { word: 'recycle', gesture: '♻️ Arms make a circle' },
    { word: 'tree', gesture: '🌳 Arms up like branches' },
    { word: 'clean', gesture: '👍 Thumbs up, big smile' },
    { word: 'help', gesture: '🫶 Hand on heart' },
  ],
  phrase: 'I help the Earth!',
  books: [
    { title: 'Look out for Litter', day: 'Tuesday' },
    { title: 'Save the Pandas', day: 'Wednesday' },
  ],
  materials: [
    '6 pollution picture cards (air, water, land, plastic, noise, light)',
    'Squeaky hammer',
    '3 sorting mats with pictures (paper / plastic / metal)',
    'Real objects to sort (paper cup, plastic bottle, tin can, cardboard, plastic bag, foil)',
    'Toy animals + habitat picture cards (tree, water, grass, cave)',
    'Water basin or blue cloth + plastic bits + small nets/spoons',
    'Pre-printed Earth booklet pages (or blank paper folded in half)',
    'Crayons + stickers (tree, water, trash, Earth)',
  ],
  days: [
    {
      day: 'monday',
      dayLabel: 'Monday',
      targetWord: 'dirty',
      targetPhrase: 'Pollution makes the Earth dirty!',
      gesture: '🤢 Hold nose, wave hand',
      isBookDay: false,
      songBlock: {
        duration: '10 min',
        steps: [
          'Hello song',
          'Sing "Happy Earth Day" — teach actions',
          'Teach gesture: hold nose + wave = "dirty!"',
          'Whole class chants "dirty! dirty!" pointing at pollution cards',
        ],
      },
      activityBlock: {
        name: '🔨 Dirty or Clean? (Squeaky Hammer)',
        duration: '20 min',
        steps: [
          'Lay 6 pollution cards face-down on mat',
          'Kids flip one — teacher: "DIRTY air! Say it — dirty!"',
          'Hammer game: teacher says word → if "dirty" → hammer the card, if "clean" → hands on head',
          'End: sort all cards into "dirty" pile together',
        ],
        tip: 'Let the littlest ones just hammer everything — the word exposure is what matters',
      },
    },
    {
      day: 'tuesday',
      dayLabel: 'Tuesday',
      targetWord: 'recycle',
      targetPhrase: 'We can recycle!',
      gesture: '♻️ Arms make a circle',
      isBookDay: true,
      songBlock: {
        duration: '10 min',
        steps: [
          'Hello song',
          'Sing "Happy Earth Day"',
          'Quick review: hold up 2 cards — "dirty or clean?"',
          'Teach gesture: arms circle = "recycle!"',
        ],
      },
      bookBlock: {
        title: 'Look out for Litter',
        duration: '10 min',
        before: 'Show cover: "This book is about TRASH — dirty!"',
        during: 'Every time trash appears in pictures → kids shout "dirty!"',
        after: '"But we can RECYCLE!" — pick up a paper cup dramatically',
      },
      activityBlock: {
        name: '♻️ Sorting Station',
        duration: '10 min',
        steps: [
          '3 mats on floor: paper, plastic, metal (with pictures)',
          'Pile of real objects in the middle',
          'Kids take turns: pick one → place on right mat',
          'Whole class chants "Re-cy-cle!" after each correct sort',
        ],
        tip: 'Younger kids just carry and place — don\'t worry about accuracy, the sorting action is the lesson',
      },
    },
    {
      day: 'wednesday',
      dayLabel: 'Wednesday',
      targetWord: 'tree',
      targetPhrase: 'Save the trees!',
      gesture: '🌳 Arms up like branches',
      isBookDay: true,
      songBlock: {
        duration: '10 min',
        steps: [
          'Hello song',
          'Sing "Happy Earth Day"',
          'Review gestures: "dirty!" (nose) → "recycle!" (arms circle)',
          'New gesture: arms up = "tree!" — everyone does tree pose',
        ],
      },
      bookBlock: {
        title: 'Save the Pandas',
        duration: '10 min',
        before: '"Pandas live in TREES!" — everyone does tree pose',
        during: 'Every time a tree appears → tree pose',
        after: '"No trees = no home for panda" — sad face → happy when we plant',
      },
      activityBlock: {
        name: '🐾 Animal Homes Matching',
        duration: '10 min',
        steps: [
          'Lay out animal cards + habitat cards (tree, water, grass, cave)',
          'Kids match animal to its home',
          '"Where does the bird live? TREE!"',
          'Younger kids: stick animals onto a big tree picture',
        ],
        tip: 'Keep it physical — let them walk the animal card to the habitat card across the room',
      },
    },
    {
      day: 'thursday',
      dayLabel: 'Thursday',
      targetWord: 'clean',
      targetPhrase: 'We can clean the water!',
      gesture: '👍 Thumbs up, big smile',
      isBookDay: false,
      songBlock: {
        duration: '10 min',
        steps: [
          'Hello song',
          'Sing "Happy Earth Day"',
          'Review ALL gestures: dirty → recycle → tree',
          'New: thumbs up + smile = "clean!" — "Dirty water → CLEAN water!"',
        ],
      },
      activityBlock: {
        name: '💧 Clean the Water!',
        duration: '20 min',
        steps: [
          'Basin with water + floating plastic bits',
          'Before scooping: "Dirty water!" (hold nose)',
          'Kids scoop trash out with nets or spoons — everyone gets a turn',
          'After scooping: "CLEAN water!" (thumbs up)',
        ],
        tip: 'Older kids count how many pieces they scooped. The physical before/after is the lesson — dirty basin → clean basin',
      },
    },
    {
      day: 'friday',
      dayLabel: 'Friday',
      targetWord: 'I help the Earth',
      targetPhrase: 'I help the Earth!',
      gesture: '🫶 Hand on heart',
      isBookDay: false,
      songBlock: {
        duration: '10 min',
        steps: [
          'Hello song',
          'Sing "Happy Earth Day"',
          'Speed review: teacher shouts word → kids do gesture (all 4!)',
          'New phrase: hand on heart = "I help the Earth"',
        ],
      },
      activityBlock: {
        name: '📒 My Earth Booklet',
        duration: '20 min',
        steps: [
          'Page 1: Color the Earth green and blue',
          'Page 2: Draw or paste sticker of something "dirty" (trash)',
          'Page 3: Draw or paste sticker of something "clean" (tree, water)',
          'Cover: teacher writes "I help the Earth" — kids trace or decorate',
        ],
        tip: 'Everyone takes it home. Final moment: whole class stands, hand on heart — "I help the Earth!"',
      },
    },
  ],
};

// ─── All weeks (expand this array as school sends more plans) ────────────────

const ALL_WEEKS: CircleWeekV2[] = [EARTH_DAY_WEEK];

// ─── Component ───────────────────────────────────────────────────────────────

export default function CirclePlannerV2() {
  const router = useRouter();
  const [selectedWeekId, setSelectedWeekId] = useState<string>(ALL_WEEKS[0].id);
  const [selectedDayIndex, setSelectedDayIndex] = useState(0);
  const [showPrep, setShowPrep] = useState(false);

  const week = ALL_WEEKS.find(w => w.id === selectedWeekId) || ALL_WEEKS[0];
  const day = week.days[selectedDayIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-20 bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button onClick={() => router.back()} className="text-gray-400 text-sm">
              ← Back
            </button>
            <h1 className="text-base font-bold text-gray-900">
              Circle Time v2
            </h1>
            <button
              onClick={() => setShowPrep(!showPrep)}
              className="text-sm px-3 py-1 rounded-full bg-gray-100 hover:bg-gray-200"
            >
              {showPrep ? '📋 Hide Prep' : '📋 Prep'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4 pb-32">

        {/* ── Week Theme Banner ── */}
        <div
          className="rounded-2xl p-4 mb-4 text-white"
          style={{ backgroundColor: week.color }}
        >
          <div className="flex items-center gap-3">
            <span className="text-4xl">{week.themeIcon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-lg font-bold leading-tight">{week.theme}</div>
              <div className="text-sm opacity-90 mt-1">🎵 {week.song}</div>
              <div className="text-xs opacity-75 mt-0.5">
                📖 {week.books.map(b => b.title).join(' · ')}
              </div>
            </div>
          </div>

          {/* Weekly Words */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {week.vocabulary.map((v, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  i === selectedDayIndex
                    ? 'bg-white text-gray-900 scale-110 shadow-lg'
                    : 'bg-white/20 text-white'
                }`}
              >
                {v.word}
              </span>
            ))}
          </div>

          {/* Phrase */}
          <div className="mt-2 text-center">
            <span className="text-sm font-medium bg-white/15 px-3 py-1 rounded-full inline-block">
              🗣️ &quot;{week.phrase}&quot;
            </span>
          </div>
        </div>

        {/* ── Prep Panel (collapsible) ── */}
        {showPrep && (
          <div className="bg-white rounded-xl p-4 mb-4 shadow-sm border-2 border-dashed border-amber-300">
            <h3 className="font-bold text-gray-800 mb-3">📋 Monday Morning Prep</h3>

            {/* Materials */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">🧰 Materials</h4>
              <ul className="space-y-1">
                {week.materials.map((m, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-gray-300 mt-0.5">☐</span>
                    <span>{m}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Gestures */}
            <div className="mb-4">
              <h4 className="font-semibold text-gray-700 text-sm mb-2">🤲 Word Gestures</h4>
              <div className="grid grid-cols-1 gap-1.5">
                {week.vocabulary.map((v, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-1.5">
                    <span className="font-bold text-gray-900 w-16">{v.word}</span>
                    <span className="text-gray-500">{v.gesture}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Tool Links */}
            <div>
              <h4 className="font-semibold text-gray-700 text-sm mb-2">🛠️ Generate Materials</h4>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/admin/vocabulary-flashcards`}
                  className="px-3 py-1.5 bg-cyan-500 text-white text-sm rounded-lg hover:bg-cyan-600 inline-flex items-center gap-1"
                >
                  🃏 Flashcards
                </Link>
                <Link
                  href={`/admin/card-generator`}
                  className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 inline-flex items-center gap-1"
                >
                  🎴 3-Part Cards
                </Link>
                <a
                  href={`/tools/picture-bingo-generator.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 inline-flex items-center gap-1"
                >
                  🎯 Picture Bingo
                </a>
                <a
                  href={`/tools/my-first-dictionary.html`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-amber-500 text-white text-sm rounded-lg hover:bg-amber-600 inline-flex items-center gap-1"
                >
                  📖 Dictionary
                </a>
              </div>
            </div>
          </div>
        )}

        {/* ── Day Selector ── */}
        <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
          {week.days.map((d, i) => (
            <button
              key={d.day}
              onClick={() => setSelectedDayIndex(i)}
              className={`flex-1 min-w-0 px-2 py-2.5 rounded-xl text-center transition-all ${
                selectedDayIndex === i
                  ? 'bg-gray-900 text-white shadow-lg scale-[1.02]'
                  : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
              }`}
            >
              <div className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                {d.dayLabel.slice(0, 3)}
              </div>
              <div className={`text-xs font-bold mt-0.5 ${selectedDayIndex === i ? '' : 'text-gray-900'}`}>
                {d.isBookDay ? '📖' : '🎯'} {d.targetWord}
              </div>
            </button>
          ))}
        </div>

        {/* ── Day Plan Card ── */}
        <div className="space-y-3">

          {/* Target Word — THE headline */}
          <div
            className="rounded-xl p-4 text-center"
            style={{ backgroundColor: week.colorLight, border: `2px solid ${week.color}` }}
          >
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Today&apos;s Target
            </div>
            <div className="text-3xl font-black mt-1" style={{ color: week.color }}>
              {day.targetWord}
            </div>
            <div className="text-lg mt-1">{day.gesture}</div>
            <div className="text-sm text-gray-600 mt-2 italic">
              &quot;{day.targetPhrase}&quot;
            </div>
          </div>

          {/* Song Block */}
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-amber-800">
                🎵 Song
              </h3>
              <span className="text-xs font-medium bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
                {day.songBlock.duration}
              </span>
            </div>
            <ol className="space-y-1.5">
              {day.songBlock.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-amber-900">
                  <span className="font-bold text-amber-400 mt-0.5 text-xs w-4 shrink-0">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Book Block (only on book days) */}
          {day.bookBlock && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-blue-800">
                  📖 {day.bookBlock.title}
                </h3>
                <span className="text-xs font-medium bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">
                  {day.bookBlock.duration}
                </span>
              </div>
              <div className="space-y-1.5 text-sm text-blue-900">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-400 shrink-0 text-xs mt-0.5">BEFORE</span>
                  <span>{day.bookBlock.before}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-400 shrink-0 text-xs mt-0.5">DURING</span>
                  <span>{day.bookBlock.during}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-400 shrink-0 text-xs mt-0.5">AFTER</span>
                  <span>{day.bookBlock.after}</span>
                </div>
              </div>
            </div>
          )}

          {/* Activity Block */}
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-emerald-800">
                {day.activityBlock.name}
              </h3>
              <span className="text-xs font-medium bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">
                {day.activityBlock.duration}
              </span>
            </div>
            <ol className="space-y-1.5">
              {day.activityBlock.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-emerald-900">
                  <span className="font-bold text-emerald-400 mt-0.5 text-xs w-4 shrink-0">{i + 1}</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <div className="mt-3 pt-2 border-t border-emerald-200">
              <div className="text-xs text-emerald-700 italic">
                💡 {day.activityBlock.tip}
              </div>
            </div>
          </div>

          {/* Day Summary Footer */}
          <div className="bg-gray-100 rounded-xl p-3 text-center">
            <div className="text-xs text-gray-500">
              {day.isBookDay ? '10 song + 10 book + 10 activity' : '10 song + 20 activity'} = <span className="font-bold text-gray-700">30 min</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Win condition: kids say &quot;{day.targetWord}&quot; {day.gesture.split(' ')[0]}
            </div>
          </div>
        </div>

        {/* ── Day Navigation (swipe-like) ── */}
        <div className="flex justify-between mt-4">
          <button
            onClick={() => setSelectedDayIndex(Math.max(0, selectedDayIndex - 1))}
            disabled={selectedDayIndex === 0}
            className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm disabled:opacity-30"
          >
            ← {selectedDayIndex > 0 ? week.days[selectedDayIndex - 1].dayLabel : ''}
          </button>
          <button
            onClick={() => setSelectedDayIndex(Math.min(4, selectedDayIndex + 1))}
            disabled={selectedDayIndex === 4}
            className="px-4 py-2 bg-white rounded-lg shadow-sm text-sm disabled:opacity-30"
          >
            {selectedDayIndex < 4 ? week.days[selectedDayIndex + 1].dayLabel : ''} →
          </button>
        </div>

        {/* ── Week Navigation (when multiple weeks exist) ── */}
        {ALL_WEEKS.length > 1 && (
          <div className="mt-6 pt-4 border-t">
            <h4 className="text-sm font-bold text-gray-700 mb-2">Other Weeks</h4>
            <div className="flex flex-wrap gap-2">
              {ALL_WEEKS.map(w => (
                <button
                  key={w.id}
                  onClick={() => { setSelectedWeekId(w.id); setSelectedDayIndex(0); }}
                  className={`px-3 py-1.5 rounded-lg text-sm ${
                    w.id === selectedWeekId
                      ? 'bg-gray-900 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 shadow-sm'
                  }`}
                >
                  {w.themeIcon} {w.theme}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
