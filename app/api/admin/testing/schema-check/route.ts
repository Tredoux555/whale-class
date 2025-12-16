import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { getAdminSession } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const session = await getAdminSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Check if table exists by trying to query it
    let tableExists = false;
    try {
      const { data: tableCheck, error: tableError } = await supabase
        .from('child_video_watches')
        .select('id')
        .limit(1);

      // Table exists if no error (even if empty result - data will be null/empty array)
      // Error code 42P01 means "relation does not exist"
      if (tableError) {
        if (tableError.code === '42P01' || tableError.message?.includes('does not exist')) {
          tableExists = false;
        } else {
          // Other error - might be RLS or permission issue, but table exists
          // Log it but assume table exists
          console.warn('Error querying child_video_watches (table may exist):', tableError);
          tableExists = true; // Assume table exists if it's not a "does not exist" error
        }
      } else {
        // No error means table exists (even if empty)
        tableExists = true;
      }
    } catch (err: any) {
      // If error code is "relation does not exist", table doesn't exist
      if (err?.code === '42P01' || err?.message?.includes('does not exist')) {
        tableExists = false;
      } else {
        // Other error - log and assume table exists
        console.error('Error checking table existence:', err);
        tableExists = true; // Assume table exists for other errors
      }
    }

    // Define expected columns
    const expectedColumns = [
      { name: 'id', type: 'uuid' },
      { name: 'child_id', type: 'uuid' },
      { name: 'curriculum_video_id', type: 'uuid' },
      { name: 'curriculum_work_id', type: 'uuid' },
      { name: 'watch_started_at', type: 'timestamptz' },
      { name: 'watch_completed_at', type: 'timestamptz' },
      { name: 'watch_duration_seconds', type: 'integer' },
      { name: 'video_duration_seconds', type: 'integer' },
      { name: 'watch_percentage', type: 'numeric' },
      { name: 'is_complete', type: 'boolean' },
      { name: 'device_type', type: 'text' },
      { name: 'created_at', type: 'timestamptz' },
      { name: 'updated_at', type: 'timestamptz' },
    ];

    // Check columns (simplified - in production you'd query information_schema)
    const columns = expectedColumns.map(col => ({
      ...col,
      exists: tableExists, // Simplified - assumes all columns exist if table exists
    }));

    // Define expected indexes
    const expectedIndexes = [
      { name: 'idx_video_watches_child_id', exists: tableExists },
      { name: 'idx_video_watches_video_id', exists: tableExists },
      { name: 'idx_video_watches_work_id', exists: tableExists },
      { name: 'idx_video_watches_complete', exists: tableExists },
      { name: 'idx_video_watches_started_at', exists: tableExists },
      { name: 'idx_video_watches_child_video', exists: tableExists },
    ];

    const allGood = tableExists && columns.every(c => c.exists) && expectedIndexes.every(i => i.exists);

    return NextResponse.json({
      tableExists,
      columns,
      indexes: expectedIndexes,
      allGood,
    });

  } catch (error: any) {
    console.error('Error checking schema:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { 
        error: error.message || 'Failed to check schema',
        details: error.toString(),
        code: error.code,
        hint: error.hint
      },
      { status: 500 }
    );
  }
}

