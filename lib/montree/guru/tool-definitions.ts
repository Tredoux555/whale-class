// lib/montree/guru/tool-definitions.ts
// Anthropic tool-use definitions for Guru-driven home system
// 9 action tools + 3 curriculum read-only tools + 1 custom work tool + 2 classroom tools + 1 area analytics tool + 3 daily activity tools = 19 total

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

// Mode-based tool injection: only send tools the model needs for the current conversation mode.
// NORMAL mode (80%+ of calls) drops 8 niche tools → saves ~1,600 tokens (~8% of total input).
// Each tool definition averages ~200 tokens in the API payload.

type GuruMode = 'SETUP' | 'INTAKE' | 'CHECKIN' | 'REFLECTION' | 'NORMAL';

// Tool name → which modes it's available in. Missing = available in ALL tool-enabled modes.
const MODE_TOOL_MAP: Record<string, GuruMode[]> = {
  // Profile tools: only during intake/checkin when gathering info
  save_child_profile:        ['INTAKE', 'SETUP'],
  save_developmental_insight: ['CHECKIN', 'NORMAL'],
  track_guidance_outcome:     ['CHECKIN'],
  save_checkin:               ['CHECKIN'],

  // Custom work creation: only during setup or when explicitly building shelf
  add_curriculum_work:        ['SETUP', 'NORMAL'],

  // Classroom-wide tools: only in whole-class mode (injected separately)
  get_classroom_overview:     [],  // empty = never auto-included, only via wholeClass flag
  group_students:             [],
  get_classroom_media_summary: [],
};

// Tool names that are ONLY injected in whole-class mode
const WHOLE_CLASS_ONLY_TOOLS = new Set([
  'get_classroom_overview',
  'group_students',
  'get_classroom_media_summary',
]);

/**
 * Returns the subset of GURU_TOOLS appropriate for the current mode.
 * NORMAL mode (80%+ of calls): ~11 tools instead of 19 → saves ~1,600 tokens.
 * Whole-class mode adds 3 classroom-wide tools on top.
 */
export function getToolsForMode(mode: GuruMode, isWholeClass: boolean): Tool[] {
  if (mode === 'REFLECTION') return []; // Reflection = pure conversation

  return GURU_TOOLS.filter(tool => {
    const name = tool.name;

    // Whole-class-only tools: include only when isWholeClass
    if (WHOLE_CLASS_ONLY_TOOLS.has(name)) {
      return isWholeClass;
    }

    // Check mode-specific restrictions
    const allowedModes = MODE_TOOL_MAP[name];
    if (allowedModes === undefined) return true; // No restriction → always included
    return allowedModes.includes(mode);
  });
}

