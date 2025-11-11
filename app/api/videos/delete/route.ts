import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { deleteVideo } from "@/lib/data";
import { unlink } from "fs/promises";
import { join } from "path";
import { createSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

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
    // Note: We delete metadata first, then try to delete the file
    // This way the video disappears from the list even if file deletion fails
    
    // Delete video metadata first
    let success: boolean;
    try {
      success = await deleteVideo(id);
    } catch (metadataError) {
      console.error("Error deleting video metadata:", metadataError);
      const errorMessage = metadataError instanceof Error ? metadataError.message : "Unknown error";
      return NextResponse.json(
        { 
          error: `Failed to delete video metadata: ${errorMessage}`,
          details: process.env.NODE_ENV === "development" ? (metadataError instanceof Error ? metadataError.stack : undefined) : undefined
        },
        { status: 500 }
      );
    }

    if (!success) {
      return NextResponse.json(
        { error: "Video not found in metadata" },
        { status: 404 }
      );
    }

    // Now try to delete the actual file (non-blocking)
    if (video.videoUrl.startsWith("http") && video.videoUrl.includes("supabase")) {
      // Supabase Storage URL - extract path and delete
      try {
        const supabase = createSupabaseAdmin();
        // Extract file path from Supabase URL
        // URL format: https://xxxxx.supabase.co/storage/v1/object/public/videos/path/to/file
        const urlObj = new URL(video.videoUrl);
        const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/public\/videos\/(.+)/);
        
        if (pathMatch && pathMatch[1]) {
          const filePath = decodeURIComponent(pathMatch[1]);
          const { error: deleteError } = await supabase.storage
            .from(STORAGE_BUCKET)
            .remove([filePath]);
          
          if (deleteError) {
            console.error("Error deleting video from Supabase Storage (non-critical):", deleteError);
          } else {
            console.log("Deleted video from Supabase Storage:", filePath);
          }
        } else {
          console.error("Could not extract file path from Supabase URL:", video.videoUrl);
        }
      } catch (error) {
        console.error("Error deleting video from Supabase Storage (non-critical):", error);
        // Non-critical - metadata already deleted
      }
    } else if (!process.env.VERCEL) {
      // Local file path - only delete on localhost
      const videoPath = join(process.cwd(), "public", video.videoUrl);
      try {
        await unlink(videoPath);
        console.log("Deleted local video file:", videoPath);
      } catch (error) {
        console.error("Error deleting local video file (non-critical):", error);
        // Non-critical - metadata already deleted
      }
    } else {
      // On Vercel, local file paths don't exist - skip file deletion
      console.log("Skipping file deletion on Vercel (file doesn't exist):", video.videoUrl);
    }

    // Metadata already deleted above, return success
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

