// /api/home/curriculum/update/route.ts
// Toggle active/inactive, update sequence, or edit work details
// Audit fixes: area enum validation, sequence bounds check, standardized errors

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';

const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

function errorResponse(error: string, debug?: Record<string, unknown>, status = 500) {
  return NextResponse.json({ success: false, error, ...(debug ? { debug } : {}) }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { work_id } = body;

    if (!work_id) {
      return errorResponse('work_id required', undefined, 400);
    }

    const supabase = getSupabase();

    // Build update object from provided fields
    const updates: Record<string, unknown> = {};
    if (typeof body.is_active === 'boolean') updates.is_active = body.is_active;
    if (typeof body.sequence === 'number') {
      if (body.sequence < 0) {
        return errorResponse('sequence must be >= 0', undefined, 400);
      }
      updates.sequence = body.sequence;
    }
    if (typeof body.work_name === 'string' && body.work_name.trim()) updates.work_name = body.work_name.trim();
    if (typeof body.area === 'string' && body.area.trim()) {
      const area = body.area.trim();
      if (!VALID_AREAS.includes(area as typeof VALID_AREAS[number])) {
        return errorResponse(
          `Invalid area "${area}". Must be one of: ${VALID_AREAS.join(', ')}`,
          undefined,
          400,
        );
      }
      updates.area = area;
    }
    if (typeof body.category === 'string') updates.category = body.category.trim();

    if (Object.keys(updates).length === 0) {
      return errorResponse('No valid fields to update', undefined, 400);
    }

    const { data: updated, error } = await supabase
      .from('home_curriculum')
      .update(updates)
      .eq('id', work_id)
      .select()
      .single();

    if (error) {
      console.error('Curriculum update error:', error.message, error.code);
      return errorResponse('Failed to update work', {
        message: error.message, code: error.code,
      });
    }

    return NextResponse.json({ success: true, work: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Curriculum update error:', message);
    return errorResponse('Server error', { message });
  }
}
