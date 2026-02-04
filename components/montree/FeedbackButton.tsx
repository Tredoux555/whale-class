'use client';

// components/montree/FeedbackButton.tsx
// Quick feedback button for teachers, principals, and parents
// Floating button → expands to quick form → 2-3 taps to submit
// Auto-detects user type and session data from localStorage

import { useState, useEffect } from 'react';

interface FeedbackButtonProps {
  // Optional overrides - if not provided, auto-detects from session
  userType?: 'teacher' | 'principal' | 'parent' | 'admin';
  schoolId?: string;
  userId?: string;
  userName?: string;
}

type FeedbackType = 'bug' | 'idea' | 'help' | 'praise';

interface DetectedSession {
  userType: 'teacher' | 'principal' | 'parent' | 'admin';
  schoolId?: string;
  userId?: string;
  userName?: string;
}

const feedbackTypes: { type: FeedbackType; emoji: string; label: string }[] = [
  { type: 'bug', emoji: '🐛', label: 'Bug' },
  { type: 'idea', emoji: '💡', label: 'Idea' },
  { type: 'help', emoji: '❓', label: 'Help' },
  { type: 'praise', emoji: '👍', label: 'Love it' },
];

// Auto-detect user session from localStorage
function detectSession(): DetectedSession | null {
  if (typeof window === 'undefined') return null;

  // Try teacher/principal session first (montree_session)
  try {
    const teacherSession = localStorage.getItem('montree_session');
    if (teacherSession) {
      const data = JSON.parse(teacherSession);
      if (data.teacher?.id) {
        return {
          userType: data.teacher.role === 'principal' ? 'principal' : 'teacher',
          schoolId: data.school?.id,
          userId: data.teacher.id,
          userName: data.teacher.name
        };
      }
    }
  } catch {}

  // Try parent session (montree_parent_session)
  try {
    const parentSession = localStorage.getItem('montree_parent_session');
    if (parentSession) {
      const data = JSON.parse(parentSession);
      if (data.childId || data.parentId) {
        return {
          userType: 'parent',
          userId: data.parentId || data.childId,
          userName: data.name || 'Parent'
        };
      }
    }
  } catch {}

  return null;
}

export default function FeedbackButton({
  userType: propUserType,
  schoolId: propSchoolId,
  userId: propUserId,
  userName: propUserName
}: FeedbackButtonProps) {
  const [sessionData, setSessionData] = useState<DetectedSession | null>(null);

  // Detect session on mount
  useEffect(() => {
    const detected = detectSession();
    setSessionData(detected);
  }, []);

  // Use props if provided, otherwise use detected session
  const userType = propUserType || sessionData?.userType || 'teacher';
  const schoolId = propSchoolId || sessionData?.schoolId;
  const userId = propUserId || sessionData?.userId;
  const userName = propUserName || sessionData?.userName;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      // Reset after animation
      const timer = setTimeout(() => {
        setSelectedType(null);
        setMessage('');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!selectedType || !message.trim()) return;

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/montree/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          school_id: schoolId,
          user_type: userType,
          user_id: userId,
          user_name: userName,
          page_url: window.location.pathname,
          feedback_type: selectedType,
          message: message.trim()
        })
      });

      if (res.ok) {
        setShowSuccess(true);
        setTimeout(() => {
          setShowSuccess(false);
          setIsOpen(false);
        }, 1500);
      } else {
        alert('Failed to send feedback. Please try again.');
      }
    } catch (error) {
      console.error('Feedback error:', error);
      alert('Failed to send feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success state
  if (showSuccess) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <div className="bg-emerald-500 text-white rounded-2xl px-6 py-4 shadow-lg flex items-center gap-3 animate-bounce">
          <span className="text-2xl">✓</span>
          <span className="font-medium">Thanks for your feedback!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Expanded Form */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50">
            <span className="font-semibold text-gray-800">Quick Feedback</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600 text-xl leading-none"
            >
              ×
            </button>
          </div>

          {/* Type Selection */}
          <div className="p-4">
            <div className="flex gap-2 mb-4">
              {feedbackTypes.map(({ type, emoji, label }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex-1 py-2 px-1 rounded-xl text-center transition-all ${
                    selectedType === type
                      ? 'bg-emerald-100 border-2 border-emerald-500 scale-105'
                      : 'bg-gray-100 border-2 border-transparent hover:bg-gray-200'
                  }`}
                >
                  <div className="text-xl">{emoji}</div>
                  <div className="text-xs text-gray-600 mt-1">{label}</div>
                </button>
              ))}
            </div>

            {/* Message Input */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={
                selectedType === 'bug' ? "What's not working?" :
                selectedType === 'idea' ? "What would make it better?" :
                selectedType === 'help' ? "What do you need help with?" :
                selectedType === 'praise' ? "What do you love?" :
                "Select a type above, then tell us..."
              }
              className="w-full h-24 p-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              disabled={!selectedType}
            />

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedType || !message.trim() || isSubmitting}
              className={`w-full mt-3 py-3 rounded-xl font-semibold transition-all ${
                selectedType && message.trim() && !isSubmitting
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-98'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span> Sending...
                </span>
              ) : (
                'Send Feedback →'
              )}
            </button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl transition-all hover:scale-110 active:scale-95 ${
          isOpen
            ? 'bg-gray-800 text-white rotate-45'
            : 'bg-emerald-500 text-white hover:bg-emerald-600'
        }`}
        aria-label="Give feedback"
      >
        {isOpen ? '×' : '💬'}
      </button>
    </div>
  );
}
