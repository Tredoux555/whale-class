// app/api/whale/children/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChildById, updateChild, deactivateChild } from '@/lib/db/children';
import type { UpdateChildInput } from '@/types/database';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const child = await getChildById(id);
    if (!child) return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    return NextResponse.json({ data: child });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch child' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const input: UpdateChildInput = {
      name: body.name,
      date_of_birth: body.date_of_birth,
      age_group: body.age_group,
      active_status: body.active_status,
      photo_url: body.photo_url,
      parent_email: body.parent_email,
      parent_name: body.parent_name,
      notes: body.notes,
    };

    Object.keys(input).forEach(key => 
      input[key as keyof UpdateChildInput] === undefined && delete input[key as keyof UpdateChildInput]
    );

    const child = await updateChild(id, input);
    return NextResponse.json({ data: child, message: 'Child updated successfully' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to update child' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await deactivateChild(id);
    return NextResponse.json({ message: 'Child deactivated' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to delete child' }, { status: 500 });
  }
}
