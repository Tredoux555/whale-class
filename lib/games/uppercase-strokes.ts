// lib/games/uppercase-strokes.ts
// Stroke data for uppercase letters A-Z - points normalized to 0-100 scale

import { StrokePoint } from './letter-strokes';

export interface UppercaseStrokeData {
  letter: string;
  strokes: StrokePoint[][];
}

export interface UppercaseLetterData {
  letter: string;
  word: string;
  image: string;
  audioUrl: string;
}

// Capital letters with example words
export const UPPERCASE_DATA: UppercaseLetterData[] = [
  { letter: 'A', word: 'Apple', image: '🍎', audioUrl: '/audio/letters/a.mp3' },
  { letter: 'B', word: 'Ball', image: '⚽', audioUrl: '/audio/letters/b.mp3' },
  { letter: 'C', word: 'Cat', image: '🐱', audioUrl: '/audio/letters/c.mp3' },
  { letter: 'D', word: 'Dog', image: '🐕', audioUrl: '/audio/letters/d.mp3' },
  { letter: 'E', word: 'Elephant', image: '🐘', audioUrl: '/audio/letters/e.mp3' },
  { letter: 'F', word: 'Fish', image: '🐟', audioUrl: '/audio/letters/f.mp3' },
  { letter: 'G', word: 'Goat', image: '🐐', audioUrl: '/audio/letters/g.mp3' },
  { letter: 'H', word: 'Hat', image: '🎩', audioUrl: '/audio/letters/h.mp3' },
  { letter: 'I', word: 'Igloo', image: '🏠', audioUrl: '/audio/letters/i.mp3' },
  { letter: 'J', word: 'Jar', image: '🫙', audioUrl: '/audio/letters/j.mp3' },
  { letter: 'K', word: 'Kite', image: '🪁', audioUrl: '/audio/letters/k.mp3' },
  { letter: 'L', word: 'Lion', image: '🦁', audioUrl: '/audio/letters/l.mp3' },
  { letter: 'M', word: 'Moon', image: '🌙', audioUrl: '/audio/letters/m.mp3' },
  { letter: 'N', word: 'Nest', image: '🪺', audioUrl: '/audio/letters/n.mp3' },
  { letter: 'O', word: 'Octopus', image: '🐙', audioUrl: '/audio/letters/o.mp3' },
  { letter: 'P', word: 'Pen', image: '🖊️', audioUrl: '/audio/letters/p.mp3' },
  { letter: 'Q', word: 'Queen', image: '👑', audioUrl: '/audio/letters/q.mp3' },
  { letter: 'R', word: 'Rabbit', image: '🐰', audioUrl: '/audio/letters/r.mp3' },
  { letter: 'S', word: 'Sun', image: '☀️', audioUrl: '/audio/letters/s.mp3' },
  { letter: 'T', word: 'Table', image: '🪑', audioUrl: '/audio/letters/t.mp3' },
  { letter: 'U', word: 'Umbrella', image: '☂️', audioUrl: '/audio/letters/u.mp3' },
  { letter: 'V', word: 'Van', image: '🚐', audioUrl: '/audio/letters/v.mp3' },
  { letter: 'W', word: 'Water', image: '💧', audioUrl: '/audio/letters/w.mp3' },
  { letter: 'X', word: 'Box', image: '📦', audioUrl: '/audio/letters/x.mp3' },
  { letter: 'Y', word: 'Yellow', image: '💛', audioUrl: '/audio/letters/y.mp3' },
  { letter: 'Z', word: 'Zebra', image: '🦓', audioUrl: '/audio/letters/z.mp3' },
];

