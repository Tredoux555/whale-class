import { NextRequest, NextResponse } from 'next/server';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabase: SupabaseClient | null = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase not configured');
    supabase = createClient(url, key);
  }
  return supabase;
}

export async function GET(request: NextRequest) {
  try {
    const sb = getSupabase();
    const { searchParams } = new URL(request.url);
    const childId = searchParams.get('child_id');

    if (!childId) return NextResponse.json({ error: 'child_id required' }, { status: 400 });

    const { data, error } = await sb.from('parent_messages').select('*').eq('child_id', childId).order('created_at', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ messages: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const sb = getSupabase();
    const body = await request.json();
    const { child_id, sender_type, sender_name, message } = body;

    if (!child_id || !sender_type || !sender_name || !message) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const { data, error } = await sb.from('parent_messages').insert({ child_id, sender_type, sender_name, message }).select().single();
    if (error) throw error;

    return NextResponse.json({ message: data });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
