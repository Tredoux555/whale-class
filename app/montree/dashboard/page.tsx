// /montree/dashboard/page.tsx
// Full-screen student grid - tiles fill available space
'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DashboardPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [gridCols, setGridCols] = useState(4);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/montree/students')
      .then(r => r.json())
      .then(data => {
        setStudents(data.students || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Calculate optimal grid based on student count and screen size
  useEffect(() => {
    const calculateGrid = () => {
      if (!containerRef.current || students.length === 0) return;
      
      const container = containerRef.current;
      const width = container.clientWidth;
      const height = container.clientHeight;
      const count = students.length;
      
      // Find optimal columns to fill screen nicely
      // Try different column counts and pick the one that best fills space
      let bestCols = 4;
      let bestRatio = 0;
      
      for (let cols = 3; cols <= 8; cols++) {
        const rows = Math.ceil(count / cols);
        const cellWidth = width / cols;
        const cellHeight = height / rows;
        const ratio = Math.min(cellWidth, cellHeight * 2) / Math.max(cellWidth, cellHeight * 2);
        
        if (ratio > bestRatio) {
          bestRatio = ratio;
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
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  const rows = Math.ceil(students.length / gridCols);

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header - Centered class name + logo */}
      <header className="py-3 flex items-center justify-center gap-2 border-b border-gray-800">
        <span className="text-2xl">🐋</span>
        <h1 className="text-lg font-bold text-white">Whale Class</h1>
      </header>

      {/* Student Grid - Fills screen */}
      <main 
        ref={containerRef}
        className="flex-1 p-2 overflow-hidden"
      >
        <div 
          className="h-full grid gap-1.5"
          style={{
            gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
            gridTemplateRows: `repeat(${rows}, 1fr)`,
          }}
        >
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/montree/dashboard/student/${student.id}`}
              className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-emerald-500 rounded-lg flex items-center justify-center transition-all active:scale-95"
            >
              <span className="text-white text-sm font-medium truncate px-1">
                {student.name}
              </span>
            </Link>
          ))}
        </div>

        {students.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center">
            <div className="text-3xl mb-3">🐋</div>
            <div className="text-gray-400 mb-2">No students yet</div>
            <Link 
              href="/montree/admin/students"
              className="text-emerald-400"
            >
              + Add students
            </Link>
          </div>
        )}
      </main>


      {/* Tools Link */}
      <div className="p-2 flex justify-center">
        <Link
          href="/montree/dashboard/tools"
          className="bg-emerald-600 hover:bg-emerald-700 rounded-lg px-6 py-2 transition-all active:scale-95"
        >
          <span className="text-xl">🔧</span>
        </Link>
      </div>
    </div>
  );
}
