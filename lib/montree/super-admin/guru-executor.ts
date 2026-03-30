// lib/montree/super-admin/guru-executor.ts
// Tool execution handlers for Super-Admin Guru

import { SupabaseClient } from '@supabase/supabase-js';

export interface ToolInput {
  [key: string]: any;
}

export interface ToolResult {
  success: boolean;
  data?: any;
  error?: string;
  confirmation_required?: boolean;
  confirmation_id?: string;
  description?: string;
}

/** Clamp a numeric parameter within safe bounds */
function clampParam(value: unknown, min: number, max: number, fallback: number): number {
  const num = typeof value === 'number' ? value : fallback;
  return Math.max(min, Math.min(max, num));
}

/**
 * Validate a table name against the allowed tables whitelist.
 */
function validateTable(table: string, allowedTables: Set<string>): boolean {
  return allowedTables.has(table);
}

/**
 * Execute a tool based on name and input.
 * Returns a ToolResult object.
 */
export async function executeTool(
  toolName: string,
  input: ToolInput,
  supabase: SupabaseClient,
  allowedTables: Set<string>
): Promise<ToolResult> {
  try {
    switch (toolName) {
      // GROUP 1: Query Tools

      case 'query_table':
        return await executeQueryTable(input, supabase, allowedTables);

      case 'query_stats':
        return await executeQueryStats(input, supabase, allowedTables);

      case 'query_custom':
        return await executeQueryCustom(input, supabase);

      case 'search_across_tables':
        return await executeSearchAcrossTables(input, supabase, allowedTables);

      // GROUP 2: Operations Tools

      case 'get_system_health':
        return await executeGetSystemHealth(supabase);

      case 'get_school_detail':
        return await executeGetSchoolDetail(input, supabase);

      case 'delete_school':
        return await executeDeleteSchool(input, supabase);

      case 'toggle_feature':
        return await executeToggleFeature(input, supabase);

      // GROUP 3: Outreach Tools

      case 'manage_lead':
        return await executeManageLead(input, supabase);

      case 'get_lead_overview':
        return await executeGetLeadOverview(supabase);

      case 'draft_email':
        return await executeDraftEmail(input, supabase);

      case 'get_campaign_stats':
        return await executeGetCampaignStats(supabase);

      // GROUP 4: Management Tools

      case 'update_school_settings':
        return await executeUpdateSchoolSettings(input, supabase);

      case 'run_named_query':
        return await executeRunNamedQuery(input, supabase);

      case 'get_audit_log':
        return await executeGetAuditLog(input, supabase);

      default:
        return {
          success: false,
          error: `Unknown tool: ${toolName}`,
        };
    }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Tool execution failed',
    };
  }
}

// QUERY TOOLS

async function executeQueryTable(
  input: ToolInput,
  supabase: SupabaseClient,
  allowedTables: Set<string>
): Promise<ToolResult> {
  const { table, columns, filters, order_by, limit = 50 } = input;

  if (!validateTable(table, allowedTables)) {
    return { success: false, error: `Table not allowed: ${table}` };
  }

  if (limit > 500) {
    return { success: false, error: 'Limit must be <= 500' };
  }

  let query = supabase.from(table).select(columns?.join(',') || '*');

  // Apply filters
  if (filters && Array.isArray(filters)) {
    for (const filter of filters) {
      const { column, op, value } = filter;
      if (op === 'eq') query = query.eq(column, value);
      else if (op === 'neq') query = query.neq(column, value);
      else if (op === 'gt') query = query.gt(column, value);
      else if (op === 'gte') query = query.gte(column, value);
      else if (op === 'lt') query = query.lt(column, value);
      else if (op === 'lte') query = query.lte(column, value);
      else if (op === 'like') query = query.like(column, value);
      else if (op === 'ilike') query = query.ilike(column, value);
      else if (op === 'is_null') query = query.is(column, null);
      else if (op === 'not_null') query = query.not(column, 'is', null);
    }
  }

  // Apply ordering
  if (order_by) {
    const isDesc = order_by.startsWith('-');
    const col = isDesc ? order_by.slice(1) : order_by;
    query = query.order(col, { ascending: !isDesc });
  }

  // Apply limit
  query = query.limit(limit);

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      rows: data || [],
      count: data?.length || 0,
      table,
    },
  };
}

