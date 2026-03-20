// app/api/montree/debug-upload/route.ts
// TEMPORARY diagnostic endpoint to debug photo upload failures
// DELETE after issue is resolved
//
// Tests: auth, Supabase connection, storage write, DB write, photo queue state

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySchoolRequest } from '@/lib/montree/verify-request';

export async function GET(request: NextRequest) {
  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {} as Record<string, unknown>,
  };

  // ============================================
  // CHECK 1: Auth cookie validity
  // ============================================
  try {
    const auth = await verifySchoolRequest(request);
    if (auth instanceof NextResponse) {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        auth: {
          status: 'FAIL',
          error: 'Auth cookie invalid or expired — teacher needs to log in again',
          httpStatus: auth.status,
        },
      };
      // Still continue other checks with service role
    } else {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        auth: {
          status: 'OK',
          userId: auth.userId,
          schoolId: auth.schoolId,
          classroomId: auth.classroomId,
          role: auth.role,
        },
      };
    }
  } catch (err) {
    results.checks = {
      ...results.checks as Record<string, unknown>,
      auth: {
        status: 'FAIL',
        error: err instanceof Error ? err.message : 'Unknown auth error',
      },
    };
  }

  // ============================================
  // CHECK 2: Supabase connection
  // ============================================
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase
      .from('montree_schools')
      .select('id')
      .limit(1);

    if (error) {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        supabase_db: {
          status: 'FAIL',
          error: error.message,
          code: error.code,
        },
      };
    } else {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        supabase_db: {
          status: 'OK',
          rows_returned: data?.length ?? 0,
        },
      };
    }
  } catch (err) {
    results.checks = {
      ...results.checks as Record<string, unknown>,
      supabase_db: {
        status: 'FAIL',
        error: err instanceof Error ? err.message : 'Unknown DB error',
      },
    };
  }

  // ============================================
  // CHECK 3: Supabase storage bucket access
  // ============================================
  try {
    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from('montree-media')
      .list('', { limit: 1 });

    if (error) {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        supabase_storage: {
          status: 'FAIL',
          error: error.message,
          hint: 'Storage bucket "montree-media" may not exist or be inaccessible',
        },
      };
    } else {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        supabase_storage: {
          status: 'OK',
          files_found: data?.length ?? 0,
        },
      };
    }
  } catch (err) {
    results.checks = {
      ...results.checks as Record<string, unknown>,
      supabase_storage: {
        status: 'FAIL',
        error: err instanceof Error ? err.message : 'Unknown storage error',
      },
    };
  }

  // ============================================
  // CHECK 4: Recent media records (last 24h)
  // ============================================
  try {
    const supabase = getSupabase();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase
      .from('montree_media')
      .select('id, created_at, child_id, sync_status, processing_status, file_size_bytes')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        recent_media: {
          status: 'FAIL',
          error: error.message,
        },
      };
    } else {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        recent_media: {
          status: 'OK',
          count_last_24h: data?.length ?? 0,
          records: data?.map(r => ({
            id: r.id,
            created_at: r.created_at,
            child_id: r.child_id?.substring(0, 8) + '...',
            sync_status: r.sync_status,
            processing_status: r.processing_status,
            file_size_bytes: r.file_size_bytes,
          })),
        },
      };
    }
  } catch (err) {
    results.checks = {
      ...results.checks as Record<string, unknown>,
      recent_media: {
        status: 'FAIL',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }

  // ============================================
  // CHECK 5: Storage test write (1-byte file)
  // ============================================
  try {
    const supabase = getSupabase();
    const testPath = `_debug/test-${Date.now()}.txt`;
    const testContent = new Uint8Array([0x41]); // "A"

    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(testPath, testContent, {
        contentType: 'text/plain',
        upsert: true,
      });

    if (uploadError) {
      results.checks = {
        ...results.checks as Record<string, unknown>,
        storage_write: {
          status: 'FAIL',
          error: uploadError.message,
          hint: 'Storage quota may be exceeded or bucket permissions wrong',
        },
      };
    } else {
      // Clean up test file
      await supabase.storage.from('montree-media').remove([testPath]);
      results.checks = {
        ...results.checks as Record<string, unknown>,
        storage_write: {
          status: 'OK',
          message: 'Successfully wrote and deleted test file',
        },
      };
    }
  } catch (err) {
    results.checks = {
      ...results.checks as Record<string, unknown>,
      storage_write: {
        status: 'FAIL',
        error: err instanceof Error ? err.message : 'Unknown error',
      },
    };
  }

  // ============================================
  // SUMMARY
  // ============================================
  const checks = results.checks as Record<string, { status: string }>;
  const allPassing = Object.values(checks).every(c => c.status === 'OK');
  results.overall = allPassing ? 'ALL_OK' : 'ISSUES_FOUND';
  results.failing = Object.entries(checks)
    .filter(([, v]) => v.status === 'FAIL')
    .map(([k]) => k);

  return NextResponse.json(results, { status: 200 });
}
