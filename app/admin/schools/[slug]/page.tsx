// app/admin/schools/[slug]/page.tsx
// School Dashboard - Tesla Style: Classrooms + Teachers lists
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Classroom {
  id: string;
  name: string;
  teacher?: string;
  teacherId?: string;
  studentCount: number;
}

interface Teacher {
  id: string;
  name: string;
  email?: string;
  classroom?: string;
  classroomId?: string;
  isActive: boolean;
}

// Mock data
const MOCK_CLASSROOMS: Classroom[] = [
  { id: '1', name: 'Whale Class', teacher: 'Tredoux', teacherId: 't1', studentCount: 12 },
];

const MOCK_TEACHERS: Teacher[] = [
  { id: 't1', name: 'Tredoux', email: 'tredoux@school.com', classroom: 'Whale Class', classroomId: '1', isActive: true },
];

const SCHOOL_NAMES: Record<string, string> = {
  'beijing-international': 'Beijing International School',
  'master': 'Master Templates',
};

export default function SchoolPage() {
  const params = useParams();
  const slug = params.slug as string;
  const schoolName = SCHOOL_NAMES[slug] || slug;
  
  const [tab, setTab] = useState<'classrooms' | 'teachers'>('classrooms');
  const [classrooms, setClassrooms] = useState<Classroom[]>(MOCK_CLASSROOMS);
  const [teachers, setTeachers] = useState<Teacher[]>(MOCK_TEACHERS);
  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newClassroomName, setNewClassroomName] = useState('');
  const [newTeacherName, setNewTeacherName] = useState('');
  const [newTeacherEmail, setNewTeacherEmail] = useState('');

  const addClassroom = () => {
    if (!newClassroomName.trim()) return;
    const newClassroom: Classroom = {
      id: Date.now().toString(),
      name: newClassroomName.trim(),
      studentCount: 0,
    };
    setClassrooms([...classrooms, newClassroom]);
    setNewClassroomName('');
    setShowAddClassroom(false);
  };

  const addTeacher = () => {
    if (!newTeacherName.trim()) return;
    const newTeacher: Teacher = {
      id: Date.now().toString(),
      name: newTeacherName.trim(),
      email: newTeacherEmail.trim() || undefined,
      isActive: true,
    };
    setTeachers([...teachers, newTeacher]);
    setNewTeacherName('');
    setNewTeacherEmail('');
    setShowAddTeacher(false);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/admin/schools" className="text-slate-500 hover:text-white text-sm">
              ← Schools
            </Link>
            <span className="text-slate-700">/</span>
            <h1 className="text-white font-medium">{schoolName}</h1>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-6">
            <button
              onClick={() => setTab('classrooms')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'classrooms' 
                  ? 'text-white border-white' 
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Classrooms ({classrooms.length})
            </button>
            <button
              onClick={() => setTab('teachers')}
              className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === 'teachers' 
                  ? 'text-white border-white' 
                  : 'text-slate-500 border-transparent hover:text-slate-300'
              }`}
            >
              Teachers ({teachers.length})
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        
        {/* CLASSROOMS TAB */}
        {tab === 'classrooms' && (
          <div>
            {/* Add Button */}
            {!showAddClassroom ? (
              <button
                onClick={() => setShowAddClassroom(true)}
                className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors text-sm mb-4"
              >
                + Add Classroom
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
                <input
                  type="text"
                  placeholder="Classroom name (e.g., Whale Class)"
                  value={newClassroomName}
                  onChange={(e) => setNewClassroomName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addClassroom()}
                  autoFocus
                  className="w-full bg-transparent border-none text-white placeholder-slate-600 focus:outline-none mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addClassroom}
                    className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-slate-200"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddClassroom(false); setNewClassroomName(''); }}
                    className="px-4 py-2 text-slate-500 text-sm hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Classrooms List */}
            <div className="divide-y divide-slate-800">
              {classrooms.map((classroom) => (
                <Link
                  key={classroom.id}
                  href={`/admin/schools/${slug}/classrooms/${classroom.id}`}
                  className="flex items-center justify-between py-4 hover:bg-slate-900/50 -mx-4 px-4 rounded-lg transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-2 h-2 rounded-full bg-green-500" />
                    <div>
                      <span className="text-white font-medium">{classroom.name}</span>
                      {classroom.teacher && (
                        <span className="text-slate-500 text-sm ml-3">
                          {classroom.teacher}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-slate-500 text-sm">{classroom.studentCount} students</span>
                    <svg className="w-5 h-5 text-slate-600 group-hover:text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>

            {classrooms.length === 0 && (
              <p className="text-slate-600 text-center py-8">No classrooms yet</p>
            )}
          </div>
        )}

        {/* TEACHERS TAB */}
        {tab === 'teachers' && (
          <div>
            {/* Add Button */}
            {!showAddTeacher ? (
              <button
                onClick={() => setShowAddTeacher(true)}
                className="w-full py-3 border border-dashed border-slate-700 rounded-lg text-slate-500 hover:border-slate-600 hover:text-slate-400 transition-colors text-sm mb-4"
              >
                + Add Teacher
              </button>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-4">
                <input
                  type="text"
                  placeholder="Teacher name"
                  value={newTeacherName}
                  onChange={(e) => setNewTeacherName(e.target.value)}
                  autoFocus
                  className="w-full bg-transparent border-none text-white placeholder-slate-600 focus:outline-none mb-2"
                />
                <input
                  type="email"
                  placeholder="Email (optional)"
                  value={newTeacherEmail}
                  onChange={(e) => setNewTeacherEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addTeacher()}
                  className="w-full bg-transparent border-none text-white placeholder-slate-600 focus:outline-none mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={addTeacher}
                    className="px-4 py-2 bg-white text-black text-sm font-medium rounded-lg hover:bg-slate-200"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddTeacher(false); setNewTeacherName(''); setNewTeacherEmail(''); }}
                    className="px-4 py-2 text-slate-500 text-sm hover:text-white"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Teachers List */}
            <div className="divide-y divide-slate-800">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className="flex items-center justify-between py-4 -mx-4 px-4"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-2 rounded-full ${teacher.isActive ? 'bg-green-500' : 'bg-slate-600'}`} />
                    <div>
                      <span className="text-white font-medium">{teacher.name}</span>
                      {teacher.email && (
                        <span className="text-slate-600 text-sm ml-3">{teacher.email}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {teacher.classroom ? (
                      <span className="text-slate-500 text-sm">{teacher.classroom}</span>
                    ) : (
                      <select className="bg-slate-900 border border-slate-700 rounded px-3 py-1 text-sm text-slate-400 focus:outline-none">
                        <option value="">Assign to classroom...</option>
                        {classrooms.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {teachers.length === 0 && (
              <p className="text-slate-600 text-center py-8">No teachers yet</p>
            )}
          </div>
        )}

        {/* Quick Links */}
        <div className="mt-12 pt-8 border-t border-slate-800">
          <p className="text-slate-600 text-xs uppercase tracking-wider mb-4">School Settings</p>
          <div className="flex gap-4">
            <Link 
              href={`/admin/schools/${slug}/curriculum`}
              className="text-slate-500 hover:text-white text-sm transition-colors"
            >
              School Curriculum →
            </Link>
            <Link 
              href={`/admin/schools/${slug}/english`}
              className="text-slate-500 hover:text-white text-sm transition-colors"
            >
              English Sequence →
            </Link>
            <Link 
              href={`/admin/schools/${slug}/settings`}
              className="text-slate-500 hover:text-white text-sm transition-colors"
            >
              Settings →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
