import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { put } from "@vercel/blob";
import { v4 as uuidv4 } from "uuid";
import { addVideo } from "@/lib/data";

// Configure route for larger payloads
export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for large uploads

// This endpoint handles the actual blob upload and saves metadata
// Note: put() streams directly to blob storage, but FormData still loads into memory
// For files > 4.5MB, we need to use client-side upload or streaming
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
    const videoFile = formData.get("video") as File | null;

    if (!title || !category || !videoFile) {
      return NextResponse.json(
        { error: "Missing required fields" },
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

    // Check file size (100MB limit for blob storage)
    const maxSize = 100 * 1024 * 1024; // 100MB
    if (videoFile.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 100MB. Your file is ${(videoFile.size / 1024 / 1024).toFixed(2)}MB` },
        { status: 400 }
      );
    }

    // Upload to Vercel Blob Storage
    // put() streams the file directly to blob storage, avoiding the 4.5MB function limit
    const videoId = uuidv4();
    const cleanFilename = videoFile.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const blobPath = `videos/${videoId}-${cleanFilename}`;

    // Use put() which handles the upload directly to blob storage
    const blob = await put(blobPath, videoFile, {
      access: 'public',
      contentType: videoFile.type || 'video/mp4',
      // This uploads directly to blob storage, not through function body
    });

    // Save video metadata
    const video = {
      id: videoId,
      title,
      category,
      videoUrl: blob.url, // Use blob URL instead of local path
      uploadedAt: new Date().toISOString(),
      week: week || undefined,
    };

    addVideo(video);

    return NextResponse.json({ success: true, video });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Check for blob storage specific errors
    if (errorMessage.includes("BLOB_STORE_NOT_FOUND") || errorMessage.includes("BLOB_")) {
      return NextResponse.json(
        { 
          error: "Vercel Blob Storage not configured. Please set BLOB_READ_WRITE_TOKEN in Vercel environment variables.",
          needsBlobToken: true
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: `Upload failed: ${errorMessage}` 
      },
      { status: 500 }
    );
  }
}

