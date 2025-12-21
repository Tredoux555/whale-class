// app/api/montree/children/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getChildren, createChild } from '@/lib/montree/db';

export async function GET() {
  try {
    const children = await getChildren();
    return NextResponse.json(children);
  } catch (error) {
    console.error('Error fetching children:', error);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { name, dateOfBirth, parentId } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const child = await createChild(name, dateOfBirth, parentId);
    return NextResponse.json(child);
  } catch (error) {
    console.error('Error creating child:', error);
    return NextResponse.json({ error: 'Failed to create child' }, { status: 500 });
  }
}

