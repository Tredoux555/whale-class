'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url: string | null;
  age: number;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
  };
}

interface Teacher {
  id: string;
  name: string;
  role: string;
}

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  school_id: string;
  school_name: string;
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClassroomData();
  }, [classroomId]);

  const fetchClassroomData = async () => {
    try {
      const res = await fetch(`/api/admin/classrooms/${classroomId}`);
      const data = await res.json();
      setClassroom(data.classroom || null);
      setStudents(data.students || []);
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Failed to fetch classroom:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: string) => {
    const birth = new Date(dob);
    const now = new Date();
    const years = (now.getTime() - birth.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    return years.toFixed(1);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading classroom...</div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="p-8">
        <p className="text-red-500">Classroom not found</p>
        <Link href="/admin/schools" className="text-emerald-600 hover:underline">← Back to schools</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href={`/admin/schools/${classroom.school_id}`} className="text-gray-400 hover:text-gray-600">←</Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📚 {classroom.name}</h1>
          <p className="text-sm text-gray-500">
            {classroom.school_name} • Ages {classroom.age_group}
          </p>
        </div>
      </div>

      {/* Teachers */}
      {teachers.length > 0 && (
        <div className="mb-6 flex gap-2">
          <span className="text-sm text-gray-500">Teachers:</span>
          {teachers.map((t) => (
            <span key={t.id} className="text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {t.name} ({t.role})
            </span>
          ))}
        </div>
      )}

      {/* Students Grid */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Students ({students.length})</h2>
      
      {students.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <p className="text-gray-500">No students enrolled.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {students.map((student) => (
            <Link
              key={student.id}
              href={`/admin/students/${student.id}`}
              className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all text-center"
            >
              <div className="w-16 h-16 bg-emerald-100 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl overflow-hidden">
                {student.photo_url ? (
                  <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
                ) : (
                  student.name.charAt(0)
                )}
              </div>
              <h3 className="font-medium text-gray-900 text-sm">{student.name}</h3>
              <p className="text-xs text-gray-500 mt-1">Age {calculateAge(student.date_of_birth)}</p>
              
              {/* Progress indicators */}
              <div className="flex justify-center gap-1 mt-3">
                <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded" title="Presented">
                  {student.progress.presented}
                </span>
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded" title="Practicing">
                  {student.progress.practicing}
                </span>
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded" title="Mastered">
                  {student.progress.mastered}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
