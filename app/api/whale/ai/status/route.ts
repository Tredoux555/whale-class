// app/api/whale/ai/status/route.ts
// Check AI feature status

import { NextResponse } from 'next/server';
import { AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';

export async function GET() {
  return NextResponse.json({
    enabled: AI_ENABLED,
    model: AI_ENABLED ? AI_MODEL : null,
    features: AI_ENABLED 
      ? ['daily-plan', 'weekly-plan', 'activity-guidance']
      : [],
  });
}


