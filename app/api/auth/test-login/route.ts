import { NextRequest, NextResponse } from "next/server";

// Force Node.js runtime
export const runtime = 'nodejs';

// Simple test endpoint to verify deployment and env vars
export async function GET() {
  return NextResponse.json({ 
    status: "ok",
    timestamp: new Date().toISOString(),
    runtime: "nodejs",
    env: {
      hasAdminUsername: !!process.env.ADMIN_USERNAME,
      hasAdminPassword: !!process.env.ADMIN_PASSWORD,
      hasAdminSecret: !!process.env.ADMIN_SECRET,
      nodeVersion: process.version,
    },
    message: "New code is deployed if you see this"
  });
}

export async function POST(request: NextRequest) {
  try {
    const startTime = Date.now();
    console.log('[TEST-LOGIN] Starting test login');
    
    const body = await request.json();
    console.log('[TEST-LOGIN] Body parsed');
    
    const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Tredoux";
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "870602";
    
    const isValid = body.username === ADMIN_USERNAME && body.password === ADMIN_PASSWORD;
    console.log('[TEST-LOGIN] Credentials valid:', isValid);
    
    const endTime = Date.now();
    
    return NextResponse.json({
      success: isValid,
      timing: `${endTime - startTime}ms`,
      env: {
        hasAdminUsername: !!process.env.ADMIN_USERNAME,
        hasAdminPassword: !!process.env.ADMIN_PASSWORD,
        hasAdminSecret: !!process.env.ADMIN_SECRET,
      },
      message: "Test endpoint working - new code deployed"
    });
  } catch (error) {
    console.error('[TEST-LOGIN] Error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}

