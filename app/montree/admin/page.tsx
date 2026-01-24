// /montree/admin/page.tsx
// Admin overview - All links stay within Montree
'use client';

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">School Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Parent Access Codes - TOP PRIORITY */}
        <Link 
          href="/montree/admin/parent-codes"
          className="bg-gradient-to-br from-emerald-900 to-teal-900 border border-emerald-700 rounded-xl p-6 hover:border-emerald-400 transition-colors"
        >
          <div className="text-3xl mb-3">👨‍👩‍👧</div>
          <h2 className="text-lg font-bold text-white mb-2">Parent Access Codes</h2>
          <p className="text-emerald-300 text-sm">Generate QR codes for parents to view their child&apos;s progress. Print cards to hand out.</p>
        </Link>

        {/* Students/Import Card */}
        <Link 
          href="/montree/admin/students"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-lg font-bold text-white mb-2">Students & Weekly Planning</h2>
          <p className="text-gray-400 text-sm">Upload your weekly plan document. Creates students and assigns works automatically.</p>
        </Link>

        {/* Classroom View Card */}
        <Link 
          href="/montree/dashboard"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">🌳</div>
          <h2 className="text-lg font-bold text-white mb-2">Classroom View</h2>
          <p className="text-gray-400 text-sm">View all students, track progress, and capture work photos.</p>
        </Link>

        {/* Teachers Card */}
        <Link 
          href="/montree/admin/teachers"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">👩‍🏫</div>
          <h2 className="text-lg font-bold text-white mb-2">Teachers</h2>
          <p className="text-gray-400 text-sm">Manage teacher accounts and classroom assignments.</p>
        </Link>

        {/* Reports Card */}
        <Link 
          href="/montree/dashboard/reports"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-lg font-bold text-white mb-2">Weekly Reports</h2>
          <p className="text-gray-400 text-sm">Generate and send parent reports with photos and AI summaries.</p>
        </Link>

        {/* Settings Card */}
        <Link 
          href="/montree/admin/settings"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">⚙️</div>
          <h2 className="text-lg font-bold text-white mb-2">Settings</h2>
          <p className="text-gray-400 text-sm">Configure school settings and preferences.</p>
        </Link>

        {/* Media Gallery Card */}
        <Link 
          href="/montree/dashboard/media"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">🖼️</div>
          <h2 className="text-lg font-bold text-white mb-2">Media Gallery</h2>
          <p className="text-gray-400 text-sm">Browse all captured photos and videos.</p>
        </Link>

        {/* Curriculum Games Card */}
        <Link 
          href="/montree/dashboard/games"
          className="bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-700 rounded-xl p-6 hover:border-purple-400 transition-colors"
        >
          <div className="text-3xl mb-3">🎮</div>
          <h2 className="text-lg font-bold text-white mb-2">Curriculum Games</h2>
          <p className="text-purple-300 text-sm">11 English games aligned to Montessori curriculum. Letter sounds, word building, grammar.</p>
        </Link>
      </div>
    </div>
  );
}
