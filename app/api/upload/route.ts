import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function POST(request: NextRequest) {
  try {
    const sb = getSupabase();
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${folder}/${timestamp}-${Math.random().toString(36).slice(2)}.${ext}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { data, error } = await sb.storage.from('whale-uploads').upload(filename, buffer, {
      contentType: file.type,
      upsert: false
    });

    if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 });

    const { data: { publicUrl } } = sb.storage.from('whale-uploads').getPublicUrl(filename);

    return NextResponse.json({ success: true, url: publicUrl, path: data.path });
  } catch (error) {
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
