// app/api/montree/guru/settings/route.ts
// GET/PUT per-school Guru personality settings
// Stored in montree_schools.settings.guru_personality JSONB

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

const VALID_TONES = ['warm_nurturing', 'professional_direct', 'analytical', 'balanced'] as const;
const VALID_COMMUNICATION_STYLES = ['formal', 'casual', 'balanced'] as const;
const VALID_AGE_RANGES = ['0-3', '3-6', '6-9', 'mixed'] as const;
const VALID_AREAS = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'] as const;

const MAX_LENGTHS = {
  philosophy: 500,
  materials_note: 500,
  language_preference: 200,
  custom_instructions: 1000,
} as const;

// Basic sanitization — strip common prompt injection patterns
function sanitizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/ignore\s+(all\s+)?previous\s+instructions/gi, '[removed]')
    .replace(/you\s+are\s+now\s+a/gi, '[removed]')
    .replace(/system\s*:/gi, '[removed]')
    .replace(/\bprompt\s*:/gi, '[removed]')
    .trim();
}

// GET: Fetch school's guru personality settings
export async function GET(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const supabase = getSupabase();
    const { data: school, error } = await supabase
      .from('montree_schools')
      .select('settings')
      .eq('id', auth.schoolId)
      .maybeSingle();

    if (error) throw error;

    const settings = (school?.settings as Record<string, unknown>) || {};
    const guruPersonality = (settings.guru_personality as Record<string, unknown>) || null;

    return NextResponse.json({
      success: true,
      guru_personality: guruPersonality,
    }, {
      headers: { 'Cache-Control': 'private, max-age=300, stale-while-revalidate=600' }
    });
  } catch (error) {
    console.error('[Guru Settings] GET error:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch guru settings' }, { status: 500 });
  }
}

// PUT: Update school's guru personality settings
export async function PUT(request: NextRequest) {
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) return auth;

    const body = await request.json();
    const { guru_personality } = body;

    if (!guru_personality || typeof guru_personality !== 'object') {
      return NextResponse.json({ success: false, error: 'guru_personality object is required' }, { status: 400 });
    }

    // Validate and sanitize each field
    const validated: Record<string, unknown> = {};

    // Tone
    if (guru_personality.tone) {
      if (!VALID_TONES.includes(guru_personality.tone)) {
        return NextResponse.json({ success: false, error: `Invalid tone. Must be one of: ${VALID_TONES.join(', ')}` }, { status: 400 });
      }
      validated.tone = guru_personality.tone;
    }

    // Communication style
    if (guru_personality.communication_style) {
      if (!VALID_COMMUNICATION_STYLES.includes(guru_personality.communication_style)) {
        return NextResponse.json({ success: false, error: `Invalid communication_style. Must be one of: ${VALID_COMMUNICATION_STYLES.join(', ')}` }, { status: 400 });
      }
      validated.communication_style = guru_personality.communication_style;
    }

    // Age range focus
    if (guru_personality.age_range_focus) {
      if (!VALID_AGE_RANGES.includes(guru_personality.age_range_focus)) {
        return NextResponse.json({ success: false, error: `Invalid age_range_focus. Must be one of: ${VALID_AGE_RANGES.join(', ')}` }, { status: 400 });
      }
      validated.age_range_focus = guru_personality.age_range_focus;
    }

    // Focus areas (array of valid area strings)
    if (guru_personality.focus_areas) {
      if (!Array.isArray(guru_personality.focus_areas)) {
        return NextResponse.json({ success: false, error: 'focus_areas must be an array' }, { status: 400 });
      }
      const invalidAreas = guru_personality.focus_areas.filter((a: string) => !VALID_AREAS.includes(a as typeof VALID_AREAS[number]));
      if (invalidAreas.length > 0) {
        return NextResponse.json({ success: false, error: `Invalid focus areas: ${invalidAreas.join(', ')}` }, { status: 400 });
      }
      validated.focus_areas = guru_personality.focus_areas;
    }

    // Free text fields with length limits + sanitization
    for (const [field, maxLen] of Object.entries(MAX_LENGTHS)) {
      if (guru_personality[field] !== undefined && guru_personality[field] !== null) {
        if (typeof guru_personality[field] !== 'string') {
          return NextResponse.json({ success: false, error: `${field} must be a string` }, { status: 400 });
        }
        const text = guru_personality[field] as string;
        if (text.length > maxLen) {
          return NextResponse.json({ success: false, error: `${field} must be ${maxLen} characters or less` }, { status: 400 });
        }
        validated[field] = sanitizeText(text);
      }
    }

    // Read current settings, merge guru_personality
    const supabase = getSupabase();
    const { data: school } = await supabase
      .from('montree_schools')
      .select('settings')
      .eq('id', auth.schoolId)
      .single();

    const currentSettings = (school?.settings as Record<string, unknown>) || {};
    const updatedSettings = {
      ...currentSettings,
      guru_personality: validated,
    };

    const { error } = await supabase
      .from('montree_schools')
      .update({ settings: updatedSettings })
      .eq('id', auth.schoolId);

    if (error) throw error;

    return NextResponse.json({ success: true, guru_personality: validated });
  } catch (error) {
    console.error('[Guru Settings] PUT error:', error);
    return NextResponse.json({ success: false, error: 'Failed to save guru settings' }, { status: 500 });
  }
}
