import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ images: [], error: 'Missing Supabase config' }, { status: 500 });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);

    // List all files in the sound-objects folder
    const { data: files, error } = await supabase.storage
      .from('images')
      .list('sound-objects', {
        limit: 500,
        sortBy: { column: 'name', order: 'asc' },
      });

    if (error) {
      console.error('Storage list error:', error);
      return NextResponse.json({ images: [] });
    }

    // Extract word names from filenames (remove .png extension)
    const images = (files || [])
      .filter(f => f.name.endsWith('.png'))
      .map(f => f.name.replace('.png', ''));

    // Also get full URLs for each image
    const imagesWithUrls = images.map(word => {
      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(`sound-objects/${word}.png`);
      return {
        word,
        url: data.publicUrl,
      };
    });

    return NextResponse.json({ 
      images,
      imagesWithUrls,
      count: images.length,
    });

  } catch (error: any) {
    console.error('List images error:', error);
    return NextResponse.json({ images: [], error: error.message }, { status: 500 });
  }
}
