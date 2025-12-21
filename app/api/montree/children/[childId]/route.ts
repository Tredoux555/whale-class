// app/api/montree/children/[childId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChildById, deleteChild } from '@/lib/montree/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;
    const child = await getChildById(childId);
    if (!child) {
      return NextResponse.json({ error: 'Child not found' }, { status: 404 });
    }
    return NextResponse.json(child);
  } catch (error) {
    console.error('Error fetching child:', error);
    return NextResponse.json({ error: 'Failed to fetch child' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ childId: string }> }
) {
  try {
    const { childId } = await params;
    await deleteChild(childId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting child:', error);
    return NextResponse.json({ error: 'Failed to delete child' }, { status: 500 });
  }
}