async function executeQueryStats(
  input: ToolInput,
  supabase: SupabaseClient,
  allowedTables: Set<string>
): Promise<ToolResult> {
  const { table, aggregate, column, filters, group_by } = input;

  if (!validateTable(table, allowedTables)) {
    return { success: false, error: `Table not allowed: ${table}` };
  }

  if (!['count', 'sum', 'avg', 'min', 'max'].includes(aggregate)) {
    return { success: false, error: 'Invalid aggregate function' };
  }

  // For count, use Supabase's built-in count
  if (aggregate === 'count') {
    let query = supabase.from(table).select('id', { count: 'exact' });

    // Apply filters if provided
    if (filters && Array.isArray(filters)) {
      for (const filter of filters) {
        const { column, op, value } = filter;
        if (op === 'eq') query = query.eq(column, value);
        else if (op === 'neq') query = query.neq(column, value);
        else if (op === 'gt') query = query.gt(column, value);
        else if (op === 'gte') query = query.gte(column, value);
        else if (op === 'lt') query = query.lt(column, value);
        else if (op === 'lte') query = query.lte(column, value);
        else if (op === 'like') query = query.like(column, value);
        else if (op === 'ilike') query = query.ilike(column, value);
        else if (op === 'is_null') query = query.is(column, null);
        else if (op === 'not_null') query = query.not(column, 'is', null);
      }
    }

    const { count, error } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      data: {
        result: count,
        aggregate: 'count',
        table,
      },
    };
  }

  // For sum/avg/min/max, fetch all rows and calculate (simple approach)
  // In production, this should use raw SQL via RPC for efficiency
  let query = supabase.from(table).select(column);

  if (filters && Array.isArray(filters)) {
    for (const filter of filters) {
      const { column: filterCol, op, value } = filter;
      if (op === 'eq') query = query.eq(filterCol, value);
      else if (op === 'neq') query = query.neq(filterCol, value);
      else if (op === 'gt') query = query.gt(filterCol, value);
      else if (op === 'gte') query = query.gte(filterCol, value);
      else if (op === 'lt') query = query.lt(filterCol, value);
      else if (op === 'lte') query = query.lte(filterCol, value);
      else if (op === 'like') query = query.like(filterCol, value);
      else if (op === 'ilike') query = query.ilike(filterCol, value);
      else if (op === 'is_null') query = query.is(filterCol, null);
      else if (op === 'not_null') query = query.not(filterCol, 'is', null);
    }
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  if (!data || data.length === 0) {
    return {
      success: true,
      data: {
        result: null,
        aggregate,
        table,
        message: 'No data to aggregate',
      },
    };
  }

  const values = data.map((row: any) => parseFloat(row[column]) || 0);

  let result;
  if (aggregate === 'sum') {
    result = values.reduce((a: number, b: number) => a + b, 0);
  } else if (aggregate === 'avg') {
    result = values.reduce((a: number, b: number) => a + b, 0) / values.length;
  } else if (aggregate === 'min') {
    result = Math.min(...values);
  } else if (aggregate === 'max') {
    result = Math.max(...values);
  }

  return {
    success: true,
    data: {
      result,
      aggregate,
      table,
      count: data.length,
    },
  };
}

