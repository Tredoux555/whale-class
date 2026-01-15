// app/admin/schools/[slug]/classrooms/[id]/page.tsx
// Classroom Detail - Whale Class with 18 real students
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  order: number;
  currentWork?: string;
}

// THE 18 WHALE CLASS STUDENTS - EXACT ORDER
const WHALE_CLASS_STUDENTS: Student[] = [
  { id: '1', name: 'Rachel', order: 1, currentWork: 'WFW /e/' },
  { id: '2', name: 'Yueze', order: 2, currentWork: 'WFW /o/' },
  { id: '3', name: 'Lucky', order: 3, currentWork: 'WFW /i/' },
  { id: '4', name: 'Austin', order: 4, currentWork: 'WFW /e/' },
  { id: '5', name: 'Minxi', order: 5, currentWork: 'WBW 3ptc /e/' },
  { id: '6', name: 'Leo', order: 6, currentWork: 'WBW 3ptc /e/' },
  { id: '7', name: 'Joey', order: 7, currentWork: 'WBW Mixed Box 1' },
  { id: '8', name: 'Eric', order: 8, currentWork: 'WFW /a/' },
  { id: '9', name: 'Jimmy', order: 9, currentWork: 'WBW /e/' },
  { id: '10', name: 'Kevin', order: 10, currentWork: 'WBW Mixed Box 1' },
  { id: '11', name: 'Niuniu', order: 11, currentWork: 'WBW /a/' },
  { id: '12', name: 'Amy', order: 12, currentWork: 'Sound Games' },
  { id: '13', name: 'Henry', order: 13, currentWork: 'SPL /a/' },
  { id: '14', name: 'Segina', order: 14, currentWork: 'Spindle Box' },
  { id: '15', name: 'Hayden', order: 15, currentWork: 'WBW 3ptc' },
  { id: '16', name: 'KK', order: 16, currentWork: 'WBW /a/' },
  { id: '17', name: 'Kayla', order: 17, currentWork: 'I Spy games' },
  { id: '18', name: 'Stella', order: 18, currentWork: 'I Spy games' },
];

const CLASSROOM_NAMES: Record<string, string> = {
  '1': 'Whale Class',
  'whale': 'Whale Class',
};

export default function ClassroomPage() {
  const params = useParams();
  const slug = params.slug as string;
  const classroomId = params.id as string;
  const classroomName = CLASSROOM_NAMES[classroomId] || 'Classroom';
  
  const [students] = useState<Student[]>(WHALE_CLASS_STUDENTS);
  const [search, setSearch] = useState('');

  const filtered = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <Link href={`/admin/schools/${slug}`} className="text-slate-500 hover:text-white text-sm">
              ← Back
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-white font-medium">{classroomName}</h1>
            <span className="text-slate-600 text-sm">• {students.length} students</span>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-3 flex gap-3 overflow-x-auto">
          <Link
            href={`/admin/schools/${slug}/english-reports`}
            className="px-4 py-2 bg-teal-500/10 border border-teal-500/30 rounded-lg text-sm text-teal-400 hover:border-teal-500/50 transition-colors whitespace-nowrap"
          >
            📝 Weekly Reports
          </Link>
          <Link
            href={`/admin/schools/${slug}/newsletter`}
            className="px-4 py-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-400 hover:border-amber-500/50 transition-colors whitespace-nowrap"
          >
            📰 Newsletter
          </Link>
          <Link
            href={`/admin/schools/${slug}/english`}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            🔤 English Sequence
          </Link>
          <Link
            href={`/admin/schools/${slug}/curriculum`}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            📚 Curriculum
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Search */}
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 mb-4"
        />

        {/* Students List */}
        <div className="divide-y divide-slate-800">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between py-3 -mx-4 px-4 hover:bg-slate-900/50 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <span className="w-6 h-6 bg-slate-800 rounded-full flex items-center justify-center text-xs text-slate-500">
                  {student.order}
                </span>
                <span className="text-white font-medium">{student.name}</span>
              </div>
              {student.currentWork && (
                <span className="text-slate-500 text-sm">{student.currentWork}</span>
              )}
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-slate-600 text-center py-8">
            {search ? 'No students match your search' : 'No students'}
          </p>
        )}
      </div>
    </div>
  );
}
