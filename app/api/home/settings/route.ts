// /api/home/settings/route.ts
// Family settings CRUD

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

// GET - Get family settings
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const familyId = searchParams.get('family_id');

    if (!familyId) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    const { data: family, error } = await supabase
      .from('home_families')
      .select('id, name, email, plan, settings, created_at, updated_at')
      .eq('id', familyId)
      .single();

    if (error || !family) {
      return errorResponse('Family not found', { message: error?.message }, 404);
    }

    return NextResponse.json({
      success: true,
      family: {
        id: family.id,
        name: family.name,
        email: family.email,
        plan: family.plan,
        settings: family.settings || {},
        created_at: family.created_at,
        updated_at: family.updated_at,
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Settings GET error:', message);
    return errorResponse('Server error', { message });
  }
}

// PATCH - Update family settings
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { family_id, settings, name, email } = body;

    if (!family_id) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify family exists
    const { data: family, error: findError } = await supabase
      .from('home_families')
      .select('id')
      .eq('id', family_id)
      .single();

    if (findError || !family) {
      return errorResponse('Family not found', { message: findError?.message }, 404);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (settings !== undefined) updates.settings = settings;

    if (Object.keys(updates).length === 1) {
      // Only has updated_at
      return errorResponse('No updates provided', undefined, 400);
    }

    const { data: updatedFamily, error: updateError } = await supabase
      .from('home_families')
      .update(updates)
      .eq('id', family_id)
      .select()
      .single();

    if (updateError) {
      console.error('Settings update error:', updateError.message);
      return errorResponse('Failed to update settings', { message: updateError.message });
    }

    return NextResponse.json({
      success: true,
      family: {
        id: updatedFamily.id,
        name: updatedFamily.name,
        email: updatedFamily.email,
        plan: updatedFamily.plan,
        settings: updatedFamily.settings || {},
        updated_at: updatedFamily.updated_at,
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Settings PATCH error:', message);
    return errorResponse('Server error', { message });
  }
}

// PUT - Full family update (name, email, plan)
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { family_id, name, email, plan } = body;

    if (!family_id) {
      return errorResponse('family_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Verify family exists
    const { data: family, error: findError } = await supabase
      .from('home_families')
      .select('id')
      .eq('id', family_id)
      .single();

    if (findError || !family) {
      return errorResponse('Family not found', { message: findError?.message }, 404);
    }

    const updates: Record<string, unknown> = {
      updated_at: new Date().toISOString()
    };

    if (name !== undefined) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim().toLowerCase();
    if (plan !== undefined) updates.plan = plan;

    if (Object.keys(updates).length === 1) {
      return errorResponse('No updates provided', undefined, 400);
    }

    const { data: updatedFamily, error: updateError } = await supabase
      .from('home_families')
      .update(updates)
      .eq('id', family_id)
      .select()
      .single();

    if (updateError) {
      console.error('Family update error:', updateError.message);
      return errorResponse('Failed to update family', { message: updateError.message });
    }

    return NextResponse.json({
      success: true,
      family: {
        id: updatedFamily.id,
        name: updatedFamily.name,
        email: updatedFamily.email,
        plan: updatedFamily.plan,
        settings: updatedFamily.settings || {},
        updated_at: updatedFamily.updated_at,
      }
    });

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Settings PUT error:', message);
    return errorResponse('Server error', { message });
  }
}
