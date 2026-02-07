// app/api/whale/ai/status/route.ts
// Check AI feature status

import { NextResponse } from 'next/server';
import { AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';

export async function GET() {
  try {
    return NextResponse.json({
      enabled: AI_ENABLED,
      model: AI_ENABLED ? AI_MODEL : null,
      features: AI_ENABLED
        ? ['daily-plan', 'weekly-plan', 'activity-guidance']
        : [],
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    console.error('[AI Status] Error:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


