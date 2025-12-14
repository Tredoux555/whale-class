import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const works = [
  // PRACTICAL LIFE (17 works)
  { name: 'Care of Environment', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Pouring/Transferring', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Pouring Game', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Scooping/Spooning', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Cutting/Scissors', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Scissors Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Advanced Scissors Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Dressing Frame Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Dressing/Undressing Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Zipper Dressing Frame', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Braiding', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Braiding Practice', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Folding Clothes', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Washing Tables', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Flower Arranging', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Food Preparation', curriculum_area: 'practical_life', status: 'in_progress' },
  { name: 'Independence', curriculum_area: 'practical_life', status: 'in_progress' },

  // SENSORIAL (13 works)
  { name: 'Pink Tower', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Brown Stair', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Red Rods', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Color Tablets', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Geometric Cabinet', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Binomial Cube', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Trinomial Cube', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Triangle Construction Box', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Bells/Sound Bottles Matching', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Smell Bottles Matching', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Taste Bottles', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Temperature Tablets', curriculum_area: 'sensorial', status: 'in_progress' },
  { name: 'Matching Work', curriculum_area: 'sensorial', status: 'in_progress' },

  // MATHEMATICS (9 works)
  { name: 'Counting', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Linear Counting', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Numerals and Counters', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Golden Beads Introduction', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Decenary/Ten Bead Board', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Addition Finger Board', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Addition Snake', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Stamp Game - Multiplication', curriculum_area: 'mathematics', status: 'in_progress' },
  { name: 'Cube Chain', curriculum_area: 'mathematics', status: 'in_progress' },

  // LANGUAGE (9 works)
  { name: 'Sandpaper Letters', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Beginning Sounds', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Phoneme Review', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Movable Alphabet', curriculum_area: 'language', status: 'in_progress' },
  { name: 'CVC Words', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Word Building Work', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Word Family Work', curriculum_area: 'language', status: 'in_progress' },
  { name: '3-Part Cards', curriculum_area: 'language', status: 'in_progress' },
  { name: 'Small to Big Letter Matching Puzzle', curriculum_area: 'language', status: 'in_progress' },

  // SCIENCE & CULTURE (12 works)
  { name: 'Colored Globe', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Continents Map', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'China Map', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Leaf Puzzle Map', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Parts of a Tree', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Animal Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Bird Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Butterfly Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Flower Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Frog Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Turtle Puzzle', curriculum_area: 'culture', status: 'in_progress' },
  { name: 'Culture Envelope', curriculum_area: 'culture', status: 'in_progress' },
];

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient();

    // Insert all works in one batch
    const { data, error } = await supabase
      .from('montessori_works')
      .insert(works)
      .select();

    if (error) {
      console.error('Error seeding montessori works:', error);
      
      // Check if error is due to duplicate entries (works already exist)
      if (error.code === '23505') { // PostgreSQL unique constraint violation
        return NextResponse.json(
          { 
            success: false, 
            error: 'Some works already exist in the database',
            details: error.message,
            message: 'Works may have already been seeded. Check the database or use UPSERT instead.'
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { 
          success: false, 
          error: error.message,
          details: error
        },
        { status: 500 }
      );
    }

    // Calculate breakdown by curriculum area
    const counts = works.reduce((acc, work) => {
      acc[work.curriculum_area] = (acc[work.curriculum_area] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${data.length} Montessori works`,
      count: data.length,
      breakdown: counts,
      data: data
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/whale/montessori-works/seed:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error',
        details: errorMessage
      },
      { status: 500 }
    );
  }
}