async function executeQueryCustom(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult> {
  const { query_name, params } = input;

  const validQueries = [
    'active_schools_summary',
    'daily_api_costs',
    'guru_usage_by_school',
    'visitor_stats_by_country',
    'recent_signups',
    'stale_schools',
    'top_api_consumers',
    'lead_conversion_funnel',
  ];

  if (!validQueries.includes(query_name)) {
    return { success: false, error: `Unknown query: ${query_name}` };
  }

  // Execute predefined queries
  switch (query_name) {
    case 'active_schools_summary': {
      const { data, error } = await supabase
        .from('montree_schools')
        .select('id, name, subscription_tier, created_at, updated_at')
        .neq('subscription_tier', 'free');

      if (error) return { success: false, error: error.message };
      return { success: true, data: { query: query_name, results: data } };
    }

    case 'daily_api_costs': {
      const { data, error } = await supabase
        .from('montree_api_usage')
        .select('school_id, cost_cents, created_at')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      if (error) return { success: false, error: error.message };

      // Group by school and sum costs
      const costs: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        costs[row.school_id] = (costs[row.school_id] || 0) + row.cost_cents;
      });

      return {
        success: true,
        data: {
          query: query_name,
          total_cost_cents: Object.values(costs).reduce((a: number, b: number) => a + b, 0),
          by_school: costs,
        },
      };
    }

    case 'guru_usage_by_school': {
      const { data, error } = await supabase
        .from('montree_guru_interactions')
        .select('school_id, model_used, tokens_input, tokens_output, created_at')
        .gte('created_at', new Date(Date.now() - clampParam(params?.days, 1, 365, 30) * 24 * 60 * 60 * 1000).toISOString());

      if (error) return { success: false, error: error.message };

      const bySchool: Record<string, { count: number; tokens_in: number; tokens_out: number; models: Record<string, number> }> = {};
      (data || []).forEach((row: any) => {
        const sid = row.school_id || 'unknown';
        if (!bySchool[sid]) bySchool[sid] = { count: 0, tokens_in: 0, tokens_out: 0, models: {} };
        bySchool[sid].count++;
        bySchool[sid].tokens_in += row.tokens_input || 0;
        bySchool[sid].tokens_out += row.tokens_output || 0;
        const model = row.model_used || 'unknown';
        bySchool[sid].models[model] = (bySchool[sid].models[model] || 0) + 1;
      });

      return { success: true, data: { query: query_name, total_interactions: (data || []).length, by_school: bySchool } };
    }

    case 'visitor_stats_by_country': {
      const { data, error } = await supabase
        .from('montree_visitors')
        .select('country, city, device_type, page_path, created_at')
        .gte('created_at', new Date(Date.now() - clampParam(params?.days, 1, 365, 7) * 24 * 60 * 60 * 1000).toISOString())
        .limit(500);

      if (error) return { success: false, error: error.message };

      const byCountry: Record<string, number> = {};
      const byCity: Record<string, number> = {};
      const byDevice: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        byCountry[row.country || 'unknown'] = (byCountry[row.country || 'unknown'] || 0) + 1;
        byCity[row.city || 'unknown'] = (byCity[row.city || 'unknown'] || 0) + 1;
        byDevice[row.device_type || 'unknown'] = (byDevice[row.device_type || 'unknown'] || 0) + 1;
      });

      return { success: true, data: { query: query_name, total_visitors: (data || []).length, by_country: byCountry, by_city: byCity, by_device: byDevice } };
    }

    case 'recent_signups': {
      const { data, error } = await supabase
        .from('montree_schools')
        .select('id, name, subscription_tier, plan_type, account_type, created_at')
        .order('created_at', { ascending: false })
        .limit(clampParam(params?.limit, 1, 500, 20));

      if (error) return { success: false, error: error.message };
      return { success: true, data: { query: query_name, results: data } };
    }

    case 'stale_schools': {
      // Schools with no guru interactions in the last 14 days
      const cutoff = new Date(Date.now() - clampParam(params?.days, 1, 365, 14) * 24 * 60 * 60 * 1000).toISOString();

      const { data: allSchools, error: schoolErr } = await supabase
        .from('montree_schools')
        .select('id, name, subscription_tier, created_at, updated_at');

      if (schoolErr) return { success: false, error: schoolErr.message };

      const { data: activeSchools, error: activeErr } = await supabase
        .from('montree_guru_interactions')
        .select('school_id')
        .gte('created_at', cutoff);

      if (activeErr) return { success: false, error: activeErr.message };

      const activeIds = new Set((activeSchools || []).map((r: any) => r.school_id));
      const stale = (allSchools || []).filter((s: any) => !activeIds.has(s.id));

      return { success: true, data: { query: query_name, stale_schools: stale, total_schools: (allSchools || []).length, stale_count: stale.length } };
    }

    case 'top_api_consumers': {
      const { data, error } = await supabase
        .from('montree_api_usage')
        .select('school_id, cost_cents, tokens_input, tokens_output, model_name, created_at')
        .gte('created_at', new Date(Date.now() - clampParam(params?.days, 1, 365, 30) * 24 * 60 * 60 * 1000).toISOString());

      if (error) return { success: false, error: error.message };

      const bySchool: Record<string, { cost_cents: number; calls: number; tokens_in: number; tokens_out: number }> = {};
      (data || []).forEach((row: any) => {
        const sid = row.school_id || 'unknown';
        if (!bySchool[sid]) bySchool[sid] = { cost_cents: 0, calls: 0, tokens_in: 0, tokens_out: 0 };
        bySchool[sid].cost_cents += row.cost_cents || 0;
        bySchool[sid].calls++;
        bySchool[sid].tokens_in += row.tokens_input || 0;
        bySchool[sid].tokens_out += row.tokens_output || 0;
      });

      // Sort by cost descending
      const sorted = Object.entries(bySchool)
        .sort(([, a], [, b]) => b.cost_cents - a.cost_cents)
        .slice(0, clampParam(params?.limit, 1, 100, 10));

      return { success: true, data: { query: query_name, top_consumers: Object.fromEntries(sorted), total_cost_cents: (data || []).reduce((s: number, r: any) => s + (r.cost_cents || 0), 0) } };
    }

    case 'lead_conversion_funnel': {
      const { data, error } = await supabase
        .from('montree_leads')
        .select('id, status, source, created_at, email');

      if (error) return { success: false, error: error.message };

      const leads = data || [];
      const statuses: Record<string, number> = {};
      const sources: Record<string, number> = {};
      const withEmail = leads.filter((l: any) => l.email).length;
      leads.forEach((l: any) => {
        statuses[l.status || 'unknown'] = (statuses[l.status || 'unknown'] || 0) + 1;
        sources[l.source || 'unknown'] = (sources[l.source || 'unknown'] || 0) + 1;
      });

      return {
        success: true,
        data: {
          query: query_name,
          total_leads: leads.length,
          with_email: withEmail,
          by_status: statuses,
          by_source: sources,
          conversion_rate: leads.length > 0
            ? ((statuses['converted'] || statuses['active'] || 0) / leads.length * 100).toFixed(1) + '%'
            : '0%',
        },
      };
    }

    default:
      return {
        success: false,
        error: `Query not yet implemented: ${query_name}`,
      };
  }
}

