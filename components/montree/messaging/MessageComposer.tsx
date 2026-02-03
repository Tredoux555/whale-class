// /components/montree/messaging/MessageComposer.tsx
// Compose and send messages

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface MessageComposerProps {
  childId: string;
  childName: string;
  senderType: 'teacher' | 'parent';
  senderId: string;
  senderName: string;
  onSent?: () => void;
  onCancel?: () => void;
}

export function MessageComposer({
  childId,
  childName,
  senderType,
  senderId,
  senderName,
  onSent,
  onCancel,
}: MessageComposerProps) {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!message.trim()) {
      toast.error('Please write a message');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/montree/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId,
          senderType,
          senderId,
          senderName,
          subject: subject.trim() || null,
          messageText: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || 'Failed to send message');
        return;
      }

      toast.success('Message sent');
      setSubject('');
      setMessage('');
      onSent?.();
    } catch (error) {
      console.error('Send error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const charCount = message.length;
  const isValid = message.trim().length > 0;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white text-sm font-semibold">
            ✉️
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 text-sm">New Message</h3>
            <p className="text-xs text-gray-500">To {senderType === 'teacher' ? 'teacher' : 'parent'}</p>
          </div>
        </div>

        {/* Child context */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-emerald-50 rounded-lg">
          <span className="text-sm">👶</span>
          <span className="text-xs font-medium text-emerald-700">{childName}</span>
        </div>
      </div>

      {/* Subject field */}
      <input
        type="text"
        placeholder="Subject (optional)"
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        maxLength={100}
        className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-200 mb-3"
      />

      {/* Message field */}
      <div className="relative">
        <textarea
          placeholder="Write your message here. Keep it professional and focused on learning..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={2000}
          rows={5}
          className="w-full px-3 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm placeholder-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors duration-200 resize-none font-sans"
        />

        {/* Character count */}
        <div className="absolute bottom-2 right-3 text-xs text-gray-500 font-medium">
          {charCount}/2000
        </div>
      </div>

      {/* Tips */}
      <div className="mt-3 p-3 bg-blue-50 border border-blue-100 rounded-lg">
        <p className="text-xs text-blue-700 leading-relaxed">
          <span className="font-semibold">💡 Tip:</span> Keep messages professional and learning-focused. Share observations, progress, and specific examples.
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 mt-4 justify-end">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors duration-200 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 rounded-lg shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <span>📤</span>
              Send
            </>
          )}
        </button>
      </div>
    </form>
  );
}
