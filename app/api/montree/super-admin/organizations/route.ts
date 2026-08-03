// app/api/montree/super-admin/organizations/route.ts
//
// GET — every organisation on the platform, with its school count and its leader.
//
// Tredoux's view of the organization tier (migration 315). Minting the invite links that
// create these rows is POST /api/montree/org/invites with inviteType='organization', which
// is super-admin gated by the same helper; this route is only the list beside it.
//
// Auth: super-admin only, via verifySuperAdminAuth — the same door the rest of
// /api/montree/super-admin/* uses.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase-client';
import { verifySuperAdminAuth } from '@/lib/verify-super-admin';
import { isOrgMigrationPending, orgMigrationPending } from '@/lib/montree/org/verify-org-request';

export const dynamic = 'force-dynamic';

interface OrgRow {
  id: string;
  name: string;
  slug: string;
  contact_name: string | null;
  contact_email: string | null;
  created_at: string;
}

export async function GET(request: NextRequest) {
  const { valid } = await verifySuperAdminAuth(request.headers);
  if (!valid) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = getSupabase();

  const { data, error } = await supabase
    .from('montree_organizations')
    .select('id, name, slug, contact_name, contact_email, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    if (isOrgMigrationPending(error)) return orgMigrationPending(error.message);
    console.error('[montree-org] super-admin organization list failed:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const orgs = (data ?? []) as OrgRow[];
  const ids = orgs.map((o) => o.id);

  // School counts in one read rather than one query per organisation.
  const counts = new Map<string, number>();
  if (ids.length) {
    const { data: schools, error: schErr } = await supabase
      .from('montree_schools')
      .select('id, organization_id')
      .in('organization_id', ids);
    if (schErr) {
      console.error('[montree-org] school count failed:', schErr);
    } else {
      for (const row of (schools ?? []) as Array<{ organization_id: string | null }>) {
        if (!row.organization_id) continue;
        counts.set(row.organization_id, (counts.get(row.organization_id) ?? 0) + 1);
      }
    }
  }

  return NextResponse.json(
    {
      available: true,
      organizations: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        contactName: o.contact_name,
        contactEmail: o.contact_email,
        createdAt: o.created_at,
        schoolCount: counts.get(o.id) ?? 0,
      })),
      totals: {
        organizations: orgs.length,
        schools: [...counts.values()].reduce((a, b) => a + b, 0),
      },
    },
    { headers: { 'Cache-Control': 'private, no-store' } },
  );
}
