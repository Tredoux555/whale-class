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

  const prompt = `Create a 10-MINUTE PHONICS CIRCLE TIME plan for kindergarten. Letter(s): ${lettersDisplay}

IMPORTANT: Generate ONE UNIQUE GAME per day (5 different games total). Each game must be:
- INNOVATIVE and FUN - children should be excited to play
- SIMPLE to understand - explain in 30 seconds or less
- INCLUSIVE - ALL children participate at the same time
- ACTIVE - involves movement, sounds, or actions
- Focused on the letter SOUND of ${lettersDisplay}

GAME IDEAS TO INSPIRE (adapt these or create similar):
- "Letter Sound Freeze Dance" - dance when music plays, freeze in letter shape when it stops
- "Sound Detective" - find objects/pictures that start with the letter sound
- "Pass the Letter Ball" - pass ball while making letter sound, when music stops that child says a word
- "Letter Sound Simon Says" - "Simon says make the /s/ sound like a snake!"
- "Musical Letter Chairs" - walk around letter cards, when music stops find your letter
- "Sound Sorting Relay" - run to sort pictures by starting sound
- "Letter Body Builders" - work together to make giant letters with bodies

Return ONLY valid JSON (no markdown):

{
  "id": "${letters.join('-').toLowerCase()}-${weekStart}",
  "letters": ${JSON.stringify(letters.map(l => l.toUpperCase()))},
  "weekStart": "${weekStart}",
  "weekEnd": "${weekEnd}",
  "status": "upcoming",
  "color": "#6366f1",
  "description": "Fun week learning the sound of ${lettersDisplay}!",
  "letterSong": {
    "title": "Song name",
    "lyrics": "Full lyrics with letter sound emphasis",
    "actions": "Actions for each line"
  },
  "letterChant": {
    "chant": "Catchy rhythmic chant",
    "rhythm": "Clap pattern description"
  },
  "dailyGames": {
    "monday": {
      "name": "Game name (make it catchy!)",
      "duration": "5-6 min",
      "objective": "What children will learn",
      "materials": "List simple materials (or 'None needed')",
      "setup": "How to prepare (1-2 sentences)",
      "howToPlay": [
        "Step 1: Gather children in a circle...",
        "Step 2: Explain the game...",
        "Step 3: Demonstrate once...",
        "Step 4: Play the game...",
        "Step 5: Celebrate and end..."
      ],
      "teacherScript": "Exact words to say: 'Today we're going to play...'",
      "inclusionTip": "How to help shy or struggling children participate",
      "excitement": "What makes this game FUN for kids"
    },
    "tuesday": {
      "name": "Different game name",
      "duration": "5-6 min",
      "objective": "Learning objective",
      "materials": "Materials list",
      "setup": "Setup instructions",
      "howToPlay": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5..."],
      "teacherScript": "Opening script",
      "inclusionTip": "Inclusion strategy",
      "excitement": "Fun factor"
    },
    "wednesday": {
      "name": "Another unique game",
      "duration": "5-6 min",
      "objective": "Learning objective",
      "materials": "Materials list",
      "setup": "Setup instructions",
      "howToPlay": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5..."],
      "teacherScript": "Opening script",
      "inclusionTip": "Inclusion strategy",
      "excitement": "Fun factor"
    },
    "thursday": {
      "name": "Fourth unique game",
      "duration": "5-6 min",
      "objective": "Learning objective",
      "materials": "Materials list",
      "setup": "Setup instructions",
      "howToPlay": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5..."],
      "teacherScript": "Opening script",
      "inclusionTip": "Inclusion strategy",
      "excitement": "Fun factor"
    },
    "friday": {
      "name": "Friday celebration game",
      "duration": "5-6 min",
      "objective": "Review and celebrate learning",
      "materials": "Materials list",
      "setup": "Setup instructions",
      "howToPlay": ["Step 1...", "Step 2...", "Step 3...", "Step 4...", "Step 5..."],
      "teacherScript": "Opening script",
      "inclusionTip": "Inclusion strategy",
      "excitement": "Fun factor"
    }
  },
  "dailyPlan": {
    "monday": {"focus": "Introduce the letter sound", "game": "monday"},
    "tuesday": {"focus": "Practice hearing the sound", "game": "tuesday"},
    "wednesday": {"focus": "Sound in words", "game": "wednesday"},
    "thursday": {"focus": "Letter formation", "game": "thursday"},
    "friday": {"focus": "Celebrate & review", "game": "friday"}
  },
  "tips": [
    "Tip for teaching ${lettersDisplay}",
    "Common pronunciation help",
    "How to keep all children engaged"
  ],
  "createdAt": "${new Date().toISOString()}"
}

CRITICAL: Each day MUST have a DIFFERENT game. Make games exciting - children should BEG to play again!`;

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

