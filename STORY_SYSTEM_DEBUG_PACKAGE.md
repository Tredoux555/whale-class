# Story System Debug Package
**Generated:** $(date)  
**Project:** Whale - Story Messaging System  
**Purpose:** Complete codebase package for AI debugging assistance

---

## 📋 Table of Contents

1. [System Overview](#system-overview)
2. [Database Schema](#database-schema)
3. [Frontend Pages](#frontend-pages)
4. [API Routes](#api-routes)
5. [Library Files](#library-files)
6. [Configuration](#configuration)
7. [Known Issues & Debugging Notes](#known-issues--debugging-notes)

---

## System Overview

The Story System is a weekly messaging platform where:
- **Users (T, Z)** can view weekly stories and send messages
- **Admins** can monitor activity and send teacher notes
- **Features:** Interactive story viewing, hidden messages, media uploads (images/videos/audio), 24-hour expiration

**Routes:**
- `/story` - User login
- `/story/[session]` - Story viewer
- `/story/admin` - Admin login
- `/story/admin/dashboard` - Admin dashboard

**Key Environment Variables:**
- `DATABASE_URL` - PostgreSQL connection string
- `STORY_JWT_SECRET` - JWT signing secret
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase URL
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service key

---

## Database Schema

### File: `migrations/story_complete_schema.sql`

```sql
-- =============================================
-- STORY SYSTEM - COMPLETE DATABASE SCHEMA
-- =============================================

-- 1. SECRET STORIES TABLE
CREATE TABLE IF NOT EXISTS secret_stories (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL UNIQUE,
  theme VARCHAR(255) NOT NULL,
  story_title VARCHAR(255) NOT NULL,
  story_content JSONB NOT NULL,
  hidden_message TEXT,
  message_author VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_secret_stories_week ON secret_stories(week_start_date);

-- 2. STORY USERS TABLE
CREATE TABLE IF NOT EXISTS story_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. STORY LOGIN LOGS TABLE
CREATE TABLE IF NOT EXISTS story_login_logs (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) NOT NULL,
  login_at TIMESTAMP DEFAULT NOW(),
  session_token TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_id VARCHAR(50),
  logout_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_story_login_logs_time ON story_login_logs(login_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_login_logs_user ON story_login_logs(username);

-- 4. STORY MESSAGE HISTORY TABLE
CREATE TABLE IF NOT EXISTS story_message_history (
  id SERIAL PRIMARY KEY,
  week_start_date DATE NOT NULL,
  message_type VARCHAR(20) NOT NULL,
  content TEXT,
  media_url TEXT,
  media_filename TEXT,
  author VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_expired BOOLEAN DEFAULT FALSE,
  is_from_admin BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_story_message_week ON story_message_history(week_start_date);
CREATE INDEX IF NOT EXISTS idx_story_message_time ON story_message_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_story_message_expired ON story_message_history(is_expired, expires_at);

-- 5. STORY ADMIN USERS TABLE
CREATE TABLE IF NOT EXISTS story_admin_users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- SEED DATA
INSERT INTO story_users (username, password_hash) VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
  ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO story_admin_users (username, password_hash) VALUES
  ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- EXPIRATION FUNCTION
CREATE OR REPLACE FUNCTION mark_expired_messages()
RETURNS void AS $$
BEGIN
  UPDATE story_message_history
  SET is_expired = TRUE
  WHERE is_expired = FALSE
    AND expires_at IS NOT NULL
    AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql;
```

---

## Frontend Pages

### File: `app/story/page.tsx` - User Login

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function StoryLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/story/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('story_session', data.session);
        router.push(`/story/${data.session}`);
      } else {
        setError(data.details || data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">
          Classroom Activities
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Weekly learning updates for parents
        </p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Parent Name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Access Code"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              autoComplete="off"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:bg-indigo-400 transition-colors"
          >
            {isLoading ? 'Loading...' : 'View Activities'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### File: `app/story/[session]/page.tsx` - Story Viewer

[Full file content - 532 lines]
Key features:
- Interactive letter clicking (first 't' shows message, first 'c' edits, last letter shows media)
- Media upload and display (images, videos, audio)
- Auto-refresh for new messages (every 10 seconds)
- Session management

### File: `app/story/admin/page.tsx` - Admin Login

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      const res = await fetch('/api/story/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (res.ok) {
        sessionStorage.setItem('story_admin_session', data.session);
        router.push('/story/admin/dashboard');
      } else {
        setError(data.error || 'Invalid credentials');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold mb-2 text-center text-gray-800">
          Admin Portal
        </h1>
        <p className="text-gray-500 text-center mb-6 text-sm">Story Management</p>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="text"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              autoComplete="off"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm text-center">{error}</p>
          )}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 disabled:bg-purple-400 transition-colors"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
```

### File: `app/story/admin/dashboard/page.tsx` - Admin Dashboard

[Full file content - 492 lines]
Key features:
- Online users monitoring (auto-refresh every 5 seconds)
- Login logs table
- Message history with statistics
- Send teacher notes functionality
- Three tabs: Online, Logs, Messages

---

## API Routes

### File: `app/api/story/auth/route.ts` - User Authentication

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { compare } from 'bcryptjs';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  const client = getPool();
  return client.query(text, params);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

async function ensureUsersTable() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS story_users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    
    await dbQuery(`
      INSERT INTO story_users (username, password_hash) VALUES
        ('T', '$2b$10$dvPHncs3Lb89p3nyfvM4k.8yxjZ9jg6aqs8Y35Din59aK1fUxgUKO'),
        ('Z', '$2b$10$o8s80aV2vWkgVjZKSsIRKu7IPvNbuLwb08HiWECZ7xCtv4f5bQkPK')
      ON CONFLICT (username) DO NOTHING
    `);
    
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS story_login_logs (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        login_at TIMESTAMP DEFAULT NOW(),
        session_token TEXT,
        ip_address VARCHAR(45),
        user_agent TEXT,
        user_id VARCHAR(50),
        logout_at TIMESTAMP
      )
    `);
    
    return true;
  } catch (e) {
    console.error('[Auth] ensureUsersTable error:', e);
    return false;
  }
}

export async function POST(req: NextRequest) {
  console.log('[Auth] POST login request');
  
  if (!process.env.DATABASE_URL) {
    console.error('[Auth] DATABASE_URL missing');
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }
  
  if (!process.env.STORY_JWT_SECRET) {
    console.error('[Auth] STORY_JWT_SECRET missing');
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500 });
  }

  try {
    const body = await req.json();
    const { username, password } = body;
    
    console.log('[Auth] Login attempt for:', username);

    if (!username || !password) {
      return NextResponse.json({ error: 'Missing credentials' }, { status: 400 });
    }

    await ensureUsersTable();

    const result = await dbQuery(
      'SELECT username, password_hash FROM story_users WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      console.log('[Auth] User not found:', username);
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const user = result.rows[0];
    const validPassword = await compare(password, user.password_hash);
    
    if (!validPassword) {
      console.log('[Auth] Invalid password');
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    console.log('[Auth] Password valid, creating token...');

    const secret = getJWTSecret();
    const token = await new SignJWT({ username: user.username })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h')
      .sign(secret);

    console.log('[Auth] Token created successfully');

    try {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown';
      const userAgent = req.headers.get('user-agent') || 'unknown';
      
      await dbQuery(
        `INSERT INTO story_login_logs (username, login_at, session_token, ip_address, user_agent, user_id) 
         VALUES ($1, NOW(), $2, $3, $4, $5)`,
        [user.username, token.substring(0, 50), ip, userAgent, user.username]
      );
      console.log('[Auth] Login logged successfully for:', user.username);
    } catch (logError) {
      console.error('[Auth] Failed to log login (non-critical):', logError);
    }

    return NextResponse.json({ session: token });
    
  } catch (error) {
    console.error('[Auth] Error:', error);
    return NextResponse.json(
      { error: 'Login failed', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  return NextResponse.json({ success: true });
}
```

### File: `app/api/story/current/route.ts` - Get Current Story

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  const client = getPool();
  return client.query(text, params);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.username as string;
  } catch {
    return null;
  }
}

function getDefaultStory() {
  return {
    theme: 'Weekly Learning',
    title: 'Classroom Activities',
    content: {
      paragraphs: [
        'Today we learned about counting and colors in class.',
        'The children practiced their letters and sounds.',
        'Everyone had fun during circle time activities.',
        'We read a wonderful story about friendship and sharing.',
        'Looking forward to more learning adventures tomorrow.'
      ]
    }
  };
}

export async function GET(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekStartDate = getCurrentWeekStart();

    const result = await dbQuery(
      `SELECT story_title, story_content, hidden_message, message_author, updated_at 
       FROM secret_stories 
       WHERE week_start_date = $1`,
      [weekStartDate]
    );

    let story;
    let updatedAt = null;

    if (result.rows.length === 0) {
      const defaultStory = getDefaultStory();
      
      await dbQuery(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (week_start_date) DO NOTHING`,
        [weekStartDate, defaultStory.theme, defaultStory.title, JSON.stringify(defaultStory.content)]
      );

      story = {
        title: defaultStory.title,
        paragraphs: defaultStory.content.paragraphs,
        hiddenMessage: null,
        messageAuthor: null
      };
    } else {
      const row = result.rows[0];
      const content = typeof row.story_content === 'string' 
        ? JSON.parse(row.story_content)
        : row.story_content;

      story = {
        title: row.story_title,
        paragraphs: content.paragraphs || [],
        hiddenMessage: row.hidden_message,
        messageAuthor: row.message_author
      };
      updatedAt = row.updated_at;
    }

    return NextResponse.json({
      username,
      story,
      updatedAt
    });
  } catch (error) {
    console.error('[Current Story] Error:', error);
    return NextResponse.json({ error: 'Failed to load' }, { status: 500 });
  }
}
```

### File: `app/api/story/message/route.ts` - Message Handling

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  const client = getPool();
  return client.query(text, params);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function getExpirationDate(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires;
}

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.username as string;
  } catch {
    return null;
  }
}

async function ensureTables() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS secret_stories (
      id SERIAL PRIMARY KEY,
      week_start_date DATE NOT NULL UNIQUE,
      theme VARCHAR(255) NOT NULL,
      story_title VARCHAR(255) NOT NULL,
      story_content JSONB NOT NULL,
      hidden_message TEXT,
      message_author VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS story_message_history (
      id SERIAL PRIMARY KEY,
      week_start_date DATE NOT NULL,
      message_type VARCHAR(20) NOT NULL,
      content TEXT,
      media_url TEXT,
      media_filename TEXT,
      author VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP,
      is_expired BOOLEAN DEFAULT FALSE
    )
  `);
}

export async function POST(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message, author } = body;
    
    if (!message || typeof message !== 'string' || !message.trim()) {
      return NextResponse.json({ error: 'Message required' }, { status: 400 });
    }

    const weekStart = getCurrentWeekStart();
    const msgAuthor = author || username;
    const trimmedMsg = message.trim();
    const expiresAt = getExpirationDate();

    await ensureTables();

    await dbQuery(
      `INSERT INTO story_message_history (week_start_date, message_type, content, author, expires_at)
       VALUES ($1, 'text', $2, $3, $4)`,
      [weekStart, trimmedMsg, msgAuthor, expiresAt]
    );

    const storyCheck = await dbQuery(
      'SELECT week_start_date FROM secret_stories WHERE week_start_date = $1',
      [weekStart]
    );

    if (storyCheck.rows.length > 0) {
      await dbQuery(
        `UPDATE secret_stories SET hidden_message = $1, message_author = $2, updated_at = NOW() WHERE week_start_date = $3`,
        [trimmedMsg, msgAuthor, weekStart]
      );
    } else {
      const content = JSON.stringify({
        paragraphs: [
          'Today we learned about counting and colors.',
          'The children practiced their letters.',
          'Everyone had fun during circle time.',
          'We read a wonderful story together.',
          'Looking forward to more learning tomorrow.'
        ]
      });
      
      await dbQuery(
        `INSERT INTO secret_stories (week_start_date, theme, story_title, story_content, hidden_message, message_author)
         VALUES ($1, 'Weekly Learning', 'Classroom Activities', $2, $3, $4)`,
        [weekStart, content, trimmedMsg, msgAuthor]
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Message] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const weekStart = getCurrentWeekStart();
    const result = await dbQuery(
      'SELECT hidden_message, message_author, updated_at FROM secret_stories WHERE week_start_date = $1',
      [weekStart]
    );

    if (result.rows.length === 0 || !result.rows[0].hidden_message) {
      return NextResponse.json({ hasMessage: false });
    }

    return NextResponse.json({
      hasMessage: true,
      author: result.rows[0].message_author,
      updatedAt: result.rows[0].updated_at
    });
  } catch (error) {
    console.error('[Message GET] Error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
```

### File: `app/api/story/upload-media/route.ts` - Media Upload

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
    });
  }
  return pool;
}

async function dbQuery(text: string, params?: unknown[]) {
  const client = getPool();
  return client.query(text, params);
}

function getJWTSecret(): Uint8Array {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) throw new Error('STORY_JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

async function verifyToken(authHeader: string | null): Promise<string | null> {
  if (!authHeader) return null;
  try {
    const token = authHeader.replace('Bearer ', '');
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);
    return payload.username as string;
  } catch {
    return null;
  }
}

function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

function getExpirationDate(): Date {
  const expires = new Date();
  expires.setHours(expires.getHours() + 24);
  return expires;
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
const VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska'];
const AUDIO_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/m4a', 'audio/x-m4a', 'audio/mp4', 'audio/flac', 'audio/webm'];

const MAX_IMAGE_SIZE = 50 * 1024 * 1024;
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const MAX_AUDIO_SIZE = 50 * 1024 * 1024;

function getFileType(mimeType: string, filename: string): 'image' | 'video' | 'audio' | null {
  if (IMAGE_TYPES.includes(mimeType)) return 'image';
  if (VIDEO_TYPES.includes(mimeType)) return 'video';
  if (AUDIO_TYPES.includes(mimeType)) return 'audio';
  
  const ext = filename.split('.').pop()?.toLowerCase();
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif'];
  const videoExts = ['mp4', 'webm', 'mov', 'avi', 'mkv'];
  const audioExts = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac', 'weba'];
  
  if (ext && imageExts.includes(ext)) return 'image';
  if (ext && videoExts.includes(ext)) return 'video';
  if (ext && audioExts.includes(ext)) return 'audio';
  
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const username = await verifyToken(req.headers.get('authorization'));
    
    if (!username) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return NextResponse.json({ error: 'Storage not configured' }, { status: 500 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const fileType = getFileType(file.type, file.name);
    
    if (!fileType) {
      return NextResponse.json(
        { error: 'Unsupported file type' },
        { status: 400 }
      );
    }

    const maxSizes = { image: MAX_IMAGE_SIZE, video: MAX_VIDEO_SIZE, audio: MAX_AUDIO_SIZE };
    const maxSize = maxSizes[fileType];
    
    if (file.size > maxSize) {
      const maxMB = maxSize / (1024 * 1024);
      return NextResponse.json(
        { error: `File too large. Maximum: ${maxMB}MB` },
        { status: 400 }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const weekStartDate = getCurrentWeekStart();
    const timestamp = Date.now();
    const ext = file.name.split('.').pop() || 'bin';
    const filename = `${timestamp}-${username}.${ext}`;
    const storagePath = `story-media/${weekStartDate}/${filename}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);
    
    const { error: uploadError } = await supabase.storage
      .from('story-uploads')
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file', details: uploadError.message },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage
      .from('story-uploads')
      .getPublicUrl(storagePath);

    const mediaUrl = urlData.publicUrl;
    const expiresAt = getExpirationDate();

    await dbQuery(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, media_url, media_filename, author, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [weekStartDate, fileType, mediaUrl, file.name, username, expiresAt]
    );

    return NextResponse.json({
      success: true,
      mediaUrl,
      fileName: file.name,
      fileType,
      expiresIn: '24 hours'
    });
  } catch (error) {
    console.error('Media upload error:', error);
    return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
  }
}
```

### File: `app/api/story/admin/auth/route.ts` - Admin Authentication

[Full file content - 199 lines]
- POST: Admin login with JWT token creation
- GET: Verify admin session
- Includes extensive logging for debugging

### File: `app/api/story/admin/send-message/route.ts` - Admin Send Message

[Full file content - 147 lines]
- POST: Send teacher notes from admin
- Updates or creates story with hidden message
- 24-hour expiration

### File: `app/api/story/admin/message-history/route.ts` - Message History

[Full file content - 80 lines]
- GET: Retrieve message history with filtering
- Supports pagination, type filtering, expired message toggle
- Returns statistics

---

## Library Files

### File: `lib/story-auth.ts` - Authentication Utilities

```typescript
import { jwtVerify, SignJWT } from 'jose';

const getJwtSecret = () => {
  const secret = process.env.STORY_JWT_SECRET;
  if (!secret) {
    throw new Error('STORY_JWT_SECRET environment variable is not set');
  }
  return new TextEncoder().encode(secret);
};

export const JWT_SECRET = getJwtSecret();

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as { username: string; type?: 'user' | 'admin' };
  } catch (error) {
    return null;
  }
}

