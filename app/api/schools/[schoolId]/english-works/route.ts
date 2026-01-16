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
  { id: 'wfw_a', code: 'WFW/a/', name: 'Word Family: Short A', description: '-at, -an, -ap, -ad families', sequence: 9, category: 'word_family', is_active: true },
  { id: 'wfw_e', code: 'WFW/e/', name: 'Word Family: Short E', description: '-en, -et, -ed, -eg families', sequence: 10, category: 'word_family', is_active: true },
  { id: 'wfw_i', code: 'WFW/i/', name: 'Word Family: Short I', description: '-in, -it, -ip, -ig families', sequence: 11, category: 'word_family', is_active: true },
  { id: 'wfw_o', code: 'WFW/o/', name: 'Word Family: Short O', description: '-ot, -op, -og, -ob families', sequence: 12, category: 'word_family', is_active: true },
  { id: 'wfw_u', code: 'WFW/u/', name: 'Word Family: Short U', description: '-un, -ut, -ug, -ub families', sequence: 13, category: 'word_family', is_active: true },
  { id: 'pr_a', code: 'PR/a/', name: 'Pink Reading: Short A', description: 'Reading CVC words with short A', sequence: 14, category: 'reading', is_active: true },
  { id: 'pr_e', code: 'PR/e/', name: 'Pink Reading: Short E', description: 'Reading CVC words with short E', sequence: 15, category: 'reading', is_active: true },
  { id: 'pr_i', code: 'PR/i/', name: 'Pink Reading: Short I', description: 'Reading CVC words with short I', sequence: 16, category: 'reading', is_active: true },
  { id: 'pr_o', code: 'PR/o/', name: 'Pink Reading: Short O', description: 'Reading CVC words with short O', sequence: 17, category: 'reading', is_active: true },
  { id: 'pr_u', code: 'PR/u/', name: 'Pink Reading: Short U', description: 'Reading CVC words with short U', sequence: 18, category: 'reading', is_active: true },
  { id: 'prph_red_1', code: 'PrPh Red 1', name: 'Primary Phonics: Red 1', description: 'Sam, Mac, Nat stories', sequence: 19, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_2', code: 'PrPh Red 2', name: 'Primary Phonics: Red 2', description: 'Continuing short A', sequence: 20, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_3', code: 'PrPh Red 3', name: 'Primary Phonics: Red 3', description: 'Short I introduction', sequence: 21, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_4', code: 'PrPh Red 4', name: 'Primary Phonics: Red 4', description: 'Short A & I mixed', sequence: 22, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_5', code: 'PrPh Red 5', name: 'Primary Phonics: Red 5', description: 'Short O introduction', sequence: 23, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_6', code: 'PrPh Red 6', name: 'Primary Phonics: Red 6', description: 'Short A, I, O mixed', sequence: 24, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_7', code: 'PrPh Red 7', name: 'Primary Phonics: Red 7', description: 'Short U introduction', sequence: 25, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_8', code: 'PrPh Red 8', name: 'Primary Phonics: Red 8', description: 'All short vowels', sequence: 26, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_9', code: 'PrPh Red 9', name: 'Primary Phonics: Red 9', description: 'Short E introduction', sequence: 27, category: 'primary_phonics', is_active: true },
  { id: 'prph_red_10', code: 'PrPh Red 10', name: 'Primary Phonics: Red 10', description: 'All five short vowels mastery', sequence: 28, category: 'primary_phonics', is_active: true },
  { id: 'bl_init', code: 'BL/init/', name: 'Initial Blends', description: 'bl, cl, fl, gl, br, cr, dr', sequence: 29, category: 'blends', is_active: true },
  { id: 'bl_final', code: 'BL/final/', name: 'Final Blends', description: 'nd, nt, nk, mp, ft, lt', sequence: 30, category: 'blends', is_active: true },
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

// PATCH /api/schools/[schoolId]/english-works - Update single work
export async function PATCH(
  request: NextRequest,
  { params }: { params: { schoolId: string } }
) {
  try {
    const schoolId = params.schoolId;
    const body = await request.json();
    const { id, old_code, code, name, description, category, is_active, sequence } = body;
    
    // Need either id or old_code to find the work
    if (!id && !old_code && !sequence) {
      return NextResponse.json({ error: 'Work id, old_code, or sequence required' }, { status: 400 });
    }
    
    const supabase = getSupabase();
    
    // Build update data
    const updateData: any = {};
    if (name !== undefined) updateData.work_name = name;
    if (description !== undefined) updateData.description = description;
    if (category !== undefined) updateData.category = category;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (code !== undefined) updateData.work_code = code;
    updateData.updated_at = new Date().toISOString();
    
    // Find by id, old_code, or sequence
    let query = supabase
      .from('school_english_works')
      .update(updateData)
      .eq('school_id', schoolId);
    
    if (id) {
      query = query.eq('id', id);
    } else if (old_code) {
      query = query.eq('work_code', old_code);
    } else if (sequence) {
      query = query.eq('sequence', sequence);
    }
    
    const { data, error } = await query.select().single();
    
    if (error) {
      console.error('Update error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ success: true, work: data });
  } catch (error: any) {
    console.error('Update English work error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/schools/[schoolId]/english-works - Save/update all works
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
