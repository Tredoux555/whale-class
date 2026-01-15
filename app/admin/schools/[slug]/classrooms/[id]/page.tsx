// app/admin/schools/[slug]/classrooms/[id]/page.tsx
// Classroom Detail - Teacher manages students + curriculum
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  age?: number;
  joinedAt: string;
}

// Mock data
const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Amy Chen', age: 4.2, joinedAt: '2025-09-01' },
  { id: '2', name: 'Bobby Liu', age: 4.5, joinedAt: '2025-09-01' },
  { id: '3', name: 'Charlie Wang', age: 4.1, joinedAt: '2025-09-01' },
  { id: '4', name: 'Diana Zhang', age: 4.8, joinedAt: '2025-09-01' },
  { id: '5', name: 'Eric Li', age: 4.3, joinedAt: '2025-09-15' },
  { id: '6', name: 'Fiona Wu', age: 4.0, joinedAt: '2025-09-15' },
  { id: '7', name: 'George Huang', age: 4.6, joinedAt: '2025-10-01' },
  { id: '8', name: 'Hannah Sun', age: 4.4, joinedAt: '2025-10-01' },
  { id: '9', name: 'Ivan Zhou', age: 4.7, joinedAt: '2025-10-15' },
  { id: '10', name: 'Julia Xu', age: 4.2, joinedAt: '2025-10-15' },
  { id: '11', name: 'Kevin Yang', age: 4.5, joinedAt: '2025-11-01' },
  { id: '12', name: 'Lucy Chen', age: 4.3, joinedAt: '2025-11-01' },
];

const CLASSROOM_NAMES: Record<string, string> = {
  '1': 'Whale Class',
};

export default function ClassroomPage() {
  const params = useParams();
  const slug = params.slug as string;
  const classroomId = params.id as string;
  const classroomName = CLASSROOM_NAMES[classroomId] || 'Classroom';
  
  const [students, setStudents] = useState<Student[]>(MOCK_STUDENTS);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentAge, setNewStudentAge] = useState('');
  const [search, setSearch] = useState('');

  const addStudent = () => {
    if (!newStudentName.trim()) return;
    const newStudent: Student = {
      id: Date.now().toString(),
      name: newStudentName.trim(),
      age: newStudentAge ? parseFloat(newStudentAge) : undefined,
      joinedAt: new Date().toISOString().split('T')[0],
    };
    setStudents([...students, newStudent]);
    setNewStudentName('');
    setNewStudentAge('');
    setShowAddStudent(false);
  };

  const deleteStudent = (id: string) => {
    if (confirm('Remove this student?')) {
      setStudents(students.filter(s => s.id !== id));
    }
  };

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
              ← {slug === 'beijing-international' ? 'Beijing International' : slug}
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-white font-medium">{classroomName}</h1>
          </div>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-3 flex gap-4">
          <Link
            href={`/admin/schools/${slug}/classrooms/${classroomId}/curriculum`}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors"
          >
            📚 Edit Curriculum
          </Link>
          <Link
            href={`/admin/schools/${slug}/classrooms/${classroomId}/english`}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors"
          >
            🔤 English Progression
          </Link>
          <Link
            href={`/admin/schools/${slug}/english-reports`}
            className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-white hover:border-slate-700 transition-colors"
          >
            📝 Weekly Reports
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-slate-400 text-sm font-medium">Students ({students.length})</h2>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white placeholder-slate-600 focus:outline-none focus:border-slate-700 mb-4"
        />

        {/* Add Student */}
        {!showAddStudent ? (
          <button
            onClick={() => setShowAddStudent(true)}
            className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors text-sm mb-4"
          >
            + Add Student
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
            <div className="flex gap-3 mb-3">
              <input
                type="text"
                placeholder="Student name"
                value={newStudentName}
                onChange={(e) => setNewStudentName(e.target.value)}
                autoFocus
                className="flex-1 bg-transparent border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Age"
                value={newStudentAge}
                onChange={(e) => setNewStudentAge(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStudent()}
                className="w-20 bg-transparent border border-slate-700 rounded px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-slate-600"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={addStudent}
                className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-slate-200"
              >
                Add
              </button>
              <button
                onClick={() => { setShowAddStudent(false); setNewStudentName(''); setNewStudentAge(''); }}
                className="px-4 py-2 text-slate-500 text-sm hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Students List */}
        <div className="divide-y divide-slate-800">
          {filtered.map((student) => (
            <div
              key={student.id}
              className="flex items-center justify-between py-3 -mx-4 px-4 hover:bg-slate-900/50 rounded-lg group"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-sm text-slate-400">
                  {student.name.charAt(0)}
                </div>
                <div>
                  <span className="text-white">{student.name}</span>
                  {student.age && (
                    <span className="text-slate-600 text-sm ml-3">Age {student.age}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => deleteStudent(student.id)}
                className="text-slate-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <p className="text-slate-600 text-center py-8">
            {search ? 'No students match your search' : 'No students yet'}
          </p>
        )}
      </div>
    </div>
  );
}
