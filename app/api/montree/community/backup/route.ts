// /api/montree/community/backup/route.ts
// POST: Create daily JSON backup of all community works
// Admin-only, also triggerable via cron

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminPassword } from '@/lib/verify-super-admin';

export async function POST(request: NextRequest) {
  try {
    const password = request.headers.get('x-admin-password') || '';
    if (!verifySuperAdminPassword(password).valid) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = getSupabase();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if backup already exists for today
    const { data: existing } = await supabase
      .from('montree_community_backups')
      .select('id')
      .eq('backup_date', today)
      .single();

    if (existing) {
      return NextResponse.json({ message: 'Backup already exists for today', date: today });
    }

    // Fetch all community works (paginated to avoid Supabase 1000-row default limit)
    const allWorks: any[] = [];
    let from = 0;
    const batchSize = 1000;
    while (true) {
      const { data: batch, error: batchError } = await supabase
        .from('montree_community_works')
        .select('*')
        .order('created_at', { ascending: true })
        .range(from, from + batchSize - 1);

      if (batchError) {
        console.error('Backup fetch error:', batchError);
        return NextResponse.json({ error: 'Failed to fetch works for backup' }, { status: 500 });
      }

      if (!batch || batch.length === 0) break;
      allWorks.push(...batch);
      if (batch.length < batchSize) break;
      from += batchSize;
    }
    const works = allWorks;

    const backupData = {
      backup_date: today,
      exported_at: new Date().toISOString(),
      total_works: works?.length || 0,
      works: works || [],
    };

    // Upload JSON to Supabase storage
    const storagePath = `backups/community-works-${today}.json`;
    const jsonStr = JSON.stringify(backupData, null, 2);
    const buffer = new TextEncoder().encode(jsonStr);

    const { error: uploadError } = await supabase.storage
      .from('montree-media')
      .upload(storagePath, buffer, {
        contentType: 'application/json',
        upsert: true,
      });

    if (uploadError) {
      console.error('Backup upload error:', uploadError);
      return NextResponse.json({ error: 'Failed to upload backup' }, { status: 500 });
    }

    // Record backup in table
    await supabase
      .from('montree_community_backups')
      .insert({
        backup_date: today,
        work_count: works?.length || 0,
        storage_path: storagePath,
      });

    // Clean up old backups (keep last 30)
    const { data: allBackups } = await supabase
      .from('montree_community_backups')
      .select('id, storage_path, backup_date')
      .order('backup_date', { ascending: false });

    if (allBackups && allBackups.length > 30) {
      const toDelete = allBackups.slice(30);
      const pathsToDelete = toDelete.map(b => b.storage_path);
      const idsToDelete = toDelete.map(b => b.id);

      // Delete from storage
      await supabase.storage.from('montree-media').remove(pathsToDelete);

      // Delete from table
      await supabase
        .from('montree_community_backups')
        .delete()
        .in('id', idsToDelete);
    }

    return NextResponse.json({
      success: true,
      date: today,
      work_count: works?.length || 0,
      storage_path: storagePath,
    });
  } catch (error) {
    console.error('Backup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
