'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  student_count: number;
  teachers: { id: string; name: string; role: string }[];
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  classrooms: string[];
}

interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
}

export default function SchoolDetailPage() {
  const params = useParams();
  const schoolId = params.schoolId as string;
  
  const [school, setSchool] = useState<School | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classrooms' | 'teachers'>('classrooms');

  useEffect(() => {
    fetchSchoolData();
  }, [schoolId]);

  const fetchSchoolData = async () => {
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}`);
      const data = await res.json();
      setSchool(data.school || null);
      setClassrooms(data.classrooms || []);
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Failed to fetch school:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse text-gray-500">Loading school...</div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="p-8">
        <p className="text-red-500">School not found</p>
        <Link href="/admin/schools" className="text-emerald-600 hover:underline">← Back to schools</Link>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin/schools" className="text-gray-400 hover:text-gray-600">←</Link>
        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center text-xl">
          {school.logo_url ? (
            <img src={school.logo_url} alt={school.name} className="w-full h-full rounded-xl object-cover" />
          ) : (
            '🏫'
          )}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
          <p className="text-sm text-gray-500">{school.slug}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('classrooms')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'classrooms'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          📚 Classrooms ({classrooms.length})
        </button>
        <button
          onClick={() => setActiveTab('teachers')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'teachers'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          👩‍🏫 Teachers ({teachers.length})
        </button>
      </div>

      {/* Classrooms Tab */}
      {activeTab === 'classrooms' && (
        <div className="grid gap-4">
          {classrooms.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No classrooms yet.</p>
            </div>
          ) : (
            classrooms.map((classroom) => (
              <Link
                key={classroom.id}
                href={`/admin/classrooms/${classroom.id}`}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{classroom.name}</h3>
                    <p className="text-sm text-gray-500">Ages {classroom.age_group}</p>
                    {classroom.teachers.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {classroom.teachers.map((t) => (
                          <span key={t.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {t.name} ({t.role})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-600">{classroom.student_count}</div>
                    <div className="text-xs text-gray-500">Students</div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* Teachers Tab */}
      {activeTab === 'teachers' && (
        <div className="grid gap-4">
          {teachers.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-xl">
              <p className="text-gray-500">No teachers yet.</p>
            </div>
          ) : (
            teachers.map((teacher) => (
              <div
                key={teacher.id}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{teacher.name}</h3>
                    <p className="text-sm text-gray-500">{teacher.email}</p>
                    {teacher.classrooms.length > 0 && (
                      <div className="flex gap-2 mt-2">
                        {teacher.classrooms.map((c, i) => (
                          <span key={i} className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded">
                            {c}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                    {teacher.role}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
