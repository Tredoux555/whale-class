import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase";

export const runtime = 'nodejs';
export const maxDuration = 60;

const PHONICS_PLANS_FILE = "phonics-plans.json";

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
        return { plans: [] };
      }

      if (!data) return { plans: [] };
      const text = await data.text();
      return JSON.parse(text);
    } catch (error) {
      return { plans: [] };
    }
  } else {
    const fs = require("fs");
    const path = require("path");
    const phonicsPath = path.join(process.cwd(), "data", "phonics-plans.json");
    try {
      const data = fs.readFileSync(phonicsPath, "utf-8");
      return JSON.parse(data);
    } catch {
      return { plans: [] };
    }
  }
}

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

    if (error) throw new Error(`Failed to save: ${error.message}`);
  } else {
    const fs = require("fs");
    const path = require("path");
    const phonicsPath = path.join(process.cwd(), "data", "phonics-plans.json");
    fs.writeFileSync(phonicsPath, jsonData, "utf-8");
  }
}

async function generatePhonicsWithAI(letters: string[], weekStart: string, weekEnd: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const letterCount = letters.length;
  const lettersDisplay = letters.join(", ").toUpperCase();

  const prompt = `Create a 10-MINUTE PHONICS CIRCLE TIME plan for kindergarten focused on teaching ${letterCount === 1 ? "the letter" : "the letters"}: ${lettersDisplay}

This is a SHORT 10-minute phonics session, NOT a full lesson. Focus on FUN, ENGAGING activities.

Return ONLY valid JSON (no markdown):

{
  "id": "${letters.join('-').toLowerCase()}-${weekStart}",
  "letters": ${JSON.stringify(letters.map(l => l.toUpperCase()))},
  "weekStart": "${weekStart}",
  "weekEnd": "${weekEnd}",
  "status": "upcoming",
  "color": "#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}",
  "description": "Brief fun description for learning ${lettersDisplay}",
  "letterSong": {
    "title": "Song name for ${lettersDisplay}",
    "lyrics": "Short catchy lyrics focusing on the letter sound(s)",
    "actions": "Hand movements or body actions to do while singing"
  },
  "warmUp": {
    "name": "Quick warm-up activity name",
    "duration": "1-2 min",
    "instructions": "How to do this quick warm-up"
  },
  "mainGame": {
    "name": "Main game name",
    "duration": "5-6 min",
    "description": "What makes this game fun",
    "materials": "Simple materials needed",
    "howToPlay": "Step-by-step instructions",
    "variations": "Ways to make it easier or harder"
  },
  "quickActivities": [
    {
      "name": "Activity name",
      "duration": "2 min",
      "description": "Quick fun activity",
      "type": "movement|flashcard|call-response|sorting"
    }
  ],
  "letterChant": {
    "chant": "Short rhythmic chant for ${lettersDisplay}",
    "rhythm": "Clapping or stomping pattern"
  },
  "dailyPlan": {
    "monday": {"focus": "Introduce ${letters[0]?.toUpperCase() || lettersDisplay}", "activities": ["Warm-up (2 min)", "Letter song (2 min)", "Main game (5 min)", "Closing chant (1 min)"]},
    "tuesday": {"focus": "Practice sounds", "activities": ["Sound warm-up (2 min)", "Flashcard activity (3 min)", "Game variation (4 min)", "Chant (1 min)"]},
    "wednesday": {"focus": "Letter recognition", "activities": ["Movement warm-up (2 min)", "Sorting game (5 min)", "Letter song (2 min)", "Closing (1 min)"]},
    "thursday": {"focus": "Writing/tracing", "activities": ["Air writing (2 min)", "Body letters (3 min)", "Game (4 min)", "Chant (1 min)"]},
    "friday": {"focus": "Review & celebrate", "activities": ["Favorite song (2 min)", "Letter hunt game (5 min)", "Show what we learned (2 min)", "Celebration chant (1 min)"]}
  },
  "tips": [
    "Teaching tip 1 for these letters",
    "Teaching tip 2",
    "Common mistakes to avoid"
  ],
  "createdAt": "${new Date().toISOString()}"
}

Requirements:
- Games must be appropriate for ${letterCount} letter(s)
- Include 2-3 quick activities
- All activities should be ACTIVE and FUN (not worksheets)
- Focus on letter SOUNDS, not just names
- Games should work for a group of 10-20 children
- Keep it to 10 minutes total per day`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API error: ${response.status} ${errorText}`);
  }

  const responseText = await response.text();
  const data = JSON.parse(responseText);

  if (!data.content?.[0]?.text) {
    throw new Error("Invalid API response");
  }

  let jsonText = data.content[0].text.trim();
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  return JSON.parse(jsonText);
}

export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { letters, weekStart, weekEnd } = body;

    if (!letters || !Array.isArray(letters) || letters.length === 0) {
      return NextResponse.json({ error: "At least one letter is required" }, { status: 400 });
    }

    if (letters.length > 3) {
      return NextResponse.json({ error: "Maximum 3 letters allowed" }, { status: 400 });
    }

    if (!weekStart || !weekEnd) {
      return NextResponse.json({ error: "Week dates are required" }, { status: 400 });
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    console.log(`Generating phonics plan for: ${letters.join(", ")}`);
    const newPlan = await generatePhonicsWithAI(letters, weekStart, weekEnd);

    const phonicsData = await readPhonicsData();
    phonicsData.plans.unshift(newPlan);
    await savePhonicsData(phonicsData);

    return NextResponse.json({
      success: true,
      plan: newPlan,
      message: `Phonics plan for "${letters.join(", ")}" generated!`,
    });
  } catch (error) {
    console.error("Error generating phonics plan:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: `Failed to generate: ${errorMessage}` }, { status: 500 });
  }
}

