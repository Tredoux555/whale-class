import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminToken } from "@/lib/auth";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "whale123";

export async function POST(request: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:9',message:'Login POST handler entered',data:{hasRequest:!!request},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    const { username, password } = await request.json();

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:14',message:'Request parsed successfully',data:{hasUsername:!!username,hasPassword:!!password,usernameLength:username?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // Simple username and password check (in production, use proper hashing)
    const isValid = username === ADMIN_USERNAME && password === ADMIN_PASSWORD;

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:19',message:'Credentials validation',data:{isValid,hasAdminUsername:!!ADMIN_USERNAME,hasAdminPassword:!!ADMIN_PASSWORD},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid username or password" },
        { status: 401 }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:30',message:'About to create admin token',data:{},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    const token = createAdminToken();

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:35',message:'Token created successfully',data:{hasToken:!!token,tokenLength:token?.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B'})}).catch(()=>{});
    // #endregion

    const response = NextResponse.json({ success: true });
    response.cookies.set("admin-token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:46',message:'Response prepared with cookie',data:{nodeEnv:process.env.NODE_ENV},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return response;
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:52',message:'Error caught in catch block',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown',errorStack:error instanceof Error ? error.stack : undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C,D,E'})}).catch(()=>{});
    // #endregion
    return NextResponse.json(
      { error: "Login failed" },
      { status: 500 }
    );
  }
}

