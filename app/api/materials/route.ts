import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

const MATERIALS_FILE = "materials.json";

// Get materials data
async function readMaterialsData() {
  const isVercel = process.env.VERCEL === "1";

  if (isVercel) {
    try {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(MATERIALS_FILE);

      if (error) {
        if (error.message.includes("not found") || error.message.includes("404")) {
          return { materials: [], categories: [] };
        }
        return { materials: [], categories: [] };
      }

      if (!data) return { materials: [], categories: [] };
      const text = await data.text();
      return JSON.parse(text);
    } catch (error) {
      return { materials: [], categories: [] };
    }
  } else {
    const fs = require("fs");
    const path = require("path");
    const materialsPath = path.join(process.cwd(), "data", "materials.json");
    try {
      const data = fs.readFileSync(materialsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return { materials: [], categories: [] };
    }
  }
}

// Save materials data
async function saveMaterialsData(data: any) {
  const isVercel = process.env.VERCEL === "1";
  const jsonData = JSON.stringify(data, null, 2);

  if (isVercel) {
    const supabase = createSupabaseAdmin();
    const blob = new Blob([jsonData], { type: "application/json" });

    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(MATERIALS_FILE, blob, {
        upsert: true,
        contentType: "application/json",
      });

    if (error) throw new Error(`Failed to save: ${error.message}`);
  } else {
    const fs = require("fs");
    const path = require("path");
    const materialsPath = path.join(process.cwd(), "data", "materials.json");
    fs.writeFileSync(materialsPath, jsonData, "utf-8");
  }
}

// GET - Fetch all materials and categories
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readMaterialsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching materials:", error);
    return NextResponse.json({ error: "Failed to fetch materials" }, { status: 500 });
  }
}

// POST - Create new material
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const material = await request.json();
    const data = await readMaterialsData();

    // Add ID if not provided
    if (!material.id) {
      material.id = crypto.randomUUID();
    }

    // Set timestamps
    material.createdAt = new Date().toISOString();
    material.updatedAt = new Date().toISOString();

    data.materials.push(material);
    await saveMaterialsData(data);

    return NextResponse.json({ success: true, material });
  } catch (error) {
    console.error("Error creating material:", error);
    return NextResponse.json({ error: "Failed to create material" }, { status: 500 });
  }
}

// PUT - Update material or category
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data = await readMaterialsData();

    // Update categories
    if (body.categories !== undefined) {
      data.categories = body.categories;
      await saveMaterialsData(data);
      return NextResponse.json({ success: true, categories: data.categories });
    }

    // Update material
    if (body.id && body.material) {
      const index = data.materials.findIndex((m: any) => m.id === body.id);
      if (index === -1) {
        return NextResponse.json({ error: "Material not found" }, { status: 404 });
      }

      data.materials[index] = { ...body.material, updatedAt: new Date().toISOString() };
      await saveMaterialsData(data);
      return NextResponse.json({ success: true, material: data.materials[index] });
    }

    return NextResponse.json({ error: "Invalid update request" }, { status: 400 });
  } catch (error) {
    console.error("Error updating material:", error);
    return NextResponse.json({ error: "Failed to update material" }, { status: 500 });
  }
}

// DELETE - Delete material
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Material ID required" }, { status: 400 });
    }

    const data = await readMaterialsData();
    const index = data.materials.findIndex((m: any) => m.id === id);

    if (index === -1) {
      return NextResponse.json({ error: "Material not found" }, { status: 404 });
    }

    const deletedMaterial = data.materials[index];
    data.materials.splice(index, 1);
    await saveMaterialsData(data);

    return NextResponse.json({
      success: true,
      message: `Material "${deletedMaterial.title}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting material:", error);
    return NextResponse.json({ error: "Failed to delete material" }, { status: 500 });
  }
}