async function executeSearchAcrossTables(
  input: ToolInput,
  supabase: SupabaseClient,
  allowedTables: Set<string>
): Promise<ToolResult> {
  const { search_term, tables } = input;

  if (!search_term || search_term.length < 2) {
    return { success: false, error: 'Search term must be at least 2 characters' };
  }

  const searchTables = tables || ['montree_schools', 'montree_teachers', 'montree_leads'];
  const searchPattern = `%${search_term}%`;
  const results: Record<string, any[]> = {};

  for (const table of searchTables) {
    if (!validateTable(table, allowedTables)) continue;

    // Search common name/email/notes columns
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .or(`name.ilike.${searchPattern},email.ilike.${searchPattern},notes.ilike.${searchPattern}`)
      .limit(20);

    if (!error && data) {
      results[table] = data;
    }
  }

  return {
    success: true,
    data: {
      search_term,
      results,
    },
  };
}

// OPERATIONS TOOLS

async function executeGetSystemHealth(supabase: SupabaseClient): Promise<ToolResult> {
  try {
    const now = Date.now();
    const last24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
    const last1h = new Date(now - 60 * 60 * 1000).toISOString();

    // Run all checks in parallel
    const [dbCheck, recentErrors, schoolCount, teacherCount, childCount, guruCount, visitorCount, apiUsage] = await Promise.all([
      supabase.from('montree_super_admin_audit').select('id').limit(1),
      supabase.from('montree_super_admin_audit').select('id').or('action.eq.error,requires_review.eq.true').gte('created_at', last24h),
      supabase.from('montree_schools').select('id', { count: 'exact' }),
      supabase.from('montree_teachers').select('id', { count: 'exact' }),
      supabase.from('montree_children').select('id', { count: 'exact' }),
      supabase.from('montree_guru_interactions').select('id', { count: 'exact' }).gte('created_at', last24h),
      supabase.from('montree_visitors').select('id', { count: 'exact' }).gte('created_at', last1h),
      supabase.from('montree_api_usage').select('cost_cents').gte('created_at', last24h),
    ]);

    const totalCost24h = (apiUsage.data || []).reduce((s: number, r: any) => s + (r.cost_cents || 0), 0);

    return {
      success: true,
      data: {
        database: {
          connected: !dbCheck.error,
          error: dbCheck.error?.message,
        },
        platform: {
          total_schools: schoolCount.count || 0,
          total_teachers: teacherCount.count || 0,
          total_children: childCount.count || 0,
        },
        last_24h: {
          guru_interactions: guruCount.count || 0,
          api_cost_cents: totalCost24h,
          api_cost_dollars: (totalCost24h / 100).toFixed(2),
          errors_or_reviews: recentErrors.data?.length || 0,
        },
        last_1h: {
          visitors: visitorCount.count || 0,
        },
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message,
    };
  }
}

async function executeGetSchoolDetail(
  input: ToolInput,
  supabase: SupabaseClient
): Promise<ToolResult> {
  const { school_id } = input;

  if (!school_id) {
    return { success: false, error: 'school_id is required' };
  }

  const { data: school, error: schoolError } = await supabase
    .from('montree_schools')
    .select('*')
    .eq('id', school_id)
    .maybeSingle();

  if (schoolError) {
    return { success: false, error: schoolError.message };
  }

  if (!school) {
    return { success: false, error: `School not found: ${school_id}` };
  }

  // Fetch related counts
  const [teachers, classrooms, children] = await Promise.all([
    supabase.from('montree_teachers').select('id').eq('school_id', school_id),
    supabase.from('montree_classrooms').select('id').eq('school_id', school_id),
    supabase.from('montree_children').select('id').eq('school_id', school_id),
  ]);

  return {
    success: true,
    data: {
      school,
      teacher_count: teachers.data?.length || 0,
      classroom_count: classrooms.data?.length || 0,
      child_count: children.data?.length || 0,
    },
  };
}

async function executeDeleteSchool(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult> {
  const { school_id, reason } = input;

  if (!school_id || !reason) {
    return { success: false, error: 'school_id and reason are required' };
  }

  // First, get the school details for confirmation description
  const { data: school, error: fetchError } = await supabase
    .from('montree_schools')
    .select('id, name')
    .eq('id', school_id)
    .maybeSingle();

  if (fetchError) {
    return { success: false, error: fetchError.message };
  }
  if (!school) {
    return { success: false, error: `School not found: ${school_id}` };
  }

  const teacherCount = await supabase
    .from('montree_teachers')
    .select('id')
    .eq('school_id', school_id);

  const description = `Will delete school "${school?.name}" (ID: ${school_id}) with ${teacherCount.data?.length || 0} teachers and associated data. Reason: ${reason}. This cannot be undone.`;

  return {
    success: true,
    confirmation_required: true,
    confirmation_id: crypto.randomUUID(),
    description,
  };
}

async function executeToggleFeature(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult> {
  const { school_id, feature_name, enabled } = input;

  if (!school_id || !feature_name || typeof enabled !== 'boolean') {
    return { success: false, error: 'school_id, feature_name, and enabled are required' };
  }

  const { data, error } = await supabase
    .from('montree_school_features')
    .upsert(
      {
        school_id,
        feature_name,
        enabled,
        enabled_at: enabled ? new Date().toISOString() : null,
      },
      { onConflict: 'school_id,feature_name' }
    )
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      message: `Feature "${feature_name}" is now ${enabled ? 'enabled' : 'disabled'} for school ${school_id}`,
      feature: data?.[0],
    },
  };
}

// OUTREACH TOOLS

const LEAD_UPDATABLE_FIELDS = new Set([
  'status', 'notes', 'contact_person', 'email', 'school_name', 'source',
]);

async function executeManageLead(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult> {
  const { lead_id, updates } = input;

  if (!lead_id || !updates) {
    return { success: false, error: 'lead_id and updates are required' };
  }

  // Whitelist updatable fields
  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
    if (LEAD_UPDATABLE_FIELDS.has(key)) {
      safeUpdates[key] = value;
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { success: false, error: `No valid fields to update. Allowed: ${[...LEAD_UPDATABLE_FIELDS].join(', ')}` };
  }

  const { data, error } = await supabase
    .from('montree_leads')
    .update(safeUpdates)
    .eq('id', lead_id)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      message: 'Lead updated',
      lead: data?.[0],
    },
  };
}

