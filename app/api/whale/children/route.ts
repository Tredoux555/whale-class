// app/api/whale/children/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChildren, createChild } from '@/lib/db/children';
import type { CreateChildInput, AgeGroup } from '@/types/database';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('active') === 'true';
    const ageGroup = searchParams.get('ageGroup') as AgeGroup | null;
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined;
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : undefined;

    const children = await getChildren({ activeOnly, ageGroup: ageGroup || undefined, limit, offset });
    return NextResponse.json({ data: children, total: children.length });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || 'Failed to fetch children' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const requiredFields = ['name', 'date_of_birth', 'age_group'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
      }
    }

    const input: CreateChildInput = {
      name: body.name,
      date_of_birth: body.date_of_birth,
      age_group: body.age_group,
      enrollment_date: body.enrollment_date,
      photo_url: body.photo_url,
      parent_email: body.parent_email,
      parent_name: body.parent_name,
      notes: body.notes,
    };

    const child = await createChild(input);
    return NextResponse.json({ data: child, message: 'Child created successfully' }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || 'Failed to create child' }, { status: 500 });
  }
}
