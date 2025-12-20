# Debug Admin Message Sending Feature

## 1. Current Code: `/api/story/admin/send-message/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { db } from '@/lib/db';

const ADMIN_JWT_SECRET = new TextEncoder().encode(
  process.env.STORY_ADMIN_JWT_SECRET || process.env.STORY_JWT_SECRET || 'fallback-admin-secret-key-change-in-production'
);

export async function POST(req: NextRequest) {
  // Check admin session - support both Authorization header and cookie
  const authHeader = req.headers.get('authorization');
  let token: string | null = null;

  if (authHeader) {
    token = authHeader.replace('Bearer ', '');
  } else {
    // Try cookie as fallback
    const cookies = req.cookies;
    const sessionCookie = cookies.get('story_admin_session');
    if (sessionCookie) {
      token = sessionCookie.value;
    }
  }

  if (!token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Verify JWT token
    const { payload } = await jwtVerify(token, ADMIN_JWT_SECRET);

    if (payload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { message, author = 'Admin' } = await req.json();

    if (!message || typeof message !== 'string' || message.trim() === '') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    // Get current week's Monday
    const today = new Date();
    const dayOfWeek = today.getDay();
    const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + diff);
    monday.setHours(0, 0, 0, 0);
    const weekStartDate = monday.toISOString().split('T')[0];

    // Expiration: 7 days from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Save to message history
    await db.query(
      `INSERT INTO story_message_history 
       (week_start_date, message_type, message_content, author, expires_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [weekStartDate, 'text', message.trim(), author, expiresAt]
    );

    // Update the story's hidden message (this is what users see when clicking 't')
    const result = await db.query(
      `UPDATE secret_stories 
       SET hidden_message = $1, 
           message_author = $2, 
           updated_at = NOW()
       WHERE week_start_date = $3
       RETURNING *`,
      [message.trim(), author, weekStartDate]
    );

    if (result.rows.length === 0) {
      // Story doesn't exist yet, create it first
      return NextResponse.json(
        { error: 'No story exists for this week. Visit the story page first to generate one.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Message sent successfully',
      sentAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Admin send message error:', error);
    
    // Handle JWT verification errors
    if (error instanceof Error && error.message.includes('JWT')) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    );
  }
}
```

## 2. Admin Session Cookie Flow

**Login Flow:**
1. User logs in at `/story/admin` (page.tsx)
2. POST to `/api/story/admin/auth` with username/password
3. Server creates JWT token and returns `{ session: token }`
4. **Client stores token in `sessionStorage`** (NOT cookies):
   ```typescript
   sessionStorage.setItem('story_admin_session', session);
   ```

**Authentication in API:**
- The API route checks for `Authorization` header first
- Falls back to cookie `story_admin_session` if header not present
- **Issue**: Client uses `sessionStorage`, not cookies, so cookie fallback won't work
- **But**: Dashboard correctly sends `Authorization: Bearer ${session}` header

## 3. Admin Dashboard Code

```typescript
const sendAdminMessage = async () => {
  if (!adminMessage.trim()) return;
  
  setSendingMessage(true);
  setMessageError('');
  setMessageSent(false);

  const session = sessionStorage.getItem('story_admin_session');
  if (!session) {
    setMessageError('Session expired. Please log in again.');
    setSendingMessage(false);
    return;
  }

  try {
    const res = await fetch('/api/story/admin/send-message', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session}`
      },
      body: JSON.stringify({ 
        message: adminMessage.trim(),
        author: adminUsername || 'Admin'
      })
    });

    const data = await res.json();

    if (res.ok) {
      setMessageSent(true);
      setAdminMessage('');
      setTimeout(() => setMessageSent(false), 3000);
      if (activeTab === 'messages') {
        fetchMessageHistory();
      }
    } else {
      setMessageError(data.error || 'Failed to send message');
    }
  } catch (err) {
    setMessageError('Network error. Please try again.');
  } finally {
    setSendingMessage(false);
  }
};
```

## 4. Potential Issues

1. **Database Error**: The `story_message_history` table might not exist or have wrong schema
2. **Missing Story**: The `secret_stories` table might not have a row for current week
3. **JWT Verification**: Token might be expired or invalid
4. **Database Connection**: `db.query()` might be failing

## 5. Test in Browser Console

Run this while logged into admin dashboard:

```javascript
// Get session token
const session = sessionStorage.getItem('story_admin_session');
console.log('Session token:', session ? 'Found' : 'Not found');

// Test API call
fetch('/api/story/admin/send-message', {
  method: 'POST',
  headers: { 
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session}`
  },
  body: JSON.stringify({ message: 'Test message', author: 'Admin' })
})
.then(r => {
  console.log('Status:', r.status);
  return r.json();
})
.then(data => {
  console.log('Response:', data);
})
.catch(err => {
  console.error('Error:', err);
});
```

## 6. Check Server Logs

Look for:
- `Admin send message error:` in console
- Database connection errors
- JWT verification errors
- SQL query errors

