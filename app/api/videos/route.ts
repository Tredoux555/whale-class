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

  try {
    const formData = await request.formData();
    const title = formData.get("title") as string;
    const category = formData.get("category") as "song-of-week" | "phonics";
    const week = formData.get("week") as string | null;
    const videoFile = formData.get("video") as File;

    if (!title || !category || !videoFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Save video file
    const bytes = await videoFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const videoId = uuidv4();
    const videoFileName = `${videoId}-${videoFile.name}`;
    const videosDir = join(process.cwd(), "public", "videos");
    
    // Ensure videos directory exists
    if (!existsSync(videosDir)) {
      await mkdir(videosDir, { recursive: true });
    }
    
    const videoPath = join(videosDir, videoFileName);
    await writeFile(videoPath, buffer);

    const videoUrl = `/videos/${videoFileName}`;

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
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}

