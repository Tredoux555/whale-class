// app/api/montree/super-admin/school-features/route.ts
// Feature Switchboard — super-admin surface.
//   GET  ?school_id=…  → every feature definition with its resolved state for
//                        this school, plus the Give Control flag.
//   POST { school_id, action } → toggle | set_all | give_control
//
// Why this exists next to /api/montree/features (which stays for teacher +
// classroom-scoped toggles):
//   1. That route's POST does NOT invalidate the server-side feature cache, so
//      a flip took up to 30s (FEATURE_CACHE_TTL_MS) to reach gated API routes.
//      Every write here calls invalidateFeatureCache().
//   2. Bulk enable/disable was N sequential POSTs from the modal. set_all is a
//      single .upsert(array).
//   3. Toggling a feature that owns a menu item now rewrites the school's
//      teachers' saved menus (see lib/montree/features/menu-sync.ts) — the
//      saved menu, when present, outranks the flag in DashboardHeader.
//
// Give Control ('feature_self_serve') is a plain montree_school_features
// override row — NO migration, no definition row. Absent = OFF.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { invalidateFeatureCache } from '@/lib/montree/features/server';
import {
  syncTeacherMenusForSchool,
  MENU_SYNCED_FEATURE_KEYS,
  FEATURE_MENU_MAP,
  type MenuSyncResult,
} from '@/lib/montree/features/menu-sync';
import type { FeatureKey } from '@/lib/montree/features/types';

/** The Give Control switch. Deliberately NOT a feature-definition row. */
export const SELF_SERVE_KEY = 'feature_self_serve';

interface FeatureDefinitionRow {
  feature_key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  is_premium: boolean;
  default_enabled: boolean;
}

interface SchoolFeatureRow {
  feature_key: string;
  enabled: boolean;
}

function unauthorized() {
  return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
}

