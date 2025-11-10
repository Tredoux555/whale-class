import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { deleteVideo } from "@/lib/data";
import { unlink } from "fs/promises";
import { join } from "path";

export async function DELETE(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Video ID required" },
        { status: 400 }
      );
    }

    // Get video to find file path
    const { getVideos } = await import("@/lib/data");
    const videos = await getVideos();
    const video = videos.find((v) => v.id === id);

    if (video && !video.videoUrl.startsWith("http")) {
      // Only delete local files (not blob storage URLs)
      const videoPath = join(process.cwd(), "public", video.videoUrl);
      try {
        await unlink(videoPath);
      } catch (error) {
        console.error("Error deleting video file:", error);
      }
    }

    const success = await deleteVideo(id);

    if (!success) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json(
      { error: "Delete failed" },
      { status: 500 }
    );
  }
}

