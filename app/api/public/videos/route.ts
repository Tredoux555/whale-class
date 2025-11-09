import { NextResponse } from "next/server";
import { getVideos } from "@/lib/data";

export async function GET() {
  const videos = getVideos();
  return NextResponse.json({ videos });
}

