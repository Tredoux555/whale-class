// CLIP test endpoint — REMOVED (Apr 4, 2026)
// SigLIP classifier permanently disabled. Haiku two-pass handles all identification.
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ error: 'CLIP classifier has been permanently disabled. Use photo-insight endpoint instead.' }, { status: 410 });
}
export async function GET() {
  return NextResponse.json({ error: 'CLIP classifier has been permanently disabled. Use photo-insight endpoint instead.' }, { status: 410 });
}
