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
  teacher: { id: string; name: string; email: string } | null;
  school: { id: string; name: string };
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const schoolId = params.id as string;
  const classroomId = params.classroomId as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [classroomId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}`);
      const data = await res.json();
      setClassroom(data.classroom);
      setStudents(data.students || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const calcAge = (dob: string) => {
    const d = new Date(dob);
    const diff = Date.now() - d.getTime();
    return (diff / (365.25 * 24 * 60 * 60 * 1000)).toFixed(1);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div></div>;
  if (!classroom) return <div className="min-h-screen flex items-center justify-center">Classroom not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <Link href={`/admin/schools/${schoolId}`} className="text-emerald-600 text-sm mb-2 inline-block">← {classroom.school?.name}</Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{classroom.name}</h1>
              <p className="text-gray-500 text-sm">Ages {classroom.age_group} • {students.length} students</p>
            </div>
            <Link href={`/teacher/setup?classroom=${classroomId}`} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg">+ Add Students</Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Teacher Section */}
        <div className="bg-white rounded-xl p-6 border mb-6">
          <h2 className="font-semibold mb-3">👩‍🏫 Assigned Teacher</h2>
          {classroom.teacher ? (
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-xl">{classroom.teacher.name.charAt(0)}</div>
              <div>
                <p className="font-medium">{classroom.teacher.name}</p>
                <p className="text-sm text-gray-500">{classroom.teacher.email}</p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500">No teacher assigned yet</p>
          )}
        </div>

        {/* Students Grid */}
        <h2 className="font-semibold mb-4">👶 Students ({students.length})</h2>
        {students.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border-2 border-dashed">
            <div className="text-5xl mb-4">👶</div>
            <p className="text-gray-500 mb-4">No students in this classroom yet</p>
            <Link href={`/teacher/setup?classroom=${classroomId}`} className="bg-emerald-600 text-white px-4 py-2 rounded-lg inline-block">+ Add Students</Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {students.map((s) => (
              <div key={s.id} className="bg-white rounded-xl p-4 border text-center hover:shadow-md">
                <div className="w-16 h-16 mx-auto mb-2 rounded-full bg-emerald-100 flex items-center justify-center text-2xl overflow-hidden">
                  {s.photo_url ? <img src={s.photo_url} className="w-full h-full object-cover" /> : s.name.charAt(0)}
                </div>
                <p className="font-medium text-sm truncate">{s.name}</p>
                <p className="text-xs text-gray-500">Age {calcAge(s.date_of_birth)}</p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
