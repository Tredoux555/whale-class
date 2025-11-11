import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

// Configure for larger files
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for large video uploads

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const videoFile = formData.get("video") as File | null;

    if (!videoFile) {
      return NextResponse.json(
        { error: "Video file required" },
        { status: 400 }
      );
    }

    // Generate unique file path
    const videoId = crypto.randomUUID();
    const cleanFilename = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `videos/${videoId}-${cleanFilename}`;

    console.log("Starting server-side Supabase Storage upload:", filePath);

    // Use admin client (service role key) to bypass RLS
    const supabase = createSupabaseAdmin();

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await videoFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType: videoFile.type || 'video/mp4',
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: "Failed to get public URL for uploaded video" },
        { status: 500 }
      );
    }

    console.log("Video uploaded successfully:", urlData.publicUrl);

    return NextResponse.json({
      success: true,
      video: {
        id: videoId,
        videoUrl: urlData.publicUrl,
        filePath: filePath,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Upload failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

