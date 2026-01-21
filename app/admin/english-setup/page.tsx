'use client';

import { useState } from 'react';
import Link from 'next/link';

// ============================================
// BRAIN DATA - Audited from /api/brain/works
// 37 Language Works mapped to shelf positions
// ============================================

const BRAIN_DATA = {
  // SHELF 1: PRE-READING
  soundGames: {
    name: 'Sound Games',
    age: '2.5-4 years',
    directAims: ['Isolate beginning sounds', 'Phonemic awareness', 'Listening skills'],
    indirectAims: ['Sandpaper Letter preparation', 'Reading foundation'],
    materials: ['Objects with distinct beginning sounds'],
    description: 'Sound Games (like "I Spy with my little eye something beginning with /m/") develop the ability to isolate sounds in words - a prerequisite for connecting sounds to letters.',
    readiness: ['Speaks clearly', 'Can listen attentively', 'Vocabulary developing'],
  },
  iSpyBeginning: {
    name: 'I Spy - Beginning Sounds',
    age: '3-4.5 years',
    directAims: ['Isolate beginning sounds', 'Phonemic awareness'],
    materials: ['Objects with distinct beginning sounds'],
    description: 'Child learns to hear the first sound in words.',
    // Supplemental word lists (not in brain, but essential for setup)
    sounds: ['m', 's', 'a', 't', 'c', 'r', 'i', 'p', 'n', 'o', 'b', 'f', 'g', 'h', 'j', 'e', 'd', 'u', 'l', 'w', 'k', 'v', 'x', 'q', 'y', 'z'],
  },
  iSpyEnding: {
    name: 'I Spy - Ending Sounds',
    age: '3-4.5 years',
    directAims: ['Isolate ending sounds', 'Complete word awareness'],
    indirectAims: ['Spelling preparation', 'Sound discrimination'],
    materials: ['Objects'],
    description: 'Child learns to hear the last sound in words.',
    readiness: ['Beginning sounds solid'],
  },
  iSpyMiddle: {
    name: 'I Spy - Middle Sounds',
    age: '3.5-5 years',
    directAims: ['Isolate middle sounds', 'Full phonemic analysis'],
    indirectAims: ['Complete decoding preparation', 'Vowel awareness'],
    materials: ['Objects'],
    description: 'Child learns to identify vowel sounds in the middle of words.',
    readiness: ['Ending sounds success'],
  },
  sandpaperLetters: {
    name: 'Sandpaper Letters',
    age: '3-5 years',
    directAims: ['Letter-sound association', 'Letter formation', 'Tactile learning'],
    indirectAims: ['Writing preparation', 'Reading foundation', 'Multi-sensory learning'],
    materials: ['Sandpaper Letters (lowercase on colored boards)'],
    description: 'Sandpaper Letters engage three senses: children see the letter, feel its shape, and say its sound. This multi-sensory approach creates strong memory pathways.',
    readiness: ['Sound Games mastered', 'Metal Insets started', 'Fine motor developing'],
  },
  metalInsets: {
    name: 'Metal Insets',
    age: '3-6 years',
    directAims: ['Hand control', 'Pencil grip'],
    indirectAims: ['Handwriting preparation', 'Design creativity'],
    materials: ['Metal insets (10 shapes)', 'Colored pencils', 'Paper'],
    description: 'Child develops hand control through tracing designs. The 10 shapes are: circle, square, triangle, rectangle, oval, ellipse, quatrefoil, curvilinear triangle, pentagon, trapezoid.',
    readiness: ['Can hold pencil', 'Can trace'],
  },
  
  // SHELF 2: ENCODING
  moveableAlphabet: {
    name: 'Moveable Alphabet',
    age: '3.5-6 years',
    directAims: ['Word building', 'Encoding (spelling)', 'Composition without handwriting'],
    indirectAims: ['Reading preparation', 'Spelling awareness', 'Creative expression'],
    materials: ['Large Moveable Alphabet (wooden letters in box)'],
    description: 'The Moveable Alphabet allows children to compose words and sentences before mastering handwriting. This separates the cognitive task of encoding from the motor task of writing.',
    readiness: ['Knows several sandpaper letters', 'Can segment sounds', 'Interested in words'],
    colors: { vowels: 'Blue', consonants: 'Red' },
  },
  moveableAlphabetCVC: {
    name: 'Moveable Alphabet - CVC Words',
    age: '3.5-5 years',
    directAims: ['Build simple words', 'Encoding'],
    indirectAims: ['Spelling', 'Reading preparation'],
    materials: ['Moveable alphabet'],
    description: 'Child builds simple three-letter words (cat, bed, pig, hot, cup).',
    readiness: ['Can segment sounds'],
  },
  
  // SHELF 2: Object Boxes (Pink Series prep)
  pinkObjectBox: {
    name: 'Pink Series - Objects',
    age: '4-5 years',
    directAims: ['Decode CVC words', 'Connect written words to objects'],
    indirectAims: ['Reading fluency', 'Spelling patterns'],
    materials: ['Pink Series object box with CVC word cards'],
    description: 'Pink Series words are CVC (consonant-vowel-consonant) words with short vowels: cat, bed, lip, hot, bus. Matching words to objects confirms comprehension.',
    readiness: ['Can build CVC words with Moveable Alphabet', 'Knows all letter sounds', 'Interest in reading'],
    wordsByVowel: {
      'Short A': ['cat', 'bat', 'hat', 'mat', 'sat', 'rat', 'can', 'pan', 'man', 'fan', 'cap', 'map', 'tap', 'bag', 'tag'],
      'Short E': ['bed', 'red', 'pen', 'hen', 'ten', 'net', 'wet', 'pet', 'jet', 'leg', 'peg', 'web'],
      'Short I': ['pig', 'big', 'dig', 'wig', 'pin', 'bin', 'fin', 'win', 'sit', 'hit', 'lip', 'tip', 'zip'],
      'Short O': ['dog', 'log', 'fog', 'pot', 'hot', 'cot', 'mop', 'top', 'hop', 'box', 'fox', 'job'],
      'Short U': ['cup', 'pup', 'bus', 'nut', 'hut', 'cut', 'bug', 'rug', 'hug', 'mug', 'sun', 'run', 'fun'],
    },
  },
  
  // SHELF 3: DECODING - Pink Series
  pinkPictureMatch: {
    name: 'Pink Series - Picture Word Match',
    age: '4-5 years',
    directAims: ['Read without objects', 'Visual decoding'],
    indirectAims: ['Reading independence', 'Comprehension'],
    materials: ['Pink series picture cards', 'Word cards'],
    description: 'Child reads words and matches them to pictures.',
    readiness: ['Object match success'],
  },
  pinkLists: {
    name: 'Pink Series - Lists',
    age: '4-5 years',
    directAims: ['Read word lists', 'Fluency building'],
    indirectAims: ['Reading speed', 'Confidence'],
    materials: ['Pink series word lists'],
    description: 'Child reads lists of CVC words organized by word family.',
    readiness: ['Picture match solid'],
  },
  pinkPhrases: {
    name: 'Pink Series - Phrases',
    age: '4-5 years',
    directAims: ['Read simple phrases', 'Comprehension'],
    indirectAims: ['Sentence preparation', 'Meaning'],
    materials: ['Pink series phrase cards'],
    description: 'Child reads short phrases like "a fat cat", "the red bed", "a big pig".',
    readiness: ['List reading success'],
    examples: ['a fat cat', 'the red bed', 'a big pig', 'the hot pot', 'a fun run'],
  },
  pinkSentences: {
    name: 'Pink Series - Sentences',
    age: '4.5-5.5 years',
    directAims: ['Read full sentences', 'Complete thoughts'],
    indirectAims: ['Reading comprehension', 'Book preparation'],
    materials: ['Pink series sentence cards'],
    description: 'Child reads complete sentences using only CVC words.',
    readiness: ['Phrase reading solid'],
    examples: ['The cat sat on the mat.', 'The dog ran in the fog.', 'The pig is big and fat.'],
  },
  pinkBooks: {
    name: 'Pink Series - Books',
    age: '4.5-5.5 years',
    directAims: ['Read simple books', 'Reading enjoyment'],
    indirectAims: ['Love of reading', 'Independence'],
    materials: ['Pink series readers'],
    description: 'Child reads their first simple books independently.',
    readiness: ['Sentence success'],
  },
  
  // SHELF 3: DECODING - Blue Series
  blueBlends: {
    name: 'Blue Series - Blends',
    age: '4.5-6 years',
    directAims: ['Decode consonant blends', 'Read 4-6 letter words'],
    indirectAims: ['Reading fluency', 'Phonics patterns'],
    materials: ['Blue Series materials with blend words'],
    description: 'Blue Series introduces consonant blends (bl, cl, fl, st, sp, etc.) while maintaining short vowel sounds. This bridges simple CVC words and complex phonograms.',
    readiness: ['Pink Series mastered', 'Can read CVC words fluently', 'Interest in longer words'],
    blends: {
      'Initial L-blends': ['bl', 'cl', 'fl', 'gl', 'pl', 'sl'],
      'Initial R-blends': ['br', 'cr', 'dr', 'fr', 'gr', 'pr', 'tr'],
      'Initial S-blends': ['sc', 'sk', 'sm', 'sn', 'sp', 'st', 'sw'],
      'Final blends': ['-nd', '-nt', '-nk', '-mp', '-sk', '-sp', '-st', '-lt', '-lk', '-lp'],
    },
    examples: ['flag', 'stop', 'frog', 'drum', 'trip', 'jump', 'desk', 'help'],
  },
  blueDigraphs: {
    name: 'Blue Series - Digraphs',
    age: '5-6 years',
    directAims: ['Decode digraphs', 'sh, ch, th sounds'],
    indirectAims: ['Phonics patterns', 'Reading expansion'],
    materials: ['Blue series digraph materials'],
    description: 'Child reads words with sh, ch, th, and other digraphs where two letters make one sound.',
    readiness: ['Blend success'],
    digraphs: ['sh', 'ch', 'th', 'wh', 'ph', 'ck'],
    examples: ['ship', 'chat', 'thin', 'when', 'phone', 'duck'],
  },
  blueBooks: {
    name: 'Blue Series - Books',
    age: '5-6 years',
    directAims: ['Read blend/digraph books', 'Fluency'],
    indirectAims: ['Reading confidence', 'Comprehension'],
    materials: ['Blue series readers'],
    description: 'Child reads books containing blends and digraphs.',
    readiness: ['Digraph success'],
  },
  
  // SHELF 3: DECODING - Green Series
  greenPhonograms: {
    name: 'Green Series - Phonograms',
    age: '5-6 years',
    directAims: ['Decode phonograms', 'Read complex words'],
    indirectAims: ['Reading fluency', 'Spelling mastery'],
    materials: ['Green Series materials with phonogram words'],
    description: 'Green Series introduces phonograms - letter combinations that create unique sounds (ai in rain, oa in boat, ee in feet). This is the final key to reading fluency.',
    readiness: ['Blue Series mastered', 'Reads blends fluently', 'Interest in complex words'],
    phonograms: ['ai', 'ay', 'ee', 'ea', 'ie', 'igh', 'oa', 'ow', 'oo', 'ou', 'ew', 'aw', 'ar', 'or', 'er', 'ir', 'ur'],
    examples: ['rain', 'play', 'tree', 'boat', 'night', 'moon', 'star', 'bird'],
  },
  greenLongVowels: {
    name: 'Green Series - Long Vowels',
    age: '5-6 years',
    directAims: ['Long vowel patterns', 'Silent e'],
    indirectAims: ['Advanced phonics', 'Spelling patterns'],
    materials: ['Green series long vowel materials'],
    description: 'Child learns long vowel patterns including silent e (cake, bike, home, cute).',
    readiness: ['Blue mastery'],
    patterns: ['a-e (cake)', 'i-e (bike)', 'o-e (home)', 'u-e (cute)', 'e-e (these)'],
  },
  greenBooks: {
    name: 'Green Series - Books',
    age: '5.5-6 years',
    directAims: ['Read complex books', 'Reading fluency'],
    indirectAims: ['Independent reading', 'Comprehension'],
    materials: ['Green series readers'],
    description: 'Child reads books with complex phonics patterns - approaching grade-level reading.',
    readiness: ['Phonogram success'],
  },
};

