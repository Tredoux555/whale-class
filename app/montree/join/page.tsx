'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';

function JoinContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGoToLogin = () => {
    router.push('/montree/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl shadow-lg mb-4">
            <span className="text-4xl">🐋</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome to Montree</h1>
          <p className="text-gray-500 mt-1">Your classroom awaits!</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl p-6">
          {code ? (
            <>
              <div className="text-center mb-6">
                <p className="text-gray-600 mb-4">Your teacher login code is:</p>
                <div 
                  onClick={handleCopyCode}
                  className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-4 cursor-pointer hover:bg-emerald-100 transition-colors"
                >
                  <div className="text-4xl font-mono font-bold text-emerald-600 tracking-widest">
                    {code}
                  </div>
                  <p className="text-xs text-emerald-500 mt-2">
                    {copied ? '✓ Copied!' : 'Tap to copy'}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={handleGoToLogin}
                  className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  Login Now →
                </button>
                
                <div className="text-center text-sm text-gray-400">
                  Save this code - you'll need it to login!
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-6">
                <div className="text-5xl mb-4">🔗</div>
                <p className="text-gray-600">No code provided in the link.</p>
                <p className="text-gray-400 text-sm mt-2">Ask your principal for your login code.</p>
              </div>
              <button
                onClick={handleGoToLogin}
                className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg"
              >
                Go to Login →
              </button>
            </>
          )}
        </div>

        {/* Instructions */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p className="font-medium mb-2">How to login:</p>
          <ol className="text-left max-w-xs mx-auto space-y-1">
            <li>1. Go to login page</li>
            <li>2. Enter your 6-character code</li>
            <li>3. Set a password (optional)</li>
            <li>4. Start tracking progress! 🎉</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">🐋</div>
      </div>
    }>
      <JoinContent />
    </Suspense>
  );
}
