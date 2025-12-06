import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
// Import JSON directly - Next.js will bundle it efficiently
import circlePlansData from "@/data/circle-plans.json";

// Configure route for Vercel
export const runtime = 'nodejs';
export const maxDuration = 10;

// Simple function to get plans data
function readPlansData() {
  return circlePlansData;
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
    const data = readPlansData();
    
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

    const data = readPlansData();
    const index = data.themes.findIndex((t: any) => t.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: "Theme not found" }, { status: 404 });
    }
    
    // Data is read-only - all deletions require git commits
    return NextResponse.json(
      { 
        error: "Cannot delete themes. Data is read-only. Please remove from lib/circle-plans-data.ts and commit to git.",
        requiresGitCommit: true
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error deleting theme:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to delete theme: ${errorMessage}` }, { status: 500 });
  }
}
