import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import fs from "fs";
import path from "path";
// Import data from TypeScript constant - always available, no filesystem issues
import { circlePlansData as circlePlansDataModule } from "@/lib/circle-plans-data";

const dataFilePath = path.join(process.cwd(), "data", "circle-plans.json");
const isVercel = process.env.VERCEL === "1";

// Cache the data to avoid repeated file reads
let circlePlansDataCache: any = null;

function readPlansData() {
  // Return cached data if available
  if (circlePlansDataCache) {
    return circlePlansDataCache;
  }

  try {
    if (isVercel) {
      // On Vercel: Use imported module (bundled with code, always available)
      circlePlansDataCache = circlePlansDataModule;
      return circlePlansDataCache;
    } else {
      // On localhost: Try filesystem read first (allows runtime updates during development)
      try {
        const data = fs.readFileSync(dataFilePath, "utf-8");
        circlePlansDataCache = JSON.parse(data);
        return circlePlansDataCache;
      } catch (fsError) {
        // Fallback to imported module if filesystem read fails
        console.warn("Filesystem read failed, using imported module:", fsError);
        circlePlansDataCache = circlePlansDataModule;
        return circlePlansDataCache;
      }
    }
  } catch (error) {
    console.error("Error reading circle plans data:", error);
    // Return default structure if all else fails
    const defaultData = { themes: [], settings: { circleDuration: 20, ageGroup: "kindergarten", classSize: 15 } };
    circlePlansDataCache = defaultData;
    return defaultData;
  }
}

function writePlansData(data: any) {
  if (isVercel) {
    // On Vercel, filesystem is read-only
    // Data changes need to be committed to git and redeployed
    console.warn("Cannot write to filesystem on Vercel. Changes must be made via git commits.");
    throw new Error("Filesystem is read-only on Vercel. Please make changes locally and commit to git.");
  }
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing circle plans data:", error);
    throw error;
  }
}

// GET - Fetch all lesson plans
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = readPlansData();
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

    if (isVercel) {
      return NextResponse.json(
        { 
          error: "Cannot create themes on Vercel. Filesystem is read-only. Please add themes locally and commit to git.",
          requiresGitCommit: true
        },
        { status: 400 }
      );
    }

    const newTheme = await request.json();
    const data = readPlansData();
    
    // Generate ID if not provided
    if (!newTheme.id) {
      newTheme.id = `${newTheme.name?.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    }
    
    newTheme.createdAt = new Date().toISOString();
    newTheme.updatedAt = new Date().toISOString();
    
    data.themes.push(newTheme);
    writePlansData(data);

    return NextResponse.json({ success: true, theme: newTheme });
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
    const data = readPlansData();
    
    const index = data.themes.findIndex((t: any) => t.id === updatedTheme.id);
    if (index === -1) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    
    // On Vercel, allow teacher notes updates (stored in memory/session) but warn about other changes
    if (isVercel && Object.keys(updatedTheme).some(key => key !== 'teacherNotes' && key !== 'id')) {
      return NextResponse.json(
        { 
          error: "Cannot update theme data on Vercel. Filesystem is read-only. Please make changes locally and commit to git.",
          requiresGitCommit: true,
          note: "Teacher notes can be updated (stored separately)"
        },
        { status: 400 }
      );
    }
    
    updatedTheme.updatedAt = new Date().toISOString();
    data.themes[index] = { ...data.themes[index], ...updatedTheme };
    
    try {
      writePlansData(data);
    } catch (writeError) {
      // On Vercel, teacher notes updates are allowed but won't persist
      if (isVercel && Object.keys(updatedTheme).every(key => key === 'teacherNotes' || key === 'id')) {
        // Return success but note that it won't persist
        return NextResponse.json({ 
          success: true, 
          theme: data.themes[index],
          warning: "Note: Changes won't persist on Vercel. Please update locally and commit to git."
        });
      }
      throw writeError;
    }

    return NextResponse.json({ success: true, theme: data.themes[index] });
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

    if (isVercel) {
      return NextResponse.json(
        { 
          error: "Cannot delete themes on Vercel. Filesystem is read-only. Please remove themes locally and commit to git.",
          requiresGitCommit: true
        },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Theme ID required" }, { status: 400 });
    }

    const data = readPlansData();
    const index = data.themes.findIndex((t: any) => t.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    
    data.themes.splice(index, 1);
    writePlansData(data);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting theme:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to delete theme: ${errorMessage}` }, { status: 500 });
  }
}
