// /montree/dashboard/page.tsx
// Clean dashboard - student names only, whole class visible
// One-click video generation, one-click send to parents
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingVideos, setGeneratingVideos] = useState(false);
  const [generatingReports, setGeneratingReports] = useState(false);
  const [videosReady, setVideosReady] = useState(false);
  const [reportsReady, setReportsReady] = useState(false);

  useEffect(() => {
    fetch('/api/montree/students')
      .then(r => r.json())
      .then(data => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const generateWeeklyVideos = async () => {
    setGeneratingVideos(true);
    // TODO: Call video generation API
    await new Promise(r => setTimeout(r, 3000)); // Simulate
    setGeneratingVideos(false);
    setVideosReady(true);
  };

  const generateWeeklyReports = async () => {
    setGeneratingReports(true);
    // TODO: Call report generation API
    await new Promise(r => setTimeout(r, 2000)); // Simulate
    setGeneratingReports(false);
    setReportsReady(true);
  };

  const sendToParents = async (type: 'videos' | 'reports') => {
    alert(`Sending ${type} to all parents via WeChat...`);
    // TODO: Implement WeChat/email sending
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Whale Class</h1>
          <p className="text-gray-400 text-sm">{students.length} students</p>
        </div>
        <Link 
          href="/montree/admin/students"
          className="text-emerald-400 hover:text-emerald-300 text-sm"
        >
          + Add Students
        </Link>
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        {/* Weekly Videos */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🎬</span>
            <h3 className="font-bold text-white">Weekly Videos</h3>
          </div>
          {!videosReady ? (
            <button
              onClick={generateWeeklyVideos}
              disabled={generatingVideos}
              className="w-full py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {generatingVideos ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚡</span> Generating...
                </span>
              ) : (
                'Generate All Videos'
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <Link
                href="/montree/dashboard/videos/preview"
                className="block w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
              >
                👀 Preview Videos
              </Link>
              <button
                onClick={() => sendToParents('videos')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                📤 Send to Parents
              </button>
            </div>
          )}
        </div>

        {/* Weekly Reports */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">📊</span>
            <h3 className="font-bold text-white">Weekly Reports</h3>
          </div>
          {!reportsReady ? (
            <button
              onClick={generateWeeklyReports}
              disabled={generatingReports}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {generatingReports ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⚡</span> Generating...
                </span>
              ) : (
                'Generate All Reports'
              )}
            </button>
          ) : (
            <div className="space-y-2">
              <Link
                href="/montree/dashboard/reports/preview"
                className="block w-full py-2 bg-gray-800 hover:bg-gray-700 text-white text-sm font-medium rounded-lg text-center transition-colors"
              >
                👀 Preview Reports
              </Link>
              <button
                onClick={() => sendToParents('reports')}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                📤 Send to Parents
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Student Grid - Clean, compact, names only */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-white">Students</h3>
          <span className="text-gray-500 text-xs">Tap to view details</span>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {students.map((student, index) => (
            <Link
              key={student.id}
              href={`/montree/dashboard/student/${student.id}`}
              className="bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-emerald-500 rounded-lg p-3 text-center transition-all group"
            >
              <div className="text-white font-medium text-sm truncate group-hover:text-emerald-400">
                {student.name}
              </div>
            </Link>
          ))}
        </div>

        {students.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-2">No students yet</div>
            <Link 
              href="/montree/admin/students"
              className="text-emerald-400 hover:text-emerald-300 text-sm"
            >
              + Add your first students
            </Link>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-white">{students.length}</div>
          <div className="text-xs text-gray-500">Students</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-emerald-400">0</div>
          <div className="text-xs text-gray-500">This Week</div>
        </div>
        <div className="bg-gray-900/50 rounded-lg p-3">
          <div className="text-2xl font-bold text-purple-400">0</div>
          <div className="text-xs text-gray-500">Videos Sent</div>
        </div>
      </div>
    </div>
  );
}
