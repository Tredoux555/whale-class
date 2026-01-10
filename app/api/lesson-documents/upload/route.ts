import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const weekNumber = formData.get('weekNumber') as string;
    const year = formData.get('year') as string || new Date().getFullYear().toString();

    if (!file || !weekNumber) {
      return NextResponse.json({ success: false, error: 'File and weekNumber required' });
    }

    const supabase = getSupabase();

    // Generate unique filename
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filename = `${timestamp}-${safeName}`;
    const storagePath = `week-${weekNumber}-${year}/${filename}`;

    // Upload to Supabase Storage
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage
      .from('lesson-documents')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json({ success: false, error: uploadError.message });
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('lesson-documents')
      .getPublicUrl(storagePath);

    // Save to database
    const { data, error: dbError } = await supabase
      .from('lesson_documents')
      .insert({
        week_number: parseInt(weekNumber),
        year: parseInt(year),
        filename,
        original_filename: file.name,
        file_type: file.type,
        file_size: file.size,
        storage_path: storagePath,
        public_url: urlData.publicUrl,
        description: '',
        uploaded_by: 'teacher'
      })
      .select()
      .single();

    if (dbError) {
      console.error('DB error:', dbError);
      return NextResponse.json({ success: false, error: dbError.message });
    }

    return NextResponse.json({ success: true, document: data });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ success: false, error: 'Upload failed' });
  }
}
