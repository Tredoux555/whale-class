// /montree/dashboard/student/[id]/page.tsx
// Teacher's mobile-first student view - Matches admin/classroom design
'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';

interface WorkAssignment {
  id: string;
  work_id: string;
  status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  current_level: number;
  notes?: string;
  work: {
    id: string;
    name: string;
    name_chinese?: string;
    work_key: string;
    category_key: string;
    area_id: string;
  };
}

interface Student {
  id: string;
  name: string;
  name_chinese?: string;
  age?: number;
  classroom_id: string;
}

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-200 text-gray-600', next: 'presented' as const },
  presented: { label: 'P', color: 'bg-amber-400 text-amber-900', next: 'practicing' as const },
  practicing: { label: 'Pr', color: 'bg-sky-400 text-sky-900', next: 'mastered' as const },
  mastered: { label: 'M', color: 'bg-emerald-500 text-white', next: 'not_started' as const },
};

const AREA_CONFIG: Record<string, { letter: string; color: string }> = {
  practical_life: { letter: 'P', color: 'bg-amber-500 text-white' },
  sensorial: { letter: 'S', color: 'bg-pink-500 text-white' },
  mathematics: { letter: 'M', color: 'bg-blue-500 text-white' },
  language: { letter: 'L', color: 'bg-green-500 text-white' },
  cultural: { letter: 'C', color: 'bg-purple-500 text-white' },
};

