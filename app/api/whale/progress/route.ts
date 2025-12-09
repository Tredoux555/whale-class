// app/api/whale/progress/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChildProgress, upsertProgress } from '@/lib/db/progress';
import type { CreateProgressInput, CurriculumArea } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('childId');
    const area = searchParams.get('area') as CurriculumArea | null;

    if (!childId) return NextResponse.json({ error: 'childId is required' }, { status: 400 });

    const progress = await getChildProgress(childId, area || undefined);
    return NextResponse.json({ data: progress });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch progress' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (!body.child_id || !body.skill_id) {
      return NextResponse.json({ error: 'child_id and skill_id are required' }, { status: 400 });
    }

    const input: CreateProgressInput = {
      child_id: body.child_id,
      skill_id: body.skill_id,
      status_level: body.status_level || 0,
      notes: body.notes,
      teacher_initials: body.teacher_initials,
    };

    const progress = await upsertProgress(input);
    return NextResponse.json({ data: progress, message: 'Progress updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update progress' }, { status: 500 });
  }
}
