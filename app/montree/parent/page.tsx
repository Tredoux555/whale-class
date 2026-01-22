// /montree/parent/page.tsx
// Parent Portal Landing - Login or Magic Link Entry
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function ParentPortalPage() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'code'>('login');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [codeSent, setCodeSent] = useState(false);

  // Send verification code
  const handleSendCode = async () => {
    if (!phone || phone.length < 8) {
      setError('Please enter a valid phone number');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/montree/parent/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setCodeSent(true);
      } else {
        setError(data.error || 'Failed to send code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Verify code and login
  const handleVerifyCode = async () => {
    if (!code || code.length < 4) {
      setError('Please enter the verification code');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/montree/parent/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        router.push('/montree/parent/dashboard');
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Access via teacher-provided code
  const handleAccessCode = async () => {
    if (!accessCode || accessCode.length < 6) {
      setError('Please enter the access code from your teacher');
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
        router.push(data.redirect || '/montree/parent/setup');
      } else {
        setError(data.error || 'Invalid access code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-emerald-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-4">
        <div className="max-w-md mx-auto flex items-center gap-3">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-2xl">🌳</span>
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Montree</h1>
            <p className="text-sm text-gray-500">Parent Portal</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
          <div className="bg-white rounded-3xl shadow-xl p-6 mb-6">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-amber-100 to-orange-100 rounded-full mb-4">
                <span className="text-4xl">👨‍👩‍👧</span>
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Welcome, Parent!</h2>
              <p className="text-gray-500 mt-1">See your child&apos;s learning journey</p>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                onClick={() => { setTab('login'); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'login'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                📱 Phone Login
              </button>
              <button
                onClick={() => { setTab('code'); setError(''); }}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  tab === 'code'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🔑 Access Code
              </button>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm mb-4">
                {error}
              </div>
            )}

            {/* Phone Login Tab */}
            {tab === 'login' && (
              <div className="space-y-4">
                {!codeSent ? (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+86 138 0000 0000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-lg"
                        disabled={loading}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Enter the phone number registered with your child&apos;s school
                      </p>
                    </div>
                    <button
                      onClick={handleSendCode}
                      disabled={loading || !phone}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                    >
                      {loading ? '⏳ Sending...' : '📤 Send Verification Code'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="text-center py-2">
                      <p className="text-gray-600">
                        Code sent to <strong>{phone}</strong>
                      </p>
                      <button
                        onClick={() => setCodeSent(false)}
                        className="text-emerald-600 text-sm hover:underline mt-1"
                      >
                        Change number
                      </button>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Verification Code
                      </label>
                      <input
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-2xl text-center tracking-[0.5em] font-mono"
                        disabled={loading}
                        maxLength={6}
                      />
                    </div>
                    <button
                      onClick={handleVerifyCode}
                      disabled={loading || code.length < 4}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                    >
                      {loading ? '⏳ Verifying...' : '✓ Verify & Login'}
                    </button>
                    <button
                      onClick={handleSendCode}
                      disabled={loading}
                      className="w-full py-2 text-emerald-600 text-sm hover:underline"
                    >
                      Didn&apos;t receive code? Send again
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Access Code Tab */}
            {tab === 'code' && (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-2">
                  <p className="text-sm text-amber-800">
                    <strong>💡 First time?</strong> Your teacher will give you an access code or QR code to connect to your child&apos;s account.
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Access Code
                  </label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))}
                    placeholder="ABCD1234"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors text-2xl text-center tracking-[0.3em] font-mono uppercase"
                    disabled={loading}
                    maxLength={8}
                  />
                  <p className="text-xs text-gray-400 mt-1 text-center">
                    8-character code from your teacher
                  </p>
                </div>
                <button
                  onClick={handleAccessCode}
                  disabled={loading || accessCode.length < 6}
                  className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-200"
                >
                  {loading ? '⏳ Connecting...' : '🔗 Connect to My Child'}
                </button>
              </div>
            )}
          </div>

          {/* Help Link */}
          <p className="text-center text-sm text-gray-500">
            Need help? Contact your child&apos;s teacher
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-4 text-center text-xs text-gray-400">
        <p>Montree • Montessori Progress Tracking</p>
      </footer>
    </div>
  );
}
