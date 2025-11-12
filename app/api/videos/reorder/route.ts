import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { getVideos, saveVideos } from "@/lib/data";

export async function PUT(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { videoIds } = body; // Array of video IDs in the new order

    if (!Array.isArray(videoIds)) {
      return NextResponse.json(
        { error: "videoIds must be an array" },
        { status: 400 }
      );
    }

    // Get all videos
    const allVideos = await getVideos();

    // Create a map for quick lookup
    const videoMap = new Map(allVideos.map(v => [v.id, v]));

    // Reorder videos according to the provided order
    const reorderedVideos = videoIds
      .map(id => videoMap.get(id))
      .filter((video): video is typeof allVideos[0] => video !== undefined);

    // Add any videos that weren't in the reorder list (shouldn't happen, but safety check)
    const remainingVideos = allVideos.filter(v => !videoIds.includes(v.id));
    const finalVideos = [...reorderedVideos, ...remainingVideos];

    // Save the reordered videos
    await saveVideos(finalVideos);

    return NextResponse.json({ 
      success: true, 
      videos: finalVideos 
    });
  } catch (error) {
    console.error("Reorder error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to reorder videos: ${errorMessage}` },
      { status: 500 }
    );
  }
}

