// lib/montree/super-admin/guru-tools.ts
// Tool definitions for Super-Admin Guru AI system
// 15 tools across 4 groups: Query (4) + Operations (4) + Outreach (4) + Management (3)

import type { Tool } from '@anthropic-ai/sdk/resources/messages';

/**
 * Explicit whitelist of tables accessible via query_table tool.
 * Includes all montree_* tables. Blocks story_*, auth tables, and system tables.
 */
export const ALLOWED_TABLES = [
  'montree_schools',
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
  'montree_leads',
  'montree_visitors',
  'montree_super_admin_audit',
  'montree_feature_toggles',
  'montree_school_features',
  'montree_api_usage',
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
 * Tools that require explicit confirmation before execution.
 * Used to trigger a two-step confirmation flow in the route.
 */
export const DESTRUCTIVE_TOOLS = new Set([
  'delete_school',
]);

export const SUPER_ADMIN_GURU_TOOLS: Tool[] = [
  // --- Group 1: Data Query (4 tools) ---

  {
    name: 'query_table',
    description: 'Query any montree_* table with filters, ordering, and pagination. Use to explore data, find specific records, or gather statistics. Supports filtering with comparison operators (eq, gt, lt, etc.) and ordering.',
    input_schema: {
      type: 'object' as const,
      properties: {
        table: {
          type: 'string',
          maxLength: 100,
          description: 'Table name (e.g., "montree_schools", "montree_teachers"). Must be in the allowed tables list.',
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
          description: 'Array of filter conditions (e.g., { column: "subscription_tier", op: "eq", value: "paid" }). value is required for all ops except is_null and not_null.',
        },
        order_by: {
          type: 'string',
          maxLength: 100,
          description: 'Column to order by (e.g., "created_at"). Prefix with "-" for descending order (e.g., "-created_at").',
        },
        limit: {
          type: 'number',
          description: 'Maximum rows to return. Default 50, max 500.',
        },
      },
      required: ['table'],
    },
  },

  {
    name: 'query_stats',
    description: 'Calculate aggregate statistics on a table: count, sum, average, min, or max. Use to understand data distribution, totals, or trends.',
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
              op: { type: 'string', enum: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'is_null', 'not_null'] },
              value: { type: ['string', 'number', 'boolean', 'null'] },
            },
            required: ['column', 'op'],
          },
          description: 'Filter conditions before aggregation.',
        },
        group_by: {
          type: 'string',
          maxLength: 100,
          description: 'Optional column to group results by (e.g., "subscription_tier"). Returns results grouped by values of this column.',
        },
      },
      required: ['table', 'aggregate'],
    },
  },

  {
    name: 'query_custom',
    description: 'Run a predefined named query optimized for common super-admin questions. Available queries: active_schools_summary, daily_api_costs, guru_usage_by_school, visitor_stats_by_country, recent_signups, stale_schools, top_api_consumers, lead_conversion_funnel.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query_name: {
          type: 'string',
          enum: [
            'active_schools_summary',
            'daily_api_costs',
            'guru_usage_by_school',
            'visitor_stats_by_country',
            'recent_signups',
            'stale_schools',
            'top_api_consumers',
            'lead_conversion_funnel',
          ],
          description: 'Name of a predefined query.',
        },
        params: {
          type: 'object',
          additionalProperties: { type: ['string', 'number'] },
          description: 'Optional parameters for the query (e.g., { days: 7, limit: 10 }).',
        },
      },
      required: ['query_name'],
    },
  },

  {
    name: 'search_across_tables',
    description: 'Search a term across multiple tables to find records. Searches in name, email, and notes fields across montree_schools, montree_teachers, montree_leads, and other relevant tables.',
    input_schema: {
      type: 'object' as const,
      properties: {
        search_term: {
          type: 'string',
          maxLength: 200,
          description: 'The term to search for (e.g., "Beijing", "john@example.com", "MSB").',
        },
        tables: {
          type: 'array',
          items: { type: 'string', maxLength: 100 },
          description: 'Optional: specific tables to search. If omitted, searches all tables.',
        },
      },
      required: ['search_term'],
    },
  },

  // --- Group 2: Operations (4 tools) ---

  {
    name: 'get_system_health',
    description: 'Check the overall health of the Montree platform. Returns database connection status, recent error counts, API response times, storage usage, and active session counts.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'get_school_detail',
    description: 'Deep dive into a specific school. Returns school info, teacher count, student count, classroom count, recent activity, Guru usage patterns, API costs, subscription status, and feature toggles.',
    input_schema: {
      type: 'object' as const,
      properties: {
        school_id: {
          type: 'string',
          maxLength: 200,
          description: 'The UUID of the school (e.g., "945c846d-fb33-4370-8a95-a29b7767af54").',
        },
      },
      required: ['school_id'],
    },
  },

  {
    name: 'delete_school',
    description: '⚠️ DESTRUCTIVE — Delete a school and ALL associated data (classrooms, children, teachers, progress, media, interactions, etc.). This action is irreversible. REQUIRES CONFIRMATION before executing.',
    input_schema: {
      type: 'object' as const,
      properties: {
        school_id: {
          type: 'string',
          maxLength: 200,
          description: 'The UUID of the school to delete.',
        },
        reason: {
          type: 'string',
          maxLength: 500,
          description: 'Reason for deletion (for audit trail).',
        },
      },
      required: ['school_id', 'reason'],
    },
  },

  {
    name: 'toggle_feature',
    description: 'Enable or disable a feature flag for a specific school. Use to grant/revoke access to beta features, Guru tiers, or experimental tools.',
    input_schema: {
      type: 'object' as const,
      properties: {
        school_id: {
          type: 'string',
          maxLength: 200,
          description: 'The UUID of the school.',
        },
        feature_name: {
          type: 'string',
          maxLength: 200,
          description: 'The feature to toggle (e.g., "voice_observations", "smart_capture", "guru_premium").',
        },
        enabled: {
          type: 'boolean',
          description: 'Whether to enable (true) or disable (false) the feature.',
        },
      },
      required: ['school_id', 'feature_name', 'enabled'],
    },
  },

  // --- Group 3: Outreach & Leads (4 tools) ---

  {
    name: 'manage_lead',
    description: 'Update a lead record: change status, add notes, or update email address. Use to track sales pipeline progress, manage follow-ups, and mark converted leads.',
    input_schema: {
      type: 'object' as const,
      properties: {
        lead_id: {
          type: 'string',
          maxLength: 200,
          description: 'The UUID of the lead.',
        },
        updates: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['new', 'contacted', 'interested', 'trial', 'converted', 'rejected', 'stale'],
              description: 'New status for the lead.',
            },
            notes: {
              type: 'string',
              maxLength: 1000,
              description: 'Additional notes about the lead interaction.',
            },
            email: {
              type: 'string',
              maxLength: 200,
              description: 'Updated email address for the lead.',
            },
          },
          required: [],
        },
      },
      required: ['lead_id', 'updates'],
    },
  },

  {
    name: 'get_lead_overview',
    description: 'Get a high-level summary of the sales pipeline: total leads, breakdown by status, conversion rate, recent activity, and source attribution.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  {
    name: 'draft_email',
    description: 'Draft an outreach email using Montree context and brand voice. Supports multiple email types: cold_intro (first contact), follow_up (after no reply), demo_offer (demo proposal), or custom (your own context). Returns subject line and email body.',
    input_schema: {
      type: 'object' as const,
      properties: {
        school_name: {
          type: 'string',
          maxLength: 200,
          description: 'Name of the school being contacted.',
        },
        contact_name: {
          type: 'string',
          maxLength: 200,
          description: 'Optional: name of the contact person for personalization.',
        },
        email_type: {
          type: 'string',
          enum: ['cold_intro', 'follow_up', 'demo_offer', 'custom'],
          description: 'Type of email to draft.',
        },
        custom_context: {
          type: 'string',
          maxLength: 5000,
          description: 'For email_type="custom": specific context, previous interactions, or custom message to include.',
        },
      },
      required: ['school_name', 'email_type'],
    },
  },

  {
    name: 'get_campaign_stats',
    description: 'Get statistics on the outreach campaign: emails sent by batch, open rate, bounce rate, reply rate, status distribution, and effectiveness metrics.',
    input_schema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },

  // --- Group 4: Platform Management (3 tools) ---

  {
    name: 'update_school_settings',
    description: 'Modify school settings: subscription tier, plan type, account type, or other configuration. Use to promote trials to paid accounts, change plan levels, or update school classification.',
    input_schema: {
      type: 'object' as const,
      properties: {
        school_id: {
          type: 'string',
          maxLength: 200,
          description: 'The UUID of the school.',
        },
        updates: {
          type: 'object',
          properties: {
            subscription_tier: {
              type: 'string',
              enum: ['free', 'trial', 'paid'],
              description: 'Subscription tier.',
            },
            plan_type: {
              type: 'string',
              enum: ['classroom', 'homeschool'],
              description: 'Plan type.',
            },
            account_type: {
              type: 'string',
              enum: ['teacher', 'principal', 'admin'],
              description: 'Primary account type.',
            },
          },
          required: [],
        },
      },
      required: ['school_id', 'updates'],
    },
  },

  {
    name: 'run_named_query',
    description: 'Execute a predefined read-only SQL query by name. Available queries: school_with_counts, api_cost_by_school_last_30d, guru_usage_heatmap, children_per_classroom, inactive_teachers_30d, media_storage_by_school, lead_source_breakdown, visitor_geo_summary, recent_errors, subscription_revenue.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query_name: {
          type: 'string',
          enum: [
            'school_with_counts',
            'api_cost_by_school_last_30d',
            'guru_usage_heatmap',
            'children_per_classroom',
            'inactive_teachers_30d',
            'media_storage_by_school',
            'lead_source_breakdown',
            'visitor_geo_summary',
            'recent_errors',
            'subscription_revenue',
          ],
          description: 'Name of a predefined read-only query.',
        },
        params: {
          type: 'object',
          additionalProperties: { type: ['string', 'number'] },
          description: 'Optional parameters for the query (e.g., { days: 30, school_id: "..." }).',
        },
      },
      required: ['query_name'],
    },
  },

  {
    name: 'get_audit_log',
    description: 'View recent audit log entries. Includes all super-admin actions: login events, data modifications, tool executions, and system changes. Useful for compliance, debugging, and tracking admin activity.',
    input_schema: {
      type: 'object' as const,
      properties: {
        limit: {
          type: 'number',
          description: 'Maximum audit entries to return. Default 50, max 500.',
        },
        action_filter: {
          type: 'string',
          maxLength: 200,
          description: 'Optional: filter by action type (e.g., "guru_tool_call", "school_delete", "login").',
        },
        since_hours: {
          type: 'number',
          description: 'Optional: only show entries from the last N hours. Default 24.',
        },
      },
      required: [],
    },
  },
];