export async function createToken(payload: { username: string; type?: 'user' | 'admin' }) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(JWT_SECRET);
}

export function getCurrentWeekStart(): string {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  monday.setHours(0, 0, 0, 0);
  return monday.toISOString().split('T')[0];
}

export function getExpirationDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 7);
  return date;
}

export function extractToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.replace('Bearer ', '');
}
```

---

## Configuration

### Environment Variables Required

```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# JWT Authentication
STORY_JWT_SECRET=your-secret-key-here

# Supabase Storage
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Supabase Storage Setup

1. Create bucket: `story-uploads`
2. Make it public
3. Set policies:
   - INSERT: authenticated users
   - SELECT: public

---

## Known Issues & Debugging Notes

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` is set correctly
   - Verify SSL settings match your database provider
   - Check connection pool limits

2. **JWT Token Issues**
   - Verify `STORY_JWT_SECRET` is set in all environments
   - Check token expiration times (24h for users, 8h for admin)
   - Ensure token is passed in Authorization header as `Bearer <token>`

3. **Media Upload Failures**
   - Verify Supabase bucket exists and is public
   - Check storage policies are set correctly
   - Verify file size limits (50MB images, 100MB videos, 50MB audio)
   - Check file type validation

4. **Message Not Appearing**
   - Check expiration times (24 hours for messages)
   - Verify `is_expired` flag in database
   - Check `updated_at` timestamp for message updates
   - Verify week_start_date calculation

5. **Admin Login Issues**
   - Check admin user exists in `story_admin_users` table
   - Verify password hash matches (default: T / redoux)
   - Check JWT secret is set
   - Review console logs for detailed error messages

### Debug Endpoints

- `/api/story/debug` - System status and database connection
- `/api/story/test-connection` - Database connectivity test

### Database Queries for Debugging

```sql
-- Check users
SELECT username, created_at FROM story_users;
SELECT username, last_login FROM story_admin_users;

