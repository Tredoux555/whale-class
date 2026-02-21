// /api/montree/community/migrate-sequence/route.ts
// ONE-TIME: Add curriculum_sequence column and populate from curriculum data
// Admin-only, idempotent

import { NextRequest, NextResponse } from 'next/server';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';
import { loadAllCurriculumWorks } from '@/lib/montree/curriculum-loader';
import { Pool } from 'pg';

export async function POST(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password') || '';
    const auth = verifySuperAdminPassword(password);
    if (!auth.valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use pg directly for DDL (Supabase JS client can't ALTER TABLE)
    const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
    const client = await pool.connect();

    try {
      // 1. Add column if not exists
      await client.query('ALTER TABLE montree_community_works ADD COLUMN IF NOT EXISTS curriculum_sequence INTEGER DEFAULT NULL');

      // 2. Build sequence map from curriculum data
      const works = loadAllCurriculumWorks();
      const sequenceMap = new Map<string, number>();
      works.forEach((w, i) => {
        sequenceMap.set(w.work_key, w.sequence || (i + 1));
      });

      // 3. Update all seeded works with their sequence number
      let updated = 0;
      for (const [workKey, seq] of sequenceMap) {
        const result = await client.query(
          'UPDATE montree_community_works SET curriculum_sequence = $1 WHERE standard_work_id = $2 AND (curriculum_sequence IS NULL OR curriculum_sequence != $1)',
          [seq, workKey]
        );
        if (result.rowCount && result.rowCount > 0) updated++;
      }

      // 4. Add index for sorting
      await client.query('CREATE INDEX IF NOT EXISTS idx_community_works_sequence ON montree_community_works (curriculum_sequence)');

      return NextResponse.json({
        success: true,
        column_added: true,
        works_in_curriculum: works.length,
        sequences_updated: updated,
        index_created: true,
      });
    } finally {
      client.release();
      await pool.end();
    }
  } catch (error: any) {
    console.error('Migrate sequence error:', error);
    return NextResponse.json({
      error: 'Migration failed',
      detail: error?.message || String(error),
    }, { status: 500 });
  }
}
