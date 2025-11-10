import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { deleteVideo } from "@/lib/data";
import { unlink } from "fs/promises";
import { join } from "path";
import { del } from "@vercel/blob";

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

    if (!video) {
      return NextResponse.json(
        { error: "Video not found" },
        { status: 404 }
      );
    }

    // Delete video file (if it exists)
    if (video.videoUrl.startsWith("http")) {
      // Blob Storage URL - delete from blob storage
      try {
        // Extract blob path from URL
        // URL format: https://[account].public.blob.vercel-storage.com/videos/[filename]
        const urlObj = new URL(video.videoUrl);
        const pathParts = urlObj.pathname.split('/');
        const videosIndex = pathParts.indexOf('videos');
        if (videosIndex !== -1) {
          const blobPath = pathParts.slice(videosIndex).join('/');
          await del(blobPath);
          console.log("Deleted video from blob storage:", blobPath);
        } else {
          console.warn("Could not extract blob path from URL:", video.videoUrl);
        }
      } catch (error) {
        console.error("Error deleting video from blob storage:", error);
        // Continue even if blob delete fails - we'll still delete metadata
      }
    } else if (!process.env.VERCEL) {
      // Local file path - only delete on localhost
      const videoPath = join(process.cwd(), "public", video.videoUrl);
      try {
        await unlink(videoPath);
        console.log("Deleted local video file:", videoPath);
      } catch (error) {
        console.error("Error deleting local video file:", error);
        // Continue even if file delete fails - we'll still delete metadata
      }
    } else {
      // On Vercel, local file paths don't exist - skip file deletion
      console.log("Skipping file deletion on Vercel (file doesn't exist):", video.videoUrl);
    }

    // Delete video metadata
    const success = await deleteVideo(id);

    if (!success) {
      return NextResponse.json(
        { error: "Video not found in metadata" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { 
        error: `Delete failed: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}

