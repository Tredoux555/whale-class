import { NextRequest, NextResponse } from 'next/server';
import { compare } from 'bcryptjs';
import { db } from '@/lib/db';
import { createToken, getCurrentWeekStart } from '@/lib/story-auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password required' },
        { status: 400 }
      );
    }

    // Query database for user (backward compatible - check for is_active if column exists)
    let result;
    try {
      // Try with is_active column first (new schema)
      result = await db.query(
        'SELECT * FROM story_users WHERE username = $1 AND is_active = TRUE',
        [username]
      );
    } catch (error) {
      // Fallback to old schema without is_active
      result = await db.query(
        'SELECT * FROM story_users WHERE username = $1',
        [username]
      );
    }

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const user = result.rows[0];

    // Verify password
    const validPassword = await compare(password, user.password_hash);
    
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Create JWT token
    const token = await createToken({ username: user.username, type: 'user' });

    // Get client IP
    const forwarded = req.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    // Log the login (backward compatible - try new schema first, fallback to old)
    try {
      // Try new schema with user_id
      await db.query(
        `INSERT INTO story_login_logs (user_id, username, ip_address, user_agent, session_token)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, user.username, ip, userAgent, token]
      );
    } catch (error) {
      // Fallback to old schema without user_id
      try {
        await db.query(
          `INSERT INTO story_login_logs (username, ip_address, user_agent, session_id)
           VALUES ($1, $2, $3, $4)`,
          [user.username, ip, userAgent, token]
        );
      } catch (logError) {
        // If login logging fails, continue anyway
        console.error('Failed to log login:', logError);
      }
    }

    // Create/update online session (optional - table might not exist yet)
    try {
      await db.query(
        `INSERT INTO story_online_sessions (user_id, username, session_token, last_seen_at, is_online)
         VALUES ($1, $2, $3, NOW(), TRUE)
         ON CONFLICT (session_token) 
         DO UPDATE SET last_seen_at = NOW(), is_online = TRUE`,
        [user.id, user.username, token]
      );
    } catch (error) {
      // Online sessions table might not exist yet - that's okay
      console.log('Online sessions table not available (will work after migration)');
    }

    return NextResponse.json({ 
      session: token,
      username: user.username,
      displayName: (user.display_name || user.username)
    });
  } catch (error) {
    console.error('Auth error:', error);
    const message = error instanceof Error ? error.message : 'Authentication failed';
    return NextResponse.json(
      { error: 'Authentication failed', details: message },
      { status: 500 }
    );
  }
}

// Logout endpoint
export async function DELETE(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      
      // Mark session as offline (if table exists)
      try {
        await db.query(
          `UPDATE story_online_sessions SET is_online = FALSE WHERE session_token = $1`,
          [token]
        );
      } catch (error) {
        // Table might not exist yet
      }

      // Update logout time in login logs (backward compatible)
      try {
        // Try new schema with session_token
        await db.query(
          `UPDATE story_login_logs SET logout_at = NOW() WHERE session_token = $1`,
          [token]
        );
      } catch (error) {
        // Try old schema with session_id
        try {
          await db.query(
            `UPDATE story_login_logs SET logout_at = NOW() WHERE session_id = $1`,
            [token]
          );
        } catch (logError) {
          // If update fails, continue anyway
        }
      }
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: true }); // Don't fail logout
  }
}
