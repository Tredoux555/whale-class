// /montree/dashboard/page.tsx
// Clean student grid with auto-resize tiles, progress indicators, and media capture
// Updated Phase 2 - Session 53
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
  progress?: number;
}

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

export default function DashboardPage() {
  const router = useRouter();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridCols, setGridCols] = useState(2);
  const containerRef = useRef<HTMLDivElement>(null);

  const week = getCurrentWeek();
  const year = new Date().getFullYear();

  useEffect(() => {
    fetch('/api/montree/children')
      .then(r => r.json())
      .then(data => {
        setStudents((data.children || []).map((s: Student) => ({ ...s, progress: 0 })));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Auto-resize grid to fill screen
  useEffect(() => {
    const calculateGrid = () => {
      if (!containerRef.current || students.length === 0) return;

      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const count = students.length;

      // Find optimal columns to fill screen nicely
      let bestCols = 2;
      let bestScore = 0;

      for (let cols = 2; cols <= 6; cols++) {
        const rows = Math.ceil(count / cols);
        const cellWidth = (width - (cols - 1) * 12) / cols; // 12px gap
        const cellHeight = (height - (rows - 1) * 12) / rows;
        
        // Score based on how well cells fill space and aspect ratio
        const aspectRatio = cellWidth / cellHeight;
        const idealAspect = 2.5; // Wide cards look better
        const aspectScore = 1 - Math.abs(aspectRatio - idealAspect) / idealAspect;
        const fillScore = (cols * rows) / count; // Closer to 1 = less wasted cells
        
        const score = aspectScore * 0.6 + (1 / fillScore) * 0.4;
        
        if (score > bestScore) {
          bestScore = score;
          bestCols = cols;
        }
      }

      setGridCols(bestCols);
    };

    calculateGrid();
    window.addEventListener('resize', calculateGrid);
    return () => window.removeEventListener('resize', calculateGrid);
  }, [students]);

  // Handle camera button click without triggering parent link
  const handleCameraClick = (e: React.MouseEvent, childId: string) => {
    e.preventDefault();
    e.stopPropagation();
    router.push(`/montree/dashboard/capture?child=${childId}`);
  };

  if (loading) {
    return (
      <div className="h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  const rows = Math.ceil(students.length / gridCols);

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🐋</span>
          <div>
            <h1 className="text-lg font-bold text-gray-800">Classroom View</h1>
            <p className="text-xs text-gray-400">Week {week}, {year}</p>
          </div>
        </div>
        
        {/* Header actions */}
        <div className="flex items-center gap-2">
          {/* Reports link */}
          <Link
            href="/montree/dashboard/reports"
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
            title="Weekly Reports"
          >
            <span className="text-lg">📊</span>
          </Link>
          
          {/* Gallery link */}
          <Link
            href="/montree/dashboard/media"
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
            title="Photo Gallery"
          >
            <span className="text-lg">🖼️</span>
          </Link>
          
          {/* Settings */}
          <Link
            href="/montree/dashboard/tools"
            className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
            title="Settings"
          >
            <span className="text-lg">⚙️</span>
          </Link>
        </div>
      </header>

      {/* Student Count & Quick Actions */}
      <div className="px-4 py-2 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-gray-700">{students.length} Children</h2>
        
        {/* Quick capture buttons */}
        <div className="flex items-center gap-2">
          <Link
            href="/montree/dashboard/capture?group=true"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <span>👥</span>
            <span className="hidden sm:inline">Group Photo</span>
          </Link>
        </div>
      </div>

      {/* Student Grid - Fills remaining space */}
      <main
        ref={containerRef}
        className="flex-1 px-4 pb-20 overflow-hidden"
      >
        {students.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-4xl mb-3">🐋</div>
            <p className="text-gray-600 mb-2">No students yet</p>
            <Link href="/montree/admin/students" className="text-blue-500">+ Add students</Link>
          </div>
        ) : (
          <div
            className="h-full grid gap-3"
            style={{
              gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
              gridTemplateRows: `repeat(${rows}, 1fr)`,
            }}
          >
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/montree/dashboard/student/${student.id}`}
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-98 flex flex-col justify-center relative group"
              >
                <div className="flex items-center gap-3 mb-2">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{student.name}</p>
                  </div>
                  
                  {/* Quick camera button - use button instead of Link to avoid nesting */}
                  <button
                    onClick={(e) => handleCameraClick(e, student.id)}
                    className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shrink-0 hover:bg-blue-600"
                    title="Take photo"
                  >
                    📷
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${student.progress || 0}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{student.progress || 0}%</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Floating Camera Button */}
      <Link
        href="/montree/dashboard/capture"
        className="fixed bottom-6 right-6 w-16 h-16 bg-blue-500 text-white rounded-full flex items-center justify-center shadow-xl hover:bg-blue-600 transition-all hover:scale-105 active:scale-95 z-50"
        title="Take Photo"
      >
        <span className="text-3xl">📷</span>
      </Link>
    </div>
  );
}
