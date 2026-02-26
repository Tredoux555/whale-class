// lib/montree/guru/tool-definitions.ts
// Anthropic tool-use definitions for Guru-driven home system
// 6 tools that let the Guru manage a child's Montessori shelf, progress, and observations

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
    description: "Save a behavioral observation. Use when the parent describes something notable about concentration, interests, challenges, or development.",
    input_schema: {
      type: "object" as const,
      properties: {
        behavior_description: { type: "string", description: "What was observed" },
        behavior_function: {
          type: "string",
          enum: ["attention", "escape", "sensory", "tangible", "unknown"]
        },
        activity_during: { type: "string", description: "What activity was happening" }
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
  }
];
