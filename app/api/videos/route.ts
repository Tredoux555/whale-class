import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getVideos, addVideo } from "@/lib/data";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const videos = getVideos();
  return NextResponse.json({ videos });
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // On Vercel, use Blob Storage (handled by /api/videos/upload-blob)
  // This endpoint is for localhost only
  const isVercel = process.env.VERCEL === "1";
  
  if (isVercel) {
    return NextResponse.json(
      { 
        error: "Please use the upload-blob endpoint on Vercel. This should be handled automatically.",
        requiresCloudStorage: true
      },
      { status: 400 }
    );
  }

  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const category = formData.get("category") as "song-of-week" | "phonics";
    const week = formData.get("week") as string | null;
    const videoFile = formData.get("video") as File | null;

    if (!title || !category || !videoFile) {
      return NextResponse.json(
        { error: `Missing required fields. Title: ${!!title}, Category: ${!!category}, File: ${!!videoFile}` },
        { status: 400 }
      );
    }

    // Validate file
    if (!(videoFile instanceof File)) {
      return NextResponse.json(
        { error: "Invalid file provided" },
        { status: 400 }
      );
    }

    // Check file size (100MB limit)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 100MB. Your file is ${(videoFile.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Save video file
    let videoId: string;
    let videoFileName: string;
    let videoUrl: string;
    
    try {
      const bytes = await videoFile.arrayBuffer();
      const buffer = Buffer.from(bytes);
      videoId = uuidv4();
      videoFileName = `${videoId}-${videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const videosDir = join(process.cwd(), "public", "videos");
      
      // Ensure videos directory exists
      if (!existsSync(videosDir)) {
        await mkdir(videosDir, { recursive: true });
      }
      
      const videoPath = join(videosDir, videoFileName);
      await writeFile(videoPath, buffer);
      videoUrl = `/videos/${videoFileName}`;
    } catch (fileError) {
      console.error("File write error:", fileError);
      return NextResponse.json(
        { 
          error: `Failed to save video file: ${fileError instanceof Error ? fileError.message : "Unknown error"}`,
          details: process.env.VERCEL ? "Vercel has read-only filesystem. Upload videos locally and push to git." : "Check file permissions and disk space."
        },
        { status: 500 }
      );
    }

    // Save video metadata
    try {
      const video = {
        id: videoId,
        title,
        category,
        videoUrl,
        uploadedAt: new Date().toISOString(),
        week: week || undefined,
      };

      addVideo(video);
      return NextResponse.json({ success: true, video });
    } catch (metadataError) {
      console.error("Metadata save error:", metadataError);
      return NextResponse.json(
        { 
          error: `Failed to save video metadata: ${metadataError instanceof Error ? metadataError.message : "Unknown error"}` 
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    return NextResponse.json(
      { 
        error: `Upload failed: ${errorMessage}`,
        ...(process.env.NODE_ENV === "development" && errorStack ? { stack: errorStack } : {})
      },
      { status: 500 }
    );
  }
}

