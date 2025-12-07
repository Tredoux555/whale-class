import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/auth";
import { createSupabaseAdmin, STORAGE_BUCKET, CIRCLE_PLANS_FILE } from "@/lib/supabase";

// Configure route for Vercel
export const runtime = 'nodejs';
export const maxDuration = 60; // AI generation can take 30-60 seconds

// Helper function to read plans data (same as in route.ts)
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
    // Save to Supabase Storage
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
    // Save to local filesystem
    const fs = require("fs");
    const path = require("path");
    const circlePlansPath = path.join(process.cwd(), "data", "circle-plans.json");
    fs.writeFileSync(circlePlansPath, jsonData, "utf-8");
  }
}

// Generate theme using Anthropic Claude API
async function generateThemeWithAI(
  themeName: string, 
  weekStart: string, 
  weekEnd: string, 
  ageGroup: string = "kindergarten",
  classProfile?: {
    classSize?: number;
    englishLevel?: string;
    phonicsGoals?: string;
    learningGoals?: string;
    availableMaterials?: string;
    previousThemes?: string[];
    specialNeeds?: string;
  }
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is not set. Please add it to your Vercel project settings.");
  }

  // Build context string from class profile
  let contextInfo = "";
  if (classProfile) {
    contextInfo = "\n\nCLASS PROFILE:\n";
    if (classProfile.classSize) contextInfo += `- Class Size: ${classProfile.classSize} children\n`;
    if (classProfile.englishLevel) contextInfo += `- English Level: ${classProfile.englishLevel}\n`;
    if (classProfile.phonicsGoals) contextInfo += `- Phonics Goals: ${classProfile.phonicsGoals}\n`;
    if (classProfile.learningGoals) contextInfo += `- Learning Goals: ${classProfile.learningGoals}\n`;
    if (classProfile.availableMaterials) contextInfo += `- Available Materials: ${classProfile.availableMaterials}\n`;
    if (classProfile.previousThemes && classProfile.previousThemes.length > 0) {
      contextInfo += `- Previous Themes: ${classProfile.previousThemes.join(", ")}\n`;
    }
    if (classProfile.specialNeeds) contextInfo += `- Special Considerations: ${classProfile.specialNeeds}\n`;
  }

  // Create prompt for 30-minute circle time theme
  const prompt = `Create a weekly 30-MINUTE CIRCLE TIME theme plan for kindergarten. This is NOT a full school day - just a focused 30-min circle time session each day.

Theme: ${themeName}
Week: ${weekStart} to ${weekEnd}
Age: ${ageGroup}${contextInfo}

Return ONLY valid JSON (no markdown, no code blocks):

{
  "id": "${themeName.toLowerCase().replace(/\s+/g, '-')}-${weekStart}",
  "name": "${themeName}",
  "weekStart": "${weekStart}",
  "weekEnd": "${weekEnd}",
  "status": "upcoming",
  "color": "#4A90E2",
  "emoji": "🎄",
  "description": "Brief engaging description",
  "discussionQuestions": ["4 simple questions for circle time"],
  "songs": [
    {"id": "song-1", "title": "Song name", "type": "song", "lyrics": "Full lyrics or verse", "youtubeUrl": "", "notes": "Actions/movements to do"}
  ],
  "stories": [
    {"id": "story-1", "title": "Book title", "author": "Author name", "type": "book", "description": "What happens in story", "amazonUrl": "", "notes": "Discussion points"}
  ],
  "games": [
    {"id": "game-1", "title": "Game name", "type": "circle-game", "description": "Learning objective", "materials": "What you need", "instructions": "Step-by-step how to play", "notes": "Variations"}
  ],
  "crafts": [
    {"id": "craft-1", "title": "Craft name", "materials": "Materials list", "instructions": "Numbered steps", "notes": "Tips"}
  ],
  "printables": [
    {"id": "print-1", "title": "Printable name", "type": "flashcards", "description": "What it shows", "notes": "How to use in circle"}
  ],
  "dramaticPlay": [
    {"id": "dp-1", "title": "Role play idea", "setup": "Quick setup", "roles": "Who children pretend to be", "props": "Simple props", "notes": "Learning focus"}
  ],
  "movementActivities": [
    {"id": "move-1", "title": "Movement name", "description": "What children do", "examples": "Specific actions", "notes": "When to use"}
  ],
  "dailyPlan": {
    "monday": {"focus": "Day's theme focus", "activities": ["Welcome song (2 min)", "Discussion question (5 min)", "Story time (10 min)", "Movement activity (5 min)", "Closing song (3 min)"]},
    "tuesday": {"focus": "Day's theme focus", "activities": ["Opening song (2 min)", "Flashcard activity (5 min)", "Circle game (10 min)", "Story (8 min)", "Goodbye song (3 min)"]},
    "wednesday": {"focus": "Day's theme focus", "activities": ["Theme song (3 min)", "Discussion (5 min)", "Movement game (8 min)", "Craft intro (10 min)", "Closing (2 min)"]},
    "thursday": {"focus": "Day's theme focus", "activities": ["Welcome (2 min)", "Story retell (8 min)", "Role play (10 min)", "Song with actions (5 min)", "Wrap up (3 min)"]},
    "friday": {"focus": "Celebration/review", "activities": ["Favorite song (3 min)", "Week review game (10 min)", "Share craft/work (8 min)", "Movement celebration (5 min)", "Goodbye song (2 min)"]}
  },
  "teacherNotes": "",
  "createdAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}"
}

Include: 3 songs with lyrics, 2 stories, 3 games with detailed instructions, 2 crafts, 2 printables (flashcards/visual aids), 1 dramatic play, 2 movement activities.
Each daily plan = 30 minutes total. Leave URLs as empty strings "".`;

  // Use Claude Sonnet 4 for best quality
  // Add timeout to prevent hanging when API is unreachable
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  let response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 5000,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });
    clearTimeout(timeoutId);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error("AI generation timed out after 30 seconds. The Anthropic API may be unreachable. Please try again or check your connection.");
    }
    if (error instanceof Error && error.message.includes('fetch')) {
      throw new Error("Unable to reach AI service. Please check your internet connection or try again later.");
    }
    throw error;
  }

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Anthropic API error: ${response.status}`, errorText);
    throw new Error(`AI generation failed: ${response.status}. Please try again.`);
  }

  // Process the response
  const responseText = await response.text();
  let data;
  try {
    data = JSON.parse(responseText);
  } catch (error) {
    console.error("Failed to parse Anthropic response as JSON:", error);
    console.error("Response text:", responseText.substring(0, 1000));
    throw new Error(`Failed to parse API response: ${error instanceof Error ? error.message : String(error)}`);
  }

  // Check if response has content
  if (!data.content || !Array.isArray(data.content) || data.content.length === 0) {
    console.error("Invalid response structure:", JSON.stringify(data, null, 2));
    throw new Error("Invalid response from Anthropic API: missing content");
  }

  const content = data.content[0];
  if (!content || content.type !== "text" || !content.text) {
    console.error("Invalid content structure:", JSON.stringify(content, null, 2));
    throw new Error("Invalid response from Anthropic API: missing text content");
  }

  // Extract JSON from response
  let jsonText = content.text.trim();
  
  if (!jsonText) {
    throw new Error("Empty response from Anthropic API");
  }
  
  // Remove markdown code blocks if present
  if (jsonText.startsWith("```json")) {
    jsonText = jsonText.replace(/^```json\n?/, "").replace(/\n?```$/, "");
  } else if (jsonText.startsWith("```")) {
    jsonText = jsonText.replace(/^```\n?/, "").replace(/\n?```$/, "");
  }

  // Parse the JSON
  let theme;
  try {
    theme = JSON.parse(jsonText);
  } catch (parseError) {
    console.error("JSON parse error. Content was:", jsonText.substring(0, 500));
    throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}`);
  }

  // Set proper emoji based on theme
  const emojiMap: Record<string, string> = {
    "ocean": "🌊",
    "animals": "🐾",
    "space": "🚀",
    "farm": "🚜",
    "jungle": "🦁",
    "dinosaurs": "🦕",
    "transportation": "🚗",
    "weather": "☁️",
    "seasons": "🍂",
    "food": "🍎",
    "family": "👨‍👩‍👧",
    "friends": "👫",
    "colors": "🌈",
    "shapes": "🔷",
    "numbers": "🔢",
    "letters": "🔤",
    "christmas": "🎄",
    "halloween": "🎃",
    "easter": "🐰",
    "valentine": "💝",
  };

  // Try to find matching emoji
  const themeLower = themeName.toLowerCase();
  for (const [key, emoji] of Object.entries(emojiMap)) {
    if (themeLower.includes(key)) {
      theme.emoji = emoji;
      break;
    }
  }

  // If no match, use a default
  if (!theme.emoji || theme.emoji === "🎨") {
    theme.emoji = "📚";
  }

  return theme;
}

// POST - Generate new theme using AI
export async function POST(request: NextRequest) {
  try {
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { themeName, weekStart, weekEnd, ageGroup, classProfile } = body;

    if (!themeName || !weekStart || !weekEnd) {
      return NextResponse.json(
        { error: "Theme name, week start, and week end are required" },
        { status: 400 }
      );
    }

    // Get existing settings/class profile from plans data
    const plansData = await readPlansData();
    const settings = plansData.settings || {};
    const existingThemes = plansData.themes || [];
    
    // Merge provided classProfile with existing settings
    const mergedClassProfile = {
      classSize: classProfile?.classSize || settings.classSize,
      englishLevel: classProfile?.englishLevel || settings.englishLevel,
      phonicsGoals: classProfile?.phonicsGoals || settings.phonicsGoals,
      learningGoals: classProfile?.learningGoals || settings.learningGoals,
      availableMaterials: classProfile?.availableMaterials || settings.availableMaterials,
      previousThemes: classProfile?.previousThemes || existingThemes.map((t: any) => t.name).slice(0, 5),
      specialNeeds: classProfile?.specialNeeds || settings.specialNeeds,
    };

    // Check if API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { 
          error: "ANTHROPIC_API_KEY is not configured. Please add it to your Vercel project settings.",
          requiresApiKey: true
        },
        { status: 500 }
      );
    }

    // Generate theme with AI
    console.log(`Generating theme: ${themeName} for ${weekStart} to ${weekEnd} with class profile:`, mergedClassProfile);
    const newTheme = await generateThemeWithAI(
      themeName, 
      weekStart, 
      weekEnd, 
      ageGroup || "kindergarten",
      mergedClassProfile
    );

    // Read existing plans (already loaded above)

    // Add new theme to the beginning of the array
    plansData.themes.unshift(newTheme);

    // Save updated plans
    await savePlansData(plansData);

    console.log(`Successfully generated and saved theme: ${newTheme.id}`);

    return NextResponse.json({
      success: true,
      theme: newTheme,
      message: `Theme "${themeName}" generated successfully!`,
    });
  } catch (error) {
    console.error("Error generating theme:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    
    // Provide user-friendly error messages
    let userMessage = "Failed to generate theme";
    if (errorMessage.includes("timed out") || errorMessage.includes("timeout")) {
      userMessage = "AI generation timed out. The service may be unreachable. Please try again or use a VPN if needed.";
    } else if (errorMessage.includes("Unable to reach") || errorMessage.includes("connection")) {
      userMessage = "Unable to reach AI service. Please check your internet connection or try again later.";
    } else if (errorMessage.includes("ANTHROPIC_API_KEY")) {
      userMessage = errorMessage; // Keep API key errors as-is
    } else {
      userMessage = `Failed to generate theme: ${errorMessage}`;
    }
    
    return NextResponse.json(
      { 
        error: userMessage,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
