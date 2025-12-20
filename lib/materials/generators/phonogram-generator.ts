// lib/materials/generators/phonogram-generator.ts
// Generates phonogram pattern cards

import jsPDF from 'jspdf';
import { CardSize, SERIES_COLORS, MaterialCard } from '../types';
import { generateMaterialPDF } from '../pdf-generator';
import { GREEN_SERIES } from '../language-data';

export interface PhonogramOptions {
  size: CardSize;
  patterns?: string[];
}

// Group phonograms by type
export const PHONOGRAM_GROUPS = {
  'long-a': ['a-e', 'ai', 'ay'],
  'long-i': ['i-e', 'igh', 'y-as-i'],
  'long-o': ['o-e', 'oa', 'ow-long'],
  'long-u': ['u-e', 'oo-long', 'ew'],
  'long-e': ['ee', 'ea'],
  'digraphs': ['ch', 'sh', 'th', 'wh', 'ck'],
  'other': ['oo-short'],
};

export function generatePhonogramCardsPDF(options: PhonogramOptions): jsPDF {
  const cards: MaterialCard[] = [];
  
  const patterns = options.patterns || Object.keys(GREEN_SERIES);
  
  // First, add pattern header cards
  patterns.forEach(pattern => {
    cards.push({
      id: `pattern-${pattern}`,
      primary: pattern.replace('-', ' '),
      category: 'pattern-header',
    });
  });
  
  // Then add word cards
  patterns.forEach(pattern => {
    const words = GREEN_SERIES[pattern as keyof typeof GREEN_SERIES] || [];
    words.forEach((word, i) => {
      cards.push({
        id: `phonogram-${pattern}-${i}`,
        primary: word,
        category: pattern,
      });
    });
  });

  return generateMaterialPDF(
    'Phonogram Cards',
    cards,
    {
      type: 'phonogram-cards',
      title: 'Phonogram Cards',
      description: 'Spelling patterns and word families',
      cardSize: options.size,
      ...SERIES_COLORS.green,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

export function generatePhonogramsByGroup(
  group: keyof typeof PHONOGRAM_GROUPS,
  options: Omit<PhonogramOptions, 'patterns'>
): jsPDF {
  const patterns = PHONOGRAM_GROUPS[group];
  return generatePhonogramCardsPDF({
    ...options,
    patterns,
  });
}

export function generatePhonogramHeaderCards(size: CardSize): jsPDF {
  const patterns = Object.keys(GREEN_SERIES);
  
  const cards: MaterialCard[] = patterns.map(pattern => ({
    id: `header-${pattern}`,
    primary: pattern.replace(/-/g, ' ').toUpperCase(),
    category: 'header',
  }));

  return generateMaterialPDF(
    'Phonogram Headers',
    cards,
    {
      type: 'phonogram-cards',
      title: 'Phonogram Pattern Headers',
      description: 'Category labels for sorting',
      cardSize: size,
      color: '#1B5E20',
      backgroundColor: '#C8E6C9',
      borderColor: '#81C784',
      includeImage: false,
      cardsPerPage: 12,
    }
  );
}

