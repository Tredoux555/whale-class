// /api/montree/children/[childId]/photo/route.ts
// POST: Upload profile photo → Supabase storage → save URL to montree_children.photo_url
// DELETE: Remove profile photo from storage + clear photo_url

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';
import { getClientIP } from '@/lib/montree/audit-logger';

interface RouteContext {
  params: Promise<{ childId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const supabase = getSupabase();
    const schoolId = auth.schoolId;

    // Rate limit: 10 uploads per 15 minutes per IP
    const ip = getClientIP(request.headers);
    const { allowed, retryAfterSeconds } = await checkRateLimit(
      supabase, ip, '/api/montree/children/photo', 10, 15
    );
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
      );
    }

    // Verify child exists and belongs to this school
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('*')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', (child as Record<string, unknown>).classroom_id as string)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file || file.size === 0) {
      return NextResponse.json({ error: 'No photo provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'File must be an image' }, { status: 400 });
    }

    // Max 5MB (photos should be pre-compressed client-side)
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo must be under 5MB' }, { status: 400 });
    }

    // Upload to Supabase storage — stable path, upsert overwrites on re-take
    const storagePath = `${schoolId}/avatars/${childId}.jpg`;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Avatar upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    // Build public URL
    const photoUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/montree-media/${storagePath}`;

    // Cache-bust param forces browser to fetch the new image after a re-take
    // (Supabase CDN caches by URL — without this, the old face shows until cache expires)
    // Note: this ?v= param persists in the DB. Strip it if you ever need to compare storage paths.
    const photoUrlWithBust = `${photoUrl}?v=${Date.now()}`;

    // Save URL to montree_children.photo_url
    const { error: updateError } = await supabase
      .from('montree_children')
      .update({ photo_url: photoUrlWithBust } as never)
      .eq('id', childId);

    if (updateError) {
      console.error('Photo URL update error:', updateError);
      return NextResponse.json({ error: 'Failed to save photo URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, photo_url: photoUrlWithBust });
  } catch (error: unknown) {
    console.error('Profile photo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const { childId } = await context.params;
    const supabase = getSupabase();
    const schoolId = auth.schoolId;

    // Verify child belongs to this school
    const { data: child, error: childError } = await supabase
      .from('montree_children')
      .select('*')
      .eq('id', childId)
      .single();

    if (childError || !child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }

    const { data: classroom } = await supabase
      .from('montree_classrooms')
      .select('id')
      .eq('id', (child as Record<string, unknown>).classroom_id as string)
      .eq('school_id', schoolId)
      .single();

    if (!classroom) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Remove from storage
    const storagePath = `${schoolId}/avatars/${childId}.jpg`;
    await supabase.storage
      .from('montree-media')
      .remove([storagePath]);

    // Clear photo_url
    await supabase
      .from('montree_children')
      .update({ photo_url: null } as never)
      .eq('id', childId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error('Profile photo delete error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
