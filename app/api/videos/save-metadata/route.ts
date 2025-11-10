import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addVideo } from "@/lib/data";

// This endpoint saves video metadata after blob upload
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id, title, category, videoUrl, week } = await request.json();

    if (!id || !title || !category || !videoUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const video = {
      id,
      title,
      category,
      videoUrl,
      uploadedAt: new Date().toISOString(),
      week: week || undefined,
    };

    addVideo(video);

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error("Metadata save error:", error);
    return NextResponse.json(
      { 
        error: `Failed to save metadata: ${error instanceof Error ? error.message : "Unknown error"}` 
      },
      { status: 500 }
    );
  }
}

