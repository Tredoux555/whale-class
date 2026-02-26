# Integrating Messaging Into Montree Navigation

## Quick Integration Guide

This guide shows how to add messaging links to your existing navigation in Montree.

## For Teacher Dashboard

### Add to Sidebar/Header Navigation

Find your teacher dashboard navigation component and add:

```tsx
import Link from 'next/link';
import { Badge } from '@/components/ui/badge'; // or your badge component

// In your nav component:
<Link
  href="/montree/dashboard/messages"
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
>
  <span className="text-xl">📬</span>
  <span>Messages</span>
  {unreadCount > 0 && (
    <Badge className="ml-auto bg-emerald-500">{unreadCount}</Badge>
  )}
</Link>
```

### Get Unread Count for Badge

Add to your dashboard component:

```tsx
import { useEffect, useState } from 'react';
import { fetchUnreadMessages } from '@/lib/montree/messaging';

export function DashboardNav() {
  const [unreadCount, setUnreadCount] = useState(0);
  const session = getSession(); // your existing session function

  useEffect(() => {
    if (session?.classroom?.id) {
      fetchUnreadMessages(session.classroom.id)
        .then(data => setUnreadCount(data.messages?.length || 0))
        .catch(error => console.error('Failed to get unread count:', error));
    }
  }, [session?.classroom?.id]);

  return (
    // ... nav with unreadCount badge
  );
}
```

## For Parent Portal

### Add to Parent Dashboard Navigation

```tsx
import Link from 'next/link';

// In your parent nav component:
<Link
  href="/montree/parent/messages"
  className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-emerald-50 transition-colors"
>
  <span className="text-xl">📬</span>
  <span>Messages</span>
  {unreadCount > 0 && (
    <span className="inline-flex items-center justify-center w-5 h-5 ml-auto rounded-full bg-emerald-500 text-white text-xs font-bold">
      {unreadCount > 99 ? '99+' : unreadCount}
    </span>
  )}
</Link>
```

### Add Messages Tab to Dashboard

If you have tabs in the parent dashboard:

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function ParentDashboard() {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="milestones">Milestones</TabsTrigger>
        <TabsTrigger value="photos">Photos</TabsTrigger>
        <TabsTrigger value="messages" className="flex items-center gap-1">
          Messages
          {unreadCount > 0 && (
            <span className="inline-flex items-center justify-center w-4 h-4 ml-1 rounded-full bg-emerald-500 text-white text-xs">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="messages">
        <ParentMessagesPage />
      </TabsContent>
    </Tabs>
  );
}
```

## Add Unread Badge to Multiple Places

### Header Badge Example

```tsx
// In your app header/top-nav
import { useEffect, useState } from 'react';
import { getUnreadCount } from '@/lib/montree/messaging';

export function TopNav() {
  const [unreadCount, setUnreadCount] = useState(0);
  const session = getSession();

  useEffect(() => {
    const interval = setInterval(async () => {
      if (session?.classroom?.id) {
        const count = await getUnreadCount(session.classroom.id);
        setUnreadCount(count);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [session?.classroom?.id]);

  return (
    <div className="flex items-center gap-4">
      <Link href="/montree/dashboard/messages" className="relative">
        <span className="text-2xl">📬</span>
        {unreadCount > 0 && (
          <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold">
            {unreadCount}
          </span>
        )}
      </Link>
    </div>
  );
}
```

## Styling Consistency

Make sure the messaging nav items match your existing button styles:

```tsx
// Define button styles once, use everywhere
const navLinkStyles = "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all duration-200 text-gray-700 hover:bg-emerald-50 hover:text-emerald-700";

<Link href="/montree/dashboard/messages" className={navLinkStyles}>
  📬 Messages
</Link>
```

## Add to Mobile Menu

For mobile navigation, ensure messaging is included:

```tsx
// Mobile menu items
export const mobileNavItems = [
  { href: '/montree/dashboard', label: '📊 Dashboard', icon: '📊' },
  { href: '/montree/dashboard/curriculum', label: '📚 Curriculum', icon: '📚' },
  { href: '/montree/dashboard/messages', label: '📬 Messages', icon: '📬' },
  { href: '/montree/dashboard/focus-works', label: '🎯 Focus', icon: '🎯' },
  // ... other items
];
```

## Authentication Note

Both pages (`/montree/dashboard/messages` and `/montree/parent/messages`) automatically:
- Check for valid session
- Redirect to login if not authenticated
- Scope data to the authenticated user

No additional auth checks needed in navigation.

## Performance Tips

### 1. Cache Unread Count

```tsx
import { useCallback, useEffect, useState } from 'react';

export function useUnreadCount(classroomId?: string) {
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!classroomId) return;

    const newCount = await getUnreadCount(classroomId);
    setCount(newCount);
  }, [classroomId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { count, loading, refresh };
}

// Usage:
const { count } = useUnreadCount(session?.classroom?.id);
```

### 2. Lazy Load Messages Page

```tsx
// In your pages, use dynamic import
import dynamic from 'next/dynamic';

const TeacherMessages = dynamic(
  () => import('@/app/montree/dashboard/messages/page'),
  { loading: () => <LoadingSpinner /> }
);
```

## Testing Navigation Links

Quick checklist to verify integration:

- [ ] Teachers see message link in dashboard
- [ ] Parents see message link in portal
- [ ] Links navigate to correct pages
- [ ] Unread badges display correctly
- [ ] Authentication redirects work
- [ ] No 404 errors
- [ ] Styling matches existing nav
- [ ] Works on mobile
- [ ] Badge counts update correctly

## Troubleshooting

### Link shows 404
- Verify all files are in correct locations
- Check file permissions
- Restart dev server

### Unread count not updating
- Check that `getUnreadCount()` has correct classroomId/parentId
- Verify messages are being marked as read
- Check browser console for errors

### Styling doesn't match
- Copy existing nav button styles
- Use same color classes as other nav items
- Test on mobile view

## Next Steps

1. Add messaging links to your navigation
2. Deploy migration to create database tables
3. Test sending/receiving messages
4. Add to any additional navigation areas
5. Consider adding notification indicators
6. Monitor performance with large message volumes

## Files Reference

- Main pages: `/app/montree/dashboard/messages/page.tsx` and `/app/montree/parent/messages/page.tsx`
- Components: `/components/montree/messaging/`
- Utilities: `/lib/montree/messaging.ts`
- API: `/app/api/montree/messages/`
