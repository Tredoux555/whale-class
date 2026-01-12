import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Lazy init to avoid build-time errors
let supabase: ReturnType<typeof createClient> | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing Supabase environment variables");
    }
    supabase = createClient(url, key);
  }
  return supabase;
}

const STORAGE_BUCKET = "whale-uploads";

// GET - Fetch song for a week
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekNumber = searchParams.get("weekNumber");
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  if (!weekNumber) {
    return NextResponse.json({ error: "weekNumber required" }, { status: 400 });
  }

  try {
    const db = getSupabase();
    const { data, error } = await db
      .from("circle_time_songs")
      .select("*")
      .eq("week_number", parseInt(weekNumber))
      .eq("year", parseInt(year))
      .single();

    if (error && error.code !== "PGRST116") {
      // PGRST116 = not found, which is okay
      console.error("Fetch error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, song: data || null });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}

// POST - Upload song for a week
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const weekNumber = formData.get("weekNumber") as string | null;
    const year = formData.get("year") as string || new Date().getFullYear().toString();
    const title = formData.get("title") as string | null;
    const uploadedBy = formData.get("uploadedBy") as string || "Teacher";

    if (!file) {
      return NextResponse.json({ error: "File required" }, { status: 400 });
    }
    if (!weekNumber) {
      return NextResponse.json({ error: "weekNumber required" }, { status: 400 });
    }

    // Validate file type (audio or video)
    const isAudio = file.type.startsWith("audio/");
    const isVideo = file.type.startsWith("video/");
    if (!isAudio && !isVideo) {
      return NextResponse.json(
        { error: "File must be audio or video" },
        { status: 400 }
      );
    }

    // Max 100MB
    if (file.size > 100 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large (max 100MB)" },
        { status: 400 }
      );
    }

    const db = getSupabase();

    // Delete existing song for this week (if any)
    const { data: existing } = await db
      .from("circle_time_songs")
      .select("storage_path")
      .eq("week_number", parseInt(weekNumber))
      .eq("year", parseInt(year))
      .single();

    if (existing?.storage_path) {
      await db.storage.from(STORAGE_BUCKET).remove([existing.storage_path]);
      await db
        .from("circle_time_songs")
        .delete()
        .eq("week_number", parseInt(weekNumber))
        .eq("year", parseInt(year));
    }

    // Generate unique filename
    const fileId = crypto.randomUUID();
    const ext = file.name.split(".").pop() || "mp3";
    const filename = `${fileId}.${ext}`;
    const storagePath = `circle-songs/week-${weekNumber}/${filename}`;

    // Upload to storage
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await db.storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = db.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: "Failed to get public URL" },
        { status: 500 }
      );
    }

    // Save to database
    const songRecord = {
      week_number: parseInt(weekNumber),
      year: parseInt(year),
      filename,
      original_filename: file.name,
      file_type: file.type,
      file_size: file.size,
      public_url: urlData.publicUrl,
      storage_path: storagePath,
      title: title || null,
      uploaded_by: uploadedBy,
    };

    const { data: savedSong, error: dbError } = await db
      .from("circle_time_songs")
      .insert(songRecord)
      .select()
      .single();

    if (dbError) {
      console.error("DB error:", dbError);
      // Try to clean up uploaded file
      await db.storage.from(STORAGE_BUCKET).remove([storagePath]);
      return NextResponse.json(
        { error: `Failed to save: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, song: savedSong });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - Remove song for a week
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const weekNumber = searchParams.get("weekNumber");
  const year = searchParams.get("year") || new Date().getFullYear().toString();

  if (!weekNumber) {
    return NextResponse.json({ error: "weekNumber required" }, { status: 400 });
  }

  try {
    const db = getSupabase();

    // Get existing song
    const { data: existing } = await db
      .from("circle_time_songs")
      .select("storage_path")
      .eq("week_number", parseInt(weekNumber))
      .eq("year", parseInt(year))
      .single();

    if (existing?.storage_path) {
      // Delete from storage
      await db.storage.from(STORAGE_BUCKET).remove([existing.storage_path]);
    }

    // Delete from database
    const { error } = await db
      .from("circle_time_songs")
      .delete()
      .eq("week_number", parseInt(weekNumber))
      .eq("year", parseInt(year));

    if (error) {
      console.error("Delete error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }
}
