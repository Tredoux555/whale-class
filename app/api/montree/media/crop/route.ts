// /api/montree/media/crop/route.ts
// Replace a photo with a cropped version
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function POST(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const formData = await request.formData();

    const file = formData.get('file') as File;
    const mediaId = formData.get('media_id') as string;
    const width = parseInt(formData.get('width') as string, 10);
    const height = parseInt(formData.get('height') as string, 10);

    if (!file || !mediaId) {
      return NextResponse.json(
        { error: 'file and media_id required' },
        { status: 400 }
      );
    }

    if (isNaN(width) || isNaN(height) || width < 1 || height < 1) {
      return NextResponse.json(
        { error: 'Valid width and height required' },
        { status: 400 }
      );
    }

    // Fetch existing media record
    const { data: media, error: fetchErr } = await supabase
      .from('montree_media')
      .select('*')
      .eq('id', mediaId)
      .maybeSingle();

    if (fetchErr || !media) {
      return NextResponse.json({ error: 'Media not found' }, { status: 404 });
    }

    // Verify the media belongs to the authenticated user's school
    if (media.school_id !== auth.schoolId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Upload cropped file to same storage path (overwrite)
    const storagePath = media.storage_path;
    const fileBuffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadErr } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadErr) {
      console.error('Crop upload error:', uploadErr);
      return NextResponse.json(
        { error: 'Failed to upload cropped image' },
        { status: 500 }
      );
    }

    // Update dimensions in database
    const { error: updateErr } = await supabase
      .from('montree_media')
      .update({
        width,
        height,
        file_size_bytes: file.size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', mediaId);

    if (updateErr) {
      console.error('Crop DB update error:', updateErr);
    }

    // Delete old thumbnail so it regenerates
    if (media.thumbnail_path) {
      await supabase.storage
        .from('montree-media')
        .remove([media.thumbnail_path])
        .catch(() => {});
    }

    return NextResponse.json({
      success: true,
      media: { id: mediaId, width, height, file_size_bytes: file.size },
    });
  } catch (error) {
    console.error('Crop API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
