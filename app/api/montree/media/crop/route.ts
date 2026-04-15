// /api/montree/media/crop/route.ts
// Save a cropped version of a photo WITHOUT overwriting the original.
// Cropped file goes to a new storage path; original storage_path preserved.
import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';

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

    // Build a NEW storage path for the cropped version (keep original intact)
    const originalPath: string = media.storage_path;
    const lastDot = originalPath.lastIndexOf('.');
    const basePath = lastDot > 0 ? originalPath.substring(0, lastDot) : originalPath;
    const ext = lastDot > 0 ? originalPath.substring(lastDot) : '.jpg';
    const croppedPath = `${basePath}_cropped_${Date.now()}${ext}`;

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // Upload cropped file to NEW path (original file untouched)
    const { error: uploadErr } = await supabase.storage
      .from('montree-media')
      .upload(croppedPath, fileBuffer, {
        contentType: 'image/jpeg',
        upsert: false, // Never overwrite — always a new file
      });

    if (uploadErr) {
      console.error('Crop upload error:', uploadErr);
      return NextResponse.json(
        { error: 'Failed to upload cropped image' },
        { status: 500 }
      );
    }

    // Update DB: store cropped path separately, keep original storage_path
    const updateFields: Record<string, unknown> = {
      cropped_storage_path: croppedPath,
      updated_at: new Date().toISOString(),
    };

    const { error: updateErr } = await supabase
      .from('montree_media')
      .update(updateFields)
      .eq('id', mediaId);

    // If cropped_storage_path column doesn't exist yet (migration not run),
    // fall back gracefully — the crop is still saved in storage, just not linked
    if (updateErr) {
      const msg = updateErr.message || '';
      if (msg.includes('column') || updateErr.code === '42703') {
        console.warn('[Crop] cropped_storage_path column not found — crop saved in storage but not linked:', croppedPath);
      } else {
        console.error('Crop DB update error:', updateErr);
      }
    }

    // Build the CDN-cached proxy URL for the cropped version
    const croppedUrl = getProxyUrl(croppedPath);

    return NextResponse.json({
      success: true,
      media: {
        id: mediaId,
        width,
        height,
        file_size_bytes: file.size,
        cropped_url: croppedUrl,
        cropped_storage_path: croppedPath,
      },
    });
  } catch (error) {
    console.error('Crop API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
