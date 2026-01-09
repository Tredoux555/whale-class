'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TEACHERS = ['Jasmine', 'Ivan', 'John', 'Richard', 'Liza', 'Michael', 'Tredoux'];
const PASSWORD = '123';

export default function TeacherLoginPage() {
  const router = useRouter();
  const [selectedTeacher, setSelectedTeacher] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if already logged in
    const teacher = localStorage.getItem('teacherName');
    if (teacher) {
      router.push('/teacher/dashboard');
    } else {
      setLoading(false);
    }
  }, [router]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedTeacher) {
      setError('Please select your name');
      return;
    }

    if (password !== PASSWORD) {
      setError('Incorrect password');
      return;
    }

    // Save to localStorage
    localStorage.setItem('teacherName', selectedTeacher);
    router.push('/teacher/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center">
        <div className="text-xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-100 flex items-center justify-center p-4"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-6xl">🐋</span>
          <h1 className="text-2xl font-bold text-gray-800 mt-2">Teacher Login</h1>
          <p className="text-gray-500 text-sm mt-1">Welcome to Whale</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Teacher Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Your Name
            </label>
            <select
              value={selectedTeacher}
              onChange={(e) => setSelectedTeacher(e.target.value)}
              className="w-full p-3 border-2 rounded-xl text-lg focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400"
            >
              <option value="">-- Choose --</option>
              {TEACHERS.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              className="w-full p-3 border-2 rounded-xl text-lg focus:ring-2 focus:ring-cyan-300 focus:border-cyan-400"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="w-full py-3 bg-cyan-500 text-white rounded-xl text-lg font-bold hover:bg-cyan-600 transition-colors"
          >
            Login →
          </button>
        </form>
      </div>
    </div>
  );
}