async function executeGetLeadOverview(supabase: SupabaseClient): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('montree_leads')
    .select('id, status, source, created_at');

  if (error) {
    return { success: false, error: error.message };
  }

  const leads = data || [];
  const statuses: Record<string, number> = {};
  const sources: Record<string, number> = {};

  leads.forEach((lead: any) => {
    const status = lead.status || 'unknown';
    const source = lead.source || 'unknown';
    statuses[status] = (statuses[status] || 0) + 1;
    sources[source] = (sources[source] || 0) + 1;
  });

  return {
    success: true,
    data: {
      total_leads: leads.length,
      by_status: statuses,
      by_source: sources,
    },
  };
}

async function executeDraftEmail(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult> {
  const { school_name, contact_name, email_type, custom_context } = input;

  if (!school_name || !email_type) {
    return { success: false, error: 'school_name and email_type are required' };
  }

  const validTypes = ['cold_intro', 'follow_up', 'demo_offer', 'custom'];
  if (!validTypes.includes(email_type)) {
    return { success: false, error: 'Invalid email_type' };
  }

  // Fetch any existing lead data for context
  let leadContext = '';
  const { data: leadData } = await supabase
    .from('montree_leads')
    .select('school_name, email, contact_person, status, source, notes')
    .ilike('school_name', `%${school_name}%`)
    .limit(1);

  if (leadData?.[0]) {
    const lead = leadData[0];
    leadContext = `\nLead info: status=${lead.status}, source=${lead.source}${lead.notes ? ', notes: ' + lead.notes : ''}`;
  }

  const greeting = contact_name ? `Hi ${contact_name}` : 'Hi there';

  let subject = '';
  let body = '';

  if (email_type === 'cold_intro') {
    subject = `Montree`;
    body = `${greeting},

I built Montree for a real Montessori classroom in Beijing — an AI system that identifies what children are working on from photos, tracks progress automatically, and generates weekly parent reports.

I'm reaching out because ${school_name} seems like exactly the kind of school that would benefit from this. We're offering a full year free to schools willing to try it and give feedback.

Would you be open to a quick look? The whole system runs from a phone — no training needed.

Best,
Tredoux
montree.xyz${leadContext ? '\n\n---\nInternal context (not in email):' + leadContext : ''}`;
  } else if (email_type === 'follow_up') {
    subject = `Following up — Montree for ${school_name}`;
    body = `${greeting},

I wanted to follow up on my earlier message about Montree. I know things get busy, so I'll keep this short.

We're live in classrooms right now. Teachers take photos, the AI identifies the Montessori work, tracks mastery, and generates parent reports — all from their phone.

If now isn't the right time, no worries at all. But if you're curious, I'd love to show you a 5-minute demo.

Best,
Tredoux
montree.xyz${leadContext ? '\n\n---\nInternal context (not in email):' + leadContext : ''}`;
  } else if (email_type === 'demo_offer') {
    subject = `Quick demo? — Montree for ${school_name}`;
    body = `${greeting},

This is my last follow-up — I wanted to offer a 15-minute live demo of Montree at your convenience. No commitment, just a walkthrough of what it does for teachers and parents.

If it's not for you, I completely understand. Thank you for your time either way.

Best,
Tredoux
montree.xyz${leadContext ? '\n\n---\nInternal context (not in email):' + leadContext : ''}`;
  } else {
    subject = `${school_name} — ${custom_context?.slice(0, 50) || 'Montree'}`;
    body = `${greeting},

${custom_context || 'No content provided.'}

Best,
Tredoux
montree.xyz${leadContext ? '\n\n---\nInternal context (not in email):' + leadContext : ''}`;
  }

  return {
    success: true,
    data: {
      school: school_name,
      contact: contact_name || 'Not specified',
      email_type,
      subject,
      body,
      has_lead_data: !!leadData?.[0],
    },
  };
}

async function executeGetCampaignStats(supabase: SupabaseClient): Promise<ToolResult> {
  const { data, error } = await supabase
    .from('montree_super_admin_audit')
    .select('*')
    .eq('action', 'email_sent')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      emails_sent_30d: data?.length || 0,
      recent_sends: data?.slice(0, 10) || [],
    },
  };
}

