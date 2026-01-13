'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// Teacher-specific passwords
const PASSWORDS: Record<string, string> = {
  'Tredoux': '870602',
};
const DEFAULT_PASSWORD = '123';

export default function TeacherLoginPage() {
  const router = useRouter();
  const [teachers, setTeachers] = useState<string[]>([]);
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [teachersLoading, setTeachersLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch teachers from API
  useEffect(() => {
    fetch('/api/teacher/list')
      .then(res => res.json())
      .then(data => {
        const names = (data.teachers || []).map((t: { name: string }) => t.name);
        setTeachers(names);
      })
      .catch(() => {
        // Fallback to common names if API fails
        setTeachers(['Tredoux', 'John', 'Jasmine', 'Ivan', 'Richard', 'Liza', 'Michael']);
      })
      .finally(() => setTeachersLoading(false));
  }, []);

  useEffect(() => {
    const teacher = localStorage.getItem('teacherName');
    if (teacher) {
      router.push('/teacher/dashboard');
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    if (!selectedTeacher) {
      setError('Please select your name');
      setIsSubmitting(false);
      return;
    }

    // Check password - Tredoux has special password, others use default
    const expectedPassword = PASSWORDS[selectedTeacher] || DEFAULT_PASSWORD;
    if (password !== expectedPassword) {
      setError('Incorrect password');
      setIsSubmitting(false);
      return;
    }

    localStorage.setItem('teacherName', selectedTeacher);
    
    try {
      await fetch('/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selectedTeacher }),
      });
    } catch (err) {
      console.log('Cookie set may have failed, continuing with localStorage');
    }
    
    router.push('/teacher/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-full shadow-lg mb-4">
            <span className="text-3xl animate-bounce">🐋</span>
          </div>
          <p className="text-gray-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200 rounded-full opacity-30 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-200 rounded-full opacity-30 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-blue-200/50 p-8 border border-white/50">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg shadow-blue-300 mb-4">
              <span className="text-4xl">🐋</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Teacher Login</h1>
            <p className="text-gray-500 mt-1">Welcome to Whale Class</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Teacher Select */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Your Name
              </label>
              <div className="relative">
                <select
                  value={selectedTeacher}
                  onChange={(e) => setSelectedTeacher(e.target.value)}
                  disabled={teachersLoading}
                  className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg appearance-none cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-300 disabled:opacity-50"
                >
                  <option value="">{teachersLoading ? 'Loading teachers...' : '-- Choose your name --'}</option>
                  {teachers.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full px-4 py-3.5 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all hover:border-gray-300"
              />
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-xl text-lg font-bold hover:from-blue-600 hover:to-cyan-600 transition-all shadow-lg shadow-blue-300/50 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Logging in...</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-500">
              Need help? Contact your administrator
            </p>
          </div>
        </div>

        {/* Link to Home */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
