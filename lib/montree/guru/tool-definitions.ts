// lib/montree/guru/tool-definitions.ts
// Anthropic tool-use definitions for Guru-driven home system
// 9 action tools + 3 curriculum read-only tools = 12 total

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const GURU_TOOLS: Tool[] = [
  {
    name: "set_focus_work",
    description: "Set the focus work for one Montessori area on the child's shelf. Replaces any existing work for that area (upsert). Call once per area. The shelf holds exactly 5 works max (one per area: practical_life, sensorial, mathematics, language, cultural).",
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
        notes: { type: "string", description: "Optional notes about this update" }
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
  }
];