// ============================================
// COMPONENT
// ============================================

export default function EnglishSetupPage() {
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const openModal = (key: string) => {
    setSelectedItem({ key, ...BRAIN_DATA[key as keyof typeof BRAIN_DATA] });
  };

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold text-amber-900 mb-2">🐋 Tredoux's English Area</h1>
          <p className="text-amber-700 text-lg">Whale Class - 3 Shelf Setup</p>
          <div className="flex justify-center gap-4 md:gap-8 mt-4 text-sm flex-wrap">
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full">← Progression Flow →</span>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full">Ages 2.5 → 6</span>
            <Link href="/admin/english-guide" className="px-3 py-1 bg-amber-200 text-amber-800 rounded-full hover:bg-amber-300 transition">
              📖 Teaching Guide
            </Link>
          </div>
        </div>

        {/* Three Shelves Container */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          {/* SHELF 1: Pre-Reading */}
          <div className="bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700 rounded-lg p-4 shadow-xl border-3 border-amber-900">
            <div className="bg-green-600 text-white text-center py-2 rounded-t-lg mb-3 font-bold">
              SHELF 1: PRE-READING
              <div className="text-xs font-normal opacity-90">Ages 2.5-3.5 • "Train the ear"</div>
            </div>
            
            {/* Top Tier: Sound Games */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Top Tier: Sound Games</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('soundGames')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-2xl mb-1">🎯</div>
                  <div className="text-xs font-medium">Sound Games</div>
                  <div className="text-[10px] text-gray-500">I-Spy intro</div>
                </button>
                <button onClick={() => openModal('iSpyBeginning')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-2xl mb-1">🧺</div>
                  <div className="text-xs font-medium">Beginning</div>
                  <div className="text-[10px] text-gray-500">26 sounds</div>
                </button>
                <button onClick={() => openModal('iSpyEnding')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-2xl mb-1">🧺</div>
                  <div className="text-xs font-medium">Ending</div>
                  <div className="text-[10px] text-gray-500">/-t/, /-n/...</div>
                </button>
              </div>
              <div className="mt-2">
                <button onClick={() => openModal('iSpyMiddle')} className="w-full bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-lg mb-1">🎯</div>
                  <div className="text-xs font-medium">Middle Sounds (Vowels)</div>
                  <div className="text-[10px] text-gray-500">/-a-/, /-e-/, /-i-/, /-o-/, /-u-/</div>
                </button>
              </div>
            </div>
            
            {/* Middle Tier: Sandpaper Letters */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Middle Tier: Sandpaper Letters</div>
              <button onClick={() => openModal('sandpaperLetters')} className="w-full bg-white rounded p-3 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="text-2xl mb-1">✋</div>
                <div className="text-sm font-bold">SANDPAPER LETTERS</div>
                <div className="text-[10px] text-gray-500">26 lowercase on colored boards</div>
                <div className="flex justify-center gap-1 mt-2 flex-wrap">
                  {['a','b','c','d','e'].map(l => (
                    <span key={l} className="w-5 h-5 flex items-center justify-center bg-pink-100 text-pink-700 rounded text-xs font-bold">{l}</span>
                  ))}
                  <span className="text-gray-400 text-xs">... z</span>
                </div>
              </button>
            </div>
            
            {/* Bottom Tier: Metal Insets */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Bottom Tier: Metal Insets</div>
              <button onClick={() => openModal('metalInsets')} className="w-full bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="flex justify-center gap-2 mb-1">
                  <span className="text-lg">🔷</span>
                  <span className="text-lg">📝</span>
                  <span className="text-lg">✏️</span>
                </div>
                <div className="text-xs font-medium">Metal Insets + Paper + Pencils</div>
                <div className="text-[10px] text-gray-500">10 shapes for hand control</div>
              </button>
            </div>
          </div>

          {/* SHELF 2: Encoding */}
          <div className="bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700 rounded-lg p-4 shadow-xl border-3 border-amber-900">
            <div className="bg-blue-600 text-white text-center py-2 rounded-t-lg mb-3 font-bold">
              SHELF 2: ENCODING
              <div className="text-xs font-normal opacity-90">Ages 3.5-4.5 • "Writing before reading"</div>
            </div>
            
            {/* Top Tier: Moveable Alphabet */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Top Tier: Moveable Alphabet</div>
              <button onClick={() => openModal('moveableAlphabet')} className="w-full bg-white rounded p-3 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                <div className="text-3xl mb-1">🔤</div>
                <div className="text-sm font-bold">LARGE MOVEABLE ALPHABET</div>
                <div className="flex justify-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] rounded">Blue Vowels</span>
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 text-[10px] rounded">Red Consonants</span>
                </div>
              </button>
            </div>
            
            {/* Middle Tier: Object Boxes (CVC) */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Middle Tier: Object Boxes (Pink Series)</div>
              <button onClick={() => openModal('pinkObjectBox')} className="w-full">
                <div className="grid grid-cols-5 gap-1">
                  {[
                    { v: 'a', ex: 'cat, bat' },
                    { v: 'e', ex: 'bed, pen' },
                    { v: 'i', ex: 'pig, pin' },
                    { v: 'o', ex: 'pot, dog' },
                    { v: 'u', ex: 'cup, bug' },
                  ].map((item) => (
                    <div key={item.v} className="bg-pink-50 border border-pink-200 rounded p-1.5 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                      <div className="text-xs font-bold text-pink-700">{item.v}</div>
                      <div className="text-[9px] text-gray-600">{item.ex}</div>
                    </div>
                  ))}
                </div>
              </button>
            </div>
            
            {/* Bottom Tier: Picture-Word Matching */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Bottom Tier: Picture-Word Matching</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('pinkPictureMatch')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-lg mb-1">🖼️</div>
                  <div className="text-xs font-medium">Picture Cards</div>
                </button>
                <button onClick={() => openModal('moveableAlphabetCVC')} className="bg-white rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-lg mb-1">📄</div>
                  <div className="text-xs font-medium">Word Cards</div>
                </button>
                <div className="bg-white rounded p-2 text-center shadow">
                  <div className="text-lg mb-1">🧺</div>
                  <div className="text-xs font-medium">Matching Basket</div>
                </div>
              </div>
            </div>
          </div>

          {/* SHELF 3: Decoding */}
          <div className="bg-gradient-to-b from-amber-700 via-amber-600 to-amber-700 rounded-lg p-4 shadow-xl border-3 border-amber-900">
            <div className="bg-purple-600 text-white text-center py-2 rounded-t-lg mb-3 font-bold">
              SHELF 3: DECODING
              <div className="text-xs font-normal opacity-90">Ages 4.5-6 • "Reading emerges"</div>
            </div>
            
            {/* Top Tier: Pink Series Reading */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Top Tier: Pink Series (CVC)</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('pinkLists')} className="bg-pink-100 border border-pink-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-pink-800">Word Lists</div>
                  <div className="text-[10px] text-gray-600">CVC words</div>
                </button>
                <button onClick={() => openModal('pinkPhrases')} className="bg-pink-100 border border-pink-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-pink-800">Phrases</div>
                  <div className="text-[10px] text-gray-600">"a red cat"</div>
                </button>
                <button onClick={() => openModal('pinkSentences')} className="bg-pink-100 border border-pink-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-pink-800">Sentences</div>
                  <div className="text-[10px] text-gray-600">"The cat sat."</div>
                </button>
              </div>
              <button onClick={() => openModal('pinkBooks')} className="mt-2 w-full bg-pink-50 border border-pink-200 rounded p-2 text-center shadow hover:shadow-lg transition-all cursor-pointer">
                <div className="text-xs font-bold text-pink-700">📚 Pink Readers</div>
              </button>
            </div>
            
            {/* Middle Tier: Blue Series */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 mb-2 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Middle Tier: Blue Series (Blends)</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('blueBlends')} className="bg-blue-100 border border-blue-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-blue-800">Blends</div>
                  <div className="text-[10px] text-gray-600">bl, cr, st...</div>
                </button>
                <button onClick={() => openModal('blueDigraphs')} className="bg-blue-100 border border-blue-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-blue-800">Digraphs</div>
                  <div className="text-[10px] text-gray-600">sh, ch, th</div>
                </button>
                <button onClick={() => openModal('blueBooks')} className="bg-blue-100 border border-blue-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-blue-800">📘 Readers</div>
                  <div className="text-[10px] text-gray-600">blend books</div>
                </button>
              </div>
            </div>
            
            {/* Bottom Tier: Green Series */}
            <div className="bg-gradient-to-r from-amber-200 via-amber-100 to-amber-200 rounded p-3 border-b-2 border-amber-700">
              <div className="text-xs text-amber-800 font-semibold mb-2 uppercase">Bottom Tier: Green Series (Phonograms)</div>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => openModal('greenPhonograms')} className="bg-green-100 border border-green-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-green-800">Phonograms</div>
                  <div className="text-[10px] text-gray-600">ai, ee, oa...</div>
                </button>
                <button onClick={() => openModal('greenLongVowels')} className="bg-green-100 border border-green-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-green-800">Long Vowels</div>
                  <div className="text-[10px] text-gray-600">silent e</div>
                </button>
                <button onClick={() => openModal('greenBooks')} className="bg-green-100 border border-green-300 rounded p-2 text-center shadow hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer">
                  <div className="text-xs font-bold text-green-800">📗 Readers</div>
                  <div className="text-[10px] text-gray-600">fluent reading</div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Reference */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-amber-900 mb-4 text-center">Quick Reference</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-green-50 rounded-lg p-4 border-l-4 border-green-500">
              <h3 className="font-bold text-green-800 mb-2">Phase 1 Ready When:</h3>
              <ul className="text-sm text-green-700 space-y-1">
                <li>✅ Hears beginning sounds</li>
                <li>✅ Hears ending sounds</li>
                <li>✅ Traces letters correctly</li>
                <li>✅ Knows most letter sounds</li>
              </ul>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 border-l-4 border-blue-500">
              <h3 className="font-bold text-blue-800 mb-2">Phase 2 Ready When:</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>✅ Builds CVC words</li>
                <li>✅ Sounds out built words</li>
                <li>✅ Matches objects to words</li>
                <li>✅ Shows reading interest</li>
              </ul>
            </div>
            <div className="bg-purple-50 rounded-lg p-4 border-l-4 border-purple-500">
              <h3 className="font-bold text-purple-800 mb-2">Success Looks Like:</h3>
              <ul className="text-sm text-purple-700 space-y-1">
                <li>🎉 Reads CVC fluently</li>
                <li>🎉 Reads simple sentences</li>
                <li>🎉 Picks up books to read</li>
                <li>🎉 Writes spontaneously</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-amber-700">
          <p className="font-semibold">🐋 Whale Class - Making Readers</p>
          <p className="text-sm">Data from Montessori Brain (37 Language Works)</p>
        </div>
      </div>

      {/* Detail Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl max-h-[85vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">{selectedItem.name}</h3>
              <button 
                onClick={() => setSelectedItem(null)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            
            {/* Age */}
            <div className="mb-4 inline-block px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
              Ages {selectedItem.age}
            </div>
            
            {/* Description */}
            {selectedItem.description && (
              <p className="text-gray-600 mb-4">{selectedItem.description}</p>
            )}
            
            {/* Materials */}
            {selectedItem.materials && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📦 Materials Needed:</h4>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {selectedItem.materials.map((m: string, i: number) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Direct Aims */}
            {selectedItem.directAims && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🎯 Direct Aims:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.directAims.map((aim: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">{aim}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Indirect Aims */}
            {selectedItem.indirectAims && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔄 Indirect Aims:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.indirectAims.map((aim: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">{aim}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Readiness Indicators */}
            {selectedItem.readiness && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">✅ Ready When Child:</h4>
                <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                  {selectedItem.readiness.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Word Lists by Vowel (for Pink Object Box) */}
            {selectedItem.wordsByVowel && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📝 CVC Words by Vowel:</h4>
                {Object.entries(selectedItem.wordsByVowel).map(([vowel, words]) => (
                  <div key={vowel} className="mb-3">
                    <div className="text-sm font-medium text-pink-700 mb-1">{vowel}:</div>
                    <div className="flex flex-wrap gap-1">
                      {(words as string[]).map((w, i) => (
                        <span key={i} className="px-2 py-0.5 bg-pink-50 text-pink-700 rounded text-xs">{w}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Blends (for Blue Series) */}
            {selectedItem.blends && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Consonant Blends:</h4>
                {Object.entries(selectedItem.blends).map(([category, blends]) => (
                  <div key={category} className="mb-2">
                    <div className="text-sm font-medium text-blue-700 mb-1">{category}:</div>
                    <div className="flex flex-wrap gap-1">
                      {(blends as string[]).map((b, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs font-mono">{b}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {/* Digraphs */}
            {selectedItem.digraphs && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Digraphs:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.digraphs.map((d: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-mono font-bold">{d}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Phonograms */}
            {selectedItem.phonograms && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Phonograms:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.phonograms.map((p: string, i: number) => (
                    <span key={i} className="px-3 py-1 bg-green-100 text-green-700 rounded font-mono font-bold">{p}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Long Vowel Patterns */}
            {selectedItem.patterns && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 Long Vowel Patterns:</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedItem.patterns.map((p: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-green-50 text-green-700 rounded text-sm">{p}</span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Examples */}
            {selectedItem.examples && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">📖 Examples:</h4>
                <div className="bg-gray-50 rounded-lg p-3">
                  {selectedItem.examples.map((ex: string, i: number) => (
                    <div key={i} className="text-gray-700 text-sm mb-1">• {ex}</div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Sounds list for I-Spy */}
            {selectedItem.sounds && (
              <div className="mb-4">
                <h4 className="font-semibold text-gray-700 mb-2">🔤 All 26 Sounds:</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedItem.sounds.map((s: string, i: number) => (
                    <span key={i} className="w-8 h-8 flex items-center justify-center bg-green-100 text-green-700 rounded font-bold">/{s}/</span>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setSelectedItem(null)}
              className="mt-4 w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
