// lib/games/number-strokes.ts
// Stroke data for numbers 0-9 - points normalized to 0-100 scale

import { StrokePoint } from './letter-strokes';

export interface NumberStrokeData {
  number: number;
  strokes: StrokePoint[][];
}

export interface NumberData {
  number: number;
  word: string;
  image: string;
  quantity: number;
  audioUrl: string;
}

// Numbers with Montessori quantity representations
export const NUMBER_DATA: NumberData[] = [
  { number: 0, word: 'zero', image: '⭕', quantity: 0, audioUrl: '/audio/numbers/zero.mp3' },
  { number: 1, word: 'one', image: '🔴', quantity: 1, audioUrl: '/audio/numbers/one.mp3' },
  { number: 2, word: 'two', image: '🔴🔴', quantity: 2, audioUrl: '/audio/numbers/two.mp3' },
  { number: 3, word: 'three', image: '🔴🔴🔴', quantity: 3, audioUrl: '/audio/numbers/three.mp3' },
  { number: 4, word: 'four', image: '🟡', quantity: 4, audioUrl: '/audio/numbers/four.mp3' },
  { number: 5, word: 'five', image: '🟡🔴', quantity: 5, audioUrl: '/audio/numbers/five.mp3' },
  { number: 6, word: 'six', image: '🟡🔴🔴', quantity: 6, audioUrl: '/audio/numbers/six.mp3' },
  { number: 7, word: 'seven', image: '🟡🔴🔴🔴', quantity: 7, audioUrl: '/audio/numbers/seven.mp3' },
  { number: 8, word: 'eight', image: '🟡🟡', quantity: 8, audioUrl: '/audio/numbers/eight.mp3' },
  { number: 9, word: 'nine', image: '🟡🟡🔴', quantity: 9, audioUrl: '/audio/numbers/nine.mp3' },
];

// Stroke paths for each number (normalized 0-100)
export const NUMBER_STROKES: Record<number, NumberStrokeData> = {
  0: {
    number: 0,
    strokes: [
      // Oval shape counter-clockwise from top
      [
        {x:50,y:15},{x:38,y:18},{x:28,y:28},{x:22,y:42},{x:20,y:55},
        {x:22,y:68},{x:28,y:78},{x:38,y:85},{x:50,y:88},{x:62,y:85},
        {x:72,y:78},{x:78,y:68},{x:80,y:55},{x:78,y:42},{x:72,y:28},
        {x:62,y:18},{x:50,y:15}
      ]
    ],
  },
  1: {
    number: 1,
    strokes: [
      // Slant then down
      [{x:35,y:25},{x:50,y:15},{x:50,y:40},{x:50,y:65},{x:50,y:88}]
    ],
  },
  2: {
    number: 2,
    strokes: [
      // Curve then diagonal then base
      [
        {x:25,y:30},{x:30,y:20},{x:45,y:15},{x:60,y:18},{x:70,y:28},
        {x:72,y:40},{x:65,y:52},{x:50,y:65},{x:35,y:78},{x:25,y:88},
        {x:45,y:88},{x:65,y:88},{x:78,y:88}
      ]
    ],
  },
  3: {
    number: 3,
    strokes: [
      // Top curve and bottom curve
      [
        {x:28,y:22},{x:40,y:15},{x:55,y:15},{x:68,y:22},{x:72,y:35},
        {x:65,y:48},{x:50,y:52},{x:65,y:58},{x:72,y:72},{x:65,y:82},
        {x:50,y:88},{x:35,y:85},{x:25,y:78}
      ]
    ],
  },
  4: {
    number: 4,
    strokes: [
      // Down diagonal
      [{x:60,y:15},{x:45,y:35},{x:30,y:55},{x:20,y:65}],
      // Horizontal
      [{x:20,y:65},{x:45,y:65},{x:70,y:65}],
      // Vertical down
      [{x:60,y:15},{x:60,y:40},{x:60,y:65},{x:60,y:88}]
    ],
  },
  5: {
    number: 5,
    strokes: [
      // Top horizontal
      [{x:68,y:15},{x:50,y:15},{x:32,y:15}],
      // Down then curve
      [
        {x:32,y:15},{x:30,y:30},{x:28,y:45},{x:35,y:48},{x:50,y:48},
        {x:65,y:55},{x:70,y:68},{x:65,y:80},{x:50,y:88},{x:35,y:85},{x:25,y:78}
      ]
    ],
  },
  6: {
    number: 6,
    strokes: [
      // Curve down into loop
      [
        {x:65,y:20},{x:55,y:15},{x:42,y:18},{x:30,y:30},{x:25,y:48},
        {x:25,y:65},{x:30,y:78},{x:42,y:85},{x:55,y:85},{x:68,y:78},
        {x:72,y:65},{x:68,y:55},{x:55,y:50},{x:42,y:52},{x:30,y:60}
      ]
    ],
  },
  7: {
    number: 7,
    strokes: [
      // Top horizontal then diagonal
      [{x:22,y:15},{x:45,y:15},{x:68,y:15},{x:55,y:40},{x:45,y:65},{x:38,y:88}]
    ],
  },
  8: {
    number: 8,
    strokes: [
      // Figure 8 - top loop then bottom loop
      [
        {x:50,y:50},{x:40,y:42},{x:35,y:30},{x:40,y:20},{x:50,y:15},
        {x:60,y:20},{x:65,y:30},{x:60,y:42},{x:50,y:50},
        {x:38,y:60},{x:32,y:72},{x:38,y:82},{x:50,y:88},
        {x:62,y:82},{x:68,y:72},{x:62,y:60},{x:50,y:50}
      ]
    ],
  },
  9: {
    number: 9,
    strokes: [
      // Circle then tail down
      [
        {x:70,y:40},{x:65,y:28},{x:55,y:20},{x:42,y:20},{x:30,y:28},
        {x:25,y:40},{x:30,y:52},{x:42,y:58},{x:55,y:55},{x:68,y:48},
        {x:70,y:40},{x:70,y:55},{x:68,y:72},{x:60,y:85},{x:45,y:88}
      ]
    ],
  },
};

// Get stroke data for a number
export function getNumberStrokes(num: number): NumberStrokeData | null {
  return NUMBER_STROKES[num] || null;
}

// Get number data (word, image, quantity)
export function getNumberData(num: number): NumberData | null {
  return NUMBER_DATA.find(n => n.number === num) || null;
}
