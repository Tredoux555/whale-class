// app/api/montree/children/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('children')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error fetching children:', error);
    return NextResponse.json({ error: 'Failed to fetch children' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, dateOfBirth, parentId } = await req.json();
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    
    const { data, error } = await supabase
      .from('children')
      .insert([{ name, date_of_birth: dateOfBirth, parent_id: parentId }])
      .select()
      .single();
    
    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error creating child:', error);
    return NextResponse.json({ error: 'Failed to create child' }, { status: 500 });
  }
}