function emptySync(): MenuSyncResult {
  return { mapped: false, teachersUpdated: 0, teachersSkipped: 0, errors: [] };
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const superAdminCheck = await verifySuperAdminAuth(request.headers);
  if (!superAdminCheck.valid) return unauthorized();

  try {
    const { searchParams } = new URL(request.url);
    const schoolId = searchParams.get('school_id');
    if (!schoolId) {
      return NextResponse.json({ success: false, error: 'school_id required' }, { status: 400 });
    }

    const supabase = getSupabase();
    const [defsResult, overridesResult] = await Promise.all([
      supabase.from('montree_feature_definitions').select('*').order('category', { ascending: true }),
      supabase.from('montree_school_features').select('feature_key, enabled').eq('school_id', schoolId),
    ]);

    if (defsResult.error) {
      console.error('[super-admin/school-features] definitions query error:', defsResult.error.message);
      return NextResponse.json({ success: false, error: 'Failed to load features' }, { status: 500 });
    }

    const overrides = new Map<string, boolean>();
    ((overridesResult.data || []) as SchoolFeatureRow[]).forEach((row) => overrides.set(row.feature_key, row.enabled));

    const features = ((defsResult.data || []) as FeatureDefinitionRow[])
      .filter((def) => def.feature_key !== SELF_SERVE_KEY)
      .map((def) => {
        const override = overrides.get(def.feature_key);
        return {
          feature_key: def.feature_key,
          name: def.name,
          description: def.description,
          icon: def.icon,
          category: def.category,
          is_premium: def.is_premium,
          default_enabled: def.default_enabled,
          enabled: override ?? def.default_enabled,
          overridden: override !== undefined,
        };
      });

    return NextResponse.json(
      {
        success: true,
        features,
        self_serve_enabled: overrides.get(SELF_SERVE_KEY) ?? false,
        menu_synced_keys: MENU_SYNCED_FEATURE_KEYS,
      },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    );
  } catch (error) {
    console.error('[super-admin/school-features] GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
type Action =
  | { type: 'toggle'; feature_key: string; enabled: boolean }
  | { type: 'set_all'; enabled: boolean }
  | { type: 'give_control'; enabled: boolean };

export async function POST(request: NextRequest) {
  const superAdminCheck = await verifySuperAdminAuth(request.headers);
  if (!superAdminCheck.valid) return unauthorized();

  let body: { school_id?: string; action?: Action };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const schoolId = body?.school_id;
  const action = body?.action;
  if (!schoolId) {
    return NextResponse.json({ success: false, error: 'school_id required' }, { status: 400 });
  }
  if (!action || typeof action.type !== 'string') {
    return NextResponse.json({ success: false, error: 'action required' }, { status: 400 });
  }

  const supabase = getSupabase();
  const now = new Date().toISOString();

  try {
    // ── toggle one feature ────────────────────────────────────────────────
    if (action.type === 'toggle') {
      const { feature_key, enabled } = action;
      if (!feature_key || typeof enabled !== 'boolean') {
        return NextResponse.json(
          { success: false, error: 'feature_key and enabled required' },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('montree_school_features')
        .upsert(
          {
            school_id: schoolId,
            feature_key,
            enabled,
            enabled_by: 'super_admin',
            enabled_at: now,
          },
          { onConflict: 'school_id,feature_key' }
        )
        .select()
        .maybeSingle();

      if (error) {
        console.error('[super-admin/school-features] toggle failed:', error.message);
        return NextResponse.json({ success: false, error: 'Failed to toggle feature' }, { status: 500 });
      }

      const menuSync = await syncTeacherMenusForSchool(supabase, schoolId, feature_key, enabled);
      invalidateFeatureCache(schoolId, feature_key);

      return NextResponse.json({ success: true, toggle: data, menuSync });
    }

    // ── set every feature at once ─────────────────────────────────────────
    if (action.type === 'set_all') {
      const { enabled } = action;
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ success: false, error: 'enabled required' }, { status: 400 });
      }

      const { data: defs, error: defsError } = await supabase
        .from('montree_feature_definitions')
        .select('feature_key');

      if (defsError) {
        console.error('[super-admin/school-features] definitions query error:', defsError.message);
        return NextResponse.json({ success: false, error: 'Failed to load features' }, { status: 500 });
      }

      // Give Control is never part of a bulk sweep — handing a school the keys
      // (or taking them back) is always a deliberate, separate act.
      const keys = ((defs || []) as { feature_key: string }[])
        .map((d) => d.feature_key)
        .filter((k) => k !== SELF_SERVE_KEY);

      if (keys.length === 0) {
        return NextResponse.json({ success: true, updated: 0, menuSync: emptySync() });
      }

      const { error: upsertError } = await supabase.from('montree_school_features').upsert(
        keys.map((feature_key) => ({
          school_id: schoolId,
          feature_key,
          enabled,
          enabled_by: 'super_admin',
          enabled_at: now,
        })),
        { onConflict: 'school_id,feature_key' }
      );

      if (upsertError) {
        console.error('[super-admin/school-features] set_all failed:', upsertError.message);
        return NextResponse.json({ success: false, error: 'Failed to update features' }, { status: 500 });
      }

      // Menu sync for every mapped key that actually exists in this school's
      // definition set — sequential, and tolerant of per-teacher failures.
      const totals: MenuSyncResult = { mapped: true, teachersUpdated: 0, teachersSkipped: 0, errors: [] };
      for (const key of keys) {
        if (!FEATURE_MENU_MAP[key as FeatureKey]) continue;
        const r = await syncTeacherMenusForSchool(supabase, schoolId, key, enabled);
        totals.teachersUpdated += r.teachersUpdated;
        totals.teachersSkipped = Math.max(totals.teachersSkipped, r.teachersSkipped);
        totals.errors.push(...r.errors);
      }

      invalidateFeatureCache(schoolId);

      return NextResponse.json({ success: true, updated: keys.length, menuSync: totals });
    }

    // ── Give Control ──────────────────────────────────────────────────────
    if (action.type === 'give_control') {
      const { enabled } = action;
      if (typeof enabled !== 'boolean') {
        return NextResponse.json({ success: false, error: 'enabled required' }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('montree_school_features')
        .upsert(
          {
            school_id: schoolId,
            feature_key: SELF_SERVE_KEY,
            enabled,
            enabled_by: 'super_admin',
            enabled_at: now,
          },
          { onConflict: 'school_id,feature_key' }
        )
        .select()
        .maybeSingle();

      if (error) {
        console.error('[super-admin/school-features] give_control failed:', error.message);
        return NextResponse.json({ success: false, error: 'Failed to update Give Control' }, { status: 500 });
      }

      invalidateFeatureCache(schoolId, SELF_SERVE_KEY);

      // No menu sync — feature_self_serve owns no menu item; it only unlocks the
      // school-facing switchboard row in the dashboard More menu.
      return NextResponse.json({ success: true, toggle: data, self_serve_enabled: enabled, menuSync: emptySync() });
    }

    return NextResponse.json({ success: false, error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[super-admin/school-features] POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
