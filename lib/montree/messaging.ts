// /lib/montree/messaging.ts
// Messaging utilities and operations

export interface Message {
  id: string;
  child_id: string;
  sender_type: 'teacher' | 'parent';
  sender_id: string;
  sender_name: string;
  subject?: string;
  message_text: string;
  is_read: boolean;
  read_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MessageCreateInput {
  childId: string;
  senderType: 'teacher' | 'parent';
  senderId: string;
  senderName: string;
  subject?: string | null;
  messageText: string;
}

// Fetch messages for a classroom
export async function fetchClassroomMessages(classroomId: string) {
  const response = await fetch(
    `/api/montree/messages?classroom_id=${classroomId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

// Fetch messages for a parent
export async function fetchParentMessages(parentId: string) {
  const response = await fetch(
    `/api/montree/messages?parent_id=${parentId}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch messages');
  }

  return response.json();
}

// Fetch unread messages
export async function fetchUnreadMessages(
  classroomId?: string,
  parentId?: string
) {
  let url = '/api/montree/messages?unread_only=true';

  if (classroomId) {
    url += `&classroom_id=${classroomId}`;
  } else if (parentId) {
    url += `&parent_id=${parentId}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error('Failed to fetch unread messages');
  }

  return response.json();
}

// Send a new message
export async function sendMessage(input: MessageCreateInput) {
  const response = await fetch('/api/montree/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to send message');
  }

  return response.json();
}

// Mark message as read
export async function markMessageAsRead(messageId: string) {
  const response = await fetch(`/api/montree/messages/${messageId}`, {
    method: 'PATCH',
  });

  if (!response.ok) {
    throw new Error('Failed to mark message as read');
  }

  return response.json();
}

// Get a specific message
export async function getMessageById(messageId: string) {
  const response = await fetch(`/api/montree/messages/${messageId}`);

  if (!response.ok) {
    throw new Error('Failed to fetch message');
  }

  return response.json();
}

// Get unread count
export async function getUnreadCount(
  classroomId?: string,
  parentId?: string
) {
  const data = await fetchUnreadMessages(classroomId, parentId);
  return data.messages?.length || 0;
}

// Format date for display
export function formatMessageDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

// Group messages by child
export function groupMessagesByChild(
  messages: Message[],
  childMap: Map<string, { id: string; name: string }>
) {
  const grouped: {
    [childId: string]: {
      child: { id: string; name: string };
      messages: Message[];
    };
  } = {};

  messages.forEach(msg => {
    if (!grouped[msg.child_id]) {
      grouped[msg.child_id] = {
        child: childMap.get(msg.child_id) || {
          id: msg.child_id,
          name: 'Unknown',
        },
        messages: [],
      };
    }
    grouped[msg.child_id].messages.push(msg);
  });

  return grouped;
}

// Filter messages
export function filterMessages(
  messages: Message[],
  filter: 'all' | 'unread' | 'from_teacher' | 'from_parent'
): Message[] {
  switch (filter) {
    case 'unread':
      return messages.filter(m => !m.is_read);
    case 'from_teacher':
      return messages.filter(m => m.sender_type === 'teacher');
    case 'from_parent':
      return messages.filter(m => m.sender_type === 'parent');
    case 'all':
    default:
      return messages;
  }
}
