import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { addVideo } from "@/lib/data";

// This endpoint saves video metadata after blob upload
export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let id: string | undefined;
  let videoUrl: string | undefined;
  
  try {
    const body = await request.json();
    id = body.id;
    const title = body.title;
    const category = body.category;
    videoUrl = body.videoUrl;
    const week = body.week;

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

    await addVideo(video);

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error("Metadata save error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    // Log full error details for debugging
    console.error("Full error details:", {
      message: errorMessage,
      stack: errorStack,
      videoId: id,
      videoUrl: videoUrl
    });
    
    return NextResponse.json(
      { 
        error: `Failed to save metadata: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? errorStack : undefined
      },
      { status: 500 }
    );
  }
}

