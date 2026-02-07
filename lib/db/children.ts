// lib/db/children.ts
import { createServerClient, createAdminClient } from '@/lib/supabase-client';
import type { Child, CreateChildInput, UpdateChildInput, AgeGroup } from '@/types/database';

export async function createChild(input: CreateChildInput): Promise<Child> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('children')
    .insert({
      name: input.name,
      date_of_birth: input.date_of_birth,
      enrollment_date: input.enrollment_date || new Date().toISOString().split('T')[0],
      age_group: input.age_group,
      photo_url: input.photo_url,
      parent_email: input.parent_email,
      parent_name: input.parent_name,
      notes: input.notes,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to create child: ${error.message}`);
  return data;
}

export async function getChildById(childId: string): Promise<Child | null> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('id', childId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw new Error(`Failed to get child: ${error.message}`);
  }
  return data;
}

export interface GetChildrenOptions {
  activeOnly?: boolean;
  ageGroup?: AgeGroup;
  limit?: number;
  offset?: number;
}

export async function getChildren(options: GetChildrenOptions = {}): Promise<Child[]> {
  const supabase = await createServerClient();
  let query = supabase.from('children').select('*').order('name', { ascending: true });

  if (options.activeOnly) query = query.eq('active_status', true);
  if (options.ageGroup) query = query.eq('age_group', options.ageGroup);
  if (options.limit) query = query.limit(options.limit);
  if (options.offset) query = query.range(options.offset, options.offset + (options.limit || 10) - 1);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to get children: ${error.message}`);
  return data || [];
}

export async function updateChild(childId: string, input: UpdateChildInput): Promise<Child> {
  const supabase = await createServerClient();
  const { data, error } = await supabase
    .from('children')
    .update(input)
    .eq('id', childId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update child: ${error.message}`);
  return data;
}

export async function deactivateChild(childId: string): Promise<Child> {
  return updateChild(childId, { active_status: false });
}

export function calculateAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

export function calculateDecimalAge(dateOfBirth: string): number {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  const yearsDiff = today.getFullYear() - birthDate.getFullYear();
  const monthsDiff = today.getMonth() - birthDate.getMonth();
  const ageInMonths = yearsDiff * 12 + monthsDiff;
  return Math.round((ageInMonths / 12) * 10) / 10;
}
