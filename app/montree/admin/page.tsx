// /montree/admin/page.tsx
// Admin overview
'use client';

import Link from 'next/link';

export default function AdminPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">School Administration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Students Card */}
        <Link 
          href="/montree/admin/students"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">👧</div>
          <h2 className="text-lg font-bold text-white mb-2">Students</h2>
          <p className="text-gray-400 text-sm">Add, edit, and manage your students. Smart import from any document.</p>
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

        {/* Classrooms Card */}
        <Link 
          href="/montree/admin/classrooms"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">🏫</div>
          <h2 className="text-lg font-bold text-white mb-2">Classrooms</h2>
          <p className="text-gray-400 text-sm">Configure classrooms and assign students.</p>
        </Link>

        {/* Reports Card */}
        <Link 
          href="/montree/admin/reports"
          className="bg-gray-900 border border-gray-800 rounded-xl p-6 hover:border-emerald-500 transition-colors"
        >
          <div className="text-3xl mb-3">📊</div>
          <h2 className="text-lg font-bold text-white mb-2">Reports</h2>
          <p className="text-gray-400 text-sm">View school-wide progress and analytics.</p>
        </Link>
      </div>
    </div>
  );
}
