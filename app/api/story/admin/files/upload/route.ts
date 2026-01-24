import { NextRequest, NextResponse } from 'next/server';
import { getSupabase, verifyAdminToken } from '@/lib/story-db';
import crypto from 'crypto';

// Allowed file types for document sharing
const ALLOWED_TYPES: Record<string, string[]> = {
  // Documents
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  // Spreadsheets
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'text/csv': ['csv'],
  // Presentations
  'application/vnd.ms-powerpoint': ['ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['pptx'],
  // Images
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'image/gif': ['gif'],
  'image/webp': ['webp'],
  // Text
  'text/plain': ['txt'],
  // Archives
  'application/zip': ['zip'],
  'application/x-rar-compressed': ['rar'],
};

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export async function POST(req: NextRequest) {
  try {
    const adminUsername = await verifyAdminToken(req.headers.get('authorization'));
    if (!adminUsername) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const description = formData.get('description') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Validate file type
    const isAllowed = Object.keys(ALLOWED_TYPES).includes(file.type) || 
      file.name.match(/\.(pdf|doc|docx|xls|xlsx|csv|ppt|pptx|txt|zip|rar|jpg|jpeg|png|gif|webp)$/i);
    
    if (!isAllowed) {
      return NextResponse.json({ 
        error: `File type not allowed. Supported: PDF, Word, Excel, PowerPoint, images, text, archives` 
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    
    // Generate unique filename
    const ext = file.name.split('.').pop() || 'bin';
    const uniqueFilename = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    
    const supabase = getSupabase();

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('story-files')
      .upload(`shared/${uniqueFilename}`, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false
      });

    if (uploadError) {
      console.error('[Files Upload] Storage error:', uploadError);
      return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('story-files')
      .getPublicUrl(`shared/${uniqueFilename}`);

    // Save to database
    const { data: result, error: dbError } = await supabase
      .from('story_shared_files')
      .insert({
        filename: uniqueFilename,
        original_filename: file.name,
        file_size: file.size,
        mime_type: file.type || 'application/octet-stream',
        storage_path: `shared/${uniqueFilename}`,
        public_url: urlData.publicUrl,
        description: description?.trim() || null,
        uploaded_by: adminUsername
      })
      .select('id, original_filename, file_size, description, created_at, public_url')
      .single();

    if (dbError) {
      console.error('[Files Upload] DB error:', dbError);
      // Try to clean up uploaded file
      await supabase.storage.from('story-files').remove([`shared/${uniqueFilename}`]);
      return NextResponse.json({ error: 'Failed to save file record' }, { status: 500 });
    }

    return NextResponse.json({ success: true, file: result });
  } catch (error) {
    console.error('[Files Upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
