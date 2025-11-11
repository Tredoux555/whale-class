import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { filename, contentType } = body;

    if (!filename) {
      return NextResponse.json(
        { error: "Filename required" },
        { status: 400 }
      );
    }

    // Generate unique file path
    const videoId = crypto.randomUUID();
    const cleanFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `videos/${videoId}-${cleanFilename}`;

    // Use admin client to create signed upload URL
    // Note: Supabase doesn't have signed upload URLs, so we'll return the path
    // and use service role key for the actual upload via a different method
    // Actually, we can use the service role key to generate a token or use direct upload
    
    // For now, return the path and we'll handle upload differently
    return NextResponse.json({
      success: true,
      path: filePath,
      videoId: videoId,
    });
  } catch (error) {
    console.error("Upload URL error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to generate upload URL: ${errorMessage}` },
      { status: 500 }
    );
  }
}

