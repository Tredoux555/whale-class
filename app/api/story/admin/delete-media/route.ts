import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyToken, extractToken } from '@/lib/story-auth';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for storage operations
const getSupabaseAdmin = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Supabase configuration missing');
  }

  return createClient(url, key);
};

export async function DELETE(req: NextRequest) {
  try {
    // Verify admin token
    const token = extractToken(req.headers.get('authorization'));

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);

    if (!payload || payload.type !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get message ID from query params
    const { searchParams } = new URL(req.url);
    const messageId = searchParams.get('id');

    if (!messageId) {
      return NextResponse.json({ error: 'Message ID required' }, { status: 400 });
    }

    // Get the message to find the media URL
    const msgResult = await db.query(
      'SELECT * FROM story_message_history WHERE id = $1',
      [messageId]
    );

    if (msgResult.rows.length === 0) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 });
    }

    const message = msgResult.rows[0];

    // If there's a media URL, try to delete from storage
    if (message.media_url) {
      try {
        const supabase = getSupabaseAdmin();

        // Extract the file path from the URL
        // URL format: https://xxx.supabase.co/storage/v1/object/public/bucket-name/path/to/file
        const urlParts = message.media_url.split('/storage/v1/object/public/');
        if (urlParts.length === 2) {
          const pathParts = urlParts[1].split('/');
          const bucket = pathParts[0];
          const filePath = pathParts.slice(1).join('/');

          // Delete from storage
          const { error: storageError } = await supabase.storage
            .from(bucket)
            .remove([filePath]);

          if (storageError) {
            console.error('Storage delete error:', storageError);
            // Continue anyway - we still want to delete the database record
          }
        }
      } catch (storageErr) {
        console.error('Storage operation error:', storageErr);
        // Continue anyway
      }
    }

    // Delete from database
    await db.query(
      'DELETE FROM story_message_history WHERE id = $1',
      [messageId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete media error:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
