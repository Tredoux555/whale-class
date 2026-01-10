// /app/api/unified/families/route.ts
// UNIFIED API: Family accounts for parent portal
// Uses the new unified `families` table + `children` table

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// GET: Lookup family by email or ID
export async function GET(request: NextRequest) {
  const supabase = getSupabase();
  const { searchParams } = new URL(request.url);
  const email = searchParams.get('email');
  const id = searchParams.get('id');

  try {
    // Try unified families table first
    let query = supabase.from('families').select('*');

    if (email) {
      query = query.ilike('email', email.trim());
    } else if (id) {
      query = query.eq('id', id);
    } else {
      return NextResponse.json({ error: 'email or id required' }, { status: 400 });
    }

    const { data: families, error } = await query;
    
    if (error) {
      console.error('Families table error:', error);
      // Table might not exist yet - return empty
      return NextResponse.json({ families: [] });
    }

    // For each family, get their children from the unified children table
    const familiesWithChildren = await Promise.all(
      (families || []).map(async (family) => {
        const { data: children } = await supabase
          .from('children')
          .select('id, name, date_of_birth, color, active_status')
          .eq('family_id', family.id)
          .eq('active_status', true)
          .order('name');

        return {
          ...family,
          children: (children || []).map(c => ({
            id: c.id,
            name: c.name,
            birth_date: c.date_of_birth, // Map to expected field name
            color: c.color || '#4F46E5'
          }))
        };
      })
    );

    return NextResponse.json({ families: familiesWithChildren });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching families:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST: Create a new family account
export async function POST(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || !email) {
      return NextResponse.json({ error: 'name and email required' }, { status: 400 });
    }

    // Check if family already exists
    const { data: existing } = await supabase
      .from('families')
      .select('*')
      .ilike('email', email.trim())
      .single();

    if (existing) {
      return NextResponse.json({ family: existing, existing: true });
    }

    // Create new family
    const { data: family, error } = await supabase
      .from('families')
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || null
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ family, created: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating family:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Update family (materials, plans, etc.)
export async function PUT(request: NextRequest) {
  const supabase = getSupabase();
  
  try {
    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 });
    }

    // Only allow certain fields to be updated
    const allowedFields = ['name', 'phone', 'materials_owned', 'weekly_plans'];
    const safeUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        safeUpdates[field] = updates[field];
      }
    }

    const { data: family, error } = await supabase
      .from('families')
      .update(safeUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ family });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating family:', error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
