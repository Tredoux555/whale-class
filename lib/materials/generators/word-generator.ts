// lib/materials/generators/word-generator.ts
// Generates Pink, Blue, and Green series word cards

import jsPDF from 'jspdf';
import { CardSize, SERIES_COLORS, MaterialCard } from '../types';
import { generateMaterialPDF } from '../pdf-generator';
import { PINK_SERIES, BLUE_SERIES, GREEN_SERIES } from '../language-data';

export interface WordCardOptions {
  size: CardSize;
  categories?: string[]; // Filter to specific categories
}

export function generatePinkSeriesPDF(options: WordCardOptions): jsPDF {
  const cards: MaterialCard[] = [];
  
  const categories = options.categories || Object.keys(PINK_SERIES);
  
  categories.forEach(cat => {
    const words = PINK_SERIES[cat as keyof typeof PINK_SERIES] || [];
    words.forEach((word, i) => {
      cards.push({
        id: `pink-${cat}-${i}`,
        primary: word,
        category: cat,
      });
    });
  });

  return generateMaterialPDF(
    'Pink Series - CVC Words',
    cards,
    {
      type: 'pink-series',
      title: 'Pink Series',
      description: 'Three-letter phonetic words',
      cardSize: options.size,
      ...SERIES_COLORS.pink,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

export function generatePinkSeriesByVowel(
  vowel: 'a' | 'i' | 'o' | 'e' | 'u',
  options: WordCardOptions
): jsPDF {
  const categoryKey = `short-${vowel}` as keyof typeof PINK_SERIES;
  const words = PINK_SERIES[categoryKey] || [];
  
  const cards: MaterialCard[] = words.map((word, i) => ({
    id: `pink-${vowel}-${i}`,
    primary: word,
    category: categoryKey,
  }));

  return generateMaterialPDF(
    `Pink Series - Short ${vowel.toUpperCase()}`,
    cards,
    {
      type: 'pink-series',
      title: `Short ${vowel.toUpperCase()} Words`,
      description: `CVC words with short ${vowel}`,
      cardSize: options.size,
      ...SERIES_COLORS.pink,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

export function generateBlueSeriesPDF(options: WordCardOptions): jsPDF {
  const cards: MaterialCard[] = [];
  
  const categories = options.categories || Object.keys(BLUE_SERIES);
  
  categories.forEach(cat => {
    const words = BLUE_SERIES[cat as keyof typeof BLUE_SERIES] || [];
    words.forEach((word, i) => {
      cards.push({
        id: `blue-${cat}-${i}`,
        primary: word,
        category: cat,
      });
    });
  });

  return generateMaterialPDF(
    'Blue Series - Blends',
    cards,
    {
      type: 'blue-series',
      title: 'Blue Series',
      description: 'Words with consonant blends',
      cardSize: options.size,
      ...SERIES_COLORS.blue,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

export function generateBlueSeriesByBlend(
  blend: string,
  options: WordCardOptions
): jsPDF {
  const categoryKey = `${blend}-blend` as keyof typeof BLUE_SERIES;
  const words = BLUE_SERIES[categoryKey] || [];
  
  const cards: MaterialCard[] = words.map((word, i) => ({
    id: `blue-${blend}-${i}`,
    primary: word,
    category: categoryKey,
  }));

  return generateMaterialPDF(
    `Blue Series - ${blend.toUpperCase()} Blend`,
    cards,
    {
      type: 'blue-series',
      title: `${blend.toUpperCase()} Blend Words`,
      description: `Words starting with ${blend}`,
      cardSize: options.size,
      ...SERIES_COLORS.blue,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

export function generateGreenSeriesPDF(options: WordCardOptions): jsPDF {
  const cards: MaterialCard[] = [];
  
  const categories = options.categories || Object.keys(GREEN_SERIES);
  
  categories.forEach(cat => {
    const words = GREEN_SERIES[cat as keyof typeof GREEN_SERIES] || [];
    words.forEach((word, i) => {
      cards.push({
        id: `green-${cat}-${i}`,
        primary: word,
        category: cat,
      });
    });
  });

  return generateMaterialPDF(
    'Green Series - Phonograms',
    cards,
    {
      type: 'green-series',
      title: 'Green Series',
      description: 'Long vowels and digraphs',
      cardSize: options.size,
      ...SERIES_COLORS.green,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

export function generateGreenSeriesByPattern(
  pattern: string,
  options: WordCardOptions
): jsPDF {
  const words = GREEN_SERIES[pattern as keyof typeof GREEN_SERIES] || [];
  
  const cards: MaterialCard[] = words.map((word, i) => ({
    id: `green-${pattern}-${i}`,
    primary: word,
    category: pattern,
  }));

  return generateMaterialPDF(
    `Green Series - ${pattern.toUpperCase()}`,
    cards,
    {
      type: 'green-series',
      title: `${pattern.toUpperCase()} Pattern`,
      description: `Words with ${pattern} pattern`,
      cardSize: options.size,
      ...SERIES_COLORS.green,
      includeImage: false,
      cardsPerPage: 15,
    }
  );
}

