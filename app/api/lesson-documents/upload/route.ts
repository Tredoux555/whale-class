import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase';

// Configure for larger files
export const runtime = 'nodejs';
export const maxDuration = 300;

const BUCKET_NAME = 'lesson-documents';

const ALLOWED_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'text/plain',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

export async function POST(request: NextRequest) {
  console.log('=== LESSON DOCUMENT UPLOAD START ===');
  
  try {
    const supabase = createSupabaseAdmin();
    const formData = await request.formData();
    
    console.log('FormData received');
    
    const file = formData.get('file') as File;
    const weekNumber = parseInt(formData.get('weekNumber') as string);
    const year = parseInt(formData.get('year') as string) || new Date().getFullYear();
    const description = formData.get('description') as string || '';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!weekNumber || weekNumber < 1 || weekNumber > 52) {
      return NextResponse.json({ error: 'Invalid week number' }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type' 
      }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ 
        error: 'File too large. Max 100MB' 
      }, { status: 400 });
    }

    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const storagePath = `week-${weekNumber}-${year}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    console.log('Attempting upload to bucket:', BUCKET_NAME, 'path:', storagePath);
    
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Storage upload error:', JSON.stringify(uploadError));
      console.error('Bucket:', BUCKET_NAME, 'Path:', storagePath);
      return NextResponse.json({ 
        error: 'Failed to upload file', 
        details: uploadError.message,
        bucket: BUCKET_NAME
      }, { status: 500 });
    }
    
    console.log('Upload successful');

    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const { data: doc, error: dbError } = await supabase
      .from('lesson_documents')
      .insert({
        week_number: weekNumber,
        year: year,
        filename: filename,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        description: description
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      await supabase.storage.from(BUCKET_NAME).remove([storagePath]);
      return NextResponse.json({ 
        error: 'Failed to save document metadata', 
        details: dbError.message 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      document: doc
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload document' }, { status: 500 });
  }
}