// Stroke paths for uppercase letters (normalized 0-100)
// Capital letters are taller, using more of the canvas
export const UPPERCASE_STROKES: Record<string, UppercaseStrokeData> = {
  A: {
    letter: 'A',
    strokes: [
      // Left diagonal up
      [{x:15,y:88},{x:30,y:55},{x:45,y:22},{x:50,y:12}],
      // Right diagonal down
      [{x:50,y:12},{x:55,y:22},{x:70,y:55},{x:85,y:88}],
      // Cross bar
      [{x:30,y:60},{x:50,y:60},{x:70,y:60}]
    ],
  },
  B: {
    letter: 'B',
    strokes: [
      // Vertical down
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Top bump
      [{x:25,y:12},{x:45,y:12},{x:60,y:18},{x:65,y:30},{x:60,y:42},{x:45,y:48},{x:25,y:48}],
      // Bottom bump
      [{x:25,y:48},{x:48,y:48},{x:65,y:55},{x:70,y:68},{x:65,y:82},{x:48,y:88},{x:25,y:88}]
    ],
  },
  C: {
    letter: 'C',
    strokes: [
      // C curve
      [
        {x:78,y:28},{x:65,y:15},{x:50,y:12},{x:35,y:18},{x:22,y:32},
        {x:18,y:50},{x:22,y:68},{x:35,y:82},{x:50,y:88},{x:65,y:85},{x:78,y:72}
      ]
    ],
  },
  D: {
    letter: 'D',
    strokes: [
      // Vertical down
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Curve
      [{x:25,y:12},{x:50,y:12},{x:68,y:22},{x:78,y:42},{x:78,y:58},{x:68,y:78},{x:50,y:88},{x:25,y:88}]
    ],
  },
  E: {
    letter: 'E',
    strokes: [
      // Vertical down
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Top horizontal
      [{x:25,y:12},{x:50,y:12},{x:72,y:12}],
      // Middle horizontal
      [{x:25,y:50},{x:45,y:50},{x:62,y:50}],
      // Bottom horizontal
      [{x:25,y:88},{x:50,y:88},{x:72,y:88}]
    ],
  },
  F: {
    letter: 'F',
    strokes: [
      // Vertical down
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Top horizontal
      [{x:25,y:12},{x:50,y:12},{x:72,y:12}],
      // Middle horizontal
      [{x:25,y:48},{x:45,y:48},{x:60,y:48}]
    ],
  },
  G: {
    letter: 'G',
    strokes: [
      // C curve with bar
      [
        {x:78,y:28},{x:65,y:15},{x:50,y:12},{x:35,y:18},{x:22,y:32},
        {x:18,y:50},{x:22,y:68},{x:35,y:82},{x:50,y:88},{x:65,y:85},{x:78,y:72},
        {x:78,y:55},{x:55,y:55}
      ]
    ],
  },
  H: {
    letter: 'H',
    strokes: [
      // Left vertical
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Right vertical
      [{x:75,y:12},{x:75,y:35},{x:75,y:55},{x:75,y:75},{x:75,y:88}],
      // Cross bar
      [{x:25,y:50},{x:50,y:50},{x:75,y:50}]
    ],
  },
  I: {
    letter: 'I',
    strokes: [
      // Top horizontal
      [{x:35,y:12},{x:50,y:12},{x:65,y:12}],
      // Vertical
      [{x:50,y:12},{x:50,y:35},{x:50,y:55},{x:50,y:75},{x:50,y:88}],
      // Bottom horizontal
      [{x:35,y:88},{x:50,y:88},{x:65,y:88}]
    ],
  },
  J: {
    letter: 'J',
    strokes: [
      // Top horizontal
      [{x:40,y:12},{x:60,y:12},{x:78,y:12}],
      // Down and hook
      [{x:60,y:12},{x:60,y:35},{x:60,y:55},{x:60,y:72},{x:55,y:82},{x:42,y:88},{x:28,y:82}]
    ],
  },
  K: {
    letter: 'K',
    strokes: [
      // Vertical
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Diagonal in
      [{x:75,y:12},{x:58,y:32},{x:42,y:50},{x:25,y:50}],
      // Diagonal out
      [{x:42,y:50},{x:55,y:65},{x:68,y:78},{x:78,y:88}]
    ],
  },
  L: {
    letter: 'L',
    strokes: [
      // Vertical down
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Bottom horizontal
      [{x:25,y:88},{x:50,y:88},{x:72,y:88}]
    ],
  },
  M: {
    letter: 'M',
    strokes: [
      // Left vertical
      [{x:15,y:88},{x:15,y:55},{x:15,y:25},{x:15,y:12}],
      // Left diagonal down
      [{x:15,y:12},{x:30,y:35},{x:45,y:55},{x:50,y:62}],
      // Right diagonal up
      [{x:50,y:62},{x:55,y:55},{x:70,y:35},{x:85,y:12}],
      // Right vertical
      [{x:85,y:12},{x:85,y:35},{x:85,y:55},{x:85,y:75},{x:85,y:88}]
    ],
  },
  N: {
    letter: 'N',
    strokes: [
      // Left vertical up
      [{x:22,y:88},{x:22,y:55},{x:22,y:25},{x:22,y:12}],
      // Diagonal down
      [{x:22,y:12},{x:40,y:38},{x:58,y:62},{x:78,y:88}],
      // Right vertical up
      [{x:78,y:88},{x:78,y:55},{x:78,y:25},{x:78,y:12}]
    ],
  },
  O: {
    letter: 'O',
    strokes: [
      // Circle counter-clockwise
      [
        {x:50,y:12},{x:35,y:15},{x:22,y:28},{x:18,y:45},{x:18,y:55},
        {x:22,y:72},{x:35,y:85},{x:50,y:88},{x:65,y:85},{x:78,y:72},
        {x:82,y:55},{x:82,y:45},{x:78,y:28},{x:65,y:15},{x:50,y:12}
      ]
    ],
  },
  P: {
    letter: 'P',
    strokes: [
      // Vertical
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Bump
      [{x:25,y:12},{x:48,y:12},{x:65,y:18},{x:72,y:32},{x:68,y:45},{x:55,y:52},{x:25,y:52}]
    ],
  },
  Q: {
    letter: 'Q',
    strokes: [
      // Circle
      [
        {x:50,y:12},{x:35,y:15},{x:22,y:28},{x:18,y:45},{x:18,y:55},
        {x:22,y:72},{x:35,y:85},{x:50,y:88},{x:65,y:85},{x:78,y:72},
        {x:82,y:55},{x:82,y:45},{x:78,y:28},{x:65,y:15},{x:50,y:12}
      ],
      // Tail
      [{x:58,y:72},{x:70,y:85},{x:82,y:95}]
    ],
  },
  R: {
    letter: 'R',
    strokes: [
      // Vertical
      [{x:25,y:12},{x:25,y:35},{x:25,y:55},{x:25,y:75},{x:25,y:88}],
      // Bump
      [{x:25,y:12},{x:48,y:12},{x:65,y:18},{x:72,y:32},{x:68,y:45},{x:55,y:52},{x:25,y:52}],
      // Leg
      [{x:48,y:52},{x:60,y:68},{x:72,y:82},{x:78,y:88}]
    ],
  },
  S: {
    letter: 'S',
    strokes: [
      // S curve
      [
        {x:72,y:22},{x:60,y:14},{x:45,y:12},{x:30,y:18},{x:22,y:30},
        {x:28,y:42},{x:45,y:48},{x:60,y:55},{x:72,y:65},{x:75,y:78},
        {x:65,y:86},{x:50,y:88},{x:35,y:85},{x:25,y:78}
      ]
    ],
  },
  T: {
    letter: 'T',
    strokes: [
      // Top horizontal
      [{x:18,y:12},{x:50,y:12},{x:82,y:12}],
      // Vertical
      [{x:50,y:12},{x:50,y:35},{x:50,y:55},{x:50,y:75},{x:50,y:88}]
    ],
  },
  U: {
    letter: 'U',
    strokes: [
      // Down curve up
      [
        {x:22,y:12},{x:22,y:35},{x:22,y:55},{x:25,y:72},{x:35,y:82},
        {x:50,y:88},{x:65,y:82},{x:75,y:72},{x:78,y:55},{x:78,y:35},{x:78,y:12}
      ]
    ],
  },
  V: {
    letter: 'V',
    strokes: [
      // V shape
      [{x:18,y:12},{x:35,y:45},{x:50,y:88},{x:65,y:45},{x:82,y:12}]
    ],
  },
  W: {
    letter: 'W',
    strokes: [
      // W shape
      [
        {x:12,y:12},{x:22,y:50},{x:32,y:88},
        {x:42,y:55},{x:50,y:35},
        {x:58,y:55},{x:68,y:88},
        {x:78,y:50},{x:88,y:12}
      ]
    ],
  },
  X: {
    letter: 'X',
    strokes: [
      // Diagonal down-right
      [{x:20,y:12},{x:35,y:32},{x:50,y:50},{x:65,y:68},{x:80,y:88}],
      // Diagonal down-left
      [{x:80,y:12},{x:65,y:32},{x:50,y:50},{x:35,y:68},{x:20,y:88}]
    ],
  },
  Y: {
    letter: 'Y',
    strokes: [
      // Left diagonal to center
      [{x:18,y:12},{x:32,y:30},{x:50,y:50}],
      // Right diagonal to center
      [{x:82,y:12},{x:68,y:30},{x:50,y:50}],
      // Vertical down
      [{x:50,y:50},{x:50,y:65},{x:50,y:80},{x:50,y:88}]
    ],
  },
  Z: {
    letter: 'Z',
    strokes: [
      // Z shape
      [{x:22,y:12},{x:50,y:12},{x:78,y:12},{x:22,y:88},{x:50,y:88},{x:78,y:88}]
    ],
  },
};

// Get stroke data for an uppercase letter
export function getUppercaseStrokes(letter: string): UppercaseStrokeData | null {
  return UPPERCASE_STROKES[letter.toUpperCase()] || null;
}

// Get uppercase letter data
export function getUppercaseData(letter: string): UppercaseLetterData | null {
  return UPPERCASE_DATA.find(l => l.letter === letter.toUpperCase()) || null;
}