function getAreaFromCategory(categoryKey: string): string {
  if (categoryKey.startsWith('pl_')) return 'practical_life';
  if (categoryKey.startsWith('se_')) return 'sensorial';
  if (categoryKey.startsWith('ma_')) return 'mathematics';
  if (categoryKey.startsWith('la_')) return 'language';
  if (categoryKey.startsWith('cu_')) return 'cultural';
  return 'practical_life';
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [allAssignments, setAllAssignments] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedWork, setExpandedWork] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [savingNotes, setSavingNotes] = useState<string | null>(null);
  const notesTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  useEffect(() => {
    fetchData();
    return () => {
      Object.values(notesTimeoutRef.current).forEach(t => clearTimeout(t));
    };
  }, [id]);

  async function fetchData() {
    try {
      const studentRes = await fetch(`/api/montree/students/${id}`);
      const studentData = await studentRes.json();
      if (studentData.student) setStudent(studentData.student);

      const assignRes = await fetch(`/api/montree/assignments?child_id=${id}`);
      const assignData = await assignRes.json();
      if (assignData.assignments) {
        setAllAssignments(assignData.assignments);
        const notesMap: Record<string, string> = {};
        assignData.assignments.forEach((a: WorkAssignment) => {
          notesMap[a.id] = a.notes || '';
        });
        setNotes(notesMap);
      }
    } catch (err) {
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(assignmentId: string, newStatus: string) {
    setAllAssignments(prev => prev.map(a =>
      a.id === assignmentId ? { ...a, status: newStatus as any } : a
    ));
    try {
      await fetch(`/api/montree/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) {
      console.error('Failed to update status:', err);
      fetchData();
    }
  }

  async function saveNotes(assignmentId: string, newNotes: string) {
    setSavingNotes(assignmentId);
    try {
      await fetch(`/api/montree/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: newNotes }),
      });
    } catch (err) {
      console.error('Failed to save notes:', err);
    } finally {
      setSavingNotes(null);
    }
  }

  function handleNotesChange(assignmentId: string, value: string) {
    setNotes(prev => ({ ...prev, [assignmentId]: value }));
    if (notesTimeoutRef.current[assignmentId]) {
      clearTimeout(notesTimeoutRef.current[assignmentId]);
    }
    notesTimeoutRef.current[assignmentId] = setTimeout(() => {
      saveNotes(assignmentId, value);
    }, 800);
  }

  // Only show CURRENT works (practicing or presented)
  const currentWorks = allAssignments.filter(a => 
    a.status === 'practicing' || a.status === 'presented'
  );

  // Stats from ALL assignments
  const stats = {
    total: allAssignments.length,
    mastered: allAssignments.filter(a => a.status === 'mastered').length,
    practicing: allAssignments.filter(a => a.status === 'practicing').length,
  };
  const progressPercent = stats.total > 0 ? Math.round((stats.mastered / stats.total) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600">Student not found</p>
          <Link href="/montree/dashboard" className="text-blue-600 hover:underline mt-2 inline-block">
            ← Back to Classroom
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <Link href="/montree/dashboard" className="flex items-center gap-2 text-gray-600">
          <span>←</span>
          <span className="text-2xl">🐋</span>
          <span className="font-semibold">Classroom View</span>
        </Link>
      </header>

      {/* Status Legend */}
      <div className="bg-white border-b px-4 py-2 flex items-center gap-3 text-xs overflow-x-auto">
        <span className="text-gray-500 whitespace-nowrap">Not Started</span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-6 h-6 rounded-full bg-amber-400 flex items-center justify-center font-bold text-amber-900">P</span>
          Presented
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-6 h-6 rounded-full bg-sky-400 flex items-center justify-center font-bold text-sky-900">Pr</span>
          Practicing
        </span>
        <span className="flex items-center gap-1 whitespace-nowrap">
          <span className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-white">M</span>
          Mastered
        </span>
      </div>

      {/* Back Button */}
      <div className="px-4 py-3">
        <Link 
          href="/montree/dashboard"
          className="inline-block px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-700 text-sm font-medium shadow-sm"
        >
          ← Back to All Children
        </Link>
      </div>

      {/* Main Card - Contains header + works */}
      <div className="mx-4 mb-6 bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Blue Header with Name */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
          <h1 className="text-2xl font-bold">{student.name}</h1>
          {/* Progress Bar */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2 bg-blue-400/40 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <span className="text-sm font-medium">{progressPercent}%</span>
          </div>
        </div>

        {/* Works List */}
        <div className="divide-y divide-gray-100">
          {currentWorks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🎉</div>
              <p className="text-gray-600 font-medium">All caught up!</p>
              <p className="text-gray-400 text-sm">No works in progress</p>
            </div>
          ) : (
            currentWorks.map((assignment, index) => {
              const area = getAreaFromCategory(assignment.work?.category_key || '');
              const areaConfig = AREA_CONFIG[area] || AREA_CONFIG.practical_life;
              const statusConfig = STATUS_CONFIG[assignment.status || 'not_started'];
              const isExpanded = expandedWork === assignment.id;
              const totalInArea = currentWorks.filter(w => 
                getAreaFromCategory(w.work?.category_key || '') === area
              ).length;

              return (
                <div key={assignment.id}>
                  {/* Work Row */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Area Badge */}
                    <span className={`w-8 h-8 rounded-lg text-sm font-bold flex items-center justify-center shrink-0 ${areaConfig.color}`}>
                      {areaConfig.letter}
                    </span>

                    {/* Status Button */}
                    <button
                      onClick={() => updateStatus(assignment.id, statusConfig.next)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${statusConfig.color} active:scale-90 transition-transform`}
                    >
                      {statusConfig.label}
                    </button>

                    {/* Work Name */}
                    <div 
                      className="flex-1 min-w-0 cursor-pointer"
                      onClick={() => setExpandedWork(isExpanded ? null : assignment.id)}
                    >
                      <p className="font-medium text-gray-800">{assignment.work?.name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400">
                        {assignment.work?.name_chinese && (
                          <span className="mr-2">{assignment.work.name_chinese}</span>
                        )}
                        <span>← swipe →</span>
                      </p>
                    </div>

                    {/* Expand Arrow */}
                    <button
                      onClick={() => setExpandedWork(isExpanded ? null : assignment.id)}
                      className="w-8 h-8 flex items-center justify-center text-gray-400"
                    >
                      <svg 
                        className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        fill="none" stroke="currentColor" viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Expanded Panel */}
                  {isExpanded && (
                    <div className="bg-gray-50 border-t border-gray-100 px-4 py-3 space-y-3">
                      {/* Notes */}
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium text-gray-500">📝 Notes</span>
                          {savingNotes === assignment.id && (
                            <span className="text-[10px] text-blue-500">saving...</span>
                          )}
                        </div>
                        <textarea
                          value={notes[assignment.id] || ''}
                          onChange={(e) => handleNotesChange(assignment.id, e.target.value)}
                          placeholder="Add observation notes..."
                          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                          rows={2}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button className="flex-1 py-2.5 bg-green-100 text-green-700 rounded-lg active:scale-95 transition-transform text-sm font-medium">
                          📷 Capture
                        </button>
                        <button className="flex-1 py-2.5 bg-red-100 text-red-700 rounded-lg active:scale-95 transition-transform text-sm font-medium">
                          ▶️ Demo
                        </button>
                      </div>

                      {/* Guide */}
                      <div className="py-2 px-3 bg-amber-50 border border-amber-100 rounded-lg">
                        <p className="text-xs text-amber-700">📋 No guide available for this work yet</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
