// /montree/dashboard/page.tsx
// Clean student grid with auto-resize tiles and progress indicators
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

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
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridCols, setGridCols] = useState(2);
  const containerRef = useRef<HTMLDivElement>(null);

  const week = getCurrentWeek();
  const year = new Date().getFullYear();

  useEffect(() => {
    fetch('/api/montree/students')
      .then(r => r.json())
      .then(data => {
        setStudents((data.students || []).map((s: Student) => ({ ...s, progress: 0 })));
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
        <Link
          href="/montree/dashboard/tools"
          className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
        >
          <span className="text-lg">⚙️</span>
        </Link>
      </header>

      {/* Student Count */}
      <div className="px-4 py-2 flex items-center justify-between shrink-0">
        <h2 className="font-semibold text-gray-700">{students.length} Children</h2>
        <p className="text-sm text-gray-400">Tap a name to view details</p>
      </div>

      {/* Student Grid - Fills remaining space */}
      <main
        ref={containerRef}
        className="flex-1 px-4 pb-4 overflow-hidden"
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
                className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition-all active:scale-98 flex flex-col justify-center"
              >
                <div className="flex items-center gap-3 mb-2">
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                    {student.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 truncate">{student.name}</p>
                  </div>
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
    </div>
  );
}
