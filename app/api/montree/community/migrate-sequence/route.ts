// DEPRECATED: No longer needed — curriculum sequence sort uses in-memory mapping
import { NextResponse } from 'next/server';
export async function POST() {
  return NextResponse.json({ message: 'Deprecated — sequence sorting now uses in-memory curriculum data' });
}
