'use client';

// components/montree/FeedbackButton.tsx
// Quick feedback button for teachers, principals, and parents
// Floating button → expands to quick form → 2-3 taps to submit
// Auto-detects user type and session data from localStorage
// Supports one-tap screenshot capture via html2canvas

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

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
  const buttonRef = useRef<HTMLDivElement>(null);

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

  // Screenshot state
  const [screenshot, setScreenshot] = useState<string | null>(null); // base64 data URL
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      // Reset after animation
      const timer = setTimeout(() => {
        setSelectedType(null);
        setMessage('');
        setScreenshot(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Capture screenshot of the page
  const captureScreenshot = async () => {
    setIsCapturing(true);

    try {
      // Temporarily hide the feedback button during capture
      if (buttonRef.current) {
        buttonRef.current.style.visibility = 'hidden';
      }

      // Small delay to ensure button is hidden
      await new Promise(resolve => setTimeout(resolve, 150));

      // Mobile-friendly html2canvas settings
      const isMobile = window.innerWidth < 768;
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: true,
        scale: isMobile ? 0.4 : 0.5,   // Lower scale on mobile to avoid memory issues
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        foreignObjectRendering: false,  // More compatible on iOS
        removeContainer: true,
        ignoreElements: (element) => {
          // Ignore feedback button and any video/canvas elements that cause issues
          if (element.closest('[data-feedback-button]')) return true;
          if (element.tagName === 'VIDEO') return true;
          return false;
        }
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      setScreenshot(dataUrl);

    } catch (error) {
      console.error('Screenshot capture failed:', error);
      // Don't use alert() on mobile - it's jarring. Just show inline feedback.
      setScreenshotError(true);
      setTimeout(() => setScreenshotError(false), 3000);
    } finally {
      // Show the feedback button again
      if (buttonRef.current) {
        buttonRef.current.style.visibility = 'visible';
      }
      setIsCapturing(false);
    }
  };

  // Upload screenshot to Supabase storage and get URL
  const uploadScreenshot = async (base64Data: string): Promise<string | null> => {
    try {
      // Convert base64 to blob
      const response = await fetch(base64Data);
      const blob = await response.blob();

      // Generate unique filename
      const filename = `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      // Upload to API endpoint
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('bucket', 'feedback-screenshots');

      const uploadRes = await fetch('/api/montree/feedback/upload-screenshot', {
        method: 'POST',
        body: formData
      });

      if (!uploadRes.ok) {
        throw new Error('Upload failed');
      }

      const { url } = await uploadRes.json();
      return url;
    } catch (error) {
      console.error('Screenshot upload failed:', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!selectedType || !message.trim()) return;

    setIsSubmitting(true);

    try {
      // Upload screenshot if exists
      let screenshotUrl: string | null = null;
      if (screenshot) {
        screenshotUrl = await uploadScreenshot(screenshot);
      }

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
          message: message.trim(),
          screenshot_url: screenshotUrl
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
    <div ref={buttonRef} className="fixed bottom-6 right-6 z-50" data-feedback-button>
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

            {/* Screenshot Capture */}
            <div className="mb-3">
              {screenshot ? (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Screenshot preview"
                    className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  />
                  <button
                    onClick={() => setScreenshot(null)}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-sm flex items-center justify-center hover:bg-red-600"
                  >
                    ×
                  </button>
                  <div className="absolute bottom-1 left-1 px-2 py-0.5 bg-black/60 text-white text-xs rounded">
                    📸 Screenshot attached
                  </div>
                </div>
              ) : (
                <button
                  onClick={captureScreenshot}
                  disabled={isCapturing}
                  className={`w-full py-2.5 border-2 border-dashed rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                    screenshotError
                      ? 'bg-red-50 border-red-200 text-red-500'
                      : 'bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100 hover:border-blue-300'
                  }`}
                >
                  {isCapturing ? (
                    <>
                      <span className="animate-spin">⏳</span>
                      Capturing...
                    </>
                  ) : screenshotError ? (
                    <>
                      <span>⚠️</span>
                      Capture failed — tap to retry
                    </>
                  ) : (
                    <>
                      <span>📸</span>
                      Capture Screen
                    </>
                  )}
                </button>
              )}
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
              className="w-full h-20 p-3 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
                `Send${screenshot ? ' with Screenshot' : ''} →`
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
