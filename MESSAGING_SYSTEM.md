# Montree Teacher-Parent Messaging System

## Overview

A professional, academic-focused messaging system that connects teachers and parents through the official Montree platform. The system is designed to:

- Keep communication tied to specific children for context
- Enable asynchronous messaging (no push notifications)
- Maintain a professional, academic tone
- Provide clean, intuitive UI for both teachers and parents
- Track read/unread status without pressure

## Architecture

### Database Schema

**Table: `montree_messages`**

```sql
- id (UUID, PK)
- child_id (UUID, FK to montree_children)
- sender_type (TEXT: 'teacher' | 'parent')
- sender_id (UUID)
- sender_name (TEXT)
- subject (TEXT, nullable)
- message_text (TEXT)
- is_read (BOOLEAN)
- read_at (TIMESTAMPTZ, nullable)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

### Indexes

- `idx_messages_child`: Child ID + creation date (for filtering by child)
- `idx_messages_read`: Unread status (for inbox counts)
- `idx_messages_sender`: Sender ID + creation date (for user history)
- `idx_messages_created`: Creation date (for chronological ordering)

## API Endpoints

### GET /api/montree/messages

List messages with optional filters.

**Query Parameters:**
- `classroom_id` (UUID): Filter by classroom
- `child_id` (UUID): Filter by child
- `parent_id` (UUID): Filter parent's children
- `unread_only` (boolean): Only unread messages

**Response:**
```json
{
  "messages": [
    {
      "id": "uuid",
      "child_id": "uuid",
      "sender_name": "Mrs. Smith",
      "sender_type": "teacher",
      "subject": "Progress Update",
      "message_text": "Emma is showing great progress...",
      "is_read": false,
      "created_at": "2026-02-02T10:30:00Z"
    }
  ]
}
```

### POST /api/montree/messages

Send a new message.

**Request Body:**
```json
{
  "childId": "uuid",
  "senderType": "teacher",
  "senderId": "uuid",
  "senderName": "Mrs. Smith",
  "subject": "Quick Note",
  "messageText": "Emma had a great day with..."
}
```

**Response:**
```json
{
  "success": true,
  "message": { /* full message object */ }
}
```

### PATCH /api/montree/messages/[id]

Mark a message as read.

**Response:**
```json
{
  "success": true,
  "message": { /* updated message */ }
}
```

### GET /api/montree/messages/[id]

Fetch a specific message.

## UI Components

### MessageCard
Displays a single message in the inbox. Features:
- Sender avatar with initials
- Unread indicator (pulsing dot)
- Subject and message preview
- Expandable detail view
- Reply button

**Usage:**
```tsx
<MessageCard
  message={message}
  childName="Emma"
  onRead={(id) => markAsRead(id)}
  onReply={(msg) => openComposer(msg)}
  isTeacher={true}
/>
```

### MessageComposer
Form to compose and send new messages. Features:
- Subject line (optional)
- Rich text message area
- Character counter
- Child context display
- Submit/cancel buttons
- Tips for professional communication

**Usage:**
```tsx
<MessageComposer
  childId="uuid"
  childName="Emma"
  senderType="teacher"
  senderId="uuid"
  senderName="Mrs. Smith"
  onSent={() => reloadMessages()}
  onCancel={() => closeComposer()}
/>
```

### InboxHeader
Professional header with unread count badge. Features:
- Messaging icon
- Title and description
- Unread badge with count
- Gradient background

**Usage:**
```tsx
<InboxHeader unreadCount={5} isTeacher={true} />
```

## Pages

### Teacher Inbox
**Path:** `/montree/dashboard/messages`

Features:
- Messages grouped by child
- Filter tabs (All, Unread)
- New message button
- Quick stats sidebar
- Best practices guide

### Parent Inbox
**Path:** `/montree/parent/messages`

Features:
- Messages grouped by child
- Filter tabs (All, From Teacher, Unread)
- Children list with unread counts
- New message button
- Message overview stats

## Design Language

The messaging system uses Montree's design philosophy:

**Colors:**
- Primary: Emerald green (emerald-500)
- Secondary: Teal (teal-500/600)
- Accents: Sky blue, orange for various states
- Backgrounds: Subtle gradients and neutrals

**Typography:**
- Headings: Bold, clear hierarchy
- Body: Readable sans-serif
- Emphasis: Color coding for sender type

**Components:**
- Rounded corners (lg/xl)
- Subtle shadows
- Smooth transitions
- Clear visual hierarchy

## Usage Examples

### For Teachers

**Sending a message to a parent:**
```tsx
import { MessageComposer } from '@/components/montree/messaging';

