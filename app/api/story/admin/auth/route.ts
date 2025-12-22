import { NextRequest, NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/story/db';
import { 
  createAdminToken, 
  verifyAdminToken, 
  verifyPassword, 
  extractToken,
  hashPassword 
} from '@/lib/story/auth';
import { StoryAdminUser } from '@/lib/story/types';

// Admin login
export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Missing credentials' },
        { status: 400 }
      );
    }

    // Find admin user
    const admin = await queryOne<StoryAdminUser>(
      'SELECT * FROM story_admin_users WHERE username = $1',
      [username]
    );

    if (!admin) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verify password
    const validPassword = await verifyPassword(password, admin.password_hash);
    
    if (!validPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await query(
      'UPDATE story_admin_users SET last_login = NOW() WHERE id = $1',
      [admin.id]
    );

    // Create admin token
    const token = await createAdminToken(admin.username);

    return NextResponse.json({ session: token });
  } catch (error) {
    console.error('Admin auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

// Verify admin session
export async function GET(req: NextRequest) {
  try {
    const token = extractToken(req.headers.get('authorization'));
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyAdminToken(token);

    return NextResponse.json({ 
      valid: true, 
      username: payload.username,
      role: 'admin'
    });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

// Hash password utility (development only)
export async function PUT(req: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available' }, { status: 403 });
  }
  
  try {
    const { password } = await req.json();
    const hash = await hashPassword(password);
    return NextResponse.json({ hash });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to hash' }, { status: 500 });
  }
}
