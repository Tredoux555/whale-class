import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET, CIRCLE_PLANS_FILE } from "@/lib/supabase";
import fs from "fs";
import path from "path";

// One-time route to upload circle-plans.json to Supabase Storage
// Call this once after deployment to initialize the data
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Read the JSON file
    const filePath = path.join(process.cwd(), "data", "circle-plans.json");
    
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "circle-plans.json not found" }, { status: 404 });
    }

    const fileContent = fs.readFileSync(filePath, "utf-8");
    const jsonData = JSON.parse(fileContent); // Validate JSON
    
    console.log(`Uploading circle-plans.json (${fileContent.length} bytes, ${jsonData.themes?.length || 0} themes)`);

    // Upload to Supabase Storage
    const supabase = createSupabaseAdmin();
    const blob = new Blob([fileContent], { type: "application/json" });
    
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(CIRCLE_PLANS_FILE, blob, {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      console.error("Upload error:", error);
      return NextResponse.json(
        { error: `Failed to upload: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Circle plans data uploaded to Supabase Storage",
      path: `${STORAGE_BUCKET}/${CIRCLE_PLANS_FILE}`,
      themes: jsonData.themes?.length || 0,
    });
  } catch (error) {
    console.error("Upload error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: `Upload failed: ${errorMessage}` },
      { status: 500 }
    );
  }
}

