// /api/montree/phonics/upload/route.ts
// Upload a photo for a phonics word to Supabase storage
// Returns the public URL to be used with the phonics images or words API

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, getSupabaseUrl } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const rateLimited = await checkRateLimit(`phonics-upload-${auth.userId}`, 20, 60);
    if (rateLimited) {
      return NextResponse.json({ error: 'Rate limited' }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const phase = formData.get('phase') as string;
    const word = formData.get('word') as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
    }

    const VALID_PHASES = ['initial', 'phase2', 'blue1', 'blue2'];
    if (!phase || !VALID_PHASES.includes(phase)) {
      return NextResponse.json({ error: 'Invalid or missing phase' }, { status: 400 });
    }
    if (!word || typeof word !== 'string' || word.trim().length === 0) {
      return NextResponse.json({ error: 'Word is required' }, { status: 400 });
    }

    // Generate a safe filename
    const ext = file.name.split('.').pop() || 'jpg';
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '').slice(0, 5).toLowerCase();
    const safeWord = word.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 30);
    const timestamp = Date.now();
    const storagePath = `phonics/${auth.schoolId}/${phase}/${safeWord}_${timestamp}.${safeExt}`;

    const supabase = getSupabase();

    // Upload to Supabase storage (montree-media bucket)
    const buffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, buffer, {
        contentType: file.type,
        cacheControl: '31536000', // 1 year
      });

    if (uploadError) {
      console.error('Phonics upload error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Build public URL
    const supabaseUrl = getSupabaseUrl();
    if (!supabaseUrl) {
      return NextResponse.json({ error: 'Storage configuration error' }, { status: 500 });
    }
    const publicUrl = `${supabaseUrl}/storage/v1/object/public/montree-media/${storagePath}`;

    return NextResponse.json({ url: publicUrl }, { status: 201 });
  } catch (err) {
    console.error('Phonics upload POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
