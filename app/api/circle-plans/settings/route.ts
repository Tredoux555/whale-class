import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET, CIRCLE_PLANS_FILE } from "@/lib/supabase";

// Configure route for Vercel
export const runtime = 'nodejs';
export const maxDuration = 10;

// Helper function to read plans data
async function readPlansData() {
  const isVercel = process.env.VERCEL === "1";
  
  if (isVercel) {
    try {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(CIRCLE_PLANS_FILE);

      if (error) {
        if (error.message.includes("not found") || error.message.includes("404")) {
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

// Helper function to save plans data
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

// PUT - Update settings/class profile
export async function PUT(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { settings } = body;

    if (!settings) {
      return NextResponse.json({ error: "Settings object required" }, { status: 400 });
    }

    // Read existing data
    const plansData = await readPlansData();

    // Update settings
    plansData.settings = {
      ...plansData.settings,
      ...settings,
    };

    // Save updated data
    await savePlansData(plansData);

    return NextResponse.json({
      success: true,
      settings: plansData.settings,
      message: "Class profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating settings:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to update settings: ${errorMessage}` }, { status: 500 });
  }
}

// GET - Get current settings
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readPlansData();
    return NextResponse.json({
      settings: data.settings || { circleDuration: 20, ageGroup: "kindergarten", classSize: 15 },
    });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

















