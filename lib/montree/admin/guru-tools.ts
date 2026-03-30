// lib/montree/admin/guru-tools.ts
// Tool definitions for Principal Admin Guru AI system
// 12 tools across 3 groups: Query (4) + School Ops (4) + Insights (4)
// All tools are school-scoped — principal only sees their own school's data

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Tables accessible to principals via query_school_data tool.
 * Excludes platform-wide tables (leads, visitors, super_admin_audit, api_usage).
 */
export const ALLOWED_PRINCIPAL_TABLES = [
  'montree_classrooms',
  'montree_teachers',
  'montree_children',
  'montree_child_progress',
  'montree_works',
  'montree_classroom_curriculum_works',
  'montree_classroom_curriculum_areas',
  'montree_guru_interactions',
  'montree_media',
  'montree_weekly_reports',
  'montree_parent_invites',
  'montree_behavioral_observations',
  'montree_feature_toggles',
  'montree_school_features',
  'montree_events',
  'montree_event_attendance',
  'montree_visual_memory',
  'montree_guru_corrections',
  'montree_voice_notes',
  'montree_weekly_admin_output',
  'montree_conference_notes',
  'montree_attendance_override',
  'montree_stale_work_dismissals',
  'montree_guru_brain',
  'montree_child_patterns',
  'montree_media_children',
] as const;

/**
 * No destructive tools for principals.
 * Principals can manage teachers and toggle features, but cannot delete schools or children.
 */
export const DESTRUCTIVE_PRINCIPAL_TOOLS = new Set<string>([]);

