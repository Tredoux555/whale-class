// app/api/schools/[schoolId]/english-works/route.ts
// API for managing school-specific English works sequence
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase not configured');
  return createClient(url, key);
}

// Default English works (used when school has no custom sequence)
const DEFAULT_ENGLISH_WORKS = [
  { id: 'bs', code: 'BS', name: 'Beginning Sounds', description: 'I Spy with beginning sounds', sequence: 1, category: 'sound_games', is_active: true },
  { id: 'es', code: 'ES', name: 'Ending Sounds', description: 'I Spy with ending sounds', sequence: 2, category: 'sound_games', is_active: true },
  { id: 'ms', code: 'MS', name: 'Middle Sounds', description: 'Identifying middle vowel sounds', sequence: 3, category: 'sound_games', is_active: true },
  { id: 'wbw_a', code: 'WBW/a/', name: 'Word Building: Short A', description: 'CVC words with short A (cat, hat, bat)', sequence: 4, category: 'word_building', is_active: true },
  { id: 'wbw_e', code: 'WBW/e/', name: 'Word Building: Short E', description: 'CVC words with short E (pen, bed, red)', sequence: 5, category: 'word_building', is_active: true },
  { id: 'wbw_i', code: 'WBW/i/', name: 'Word Building: Short I', description: 'CVC words with short I (pin, sit, bit)', sequence: 6, category: 'word_building', is_active: true },
  { id: 'wbw_o', code: 'WBW/o/', name: 'Word Building: Short O', description: 'CVC words with short O (hot, pot, dog)', sequence: 7, category: 'word_building', is_active: true },
  { id: 'wbw_u', code: 'WBW/u/', name: 'Word Building: Short U', description: 'CVC words with short U (cup, bus, sun)', sequence: 8, category: 'word_building', is_active: true },
  { id: 'pr_a', code: 'PR/a/', name: 'Pink Reading: Short A', description: 'Reading CVC words with short A', sequence: 9, category: 'reading', is_active: true },
  { id: 'pr_e', code: 'PR/e/', name: 'Pink Reading: Short E', description: 'Reading CVC words with short E', sequence: 10, category: 'reading', is_active: true },
  { id: 'pr_i', code: 'PR/i/', name: 'Pink Reading: Short I', description: 'Reading CVC words with short I', sequence: 11, category: 'reading', is_active: true },
  { id: 'pr_o', code: 'PR/o/', name: 'Pink Reading: Short O', description: 'Reading CVC words with short O', sequence: 12, category: 'reading', is_active: true },
  { id: 'pr_u', code: 'PR/u/', name: 'Pink Reading: Short U', description: 'Reading CVC words with short U', sequence: 13, category: 'reading', is_active: true },
];

// GET /api/schools/[schoolId]/english-works
export async function GET(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const schoolId = params.schoolId;
    const supabase = getSupabase();
    
    // Try to get school's custom English works
    const { data: works, error } = await supabase
      .from('school_english_works')
      .select('*')
      .eq('school_id', schoolId)
      .order('sequence', { ascending: true });
    
    // If table doesn't exist or no works, return defaults
    if (error?.code === '42P01' || !works || works.length === 0) {
      return NextResponse.json({ 
        works: DEFAULT_ENGLISH_WORKS,
        is_default: true,
        message: 'Using default English progression. Edit to save custom sequence.'
      });
    }
    
    return NextResponse.json({ works, is_default: false });
  } catch (error: any) {
    console.error('English works API error:', error);
    // Return defaults on any error
    return NextResponse.json({ 
      works: DEFAULT_ENGLISH_WORKS,
      is_default: true 
    });
  }
}

// POST /api/schools/[schoolId]/english-works - Save/update works
export async function POST(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const schoolId = params.schoolId;
    const body = await request.json();
    const { works } = body;
    
    if (!works || !Array.isArray(works)) {
      return NextResponse.json({ error: 'Works array required' }, { status: 400 });
    }
    
    const supabase = getSupabase();
    
    // Delete existing works for this school
    await supabase
      .from('school_english_works')
      .delete()
      .eq('school_id', schoolId);
    
    // Insert new works
    const worksToInsert = works.map((work: any, index: number) => ({
      school_id: schoolId,
      work_code: work.code,
      work_name: work.name,
      description: work.description || null,
      sequence: index + 1,
      category: work.category || 'other',
      is_active: work.is_active !== false,
      notes: work.notes || null,
    }));
    
    const { data, error } = await supabase
      .from('school_english_works')
      .insert(worksToInsert)
      .select();
    
    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, works: data });
  } catch (error: any) {
    console.error('Save English works error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
