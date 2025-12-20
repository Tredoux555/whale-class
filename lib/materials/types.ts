// lib/materials/types.ts
// Type definitions for material generation

export type MaterialType = 
  | 'sandpaper-letters'
  | 'moveable-alphabet'
  | 'pink-series'
  | 'blue-series'
  | 'green-series'
  | 'sight-words'
  | 'sentence-strips'
  | 'picture-cards'
  | 'phonogram-cards';

export type CardSize = 'small' | 'medium' | 'large' | 'jumbo';

export interface CardDimensions {
  width: number;  // in mm
  height: number; // in mm
  fontSize: number; // in pt
  imageSize?: number; // in mm
}

// Kindergarten-appropriate font sizes for 3-6 year olds
export const KINDERGARTEN_FONT_SIZES = {
  small: 32,   // 32pt - big and readable
  medium: 48,  // 48pt - very readable
  large: 64,   // 64pt - large and clear
  jumbo: 96,   // 96pt - extra large for young readers
};

export const CARD_SIZES: Record<CardSize, CardDimensions> = {
  small: { width: 50, height: 50, fontSize: KINDERGARTEN_FONT_SIZES.small },
  medium: { width: 75, height: 75, fontSize: KINDERGARTEN_FONT_SIZES.medium },
  large: { width: 100, height: 100, fontSize: KINDERGARTEN_FONT_SIZES.large, imageSize: 60 },
  jumbo: { width: 150, height: 150, fontSize: KINDERGARTEN_FONT_SIZES.jumbo, imageSize: 100 },
};

export interface MaterialConfig {
  type: MaterialType;
  title: string;
  description: string;
  cardSize: CardSize;
  color: string;
  backgroundColor: string;
  borderColor: string;
  includeImage: boolean;
  cardsPerPage: number;
}

export interface GeneratedMaterial {
  type: MaterialType;
  title: string;
  cards: MaterialCard[];
  totalPages: number;
  config: MaterialConfig;
}

export interface MaterialCard {
  id: string;
  primary: string;      // Main text (letter, word)
  phonetic?: string;    // Phonetic spelling
  imageUrl?: string;    // Picture card image
  category?: string;    // e.g., "short-a", "bl-blend"
}

// Montessori color coding
export const SERIES_COLORS = {
  pink: {
    color: '#D81B60',
    backgroundColor: '#FCE4EC',
    borderColor: '#F48FB1',
  },
  blue: {
    color: '#1976D2',
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  green: {
    color: '#388E3C',
    backgroundColor: '#E8F5E9',
    borderColor: '#A5D6A7',
  },
  vowel: {
    color: '#D32F2F',
    backgroundColor: '#FFEBEE',
    borderColor: '#EF9A9A',
  },
  consonant: {
    color: '#1565C0',
    backgroundColor: '#E3F2FD',
    borderColor: '#90CAF9',
  },
  sight: {
    color: '#7B1FA2',
    backgroundColor: '#F3E5F5',
    borderColor: '#CE93D8',
  },
};

