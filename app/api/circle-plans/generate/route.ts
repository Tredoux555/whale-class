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

  // Create a comprehensive prompt for Claude
  const prompt = `You are an expert kindergarten teacher creating a comprehensive weekly circle time theme plan. Generate a complete theme package in JSON format.

Theme: ${themeName}
Week: ${weekStart} to ${weekEnd}
Age Group: ${ageGroup}${contextInfo}

IMPORTANT: When generating activities, songs, and games, consider:
${classProfile?.classSize ? `- Activities must work well with ${classProfile.classSize} children (group size, materials needed, etc.)` : ""}
${classProfile?.englishLevel ? `- Adjust vocabulary and language complexity for ${classProfile.englishLevel} English level` : ""}
${classProfile?.phonicsGoals ? `- Integrate phonics goals: ${classProfile.phonicsGoals} into songs, games, and activities` : ""}
${classProfile?.learningGoals ? `- Focus on learning goals: ${classProfile.learningGoals}` : ""}
${classProfile?.availableMaterials ? `- Only suggest activities using: ${classProfile.availableMaterials}` : ""}
${classProfile?.previousThemes && classProfile.previousThemes.length > 0 ? `- Build on previous themes (${classProfile.previousThemes.join(", ")}) but introduce new concepts` : ""}
${classProfile?.specialNeeds ? `- Accommodate: ${classProfile.specialNeeds}` : ""}

Generate a complete theme with the following structure (return ONLY valid JSON, no markdown, no code blocks):

{
  "id": "${themeName.toLowerCase().replace(/\s+/g, '-')}-${weekStart}",
  "name": "${themeName}",
  "weekStart": "${weekStart}",
  "weekEnd": "${weekEnd}",
  "status": "upcoming",
  "color": "#4A90E2",
  "emoji": "🎨",
  "description": "A brief, engaging description of the theme (1-2 sentences)",
  "discussionQuestions": [
    "6 age-appropriate discussion questions related to the theme"
  ],
  "songs": [
    {
      "id": "song-1",
      "title": "Song title",
      "type": "song",
      "lyrics": "First verse and chorus lyrics",
      "youtubeUrl": "",
      "notes": "Teaching notes or activity suggestions"
    }
  ],
  "stories": [
    {
      "id": "story-1",
      "title": "Book title",
      "author": "Author name",
      "type": "book",
      "description": "Brief description of the story",
      "amazonUrl": "",
      "notes": "Why this book fits the theme"
    }
  ],
  "games": [
    {
      "id": "game-1",
      "title": "Game name",
      "type": "matching-game",
      "description": "What the game teaches",
      "materials": "List of materials needed",
      "instructions": "How to play",
      "notes": "Age-appropriate notes"
    }
  ],
  "crafts": [
    {
      "id": "craft-1",
      "title": "Craft name",
      "materials": "Detailed materials list",
      "instructions": "Step-by-step instructions (numbered)",
      "notes": "Tips for success"
    }
  ],
  "printables": [
    {
      "id": "print-1",
      "title": "Printable name",
      "type": "coloring",
      "description": "What it's for",
      "notes": "How to use it"
    }
  ],
  "dramaticPlay": [
    {
      "id": "dp-1",
      "title": "Dramatic play setup name",
      "setup": "How to set up the area",
      "roles": "Roles children can play",
      "props": "Props needed",
      "notes": "Learning objectives"
    }
  ],
  "movementActivities": [
    {
      "id": "move-1",
      "title": "Activity name",
      "description": "What children do",
      "examples": "Specific examples",
      "notes": "Benefits"
    }
  ],
  "dailyPlan": {
    "monday": {
      "focus": "Day's learning focus",
      "activities": ["5-6 specific activities for the day"]
    },
    "tuesday": {
      "focus": "Day's learning focus",
      "activities": ["5-6 specific activities"]
    },
    "wednesday": {
      "focus": "Day's learning focus",
      "activities": ["5-6 specific activities"]
    },
    "thursday": {
      "focus": "Day's learning focus",
      "activities": ["5-6 specific activities"]
    },
    "friday": {
      "focus": "Day's learning focus",
      "activities": ["5-6 specific activities"]
    }
  },
  "teacherNotes": "",
  "createdAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}"
}

Requirements:
- Include 3-5 songs (popular children's songs related to the theme - leave youtubeUrl as empty string)
- Include 3-4 age-appropriate books with real author names (leave amazonUrl as empty string)
- Include 4-5 games that are hands-on and educational
- Include 3-5 crafts with simple materials (paper, glue, crayons, etc.)
- Include 2-3 printables (coloring pages, worksheets, etc.)
- Include 2-3 dramatic play setups
- Include 3-4 movement activities
- Create a logical 5-day progression that builds on the theme
- All content must be age-appropriate for ${ageGroup}
- Make it engaging, educational, and fun!
- IMPORTANT: Leave all URL fields (youtubeUrl, amazonUrl) as empty strings

Return ONLY the JSON object, no other text.`;

  // Use the best available Claude model (Claude Sonnet 4)
  // Create AbortController for timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000); // 50 second timeout

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 6000, // Reduced from 8000 to speed up generation
        system: "You are an expert early childhood educator creating educational lesson plans for kindergarten teachers. Generate age-appropriate, educational, and safe content for young children. Do not generate any URLs - leave URL fields as empty strings.",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Anthropic API error: ${response.status}`, errorText);
      throw new Error(`Anthropic API error: ${response.status} ${errorText}`);
    }

    // Process the response - read as text first so we can log it if parsing fails
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

    // Extract JSON from response (handle cases where Claude adds markdown)
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

    // Parse the JSON with better error handling
    let theme;
    try {
      theme = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("JSON parse error. Content was:", jsonText.substring(0, 500));
      throw new Error(`Failed to parse JSON response: ${parseError instanceof Error ? parseError.message : String(parseError)}. Response preview: ${jsonText.substring(0, 200)}`);
    }

    // Validate and set proper emoji based on theme
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
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timeout: The AI generation took too long. Please try again with a simpler theme.");
    }
    throw error;
  }
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
    
    return NextResponse.json(
      { 
        error: `Failed to generate theme: ${errorMessage}`,
        details: process.env.NODE_ENV === "development" ? errorMessage : undefined
      },
      { status: 500 }
    );
  }
}
