import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

// Configure route for Vercel
export const runtime = 'nodejs';
export const maxDuration = 10;

const PHONICS_PLANS_FILE = "phonics-plans.json";

// Get phonics plans data
async function readPhonicsData() {
  const isVercel = process.env.VERCEL === "1";
  
  if (isVercel) {
    try {
      const supabase = createSupabaseAdmin();
      const { data, error } = await supabase.storage
        .from(STORAGE_BUCKET)
        .download(PHONICS_PLANS_FILE);

      if (error) {
        if (error.message.includes("not found") || error.message.includes("404")) {
          return { plans: [] };
        }
        console.error("Error reading phonics plans:", error.message);
        return { plans: [] };
      }

      if (!data) {
        return { plans: [] };
      }

      const text = await data.text();
      return JSON.parse(text);
    } catch (error) {
      console.error("Error getting phonics plans:", error);
      return { plans: [] };
    }
  } else {
    const fs = require("fs");
    const path = require("path");
    const phonicsPath = path.join(process.cwd(), "data", "phonics-plans.json");
    
    try {
      const data = fs.readFileSync(phonicsPath, "utf-8");
      return JSON.parse(data);
    } catch (error) {
      return { plans: [] };
    }
  }
}

// Save phonics plans data
async function savePhonicsData(phonicsData: any) {
  const isVercel = process.env.VERCEL === "1";
  const jsonData = JSON.stringify(phonicsData, null, 2);
  
  if (isVercel) {
    const supabase = createSupabaseAdmin();
    const blob = new Blob([jsonData], { type: "application/json" });
    
    const { error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(PHONICS_PLANS_FILE, blob, {
        upsert: true,
        contentType: "application/json",
      });

    if (error) {
      throw new Error(`Failed to save: ${error.message}`);
    }
  } else {
    const fs = require("fs");
    const path = require("path");
    const phonicsPath = path.join(process.cwd(), "data", "phonics-plans.json");
    fs.writeFileSync(phonicsPath, jsonData, "utf-8");
  }
}

// GET - Fetch all phonics plans
export async function GET() {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await readPhonicsData();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching phonics plans:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

// DELETE - Delete phonics plan
export async function DELETE(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    
    if (!id) {
      return NextResponse.json({ error: "Plan ID required" }, { status: 400 });
    }

    const data = await readPhonicsData();
    const index = data.plans.findIndex((p: any) => p.id === id);
    
    if (index === -1) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    
    const deletedPlan = data.plans[index];
    data.plans.splice(index, 1);
    
    await savePhonicsData(data);
    
    return NextResponse.json({
      success: true,
      message: `Phonics plan for "${deletedPlan.letters.join(', ')}" deleted successfully`,
    });
  } catch (error) {
    console.error("Error deleting phonics plan:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}

