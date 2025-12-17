'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { HelpCircle } from 'lucide-react';

export default function StudentLoginPage() {
  const [childId, setChildId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResetRequest, setShowResetRequest] = useState(false);
  const [resetRequest, setResetRequest] = useState({
    childId: '',
    childName: '',
    parentEmail: '',
    parentName: '',
    message: '',
  });
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store session in localStorage (persists across browser closes)
        localStorage.setItem('student_session', JSON.stringify({
          childId: data.childId,
          childName: data.childName,
          avatar: data.avatar,
          loginTime: Date.now(),
        }));
        router.push('/student/dashboard');
        router.refresh();
      } else {
        setError(data.error || 'Invalid login credentials');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/password-reset-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resetRequest),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Password reset request sent! Admin will contact you soon.');
        setShowResetRequest(false);
        setResetRequest({
          childId: '',
          childName: '',
          parentEmail: '',
          parentName: '',
          message: '',
        });
      } else {
        setError(data.error || 'Failed to send request');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-xl shadow-lg">
        {/* Header */}
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-4xl">🐋</span>
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Student Portal
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Parent login for your child's learning portal
          </p>
        </div>

        {!showResetRequest ? (
          <>
            {/* Error Message */}
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form className="mt-8 space-y-6" onSubmit={handleLogin}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="childId" className="block text-sm font-medium text-gray-700 mb-2">
                    Student ID or Name
                  </label>
                  <input
                    id="childId"
                    name="childId"
                    type="text"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter student ID or name"
                    value={childId}
                    onChange={(e) => setChildId(e.target.value)}
                    disabled={loading}
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    className="appearance-none relative block w-full px-4 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </div>
            </form>

            {/* Signup Link */}
            <div className="text-center border-t pt-4">
              <p className="text-sm text-gray-600 mb-2">
                Don't have an account yet?
              </p>
              <Link
                href="/auth/student-signup"
                className="inline-block text-sm font-semibold text-indigo-600 hover:text-indigo-500 bg-indigo-50 px-4 py-2 rounded-lg transition"
              >
                📝 Register Your Child
              </Link>
            </div>

            {/* Reset Password Link */}
            <div className="text-center">
              <button
                onClick={() => setShowResetRequest(true)}
                className="text-sm text-blue-600 hover:text-blue-500 flex items-center justify-center gap-1"
              >
                <HelpCircle className="w-4 h-4" />
                Forgot password? Request reset
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Reset Request Form */}
            <form className="mt-8 space-y-4" onSubmit={handleResetRequest}>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Request Password Reset
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Student Name
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={resetRequest.childName}
                  onChange={(e) => setResetRequest({ ...resetRequest, childName: e.target.value })}
                  placeholder="Your child's name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Name (Parent)
                </label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={resetRequest.parentName}
                  onChange={(e) => setResetRequest({ ...resetRequest, parentName: e.target.value })}
                  placeholder="Parent name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email
                </label>
                <input
                  type="email"
                  required
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  value={resetRequest.parentEmail}
                  onChange={(e) => setResetRequest({ ...resetRequest, parentEmail: e.target.value })}
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message (optional)
                </label>
                <textarea
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                  value={resetRequest.message}
                  onChange={(e) => setResetRequest({ ...resetRequest, message: e.target.value })}
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading ? 'Sending...' : 'Send Request'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetRequest(false);
                    setError(null);
                  }}
                  className="flex-1 py-2 px-4 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
              </div>
            </form>
          </>
        )}

        {/* Footer */}
        <div className="text-center space-y-2 pt-4 border-t">
          <p className="text-sm text-gray-600">
            Need help?{' '}
            <a href="mailto:support@teacherpotato.xyz" className="font-medium text-blue-600 hover:text-blue-500">
              Contact support
            </a>
          </p>
          <p className="text-xs text-gray-500">
            <Link href="/auth/teacher-login" className="text-blue-600 hover:text-blue-500">
              Teacher login
            </Link>
            {' • '}
            <Link href="/admin/login" className="text-blue-600 hover:text-blue-500">
              Admin login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

