// app/api/montree/school-features/route.ts
// Feature Switchboard — school-facing (self-serve) surface.
//   GET  → the school's own features, resolved (override ?? default)
//   POST → { feature_key, enabled }  single toggle
//
// Both methods are hard-gated on the Give Control switch: the super admin must
// have turned 'feature_self_serve' ON for this school, otherwise 403
// { error: 'self_serve_disabled' } — which the dashboard page renders as a
// friendly "ask Montree to unlock school controls" state.
//
// The school never sees (nor can post) the keys below: Give Control itself,
// the AI billing tier, and the encryption/security infrastructure flags.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';
import { isFeatureEnabled, invalidateFeatureCache } from '@/lib/montree/features/server';
import { syncTeacherMenusForSchool, MENU_SYNCED_FEATURE_KEYS } from '@/lib/montree/features/menu-sync';

const SELF_SERVE_KEY = 'feature_self_serve';

/**
 * Keys a school may never toggle for itself:
 *  • feature_self_serve — only Montree grants/revokes Give Control.
 *  • ai_tier_*          — that's the AI billing tier (haiku/sonnet spend).
 *  • encryption*        — security infrastructure; flipping it mid-flight
 *                         strands already-encrypted rows.
 */
function isSchoolBlockedKey(featureKey: string): boolean {
  return (
    featureKey === SELF_SERVE_KEY ||
    featureKey.startsWith('ai_tier_') ||
    featureKey.startsWith('encryption')
  );
}

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

function selfServeDisabled() {
  return NextResponse.json({ success: false, error: 'self_serve_disabled' }, { status: 403 });
}

// ── GET ───────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const supabase = getSupabase();
    if (!(await isFeatureEnabled(supabase, auth.schoolId, SELF_SERVE_KEY))) {
      return selfServeDisabled();
    }

    const [defsResult, overridesResult] = await Promise.all([
      supabase.from('montree_feature_definitions').select('*').order('category', { ascending: true }),
      supabase.from('montree_school_features').select('feature_key, enabled').eq('school_id', auth.schoolId),
    ]);

    if (defsResult.error) {
      console.error('[school-features] definitions query error:', defsResult.error.message);
      return NextResponse.json({ success: false, error: 'Failed to load features' }, { status: 500 });
    }

    const overrides = new Map<string, boolean>();
    ((overridesResult.data || []) as SchoolFeatureRow[]).forEach((row) => overrides.set(row.feature_key, row.enabled));

    const features = ((defsResult.data || []) as FeatureDefinitionRow[])
      .filter((def) => !isSchoolBlockedKey(def.feature_key))
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
        self_serve_enabled: true,
        menu_synced_keys: MENU_SYNCED_FEATURE_KEYS,
      },
      { headers: { 'Cache-Control': 'private, no-cache' } }
    );
  } catch (error) {
    console.error('[school-features] GET error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}

// ── POST ──────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const auth = await verifySchoolRequest(request);
  if (auth instanceof NextResponse) return auth;

  let body: { feature_key?: string; enabled?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const featureKey = body?.feature_key;
  const enabled = body?.enabled;
  if (!featureKey || typeof enabled !== 'boolean') {
    return NextResponse.json(
      { success: false, error: 'feature_key and enabled required' },
      { status: 400 }
    );
  }

  try {
    const supabase = getSupabase();
    if (!(await isFeatureEnabled(supabase, auth.schoolId, SELF_SERVE_KEY))) {
      return selfServeDisabled();
    }

    // Enforced server-side, not just hidden in the UI.
    if (isSchoolBlockedKey(featureKey)) {
      return NextResponse.json(
        { success: false, error: 'This feature can only be changed by Montree' },
        { status: 403 }
      );
    }

    // Only real, defined features — no writing arbitrary keys into the table.
    const { data: def } = await supabase
      .from('montree_feature_definitions')
      .select('feature_key')
      .eq('feature_key', featureKey)
      .maybeSingle();

    if (!def) {
      return NextResponse.json({ success: false, error: 'Unknown feature' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('montree_school_features')
      .upsert(
        {
          school_id: auth.schoolId,
          feature_key: featureKey,
          enabled,
          enabled_by: 'school_self_serve',
          enabled_at: new Date().toISOString(),
        },
        { onConflict: 'school_id,feature_key' }
      )
      .select()
      .maybeSingle();

    if (error) {
      console.error('[school-features] toggle failed:', error.message);
      return NextResponse.json({ success: false, error: 'Failed to toggle feature' }, { status: 500 });
    }

    const menuSync = await syncTeacherMenusForSchool(supabase, auth.schoolId, featureKey, enabled);
    invalidateFeatureCache(auth.schoolId, featureKey);

    return NextResponse.json({ success: true, toggle: data, menuSync });
  } catch (error) {
    console.error('[school-features] POST error:', error);
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 });
  }
}