// In teacher dashboard
<MessageComposer
  childId={childId}
  childName="Emma"
  senderType="teacher"
  senderId={teacherId}
  senderName="Mrs. Smith"
  onSent={() => toast.success('Sent!')}
/>
```

**Displaying inbox:**
```tsx
import { InboxHeader } from '@/components/montree/messaging';

// In messages page
<InboxHeader unreadCount={3} isTeacher={true} />
{/* Messages grouped by child */}
<MessageCard message={msg} childName="Emma" onRead={handleRead} />
```

### For Parents

**Viewing teacher messages:**
```tsx
// Messages are automatically fetched by parent session
// Grouped and displayed by child
```

**Replying to teacher:**
```tsx
<MessageComposer
  childId={childId}
  childName="Emma"
  senderType="parent"
  senderId={parentId}
  senderName="Jane Smith"
  onSent={() => refetch()}
/>
```

## Best Practices

### For Teachers
- Keep messages professional and learning-focused
- Share specific observations with examples
- Respond within 24-48 hours when possible
- Use positive, constructive language
- Avoid discipline issues (handle in person)

### For Parents
- Check messages regularly
- Respond to teacher inquiries
- Share relevant information about home
- Ask clarifying questions if needed
- Keep messages brief and focused

## Performance Considerations

### Indexes
The schema includes strategic indexes:
- `child_id, created_at DESC`: Fast filtering by child
- `is_read WHERE NOT is_read`: Quick unread counts
- `sender_id, created_at DESC`: User message history
- `created_at DESC`: Chronological ordering

### Caching
Consider caching unread counts at the session level to avoid repeated database queries.

### Pagination
For large message lists, implement pagination:
```tsx
// Limit initial load to last 50 messages
// Load more on scroll
```

## Future Enhancements

### Planned Features
1. **Message notifications** - Optional email digest for unread messages
2. **Typing indicators** - Real-time presence
3. **Message search** - Find messages by content
4. **Message templates** - Quick responses for common topics
5. **Attachments** - Share photos/documents
6. **Voice notes** - Audio messages for parents on the go
7. **Scheduled messages** - Send messages at specific times
8. **Translation** - Automatic language translation
9. **Sentiment analysis** - Flag sensitive messages
10. **Message history** - Archive old conversations

### Technical Improvements
- Add optimistic updates for better UX
- Implement real-time sync with WebSockets
- Add message encryption for privacy
- Create message backup/export functionality
- Add rate limiting to prevent spam

## Troubleshooting

### Messages not loading
- Check classroom_id/parent_id parameters
- Verify user has access to the children
- Check browser console for errors

### Unread count incorrect
- Messages should auto-mark as read when expanded
- Check `read_at` timestamp in database
- Clear browser cache if needed

### Missing sender information
- Verify sender_id and sender_name are provided
- Check that user exists in database
- Look for logging errors in console

## Migration

The migration file `112_messaging_system.sql` creates:
1. `montree_messages` table with all required columns
2. Indexes for performance
3. Update trigger for `updated_at` timestamp
4. Check constraints for data validation

To run the migration:
```bash
# Supabase will automatically run migrations in /migrations directory
# Or manually run via Supabase dashboard
```

## Files Created

```
migrations/
  └── 112_messaging_system.sql

app/api/montree/messages/
  ├── route.ts (GET/POST)
  └── [id]/route.ts (PATCH/GET)

components/montree/messaging/
  ├── MessageCard.tsx
  ├── MessageComposer.tsx
  ├── InboxHeader.tsx
  └── index.ts

app/montree/dashboard/messages/
  └── page.tsx (Teacher inbox)

app/montree/parent/messages/
  └── page.tsx (Parent inbox)

lib/montree/
  └── messaging.ts (Utilities)

docs/
  └── MESSAGING_SYSTEM.md (This file)
```

## Support

For questions or issues with the messaging system, refer to:
- Component props in TypeScript interfaces
- API endpoint documentation above
- Best practices section
- Troubleshooting guide
