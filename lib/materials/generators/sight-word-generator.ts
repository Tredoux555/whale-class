// lib/materials/generators/sight-word-generator.ts
// Generates Dolch sight word cards

import jsPDF from 'jspdf';
import { CardSize, SERIES_COLORS, MaterialCard } from '../types';
import { generateMaterialPDF } from '../pdf-generator';
import { SIGHT_WORDS } from '../language-data';

export type SightWordLevel = 'pre-primer' | 'primer' | 'first-grade' | 'all';

export interface SightWordOptions {
  size: CardSize;
  level: SightWordLevel;
}

export function generateSightWordsPDF(options: SightWordOptions): jsPDF {
  const cards: MaterialCard[] = [];
  
  const levels = options.level === 'all' 
    ? Object.keys(SIGHT_WORDS) 
    : [options.level];
  
  levels.forEach(level => {
    const words = SIGHT_WORDS[level as keyof typeof SIGHT_WORDS] || [];
    words.forEach((word, i) => {
      cards.push({
        id: `sight-${level}-${i}`,
        primary: word,
        category: level,
      });
    });
  });

  const levelTitle = options.level === 'all' 
    ? 'All Levels' 
    : options.level.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

  return generateMaterialPDF(
    `Sight Words - ${levelTitle}`,
    cards,
    {
      type: 'sight-words',
      title: `Sight Words - ${levelTitle}`,
      description: 'Dolch sight word list',
      cardSize: options.size,
      ...SERIES_COLORS.sight,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

export function generateSightWordsByLevel(
  level: keyof typeof SIGHT_WORDS,
  options: Omit<SightWordOptions, 'level'>
): jsPDF {
  const words = SIGHT_WORDS[level] || [];
  
  const cards: MaterialCard[] = words.map((word, i) => ({
    id: `sight-${level}-${i}`,
    primary: word,
    category: level,
  }));

  const levelTitle = level.split('-').map(w => 
    w.charAt(0).toUpperCase() + w.slice(1)
  ).join(' ');

  return generateMaterialPDF(
    `Sight Words - ${levelTitle}`,
    cards,
    {
      type: 'sight-words',
      title: `Sight Words - ${levelTitle}`,
      description: `${words.length} sight words`,
      cardSize: options.size,
      ...SERIES_COLORS.sight,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

