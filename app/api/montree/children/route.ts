// /api/montree/children/route.ts
// Returns children for Montree - demo mode returns demo students

import { NextResponse } from 'next/server';

// Demo students for when no real data exists
const DEMO_STUDENTS = [
  { id: 'demo-1', name: 'Rachel', progress: { presented: 12, practicing: 8, mastered: 24, total: 44 } },
  { id: 'demo-2', name: 'Marcus', progress: { presented: 8, practicing: 15, mastered: 18, total: 41 } },
  { id: 'demo-3', name: 'Sophie', progress: { presented: 5, practicing: 12, mastered: 30, total: 47 } },
  { id: 'demo-4', name: 'James', progress: { presented: 10, practicing: 6, mastered: 22, total: 38 } },
  { id: 'demo-5', name: 'Lily', progress: { presented: 7, practicing: 11, mastered: 26, total: 44 } },
  { id: 'demo-6', name: 'Oliver', progress: { presented: 9, practicing: 14, mastered: 20, total: 43 } },
];

export async function GET() {
  // For now, return demo students
  // TODO: Once Supabase multi-tenant is set up, fetch real students by school_id
  return NextResponse.json({ children: DEMO_STUDENTS });
}
