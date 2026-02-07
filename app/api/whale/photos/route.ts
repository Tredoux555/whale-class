// app/api/whale/photos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-client';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

// GET - Get photos for an assignment or child
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assignmentId = searchParams.get('assignmentId');
    const childId = searchParams.get('childId');

    const supabase = createSupabaseAdmin();
    let query = supabase
      .from('activity_photos')
      .select('*')
      .order('uploaded_at', { ascending: false });

    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId);
    } else if (childId) {
      query = query.eq('child_id', childId);
    } else {
      return NextResponse.json(
        { error: 'assignmentId or childId is required' },
        { status: 400 }
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data: data || []
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error fetching photos:', error);
    return NextResponse.json(
      { error: message || 'Failed to fetch photos' },
      { status: 500 }
    );
  }
}

// POST - Upload photo
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const assignmentId = formData.get('assignmentId') as string;
    const childId = formData.get('childId') as string;
    const caption = formData.get('caption') as string;
    const photo = formData.get('photo') as File;

    if (!assignmentId || !childId || !photo) {
      return NextResponse.json(
        { error: 'assignmentId, childId, and photo are required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Check if running on Vercel (use Supabase Storage)
    const isVercel = process.env.VERCEL === '1';

    let photoUrl: string;

    if (isVercel) {
      // Upload to Supabase Storage
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const fileExt = photo.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `activity-photos/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('child-photos')
        .upload(filePath, buffer, {
          contentType: photo.type,
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('child-photos')
        .getPublicUrl(filePath);

      photoUrl = urlData.publicUrl;
    } else {
      // Save locally
      const bytes = await photo.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'activity-photos');
      
      // Create directory if it doesn't exist
      try {
        await mkdir(uploadDir, { recursive: true });
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && (err as any).code !== 'EEXIST') throw err;
      }

      const fileName = `${Date.now()}-${photo.name}`;
      const filePath = path.join(uploadDir, fileName);

      // Create directory if it doesn't exist
      await writeFile(filePath, buffer);

      photoUrl = `/uploads/activity-photos/${fileName}`;
    }

    // Save photo record to database
    const { data, error } = await supabase
      .from('activity_photos')
      .insert({
        assignment_id: assignmentId,
        child_id: childId,
        photo_url: photoUrl,
        caption: caption || null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      data
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error uploading photo:', error);
    return NextResponse.json(
      { error: message || 'Failed to upload photo' },
      { status: 500 }
    );
  }
}

// DELETE - Delete photo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const photoId = searchParams.get('photoId');

    if (!photoId) {
      return NextResponse.json(
        { error: 'photoId is required' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // Get photo details first
    const { data: photo } = await supabase
      .from('activity_photos')
      .select('photo_url')
      .eq('id', photoId)
      .single();

    // Delete from database
    const { error } = await supabase
      .from('activity_photos')
      .delete()
      .eq('id', photoId);

    if (error) throw error;

    // TODO: Also delete from storage if using Supabase Storage

    return NextResponse.json({
      success: true,
      message: 'Photo deleted'
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Error deleting photo:', error);
    return NextResponse.json(
      { error: message || 'Failed to delete photo' },
      { status: 500 }
    );
  }
}
