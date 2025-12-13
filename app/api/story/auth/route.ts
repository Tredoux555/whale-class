import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { SignJWT } from 'jose';
import { db } from '@/lib/db';
import { JWT_SECRET } from '@/lib/story-auth';

export async function POST(req: NextRequest) {
  try {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:7',message:'Story auth POST entered',data:{hasReq:!!req,hasDatabaseUrl:!!process.env.DATABASE_URL,hasJwtSecret:!!process.env.STORY_JWT_SECRET},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion

    // Validate environment variables
    if (!process.env.DATABASE_URL) {
      console.error('DATABASE_URL environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'DATABASE_URL environment variable is missing'
        },
        { status: 500 }
      );
    }

    if (!process.env.STORY_JWT_SECRET) {
      console.error('STORY_JWT_SECRET environment variable is not set');
      return NextResponse.json(
        { 
          error: 'Server configuration error',
          details: 'STORY_JWT_SECRET environment variable is missing'
        },
        { status: 500 }
      );
    }

    const { username, password } = await req.json();

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:12',message:'Request parsed',data:{hasUsername:!!username,hasPassword:!!password,usernameValue:username},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:15',message:'About to query database',data:{hasDb:!!db,hasQuery:typeof db?.query === 'function',databaseUrl:process.env.DATABASE_URL?.substring(0,50) + '...'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Query database for user
    let result;
    try {
      result = await db.query(
        'SELECT * FROM story_users WHERE username = $1',
        [username]
      );
    } catch (dbError) {
      console.error('Database query failed:', dbError);
      const dbErrorMessage = dbError instanceof Error ? dbError.message : String(dbError);
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:28',message:'Database query failed',data:{errorMessage:dbErrorMessage,errorName:dbError instanceof Error ? dbError.name : 'Unknown'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      throw dbError;
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:24',message:'Database query completed',data:{rowCount:result?.rows?.length,hasRows:!!result?.rows},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:35',message:'About to verify password',data:{hasUser:!!user,hasPasswordHash:!!user?.password_hash},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    // Verify password
    const validPassword = await compare(password, user.password_hash);
    
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:40',message:'Password verification result',data:{validPassword},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:50',message:'About to create JWT',data:{hasJWT_SECRET:!!JWT_SECRET,hasSignJWT:typeof SignJWT !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Create JWT token
    const token = await new SignJWT({ username: user.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(JWT_SECRET);

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:58',message:'JWT created successfully',data:{hasToken:!!token},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    return NextResponse.json({ session: token });
  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/91fbd1cb-8360-4c57-81d6-ae1b9061d0d9',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'route.ts:63',message:'Error caught in story auth',data:{errorMessage:error instanceof Error ? error.message : String(error),errorName:error instanceof Error ? error.name : 'Unknown',errorStack:error instanceof Error ? error.stack?.substring(0,500) : undefined},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'A,B,C'})}).catch(()=>{});
    // #endregion
    console.error('Auth error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error details:', errorMessage);
    
    // Check for specific error types
    let errorType = 'Unknown error';
    if (errorMessage.includes('DATABASE_URL')) {
      errorType = 'Database configuration error: DATABASE_URL not set';
    } else if (errorMessage.includes('connection') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('timeout')) {
      errorType = 'Database connection failed';
    } else if (errorMessage.includes('relation') || errorMessage.includes('does not exist')) {
      errorType = 'Database table missing: story_users table may not exist';
    } else if (errorMessage.includes('JWT_SECRET') || errorMessage.includes('STORY_JWT_SECRET')) {
      errorType = 'JWT secret configuration error';
    }
    
    // Return more specific error for debugging
    return NextResponse.json(
      { 
        error: 'Authentication failed',
        details: process.env.NODE_ENV === 'development' ? errorMessage : errorType,
        type: errorType
      },
      { status: 500 }
    );
  }
}

// Logout endpoint (for cleanup)
export async function DELETE() {
  return NextResponse.json({ success: true });
}



