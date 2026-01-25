// app/api/whale/materials/generate/route.ts
// API endpoint for generating material PDFs

import { NextRequest, NextResponse } from 'next/server';
import {
  generateSandpaperLettersPDF,
  generateVowelCardsPDF,
  generateConsonantCardsPDF,
} from '@/lib/materials/generators/letter-generator';
import {
  generatePinkSeriesPDF,
  generatePinkSeriesByVowel,
  generateBlueSeriesPDF,
  generateBlueSeriesByBlend,
  generateGreenSeriesPDF,
  generateGreenSeriesByPattern,
} from '@/lib/materials/generators/word-generator';
import {
  generateSightWordsPDF,
  generateSightWordsByLevel,
} from '@/lib/materials/generators/sight-word-generator';
import {
  generateSentenceStripsPDF,
} from '@/lib/materials/generators/sentence-generator';
import {
  generatePhonogramCardsPDF,
  generatePhonogramsByGroup,
} from '@/lib/materials/generators/phonogram-generator';
import { CardSize } from '@/lib/materials/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      type, 
      size = 'medium', 
      options = {} 
    } = body;

    let pdf;
    let filename = 'montessori-materials.pdf';

    switch (type) {
      // Letter cards
      case 'sandpaper-letters':
        pdf = generateSandpaperLettersPDF({
          includeLowercase: options.lowercase !== false,
          includeUppercase: options.uppercase !== false,
          size: size as CardSize,
          separateVowels: options.separateVowels || false,
        });
        filename = 'sandpaper-letters.pdf';
        break;

      case 'vowel-cards':
        pdf = generateVowelCardsPDF(size as CardSize);
        filename = 'vowel-cards.pdf';
        break;

      case 'consonant-cards':
        pdf = generateConsonantCardsPDF(size as CardSize);
        filename = 'consonant-cards.pdf';
        break;

      // Pink Series
      case 'pink-series':
        if (options.vowel) {
          pdf = generatePinkSeriesByVowel(options.vowel, {
            size: size as CardSize,
          });
          filename = `pink-series-short-${options.vowel}.pdf`;
        } else {
          pdf = generatePinkSeriesPDF({
            size: size as CardSize,
            categories: options.categories,
          });
          filename = 'pink-series-all.pdf';
        }
        break;

      // Blue Series
      case 'blue-series':
        if (options.blend) {
          pdf = generateBlueSeriesByBlend(options.blend, {
            size: size as CardSize,
          });
          filename = `blue-series-${options.blend}-blend.pdf`;
        } else {
          pdf = generateBlueSeriesPDF({
            size: size as CardSize,
            categories: options.categories,
          });
          filename = 'blue-series-all.pdf';
        }
        break;

      // Green Series
      case 'green-series':
        if (options.pattern) {
          pdf = generateGreenSeriesByPattern(options.pattern, {
            size: size as CardSize,
          });
          filename = `green-series-${options.pattern}.pdf`;
        } else {
          pdf = generateGreenSeriesPDF({
            size: size as CardSize,
            categories: options.categories,
          });
          filename = 'green-series-all.pdf';
        }
        break;

      // Sight Words
      case 'sight-words':
        if (options.level && options.level !== 'all') {
          pdf = generateSightWordsByLevel(options.level, {
            size: size as CardSize,
          });
          filename = `sight-words-${options.level}.pdf`;
        } else {
          pdf = generateSightWordsPDF({
            size: size as CardSize,
            level: 'all',
          });
          filename = 'sight-words-all.pdf';
        }
        break;

      // Sentences
      case 'sentence-strips':
        pdf = generateSentenceStripsPDF({
          level: options.level || 'all',
        });
        filename = `sentence-strips-${options.level || 'all'}.pdf`;
        break;

      // Phonograms
      case 'phonograms':
        if (options.group) {
          pdf = generatePhonogramsByGroup(options.group, {
            size: size as CardSize,
          });
          filename = `phonograms-${options.group}.pdf`;
        } else {
          pdf = generatePhonogramCardsPDF({
            size: size as CardSize,
            patterns: options.patterns,
          });
          filename = 'phonograms-all.pdf';
        }
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid material type' },
          { status: 400 }
        );
    }

    // Convert PDF to base64
    const pdfBase64 = pdf.output('datauristring');

    return NextResponse.json({
      success: true,
      filename,
      pdf: pdfBase64,
      type,
    });

  } catch (error) {
    console.error('Error generating materials:', error);
    return NextResponse.json(
      { error: 'Failed to generate materials' },
      { status: 500 }
    );
  }
}

// GET endpoint to list available materials
export async function GET() {
  return NextResponse.json({
    materials: [
      {
        type: 'sandpaper-letters',
        name: 'Sandpaper Letters',
        description: 'Full alphabet in Montessori order',
        options: ['lowercase', 'uppercase', 'separateVowels'],
      },
      {
        type: 'vowel-cards',
        name: 'Vowel Cards',
        description: 'A, E, I, O, U in red',
      },
      {
        type: 'consonant-cards',
        name: 'Consonant Cards',
        description: 'All consonants in blue',
      },
      {
        type: 'pink-series',
        name: 'Pink Series (CVC)',
        description: '200+ three-letter phonetic words',
        options: ['vowel: a/i/o/e/u'],
      },
      {
        type: 'blue-series',
        name: 'Blue Series (Blends)',
        description: 'CCVC/CVCC words with consonant blends',
        options: ['blend: bl/cl/fl/gr/st/etc'],
      },
      {
        type: 'green-series',
        name: 'Green Series (Phonograms)',
        description: 'Long vowels, digraphs, special patterns',
        options: ['pattern: a-e/ai/ee/sh/th/etc'],
      },
      {
        type: 'sight-words',
        name: 'Sight Words',
        description: 'Dolch sight word list',
        options: ['level: pre-primer/primer/first-grade/all'],
      },
      {
        type: 'sentence-strips',
        name: 'Sentence Strips',
        description: 'Reading practice sentences',
        options: ['level: pink-level/blue-level/green-level/all'],
      },
      {
        type: 'phonograms',
        name: 'Phonogram Cards',
        description: 'Spelling pattern cards',
        options: ['group: long-a/long-i/long-o/digraphs/etc'],
      },
    ],
    sizes: ['small', 'medium', 'large', 'jumbo'],
  });
}

