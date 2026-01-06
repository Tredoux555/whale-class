'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  is_active: boolean;
  school_id: string;
  school_name: string;
}

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  age: number;
  photo_url: string | null;
  enrolled_date: string;
  status: string;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string; // lead, assistant, substitute
}

export default function ClassroomDetailPage() {
  const params = useParams();
  const classroomId = params.id as string;

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
      setClassroom(data.classroom);
      setStudents(data.students || []);
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Failed to fetch classroom data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getProgressPercentage = (student: Student) => {
    const total = student.progress.presented + student.progress.practicing + student.progress.mastered;
    if (total === 0) return 0;
    return Math.round((student.progress.mastered / total) * 100);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!classroom) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤷</div>
          <h2 className="text-xl font-bold text-gray-900">Classroom not found</h2>
          <Link href="/admin/schools" className="text-emerald-600 mt-2 inline-block">
            ← Back to schools
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/schools" className="hover:text-emerald-600">Schools</Link>
            <span>/</span>
            <Link href={`/admin/schools/${classroom.school_id}`} className="hover:text-emerald-600">
              {classroom.school_name}
            </Link>
            <span>/</span>
            <span className="text-gray-900">{classroom.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📚
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                    Ages {classroom.age_group}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {students.length} students
                  </span>
                </div>
              </div>
            </div>
            <Link
              href={`/teacher/progress`}
              className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"
            >
              Open Progress Tracker →
            </Link>
          </div>
        </div>
      </div>

      {/* Teachers */}
      {teachers.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-3">Teachers</h3>
            <div className="flex flex-wrap gap-2">
              {teachers.map((teacher) => (
                <div
                  key={teacher.id}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                    teacher.role === 'lead'
                      ? 'bg-purple-100'
                      : 'bg-gray-100'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    teacher.role === 'lead'
                      ? 'bg-purple-200 text-purple-700'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {teacher.name.charAt(0)}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 text-sm">
                      {teacher.name}
                      {teacher.role === 'lead' && ' ⭐'}
                    </div>
                    <div className="text-xs text-gray-500">{teacher.role}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Students Grid */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-gray-900">Students</h2>
          <Link
            href="/admin/children"
            className="text-emerald-600 text-sm hover:text-emerald-700"
          >
            + Add Student
          </Link>
        </div>

        {students.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <div className="text-5xl mb-3">👶</div>
            <p className="text-gray-500">No students in this classroom yet</p>
            <Link
              href="/admin/children"
              className="mt-3 inline-block text-emerald-600 hover:text-emerald-700"
            >
              Add students →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {students.map((student) => (
              <Link
                key={student.id}
                href={`/admin/students/${student.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg hover:border-emerald-200 transition-all group"
              >
                {/* Photo */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-lg font-medium text-emerald-700 overflow-hidden">
                    {student.photo_url ? (
                      <img
                        src={student.photo_url}
                        alt={student.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      student.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900">{student.name}</h3>
                    <p className="text-xs text-gray-500">Age {student.age.toFixed(1)}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{getProgressPercentage(student)}% mastered</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full flex">
                      <div
                        className="bg-green-500"
                        style={{ width: `${student.progress.mastered}%` }}
                      />
                      <div
                        className="bg-blue-400"
                        style={{ width: `${student.progress.practicing}%` }}
                      />
                      <div
                        className="bg-yellow-400"
                        style={{ width: `${student.progress.presented}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Progress counts */}
                <div className="flex justify-between text-xs">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                    {student.progress.presented} presented
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                    {student.progress.practicing} practicing
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    {student.progress.mastered} mastered
                  </span>
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 text-emerald-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                  View details →
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
