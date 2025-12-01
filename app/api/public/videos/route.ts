import { NextResponse } from "next/server";
import { getVideos } from "@/lib/data";

export async function GET() {
  const videos = await getVideos();
  // Filter out montessori and recipes videos - they're admin-only
  const publicVideos = videos.filter(v => v.category !== "montessori" && v.category !== "recipes");
  return NextResponse.json({ videos: publicVideos });
}

