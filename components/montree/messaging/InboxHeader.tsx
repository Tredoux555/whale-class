// /components/montree/messaging/InboxHeader.tsx
// Header for messaging interface

'use client';

interface InboxHeaderProps {
  unreadCount: number;
  isTeacher?: boolean;
}

export function InboxHeader({ unreadCount, isTeacher }: InboxHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-emerald-50 via-white to-teal-50 border-b border-emerald-100 px-6 py-5">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">📬</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
            <p className="text-sm text-gray-600">
              {isTeacher
                ? 'Communicate with parents about student progress'
                : 'Stay updated on your child\'s learning'}
            </p>
          </div>
        </div>

        {/* Unread badge */}
        {unreadCount > 0 && (
          <div className="flex items-center gap-3 px-4 py-2 bg-emerald-100 rounded-full border border-emerald-200">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-semibold text-emerald-700">
              {unreadCount} new
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