export const PRINCIPAL_GURU_TOOLS: Tool[] = [
  // --- Group 1: Data Query (4 tools) ---

  {
    name: 'query_school_data',
    description:
      'Query any table in your school with filters, ordering, and pagination. All queries are automatically scoped to your school — you only see your own data. Use to explore classrooms, teachers, students, progress, media, and more.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: {
          type: 'string',
          maxLength: 100,
          description:
            'Table name (e.g., "montree_classrooms", "montree_teachers", "montree_children"). Must be in the allowed tables list.',
        },
        columns: {
          type: 'array',
          items: { type: 'string', maxLength: 100 },
          description: 'Specific columns to select. If omitted, returns all columns.',
        },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              column: { type: 'string', maxLength: 100 },
              op: {
                type: 'string',
                enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is_null', 'not_null'],
              },
              value: { type: ['string', 'number', 'boolean', 'null'] },
            },
            required: ['column', 'op'],
          },
          description:
            'Array of filter conditions. value is required for all ops except is_null and not_null.',
        },
        order_by: {
          type: 'string',
          maxLength: 100,
          description: 'Column to order by. Prefix with "-" for descending (e.g., "-created_at").',
        },
        limit: {
          type: 'number',
          minimum: 1,
          maximum: 200,
          description: 'Maximum rows to return. Default 50, max 200.',
        },
      },
      required: ['table'],
    },
  },

  {
    name: 'query_school_stats',
    description:
      'Calculate aggregate statistics on a table: count, sum, average, min, or max. All queries are automatically scoped to your school.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: {
          type: 'string',
          maxLength: 100,
          description: 'Table name.',
        },
        aggregate: {
          type: 'string',
          enum: ['count', 'sum', 'avg', 'min', 'max'],
          description: 'The aggregation function to apply.',
        },
        column: {
          type: 'string',
          maxLength: 100,
          description: 'Column to aggregate (required for sum, avg, min, max; optional for count).',
        },
        filters: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              column: { type: 'string', maxLength: 100 },
              op: {
                type: 'string',
                enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is_null', 'not_null'],
              },
              value: { type: ['string', 'number', 'boolean', 'null'] },
            },
            required: ['column', 'op'],
          },
          description: 'Filter conditions before aggregation.',
        },
        group_by: {
          type: 'string',
          maxLength: 100,
          description: 'Optional column to group results by.',
        },
      },
      required: ['table', 'aggregate'],
    },
  },

  {
    name: 'search_school',
    description:
      'Search a term across teachers, classrooms, children, and works in your school. Useful to find a specific student, teacher, or work by name.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          maxLength: 200,
          description: 'The term to search for (e.g., "Jimmy", "john@example.com", "Pink Tower").',
        },
      },
      required: ['search_term'],
    },
  },

  {
    name: 'get_school_overview',
    description:
      'Get a comprehensive overview of your school: classroom count, teacher count, student count, recent activity, Guru usage, feature toggles, and subscription status.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // --- Group 2: School Operations (4 tools) ---

  {
    name: 'get_classroom_detail',
    description:
      'Deep dive into a specific classroom. Returns classroom info, teacher list, student list with progress summary, recent Guru interactions, media count, and curriculum status.',
    input_schema: {
      type: 'object' as const,
      properties: {
        classroom_id: {
          type: 'string',
          maxLength: 200,
          description: 'The UUID of the classroom.',
        },
      },
      required: ['classroom_id'],
    },
  },

  {
    name: 'get_student_detail',
    description:
      'Get detailed information about a specific student: progress across all areas, focus works, recent media, observations, Guru interactions, and weekly reports.',
    input_schema: {
      type: 'object' as const,
      properties: {
        child_id: {
          type: 'string',
          maxLength: 200,
          description: 'The UUID of the student.',
        },
      },
      required: ['child_id'],
    },
  },

  {
    name: 'get_teacher_list',
    description:
      'Get all teachers in your school with their classroom assignments, last login, Guru plan status, and activity summary.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'toggle_school_feature',
    description:
      'Enable or disable a feature flag for your school. Use to grant/revoke access to features like voice observations, smart capture, or Guru premium.',
    input_schema: {
      type: 'object' as const,
      properties: {
        feature_name: {
          type: 'string',
          maxLength: 200,
          description:
            'The feature to toggle (e.g., "voice_observations", "smart_capture", "guru_premium").',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether to enable (true) or disable (false) the feature.',
        },
      },
      required: ['feature_name', 'enabled'],
    },
  },

  // --- Group 3: Insights & Reporting (4 tools) ---

  {
    name: 'get_progress_summary',
    description:
      'Get a school-wide progress summary: how many students have mastered, are practicing, or have been presented each area. Optionally filter by classroom or area. Great for understanding curriculum coverage.',
    input_schema: {
      type: 'object' as const,
      properties: {
        classroom_id: {
          type: 'string',
          maxLength: 200,
          description: 'Optional: filter by a specific classroom.',
        },
        area: {
          type: 'string',
          enum: ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'],
          description: 'Optional: filter by curriculum area.',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_guru_usage',
    description:
      'See how teachers and parents are using the Guru AI advisor: total interactions, questions by type, most active classrooms, and usage trends over time.',
    input_schema: {
      type: 'object' as const,
      properties: {
        days: {
          type: 'number',
          minimum: 1,
          maximum: 90,
          description: 'Number of days to look back. Default 30, max 90.',
        },
        classroom_id: {
          type: 'string',
          maxLength: 200,
          description: 'Optional: filter by a specific classroom.',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_parent_engagement',
    description:
      'See parent engagement metrics: invite codes sent, codes accessed, reports generated, reports sent, and parent message activity. Helps identify classrooms with low parent involvement.',
    input_schema: {
      type: 'object' as const,
      properties: {
        classroom_id: {
          type: 'string',
          maxLength: 200,
          description: 'Optional: filter by a specific classroom.',
        },
      },
      required: [],
    },
  },

  {
    name: 'get_media_summary',
    description:
      'Get photo and media statistics: total photos, photos per classroom, photos per student, tagged vs untagged, and recent upload activity. Helps understand documentation habits.',
    input_schema: {
      type: 'object' as const,
      properties: {
        classroom_id: {
          type: 'string',
          maxLength: 200,
          description: 'Optional: filter by a specific classroom.',
        },
        days: {
          type: 'number',
          minimum: 1,
          maximum: 90,
          description: 'Number of days to look back. Default 30, max 90.',
        },
      },
      required: [],
    },
  },
];