export const GURU_TOOLS: Tool[] = [
  {
    name: "set_focus_work",
    description: "MANDATORY: You MUST call this tool whenever you recommend a work for the child's shelf. Do NOT suggest works verbally without calling this tool — every recommendation MUST be accompanied by a set_focus_work call in the SAME response. Set the focus work for one Montessori area on the child's shelf. Replaces any existing work for that area (upsert). Call once per area. The shelf holds exactly 5 works max (one per area: practical_life, sensorial, mathematics, language, cultural). If recommending works for multiple areas, call this tool once for EACH area.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"],
          description: "The Montessori area"
        },
        work_name: {
          type: "string",
          description: "Exact name of the work from the curriculum (e.g. 'Pink Tower', 'Pouring (dry)')"
        },
        reason: {
          type: "string",
          description: "Brief explanation of WHY this work was chosen for this child right now (e.g. 'Ready for next step after mastering Brown Stair — builds on dimension discrimination'). This is shown to the parent on the shelf."
        },
        target_child_id: {
          type: "string",
          description: "Optional: set a DIFFERENT child's shelf (must be in the same classroom). Use when doing batch shelf updates across multiple students via get_classroom_overview. Omit to target the current child."
        },
        student_name: {
          type: "string",
          description: "Required in whole-class mode: the student's name (e.g. 'Joey'). The system resolves this to the correct student ID."
        }
      },
      required: ["area", "work_name"]
    }
  },
  {
    name: "clear_focus_work",
    description: "Remove the focus work from a specific area (empty that shelf slot). Use when the child should take a break from an area.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"]
        },
        target_child_id: {
          type: "string",
          description: "Optional: clear a DIFFERENT child's shelf slot (must be in same classroom). Omit for current child."
        },
        student_name: {
          type: "string",
          description: "Required in whole-class mode: the student's name (e.g. 'Joey'). The system resolves this to the correct student ID."
        }
      },
      required: ["area"]
    }
  },
  {
    name: "update_progress",
    description: "Update a work's progress status. Use after check-ins when the parent reports how the child engaged. Status flow: not_started → presented → practicing → mastered.",
    input_schema: {
      type: "object" as const,
      properties: {
        work_name: { type: "string", description: "Exact work name" },
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"],
          description: "The Montessori area this work belongs to"
        },
        status: {
          type: "string",
          enum: ["not_started", "presented", "practicing", "mastered"]
        },
        notes: { type: "string", description: "Optional notes about this update" },
        target_child_id: {
          type: "string",
          description: "Optional: update a DIFFERENT child's progress (must be in same classroom). Omit for current child."
        },
        student_name: {
          type: "string",
          description: "Required in whole-class mode: the student's name (e.g. 'Joey'). The system resolves this to the correct student ID."
        }
      },
      required: ["work_name", "area", "status"]
    }
  },
  {
    name: "save_observation",
    description: "Save a behavioral observation with emotional and temporal context. Use when the parent describes something notable — include as much context as possible to help detect patterns later.",
    input_schema: {
      type: "object" as const,
      properties: {
        behavior_description: { type: "string", description: "What was observed" },
        behavior_function: {
          type: "string",
          enum: ["attention", "escape", "sensory", "tangible", "unknown"]
        },
        activity_during: { type: "string", description: "What activity was happening" },
        emotional_state: {
          type: "string",
          enum: ["calm", "excited", "frustrated", "overwhelmed", "tired", "energized", "anxious", "happy"],
          description: "Child's emotional state during the behavior"
        },
        preceding_activity: {
          type: "string",
          description: "What happened right before this behavior (e.g., 'just mastered Pink Tower', 'transition from lunch')"
        },
        time_of_day: {
          type: "string",
          enum: ["morning", "midday", "afternoon", "evening"],
          description: "When this happened"
        },
        possible_triggers: {
          type: "array",
          items: { type: "string" },
          description: "What might have caused this (e.g., 'understimulation', 'overtired', 'seeking connection')"
        },
        related_works: {
          type: "array",
          items: { type: "string" },
          description: "Which Montessori works were involved, if any"
        },
        developmental_note: {
          type: "string",
          description: "What this might indicate developmentally"
        },
        student_name: {
          type: "string",
          description: "Required in whole-class mode: the student's name (e.g. 'Joey'). The system resolves this to the correct student ID."
        }
      },
      required: ["behavior_description"]
    }
  },
  {
    name: "save_checkin",
    description: "Record a weekly check-in summary and schedule the next one. ALWAYS call this at the END of every check-in conversation.",
    input_schema: {
      type: "object" as const,
      properties: {
        summary: { type: "string", description: "Brief summary of what was discussed and decided" },
        next_checkin_days: { type: "number", description: "Days until next check-in (typically 7)" }
      },
      required: ["summary", "next_checkin_days"]
    }
  },
  {
    name: "save_child_profile",
    description: "Save the child's intake profile from the initial conversation. Call after gathering enough info about the child.",
    input_schema: {
      type: "object" as const,
      properties: {
        personality: { type: "string" },
        strengths: { type: "array", items: { type: "string" } },
        challenges: { type: "array", items: { type: "string" } },
        interests: { type: "array", items: { type: "string" } },
        previous_experience: { type: "string" },
        learning_style: { type: "string" }
      },
      required: ["personality", "interests"]
    }
  },
  {
    name: "save_parent_state",
    description: "Silently record the parent's emotional state during the conversation. Call this when you detect emotional content — overwhelm, guilt, joy, anxiety, confidence changes. Do NOT announce that you're calling this tool.",
    input_schema: {
      type: "object" as const,
      properties: {
        emotional_themes: {
          type: "array",
          items: { type: "string" },
          description: "Key emotional themes detected (e.g., 'overwhelm', 'guilt', 'frustration', 'joy', 'pride', 'anxiety', 'burnout', 'hope', 'imposter_syndrome')"
        },
        confidence_level: {
          type: "string",
          enum: ["very_low", "low", "moderate", "high", "very_high"],
          description: "Parent's confidence level in their Montessori implementation"
        },
        stress_indicators: {
          type: "array",
          items: { type: "string" },
          description: "Specific stressors mentioned (e.g., 'sleep_deprived', 'relationship_tension', 'financial_worry', 'work_pressure', 'isolation')"
        },
        support_needed: {
          type: "string",
          description: "What kind of support this parent seems to need right now (e.g., 'validation', 'practical_simplification', 'encouragement', 'professional_referral')"
        },
        notes: {
          type: "string",
          description: "Free-form observation about the parent's emotional state"
        }
      },
      required: ["emotional_themes", "confidence_level"]
    }
  },
  {
    name: "save_developmental_insight",
    description: "Record a developmental pattern or correlation you've detected. Use when you notice connections between emotional states, work mastery, behaviors, and parent confidence. Think like a developmental detective.",
    input_schema: {
      type: "object" as const,
      properties: {
        insight_type: {
          type: "string",
          enum: ["correlation", "milestone", "prediction", "concern"],
          description: "Type of insight: correlation (A relates to B), milestone (developmental achievement), prediction (what's coming next), concern (possible red flag)"
        },
        description: {
          type: "string",
          description: "What you noticed — be specific about the connection (e.g., 'Mastered Brown Stair 3 days before hitting spike — possible understimulation from not enough challenge')"
        },
        related_works: {
          type: "array",
          items: { type: "string" },
          description: "Which Montessori works are involved"
        },
        related_behaviors: {
          type: "array",
          items: { type: "string" },
          description: "Which behaviors are involved"
        },
        confidence: {
          type: "string",
          enum: ["speculative", "likely", "confident"],
          description: "How confident are you in this pattern"
        },
        recommendation: {
          type: "string",
          description: "What to do about it"
        }
      },
      required: ["insight_type", "description"]
    }
  },
  {
    name: "track_guidance_outcome",
    description: "Record whether previous advice worked or not. Call when a parent reports back on something you suggested.",
    input_schema: {
      type: "object" as const,
      properties: {
        guidance_given: {
          type: "string",
          description: "Brief description of the advice that was given"
        },
        outcome: {
          type: "string",
          enum: ["worked_well", "partially_worked", "didnt_work", "not_tried"],
          description: "How well the advice worked"
        },
        parent_confidence_after: {
          type: "string",
          enum: ["increased", "unchanged", "decreased"],
          description: "Did following this advice change the parent's confidence?"
        },
        notes: {
          type: "string",
          description: "Additional context about the outcome"
        }
      },
      required: ["guidance_given", "outcome"]
    }
  },
  // --- Curriculum Read-Only Tools ---
  {
    name: "browse_curriculum",
    description: "Browse the Montessori curriculum. Returns works for a given area, optionally filtered by category. Use this to see what works are available before recommending or setting focus works.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"],
          description: "The Montessori area to browse"
        },
        category: {
          type: "string",
          description: "Optional category name to filter (e.g. 'Pouring', 'Linear Counting'). Omit to see all works in the area."
        }
      },
      required: ["area"]
    }
  },
  {
    name: "get_child_curriculum_status",
    description: "Get the child's progress for all works in a specific area. Shows which works are mastered, practicing, presented, or not started, plus which work is currently on their shelf. Use this to understand where the child is in the curriculum sequence before making recommendations.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"],
          description: "The Montessori area to check"
        }
      },
      required: ["area"]
    }
  },
  {
    name: "search_curriculum",
    description: "Search the entire curriculum by keyword. Matches against work names, descriptions, materials, and categories. Returns matching works across all areas. Use when looking for a specific work or topic.",
    input_schema: {
      type: "object" as const,
      properties: {
        query: {
          type: "string",
          description: "Search keyword (e.g. 'counting', 'sandpaper', 'pouring', 'geography')"
        }
      },
      required: ["query"]
    }
  },
  {
    name: "add_curriculum_work",
    description: "Create a new custom Montessori work when no standard curriculum work fits this child's needs. ONLY use after calling search_curriculum and browse_curriculum to confirm nothing suitable exists. The work is added to this child's classroom curriculum permanently. After creating, call set_focus_work to assign it to the shelf.",
    input_schema: {
      type: "object" as const,
      properties: {
        work_name: {
          type: "string",
          description: "Clear, specific work name (e.g., 'Sorting by Texture Boxes', 'Water Transfer with Baster')"
        },
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural"],
          description: "The Montessori area this work belongs to"
        },
        description: {
          type: "string",
          description: "1-2 sentence overview of what the work is and its purpose"
        },
        why_it_matters: {
          type: "string",
          description: "Developmental benefit and connection to Montessori philosophy"
        },
        direct_aims: {
          type: "array",
          items: { type: "string" },
          description: "What the child directly learns (e.g., 'discrimination of textures', 'fine motor control')"
        },
        indirect_aims: {
          type: "array",
          items: { type: "string" },
          description: "What they learn indirectly (e.g., 'concentration', 'order')"
        },
        materials: {
          type: "array",
          items: { type: "string" },
          description: "List of materials needed, with DIY alternatives if possible"
        },
        quick_guide: {
          type: "string",
          description: "Quick 2-3 sentence overview for the teacher"
        },
        presentation_steps: {
          type: "array",
          items: { type: "string" },
          description: "Step-by-step presentation instructions (6-10 steps)"
        },
        age_range: {
          type: "string",
          description: "Recommended age (e.g., '3-4 years', '4-5 years')"
        },
        photo_url: {
          type: "string",
          description: "URL of a reference photo for this work (if the teacher sent a photo showing the work). Store as a visual reference."
        },
        parent_description: {
          type: "string",
          description: "A parent-friendly explanation of the work for reports and parent communication (e.g., 'Your child practices pouring water carefully from one jug to another, building concentration and fine motor skills')."
        },
        control_of_error: {
          type: "string",
          description: "How the child knows they made a mistake without adult intervention (e.g., 'Water spills on the tray', 'Pieces don't fit together'). Core Montessori concept — include whenever possible."
        }
      },
      required: ["work_name", "area", "description", "direct_aims", "materials", "presentation_steps"]
    }
  },
  // --- Classroom-Wide Tools (teacher only) ---
  {
    name: "get_classroom_overview",
    description: "Get a complete overview of ALL students in the classroom — their names, ages, current shelf works, progress counts, and recent status. Use this when the teacher asks about the whole class, wants to compare students, plan group work, generate admin summaries, or needs a 1-liner for each student. Returns a compact summary of every child.",
    input_schema: {
      type: "object" as const,
      properties: {
        include_notes: {
          type: "boolean",
          description: "Include recent observation notes per child (default false — set true for detailed admin reports)"
        }
      },
      required: []
    }
  },
  {
    name: "group_students",
    description: "Analyze all students in the classroom and create groups based on specified criteria. Use when the teacher asks to form small groups for collaborative work, level-based grouping, area-based grouping, or any classroom organization task. Returns suggested groups with reasoning. CRITICAL CONSTRAINT: When forming groups, ensure children in the same group are working on DIFFERENT works — even if they share the same mastery level or area focus. Varied works within a group encourages peer teaching, cross-pollination of skills, and richer collaborative learning. Avoid clustering children on the same work even if they're at the same level. For games like Reverse Bingo (a leveler activity — all ages and levels play together), the strongest reader can serve as game master.",
    input_schema: {
      type: "object" as const,
      properties: {
        num_groups: {
          type: "number",
          description: "Number of groups to create (e.g., 4)"
        },
        criteria: {
          type: "string",
          enum: ["level", "area", "mixed", "interest", "custom"],
          description: "Grouping strategy: 'level' = similar mastery levels together, 'area' = by strongest Montessori area, 'mixed' = diverse levels in each group for peer learning, 'interest' = based on current works/areas of focus, 'custom' = teacher specifies in instructions"
        },
        focus_area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural", "all"],
          description: "Which Montessori area to base grouping on (use 'all' for overall progress)"
        },
        custom_instructions: {
          type: "string",
          description: "Additional instructions for grouping (e.g., 'separate Amy and Kevin', 'keep siblings together', 'ensure each group has different works')"
        }
      },
      required: ["num_groups", "criteria"]
    }
  },

  // --- Area Analytics Tool (read-only, classroom-wide) ---

  {
    name: "get_weekly_area_summary",
    description: "Get a weekly summary of which children visited each Montessori area. Shows per-area activity counts, which children worked in each area, and crucially which children did NOT visit certain areas. Use when teachers ask about area coverage, balance, who needs to be guided toward an area, or want to plan small groups based on area gaps. Pairs well with group_students for planning small groups.",
    input_schema: {
      type: "object" as const,
      properties: {
        area: {
          type: "string",
          enum: ["practical_life", "sensorial", "mathematics", "language", "cultural", "all"],
          description: "Which area to analyze. Use 'all' for a full overview across all 5 areas."
        },
        days: {
          type: "number",
          description: "Number of days to look back. Default 7 (one week), max 30."
        }
      },
      required: []
    }
  },

  // --- Daily Activity Tools (read-only, classroom-wide or per-child) ---

  {
    name: "get_daily_activity",
    description: "Get a summary of ALL classroom activity for a specific date. Returns: progress changes (new presentations, mastery), voice notes recorded, behavioral observations, photos taken, and RAZ reading records. Use this whenever a teacher asks 'what happened today?', 'what was done?', 'who worked on what?', or any question about daily activity. Defaults to today if no date provided.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date to query in YYYY-MM-DD format. Defaults to today. Max 30 days back."
        }
      },
      required: []
    }
  },
  {
    name: "get_child_recent_activity",
    description: "Get a detailed timeline of a specific child's recent activity. Returns chronological list of: progress changes, voice notes, observations, photos, and reading records over the past N days. Use when a teacher asks about a specific student's recent work.",
    input_schema: {
      type: "object" as const,
      properties: {
        student_name: {
          type: "string",
          description: "Required in whole-class mode: the student's name (e.g. 'Joey'). The system resolves this to the correct student ID."
        },
        days: {
          type: "number",
          description: "Number of days to look back. Default 7, max 30."
        }
      },
      required: []
    }
  },
  {
    name: "get_classroom_media_summary",
    description: "Get a summary of photos and videos captured in the classroom for a specific date. Returns per-child counts and captions/tags (not the actual image URLs). Use when teachers ask about photos taken, documentation captured, or want to see what was recorded visually.",
    input_schema: {
      type: "object" as const,
      properties: {
        date: {
          type: "string",
          description: "Date to query in YYYY-MM-DD format. Defaults to today. Max 30 days back."
        },
        student_name: {
          type: "string",
          description: "Optional: filter to a specific student's media only."
        }
      },
      required: []
    }
  }
];

