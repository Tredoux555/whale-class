// /montree/page.tsx
// Session 92: Montree landing page
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function MontreeLandingPage() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [teacherName, setTeacherName] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('montree_teacher');
    if (stored) {
      try {
        const teacher = JSON.parse(stored);
        setIsLoggedIn(true);
        setTeacherName(teacher.name);
      } catch {}
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2">
          <span className="text-3xl">🌱</span>
          <span className="text-xl font-bold text-gray-800">Montree</span>
        </div>
        {isLoggedIn ? (
          <Link 
            href="/montree/dashboard"
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Go to Dashboard →
          </Link>
        ) : (
          <Link 
            href="/montree/login"
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Teacher Login
          </Link>
        )}
      </header>

      {/* Hero */}
      <main className="px-6 py-16 max-w-4xl mx-auto text-center">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-800 mb-6">
          Montessori Progress Tracking
          <br />
          <span className="text-emerald-600">Made Simple</span>
        </h1>
        
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Track student progress, capture learning moments, and share reports with parents.
          All in one beautiful app.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          {isLoggedIn ? (
            <Link
              href="/montree/dashboard"
              className="px-8 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
            >
              Continue as {teacherName} →
            </Link>
          ) : (
            <>
              <Link
                href="/montree/onboarding"
                className="px-8 py-4 bg-emerald-500 text-white text-lg font-semibold rounded-xl hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/30"
              >
                Set Up My School
              </Link>
              <Link
                href="/montree/login"
                className="px-8 py-4 bg-white text-emerald-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-colors border-2 border-emerald-200"
              >
                Teacher Login
              </Link>
            </>
          )}
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 text-left">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <span className="text-4xl mb-4 block">📈</span>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Progress Tracking</h3>
            <p className="text-gray-600">
              Track each child's journey through the Montessori curriculum with simple tap-to-update status.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <span className="text-4xl mb-4 block">📷</span>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Photo Capture</h3>
            <p className="text-gray-600">
              Capture learning moments with quick photo. Tag works and students instantly.
            </p>
          </div>

          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <span className="text-4xl mb-4 block">📊</span>
            <h3 className="text-lg font-bold text-gray-800 mb-2">Weekly Reports</h3>
            <p className="text-gray-600">
              Generate beautiful parent reports with photos and progress summaries.
            </p>
          </div>
        </div>

        {/* Demo Link */}
        <div className="mt-16">
          <Link
            href="/montree/dashboard?demo=true"
            className="text-emerald-600 hover:underline font-medium"
          >
            Try Demo Mode →
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-8 text-center text-gray-500 text-sm">
        <p>Built for Montessori teachers by TeacherPotato</p>
        <div className="mt-4 flex justify-center gap-6">
          <Link href="/montree/admin" className="hover:text-gray-700">Admin</Link>
          <Link href="/montree/games" className="hover:text-gray-700">Games</Link>
        </div>
      </footer>
    </div>
  );
}
