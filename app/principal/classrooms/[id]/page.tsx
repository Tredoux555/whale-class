'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url: string | null;
  age_group: string;
}

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  teacher_id: string | null;
  school: { id: string; name: string };
}

export default function PrincipalClassroomPage() {
  const params = useParams();
  const classroomId = params.id as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [isTeacher, setIsTeacher] = useState(false);

  useEffect(() => { 
    fetchData();
    // Check if user has "claimed" this classroom
    const claimed = localStorage.getItem(`teacher_classroom_${classroomId}`);
    if (claimed) setIsTeacher(true);
  }, [classroomId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}`);
      const data = await res.json();
      setClassroom(data.classroom);
      setStudents(data.students || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleBecomeTeacher = () => {
    localStorage.setItem(`teacher_classroom_${classroomId}`, 'true');
    localStorage.setItem('teacher_current_classroom', classroomId);
    setIsTeacher(true);
  };

  const calcAge = (dob: string) => {
    const d = new Date(dob);
    const years = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return years.toFixed(1);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  if (!classroom) return <div className="min-h-screen flex items-center justify-center">Classroom not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/principal" className="text-indigo-200 text-sm hover:text-white">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">{classroom.name}</h1>
          <p className="text-indigo-200">Ages {classroom.age_group} • {students.length} students</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Role Test Banner */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-semibold text-amber-800 mb-2">🧪 Role Testing Mode</h3>
          <div className="flex flex-wrap gap-3">
            {!isTeacher ? (
              <button onClick={handleBecomeTeacher} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                👩‍🏫 Become Teacher of This Class
              </button>
            ) : (
              <Link href={`/teacher/classroom?classroom=${classroomId}`} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700">
                👩‍🏫 Enter Teacher Portal →
              </Link>
            )}
            {students.length > 0 && (
              <Link href={`/parent/child/${students[0].id}`} className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                👨‍👩‍👧 View as Parent of {students[0].name}
              </Link>
            )}
          </div>
          {isTeacher && <p className="text-sm text-amber-700 mt-2">✅ You are now the teacher of this classroom</p>}
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-indigo-600">{students.length}</div>
            <div className="text-gray-500 text-xs">Students</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-emerald-600">{isTeacher ? '1' : '0'}</div>
            <div className="text-gray-500 text-xs">Teacher</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl font-bold text-purple-600">{classroom.age_group}</div>
            <div className="text-gray-500 text-xs">Age Group</div>
          </div>
          <div className="bg-white rounded-xl p-4 border text-center">
            <div className="text-2xl">{isTeacher ? '✅' : '⚠️'}</div>
            <div className="text-gray-500 text-xs">{isTeacher ? 'Ready' : 'Needs Teacher'}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl p-6 border mb-6">
          <h2 className="font-semibold mb-4">⚡ Actions</h2>
          <div className="flex flex-wrap gap-3">
            <Link href={`/teacher/setup?classroom=${classroomId}`} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700">
              + Add Students
            </Link>
            {isTeacher && (
              <Link href={`/teacher/progress?classroom=${classroomId}`} className="px-4 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm hover:bg-emerald-200">
                📊 Track Progress
              </Link>
            )}
          </div>
        </div>

        {/* Students Grid */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">👶 Students ({students.length})</h2>
        </div>
        
        {students.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed">
            <div className="text-5xl mb-4">👶</div>
            <p className="text-gray-500 mb-4">No students in this classroom yet</p>
            <Link href={`/teacher/setup?classroom=${classroomId}`} className="bg-indigo-600 text-white px-4 py-2 rounded-lg inline-block">
              + Add Students
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {students.map((s) => (
              <Link key={s.id} href={`/parent/child/${s.id}`} className="bg-white rounded-xl p-4 border text-center hover:shadow-md hover:border-purple-300 cursor-pointer">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-indigo-100 flex items-center justify-center text-2xl overflow-hidden">
                  {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" alt={s.name} /> : s.name.charAt(0)}
                </div>
                <p className="font-medium text-sm truncate">{s.name}</p>
                <p className="text-xs text-gray-500">Age {calcAge(s.date_of_birth)}</p>
                <p className="text-xs text-purple-500 mt-1">Click for parent view</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
