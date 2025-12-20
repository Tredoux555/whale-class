// lib/materials/generators/letter-generator.ts
// Generates sandpaper letters and alphabet cards

import jsPDF from 'jspdf';
import { CardSize, CARD_SIZES, SERIES_COLORS, MaterialCard } from '../types';
import { generateMaterialPDF } from '../pdf-generator';
import { MONTESSORI_LETTER_ORDER } from '../language-data';

export interface LetterOptions {
  includeLowercase: boolean;
  includeUppercase: boolean;
  size: CardSize;
  separateVowels: boolean;
}

export function generateSandpaperLettersPDF(options: LetterOptions): jsPDF {
  const cards: MaterialCard[] = [];
  
  MONTESSORI_LETTER_ORDER.forEach(l => {
    if (options.includeLowercase) {
      cards.push({
        id: `lower-${l.letter}`,
        primary: l.letter,
        phonetic: l.sound,
        category: l.isVowel ? 'vowel' : 'consonant',
      });
    }
    if (options.includeUppercase) {
      cards.push({
        id: `upper-${l.letter}`,
        primary: l.letter.toUpperCase(),
        phonetic: l.sound,
        category: l.isVowel ? 'vowel' : 'consonant',
      });
    }
  });

  if (options.separateVowels) {
    // Sort: vowels first, then consonants
    cards.sort((a, b) => {
      if (a.category === 'vowel' && b.category !== 'vowel') return -1;
      if (a.category !== 'vowel' && b.category === 'vowel') return 1;
      return 0;
    });
  }

  return generateMaterialPDF(
    'Sandpaper Letters',
    cards,
    {
      type: 'sandpaper-letters',
      title: 'Sandpaper Letters',
      description: 'Montessori alphabet cards',
      cardSize: options.size,
      color: '#333333',
      backgroundColor: '#FFFDE7',
      borderColor: '#FFE082',
      includeImage: false,
      cardsPerPage: 12,
    }
  );
}

export function generateVowelCardsPDF(size: CardSize): jsPDF {
  const vowels = MONTESSORI_LETTER_ORDER.filter(l => l.isVowel);
  
  const cards: MaterialCard[] = [];
  vowels.forEach(v => {
    cards.push({
      id: `vowel-lower-${v.letter}`,
      primary: v.letter,
      phonetic: v.sound,
    });
    cards.push({
      id: `vowel-upper-${v.letter}`,
      primary: v.letter.toUpperCase(),
      phonetic: v.sound,
    });
  });

  return generateMaterialPDF(
    'Vowel Cards',
    cards,
    {
      type: 'sandpaper-letters',
      title: 'Vowel Cards',
      description: 'Red vowel letters',
      cardSize: size,
      ...SERIES_COLORS.vowel,
      includeImage: false,
      cardsPerPage: 12,
    }
  );
}

export function generateConsonantCardsPDF(size: CardSize): jsPDF {
  const consonants = MONTESSORI_LETTER_ORDER.filter(l => !l.isVowel);
  
  const cards: MaterialCard[] = [];
  consonants.forEach(c => {
    cards.push({
      id: `cons-lower-${c.letter}`,
      primary: c.letter,
      phonetic: c.sound,
    });
    cards.push({
      id: `cons-upper-${c.letter}`,
      primary: c.letter.toUpperCase(),
      phonetic: c.sound,
    });
  });

  return generateMaterialPDF(
    'Consonant Cards',
    cards,
    {
      type: 'sandpaper-letters',
      title: 'Consonant Cards',
      description: 'Blue consonant letters',
      cardSize: size,
      ...SERIES_COLORS.consonant,
      includeImage: false,
      cardsPerPage: 12,
    }
  );
}

