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
  mastered_count: number;
  recent_works: string[];
}

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  school_name: string;
}

export default function ClassroomViewPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;
  
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [classroomId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/classroom-view/${classroomId}`);
      const data = await res.json();
      setClassroom(data.classroom || null);
      setStudents(data.students || []);
    } catch (error) {
      console.error('Failed to fetch classroom view:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classroom...</p>
        </div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-500 text-xl">Classroom not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{classroom.name}</h1>
        <p className="text-gray-500 mt-1">{classroom.school_name} • Ages {classroom.age_group}</p>
      </div>

      {/* Students Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
        {students.map((student) => (
          <Link
            key={student.id}
            href={`/classroom-view/${classroomId}/${student.id}`}
            className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all transform hover:-translate-y-1"
          >
            {/* Photo */}
            <div className="w-20 h-20 bg-emerald-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl overflow-hidden">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student.name.charAt(0)
              )}
            </div>

            {/* Name */}
            <h3 className="font-semibold text-gray-900 text-center">{student.name}</h3>
            <p className="text-xs text-gray-500 text-center mt-1">
              Age {student.age.toFixed(1)}
            </p>

            {/* Mastered Badge */}
            <div className="mt-3 text-center">
              <span className="inline-block bg-green-100 text-green-700 text-xs px-3 py-1 rounded-full font-medium">
                ✓ {student.mastered_count} mastered
              </span>
            </div>

            {/* Recent Works Preview */}
            {student.recent_works.length > 0 && (
              <div className="mt-3 text-xs text-gray-400 text-center truncate">
                {student.recent_works.slice(0, 2).join(', ')}
              </div>
            )}
          </Link>
        ))}
      </div>

      {students.length === 0 && (
        <div className="text-center py-16">
          <p className="text-gray-500">No students in this classroom.</p>
        </div>
      )}
    </div>
  );
}
