import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminToken } from "@/lib/auth";

// Force Node.js runtime for this route (not Edge)
export const runtime = 'nodejs';

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Tredoux";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "870602";

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log('[LOGIN] 1. Request received at', new Date().toISOString());
  
  try {
    console.log('[LOGIN] 2. Parsing request body');
    const { username, password } = await request.json();
    console.log('[LOGIN] 3. Body parsed, checking credentials');

    // Simple username and password check (in production, use proper hashing)
    const isValid = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;
    console.log('[LOGIN] 4. Credentials valid:', isValid);

    if (!isValid) {
      console.log('[LOGIN] 5. Returning 401 - invalid credentials');
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    console.log('[LOGIN] 6. Creating admin token (using jose)');
    const token = await createAdminToken();
    console.log('[LOGIN] 7. Token created successfully');

    const response = NextResponse.json({ 
      success: true,
      timing: `${Date.now() - startTime}ms`,
      method: 'jose'
    });
    
    console.log('[LOGIN] 8. Setting cookie');
    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    console.log('[LOGIN] 9. Returning response');
    return response;
  } catch (error) {
    console.error('[LOGIN] ERROR at step:', error);
    console.error('[LOGIN] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown',
      stack: error instanceof Error ? error.stack : undefined,
      timing: `${Date.now() - startTime}ms`
    });
    return NextResponse.json(
      { 
        error: "Login failed",
        details: error instanceof Error ? error.message : 'Unknown error',
        timing: `${Date.now() - startTime}ms`
      },
      { status: 500 }
    );
  }
}

