// app/api/montree/schools/route.ts
// API endpoints for school management
// POST - Create school + auto-seed curriculum
// GET - List all schools

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { seedSchoolCurriculum } from '@/lib/montree/seed';

// GET /api/montree/schools - List all schools
export async function GET() {
  try {
    const supabase = await createServerClient();
    
    const { data: schools, error } = await supabase
      .from('montree_schools')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    
    return NextResponse.json({ schools });
  } catch (error) {
    console.error('Error fetching schools:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schools' },
      { status: 500 }
    );
  }
}

// POST /api/montree/schools - Create school + seed curriculum
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, slug, owner_email, owner_name } = body;
    
    // Validate required fields
    if (!name || !slug || !owner_email) {
      return NextResponse.json(
        { error: 'Missing required fields: name, slug, owner_email' },
        { status: 400 }
      );
    }
    
    // Validate slug format (lowercase, numbers, hyphens only)
    const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugRegex.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format. Use lowercase letters, numbers, and hyphens only (e.g., "my-school-123")' },
        { status: 400 }
      );
    }
    
    const supabase = await createServerClient();
    
    // Create the school
    const { data: school, error: createError } = await supabase
      .from('montree_schools')
      .insert({
        name,
        slug,
        owner_email,
        owner_name: owner_name || null,
        subscription_status: 'trialing',
        plan_type: 'school',
      })
      .select()
      .single();
    
    if (createError) {
      // Check if it's a duplicate slug error
      if (createError.code === '23505') {
        return NextResponse.json(
          { error: 'A school with this slug already exists' },
          { status: 409 }
        );
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    // Seed the curriculum from master stem
    const seedResult = await seedSchoolCurriculum(school.id);
    
    if (!seedResult.success) {
      // School created but seeding failed - log but don't fail
      console.error('Failed to seed school curriculum:', seedResult.error);
    }
    
    return NextResponse.json({
      school,
      curriculum: {
        seeded: seedResult.success,
        areas: seedResult.areasCreated,
        works: seedResult.worksCreated,
        error: seedResult.error,
      },
    }, { status: 201 });
    
  } catch (error) {
    console.error('Error creating school:', error);
    return NextResponse.json(
      { error: 'Failed to create school' },
      { status: 500 }
    );
  }
}
