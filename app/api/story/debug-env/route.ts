import { NextResponse } from 'next/server';

// Temporary debug endpoint to check environment variables
// Remove this after debugging
export async function GET() {
  // Don't expose actual values in production, just check if they exist
  const envCheck = {
    hasDATABASE_URL: !!process.env.DATABASE_URL,
    hasSTORY_JWT_SECRET: !!process.env.STORY_JWT_SECRET,
    DATABASE_URL_length: process.env.DATABASE_URL?.length || 0,
    STORY_JWT_SECRET_length: process.env.STORY_JWT_SECRET?.length || 0,
    DATABASE_URL_starts_with: process.env.DATABASE_URL?.substring(0, 20) || 'NOT_SET',
    NODE_ENV: process.env.NODE_ENV,
    // Show first few chars to verify it's the right value (safe to expose)
    DATABASE_URL_preview: process.env.DATABASE_URL 
      ? `${process.env.DATABASE_URL.substring(0, 30)}...` 
      : 'NOT_SET',
  };

  return NextResponse.json(envCheck);
}

