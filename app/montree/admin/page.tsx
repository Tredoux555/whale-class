// /montree/admin/page.tsx
// Admin overview - Updated to use working weekly-planning system
'use client';

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">School Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Weekly Planning Card - WORKING SYSTEM */}
        <Link 
          href="/admin/weekly-planning"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">📋</div>
          <h2 className="text-lg font-bold text-white mb-2">Weekly Planning</h2>
          <p className="text-gray-400 text-sm">Upload your weekly plan document. Creates students and assigns works automatically.</p>
          <span className="inline-block mt-2 text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">✓ Working System</span>
        </Link>

        {/* Classroom View Card */}
        <Link 
          href="/admin/classroom"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">🐋</div>
          <h2 className="text-lg font-bold text-white mb-2">Classroom View</h2>
          <p className="text-gray-400 text-sm">View all students, track progress, and manage assignments.</p>
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

        {/* Print Card */}
        <Link 
          href="/admin/classroom/print"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">🖨️</div>
          <h2 className="text-lg font-bold text-white mb-2">Print Weekly Plan</h2>
          <p className="text-gray-400 text-sm">Print the current week's assignments for all children.</p>
        </Link>
      </div>
    </div>
  );
}
