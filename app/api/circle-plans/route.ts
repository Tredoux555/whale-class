import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET, CIRCLE_PLANS_FILE } from "@/lib/supabase";

// Configure route for Vercel
export const runtime = 'nodejs';
export const maxDuration = 10;

// Get plans data - fetch from Supabase Storage (Vercel) or filesystem (localhost)
// This prevents the JSON from being bundled into the serverless function
async function readPlansData() {
  const isVercel = process.env.VERCEL === "1";
  
  if (isVercel) {
    // On Vercel: Read from Supabase Storage
    try {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(CIRCLE_PLANS_FILE);

      if (error) {
        // Check if it's a "not found" error (file doesn't exist yet)
        if (error.message.includes("not found") || error.message.includes("404")) {
          console.log("Circle plans file doesn't exist in Supabase Storage yet, returning empty data");
          return { themes: [], settings: { circleDuration: 20, ageGroup: "kindergarten", classSize: 15 } };
        }
        console.error("Error reading circle plans from Supabase Storage:", error.message);
        return { themes: [], settings: { circleDuration: 20, ageGroup: "kindergarten", classSize: 15 } };
      }

      if (!data) {
        return { themes: [], settings: { circleDuration: 20, ageGroup: "kindergarten", classSize: 15 } };
      }

      const text = await data.text();
      const plansData = JSON.parse(text);
      return plansData;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Error getting circle plans from Supabase:", errorMessage);
      return { themes: [], settings: { circleDuration: 20, ageGroup: "kindergarten", classSize: 15 } };
    }
  } else {
    // On localhost: Read from filesystem (lazy import)
    const fs = require("fs");
    const path = require("path");
    const circlePlansPath = path.join(process.cwd(), "data", "circle-plans.json");
    
    try {
      const data = fs.readFileSync(circlePlansPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      console.error("Error reading circle plans from filesystem:", error);
      return { themes: [], settings: { circleDuration: 20, ageGroup: "kindergarten", classSize: 15 } };
    }
  }
}

// GET - Fetch all lesson plans
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readPlansData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching circle plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

// POST - Create new theme/lesson plan
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Data is read-only - all theme creation requires git commits
    return NextResponse.json(
      { 
        error: "Cannot create themes. Data is read-only. Please add themes to lib/circle-plans-data.ts and commit to git.",
        requiresGitCommit: true
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error creating theme:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to create theme: ${errorMessage}` }, { status: 500 });
  }
}

// PUT - Update theme/lesson plan
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const updatedTheme = await request.json();
    const data = await readPlansData();
    
    const index = data.themes.findIndex((t: any) => t.id === updatedTheme.id);
    if (index === -1) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    
    // Data is read-only - all updates require git commits
    return NextResponse.json(
      { 
        error: "Cannot update theme data. Data is read-only. Please update lib/circle-plans-data.ts and commit to git.",
        requiresGitCommit: true
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error updating theme:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to update theme: ${errorMessage}` }, { status: 500 });
  }
}

// DELETE - Delete theme
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Theme ID required" }, { status: 400 });
    }

    const data = await readPlansData();
    const index = data.themes.findIndex((t: any) => t.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    
    // Remove the theme from the array
    const deletedTheme = data.themes[index];
    data.themes.splice(index, 1);
    
    // Save updated data
    await savePlansData(data);
    
    console.log(`Successfully deleted theme: ${id}`);
    
    return NextResponse.json({
      success: true,
      message: `Theme "${deletedTheme.name}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting theme:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to delete theme: ${errorMessage}` }, { status: 500 });
  }
}

// Helper function to save plans data (same as in generate route)
async function savePlansData(plansData: any) {
  const isVercel = process.env.VERCEL === "1";
  const jsonData = JSON.stringify(plansData, null, 2);
  
  if (isVercel) {
    const supabase = createSupabaseAdmin();
    const blob = new Blob([jsonData], { type: "application/json" });
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(CIRCLE_PLANS_FILE, blob, {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      throw new Error(`Failed to save to Supabase: ${error.message}`);
    }
  } else {
    const fs = require("fs");
    const path = require("path");
    const circlePlansPath = path.join(process.cwd(), "data", "circle-plans.json");
    fs.writeFileSync(circlePlansPath, jsonData, "utf-8");
  }
}
