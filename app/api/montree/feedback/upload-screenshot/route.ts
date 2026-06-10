// /api/montree/feedback/upload-screenshot/route.ts
// Upload screenshot images for feedback submissions
// 🔒 Security (Jun 2026 health check): requires an authenticated Montree
// session + per-user rate limit. This endpoint was previously open to
// anonymous uploads into a PUBLIC bucket. NOTE: the FeedbackButton UI was
// unmounted from all layouts on Mar 10 — this route has no active callers
// but stays gated in case the button returns.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { checkRateLimit } from '@/lib/rate-limiter';

const BUCKET_NAME = 'feedback-screenshots';
const MAX_SIZE = 5 * 1024 * 1024; // 5MB max

export async function POST(req: NextRequest) {
  try {
    // Auth gate — any logged-in Montree user (teacher/principal/parent role on
    // the montree-auth cookie). Anonymous callers get 401.
    const auth = await verifySchoolRequest(req);
    if (auth instanceof NextResponse) return auth;

    // Rate limit: 10 uploads / 15 min per user — feedback screenshots are
    // low-volume by nature; this stops storage-quota abuse with a stolen cookie.
    const rl = await checkRateLimit(
      getSupabase(),
      `user:${auth.userId}`,
      'feedback_upload_screenshot',
      10,
      15
    );
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many uploads. Please try again later.' },
        { status: 429 }
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Only images allowed' }, { status: 400 });
    }

    // Validate file size
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
    }

    const supabase = getSupabase();

    // Ensure bucket exists (will fail silently if already exists)
    try {
      await supabase.storage.createBucket(BUCKET_NAME, {
        public: true,
        fileSizeLimit: MAX_SIZE
      });
    } catch {
      // Bucket likely already exists
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || 'jpg';
    const filename = `${timestamp}-${randomId}.${ext}`;

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filename, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Upload error:', error);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filename);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: data.path
    });

  } catch (error) {
    console.error('Screenshot upload error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