-- Check current week's story
SELECT * FROM secret_stories WHERE week_start_date = CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int - 1);

-- Check messages
SELECT * FROM story_message_history 
WHERE week_start_date = CURRENT_DATE - (EXTRACT(DOW FROM CURRENT_DATE)::int - 1)
ORDER BY created_at DESC;

-- Check login logs
SELECT * FROM story_login_logs ORDER BY login_at DESC LIMIT 20;

-- Check expired messages
SELECT COUNT(*) FROM story_message_history WHERE is_expired = TRUE;
```

---

## File Structure Summary

```
app/
├── story/
│   ├── page.tsx                          # User login
│   ├── [session]/
│   │   └── page.tsx                      # Story viewer
│   └── admin/
│       ├── page.tsx                      # Admin login
│       └── dashboard/
│           └── page.tsx                  # Admin dashboard
└── api/
    └── story/
        ├── auth/route.ts                 # User auth
        ├── current/route.ts              # Get story
        ├── current-media/route.ts        # Get media
        ├── message/route.ts              # Message handling
        ├── upload-media/route.ts         # Media upload
        ├── debug/route.ts                # Debug endpoint
        ├── test-connection/route.ts      # Connection test
        └── admin/
            ├── auth/route.ts             # Admin auth
            ├── message-history/route.ts # Message history
            ├── send-message/route.ts     # Send message
            ├── login-logs/route.ts       # Login logs
            └── online-users/route.ts    # Online users

lib/
└── story-auth.ts                         # Auth utilities

migrations/
└── story_complete_schema.sql             # Database schema
```

---

**End of Debug Package**

