// components/home/HomeFeedbackButton.tsx
// Home-specific floating feedback button
// Bug/idea/help/praise categories with screenshot capture

'use client';

import { useState, useEffect, useRef } from 'react';
import html2canvas from 'html2canvas';

interface HomeFeedbackButtonProps {
  familyId?: string;
  userId?: string;
  userName?: string;
}

type FeedbackType = 'bug' | 'idea' | 'help' | 'praise';

const feedbackTypes: { type: FeedbackType; emoji: string; label: string }[] = [
  { type: 'bug', emoji: '🐛', label: 'Bug' },
  { type: 'idea', emoji: '💡', label: 'Idea' },
  { type: 'help', emoji: '❓', label: 'Help' },
  { type: 'praise', emoji: '👍', label: 'Love it' },
];

function detectHomeSession(): { familyId?: string; userId?: string; userName?: string } | null {
  if (typeof window === 'undefined') return null;

  try {
    const homeSession = localStorage.getItem('home_session');
    if (homeSession) {
      const data = JSON.parse(homeSession);
      if (data.family?.id) {
        return {
          familyId: data.family.id,
          userId: data.family.id,
          userName: data.family.name,
        };
      }
    }
  } catch {}

  return null;
}

export default function HomeFeedbackButton({
  familyId: propFamilyId,
  userId: propUserId,
  userName: propUserName,
}: HomeFeedbackButtonProps) {
  const [sessionData, setSessionData] = useState<{ familyId?: string; userId?: string; userName?: string } | null>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  // Detect session on mount
  useEffect(() => {
    const detected = detectHomeSession();
    setSessionData(detected);
  }, []);

  // Use props if provided, otherwise use detected session
  const familyId = propFamilyId || sessionData?.familyId;
  const userId = propUserId || sessionData?.userId;
  const userName = propUserName || sessionData?.userName || 'Parent';

  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<FeedbackType | null>(null);
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // Screenshot state
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [screenshotError, setScreenshotError] = useState(false);

  // Reset form when closed
  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setSelectedType(null);
        setMessage('');
        setScreenshot(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Capture screenshot
  const captureScreenshot = async () => {
    setIsCapturing(true);

    try {
      if (buttonRef.current) {
        buttonRef.current.style.visibility = 'hidden';
      }

      await new Promise((resolve) => setTimeout(resolve, 150));

      const isMobile = window.innerWidth < 768;
      const canvas = await html2canvas(document.documentElement, {
        useCORS: true,
        allowTaint: true,
        scale: isMobile ? 0.4 : 0.5,
        logging: false,
        width: window.innerWidth,
        height: window.innerHeight,
        windowWidth: window.innerWidth,
        windowHeight: window.innerHeight,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        foreignObjectRendering: false,
        removeContainer: true,
        ignoreElements: (element) => {
          if (element.closest('[data-feedback-button]')) return true;
          if (element.tagName === 'VIDEO') return true;
          return false;
        },
      });

      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      setScreenshot(dataUrl);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      setScreenshotError(true);
      setTimeout(() => setScreenshotError(false), 3000);
    } finally {
      if (buttonRef.current) {
        buttonRef.current.style.visibility = 'visible';
      }
      setIsCapturing(false);
    }
  };

  // Upload screenshot
  const uploadScreenshot = async (base64Data: string): Promise<string | null> => {
    try {
      const response = await fetch(base64Data);
      const blob = await response.blob();

      const filename = `feedback-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;

      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('bucket', 'home-feedback-screenshots');

      const uploadRes = await fetch('/api/home/feedback/upload-screenshot', {
        method: 'POST',
        body: formData,
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

      const res = await fetch('/api/home/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: familyId,
          user_id: userId,
          user_name: userName,
          page_url: window.location.pathname,
          feedback_type: selectedType,
          message: message.trim(),
          screenshot_url: screenshotUrl,
        }),
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
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-emerald-50">
            <span className="font-semibold text-gray-800">Give Feedback</span>
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
                    📸 Attached
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
                      Capture failed
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
                selectedType === 'bug'
                  ? "What's not working?"
                  : selectedType === 'idea'
                    ? 'What would improve it?'
                    : selectedType === 'help'
                      ? 'What do you need help with?'
                      : selectedType === 'praise'
                        ? 'What do you love?'
                        : 'Select a type above...'
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
