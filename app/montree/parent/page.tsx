// /montree/parent/page.tsx
// Parent Portal Landing - Access Code Entry
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function ParentPortalContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [autoSubmitting, setAutoSubmitting] = useState(false);

  // Auto-fill code from URL parameter (from QR scan)
  useEffect(() => {
    const codeFromUrl = searchParams.get('code');
    if (codeFromUrl) {
      setAccessCode(codeFromUrl.toUpperCase());
      setAutoSubmitting(true);
    }
  }, [searchParams]);

  // Auto-submit when code is filled from URL
  useEffect(() => {
    if (autoSubmitting && accessCode.length >= 6) {
      handleAccessCode();
      setAutoSubmitting(false);
    }
  }, [autoSubmitting, accessCode]);

  const handleAccessCode = async () => {
    if (!accessCode || accessCode.length < 6) {
      setError('Please enter your 6-character access code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/montree/parent/auth/access-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: accessCode }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        router.push(data.redirect || '/montree/parent/dashboard');
      } else {
        setError(data.error || 'Invalid access code. Please check and try again.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && accessCode.length >= 6) {
      handleAccessCode();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🌳</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">My Classroom</h1>
            <p className="text-sm text-gray-500">Parent Portal</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full mb-4">
                <span className="text-4xl">👨‍👩‍👧</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome, Parent!</h2>
              <p className="text-gray-500 mt-1">See your child&apos;s learning journey</p>
            </div>

            {/* Instructions */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-5">
              <p className="text-sm text-emerald-800">
                <strong>👋 Welcome!</strong> Enter the access code from your child&apos;s teacher to view their progress.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4 flex items-start gap-2">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* Access Code Input */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Access Code
                </label>
                <input
                  type="text"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
                  onKeyPress={handleKeyPress}
                  placeholder="ABC123"
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-2xl text-center tracking-[0.3em] font-mono uppercase bg-gray-50 focus:bg-white"
                  disabled={loading}
                  maxLength={6}
                  autoFocus
                  autoComplete="off"
                />
                <p className="text-xs text-gray-400 mt-2 text-center">
                  Enter the 6-character code from your teacher
                </p>
              </div>

              <button
                onClick={handleAccessCode}
                disabled={loading || accessCode.length < 6}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-lg rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200 active:scale-[0.98]"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Connecting...
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    🔗 Connect to My Child
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* How it works */}
          <div className="bg-white/60 rounded-2xl p-5 border border-gray-100">
            <h3 className="font-semibold text-gray-700 mb-3 text-center">How to get your code:</h3>
            <ol className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</span>
                <span>Ask your child&apos;s teacher for a parent access code</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</span>
                <span>Scan the QR code or enter the code above</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</span>
                <span>View your child&apos;s progress, photos, and reports</span>
              </li>
            </ol>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        <p>🌳 My Classroom • Montessori Progress Tracking</p>
      </footer>
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ParentPortalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-bounce">🌳</span>
          </div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <ParentPortalContent />
    </Suspense>
  );
}
