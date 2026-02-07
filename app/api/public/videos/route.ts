import { NextResponse } from "next/server";
import { getVideos } from "@/lib/data";

export async function GET() {
  try {
    const videos = await getVideos();
    // Filter out montessori and recipes videos - they're admin-only
    const publicVideos = videos.filter(v => v.category !== "montessori" && v.category !== "recipes");
    return NextResponse.json({ videos: publicVideos }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[Public Videos] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