// MANAGEMENT TOOLS

async function executeUpdateSchoolSettings(
  input: ToolInput,
  supabase: SupabaseClient
): Promise<ToolResult> {
  const SCHOOL_UPDATABLE_FIELDS = new Set([
    'name', 'subscription_tier', 'plan_type', 'account_type', 'settings',
  ]);

  const { school_id, updates } = input;

  if (!school_id || !updates) {
    return { success: false, error: 'school_id and updates are required' };
  }

  // Whitelist updatable fields
  const safeUpdates: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(updates as Record<string, unknown>)) {
    if (SCHOOL_UPDATABLE_FIELDS.has(key)) {
      safeUpdates[key] = value;
    }
  }

  if (Object.keys(safeUpdates).length === 0) {
    return { success: false, error: `No valid fields to update. Allowed: ${[...SCHOOL_UPDATABLE_FIELDS].join(', ')}` };
  }

  const { data, error } = await supabase
    .from('montree_schools')
    .update(safeUpdates)
    .eq('id', school_id)
    .select();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      message: 'School settings updated',
      school: data?.[0],
    },
  };
}

async function executeRunNamedQuery(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult> {
  const { query_name, params } = input;

  const validQueries = [
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
  ];

  if (!validQueries.includes(query_name)) {
    return { success: false, error: `Unknown query: ${query_name}` };
  }

  switch (query_name) {
    case 'school_with_counts': {
      const { data: schools, error } = await supabase
        .from('montree_schools')
        .select('id, name, subscription_tier, plan_type, account_type, created_at')
        .order('created_at', { ascending: false })
        .limit(clampParam(params?.limit, 1, 500, 50));

      if (error) return { success: false, error: error.message };

      // Fetch counts for each school in parallel
      const enriched = await Promise.all(
        (schools || []).map(async (school: any) => {
          const [teachers, classrooms, children] = await Promise.all([
            supabase.from('montree_teachers').select('id', { count: 'exact' }).eq('school_id', school.id),
            supabase.from('montree_classrooms').select('id', { count: 'exact' }).eq('school_id', school.id),
            supabase.from('montree_children').select('id', { count: 'exact' }).eq('school_id', school.id),
          ]);
          return {
            ...school,
            teacher_count: teachers.count || 0,
            classroom_count: classrooms.count || 0,
            child_count: children.count || 0,
          };
        })
      );

      return { success: true, data: { query: query_name, schools: enriched } };
    }

    case 'api_cost_by_school_last_30d': {
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('montree_api_usage')
        .select('school_id, model_name, cost_cents, created_at')
        .gte('created_at', since);

      if (error) return { success: false, error: error.message };

      const bySchool: Record<string, { cost_cents: number; calls: number; models: Record<string, number> }> = {};
      (data || []).forEach((row: any) => {
        const sid = row.school_id || 'unknown';
        if (!bySchool[sid]) bySchool[sid] = { cost_cents: 0, calls: 0, models: {} };
        bySchool[sid].cost_cents += row.cost_cents || 0;
        bySchool[sid].calls++;
        bySchool[sid].models[row.model_name || 'unknown'] = (bySchool[sid].models[row.model_name || 'unknown'] || 0) + 1;
      });

      const total = Object.values(bySchool).reduce((s, b) => s + b.cost_cents, 0);
      return { success: true, data: { query: query_name, total_cost_cents: total, total_cost_dollars: (total / 100).toFixed(2), by_school: bySchool } };
    }

    case 'guru_usage_heatmap': {
      const since = new Date(Date.now() - clampParam(params?.days, 1, 365, 7) * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('montree_guru_interactions')
        .select('created_at, question_type, model_used')
        .gte('created_at', since)
        .limit(500);

      if (error) return { success: false, error: error.message };

      const byHour: Record<number, number> = {};
      const byDay: Record<string, number> = {};
      const byType: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        const d = new Date(row.created_at);
        byHour[d.getUTCHours()] = (byHour[d.getUTCHours()] || 0) + 1;
        const dayKey = d.toISOString().slice(0, 10);
        byDay[dayKey] = (byDay[dayKey] || 0) + 1;
        byType[row.question_type || 'unknown'] = (byType[row.question_type || 'unknown'] || 0) + 1;
      });

      return { success: true, data: { query: query_name, total: (data || []).length, by_hour_utc: byHour, by_day: byDay, by_type: byType } };
    }

    case 'children_per_classroom': {
      const { data: classrooms, error } = await supabase
        .from('montree_classrooms')
        .select('id, name, school_id, student_count, teacher_count')
        .order('student_count', { ascending: false })
        .limit(clampParam(params?.limit, 1, 500, 50));

      if (error) return { success: false, error: error.message };
      return { success: true, data: { query: query_name, classrooms } };
    }

    case 'inactive_teachers_30d': {
      const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('montree_teachers')
        .select('id, name, email, school_id, last_login_at, created_at')
        .or(`last_login_at.is.null,last_login_at.lt.${cutoff}`)
        .limit(100);

      if (error) return { success: false, error: error.message };
      return { success: true, data: { query: query_name, inactive_teachers: data, count: (data || []).length } };
    }

    case 'media_storage_by_school': {
      const { data, error } = await supabase
        .from('montree_media')
        .select('id, school_id, media_type, created_at')
        .limit(500);

      if (error) return { success: false, error: error.message };

      const bySchool: Record<string, { photos: number; videos: number; total: number }> = {};
      (data || []).forEach((row: any) => {
        const sid = row.school_id || 'unknown';
        if (!bySchool[sid]) bySchool[sid] = { photos: 0, videos: 0, total: 0 };
        bySchool[sid].total++;
        if (row.media_type === 'photo') bySchool[sid].photos++;
        else if (row.media_type === 'video') bySchool[sid].videos++;
      });

      return { success: true, data: { query: query_name, by_school: bySchool, note: 'Capped at 500 most recent media records' } };
    }

    case 'lead_source_breakdown': {
      const { data, error } = await supabase
        .from('montree_leads')
        .select('id, source, status, created_at');

      if (error) return { success: false, error: error.message };

      const bySource: Record<string, { total: number; statuses: Record<string, number> }> = {};
      (data || []).forEach((row: any) => {
        const src = row.source || 'unknown';
        if (!bySource[src]) bySource[src] = { total: 0, statuses: {} };
        bySource[src].total++;
        bySource[src].statuses[row.status || 'unknown'] = (bySource[src].statuses[row.status || 'unknown'] || 0) + 1;
      });

      return { success: true, data: { query: query_name, total_leads: (data || []).length, by_source: bySource } };
    }

    case 'visitor_geo_summary': {
      const days = clampParam(params?.days, 1, 365, 7);
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await supabase
        .from('montree_visitors')
        .select('country, city, region, timezone, device_type, created_at')
        .gte('created_at', since)
        .limit(500);

      if (error) return { success: false, error: error.message };

      const byCountry: Record<string, number> = {};
      const topCities: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        byCountry[row.country || 'unknown'] = (byCountry[row.country || 'unknown'] || 0) + 1;
        topCities[`${row.city || 'unknown'}, ${row.country || ''}`.trim()] = (topCities[`${row.city || 'unknown'}, ${row.country || ''}`.trim()] || 0) + 1;
      });

      // Sort cities by count desc, take top 15
      const sortedCities = Object.entries(topCities).sort(([, a], [, b]) => b - a).slice(0, 15);

      return { success: true, data: { query: query_name, total_visitors: (data || []).length, by_country: byCountry, top_cities: Object.fromEntries(sortedCities) } };
    }

    case 'recent_errors': {
      const { data, error } = await supabase
        .from('montree_super_admin_audit')
        .select('*')
        .or('action.eq.error,action.ilike.%error%,requires_review.eq.true')
        .order('created_at', { ascending: false })
        .limit(clampParam(params?.limit, 1, 500, 25));

      if (error) return { success: false, error: error.message };
      return { success: true, data: { query: query_name, errors: data, count: (data || []).length } };
    }

    case 'subscription_revenue': {
      const { data: schools, error } = await supabase
        .from('montree_schools')
        .select('id, name, subscription_tier, plan_type')
        .neq('subscription_tier', 'free');

      if (error) return { success: false, error: error.message };

      // Fetch child counts for paid schools
      const enriched = await Promise.all(
        (schools || []).map(async (school: any) => {
          const { count, error: countError } = await supabase.from('montree_children').select('id', { count: 'exact' }).eq('school_id', school.id);
          const childCount = countError ? 0 : (count || 0);
          const pricePerChild = school.subscription_tier === 'sonnet' ? 20 : 5; // $20 schools, $5 homeschool
          return {
            ...school,
            child_count: childCount,
            monthly_revenue_usd: childCount * pricePerChild,
          };
        })
      );

      const totalMRR = enriched.reduce((s, e) => s + e.monthly_revenue_usd, 0);

      return {
        success: true,
        data: {
          query: query_name,
          paid_schools: enriched,
          total_paid_schools: enriched.length,
          total_mrr_usd: totalMRR,
          total_arr_usd: totalMRR * 12,
        },
      };
    }

    default:
      return { success: false, error: `Unknown named query: ${query_name}` };
  }
}

async function executeGetAuditLog(input: ToolInput, supabase: SupabaseClient): Promise<ToolResult> {
  const { limit = 50, action_filter, since_hours = 24 } = input;

  if (limit > 500) {
    return { success: false, error: 'Limit must be <= 500' };
  }

  const since = new Date(Date.now() - since_hours * 60 * 60 * 1000).toISOString();

  let query = supabase
    .from('montree_super_admin_audit')
    .select('*')
    .gte('created_at', since)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (action_filter) {
    query = query.eq('action', action_filter);
  }

  const { data, error } = await query;

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      entries: data || [],
      count: data?.length || 0,
      since_hours,
      action_filter: action_filter || 'all',
    },
  };
}
