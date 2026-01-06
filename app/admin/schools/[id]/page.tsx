'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface School {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  is_active: boolean;
}

interface Classroom {
  id: string;
  name: string;
  age_group: string;
  is_active: boolean;
  students_count: number;
  teachers: {
    id: string;
    name: string;
    role: string;
  }[];
}

interface Teacher {
  id: string;
  name: string;
  email: string;
  role: string;
  classrooms: string[];
}

export default function SchoolDetailPage() {
  const params = useParams();
  const schoolId = params.id as string;

  const [school, setSchool] = useState<School | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'classrooms' | 'teachers'>('classrooms');
  
  // Add classroom modal
  const [showAddClassroom, setShowAddClassroom] = useState(false);
  const [newClassroom, setNewClassroom] = useState({ name: '', age_group: '3-6' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSchoolData();
  }, [schoolId]);

  const fetchSchoolData = async () => {
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}`);
      const data = await res.json();
      setSchool(data.school);
      setClassrooms(data.classrooms || []);
      setTeachers(data.teachers || []);
    } catch (error) {
      console.error('Failed to fetch school data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createClassroom = async () => {
    if (!newClassroom.name) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/schools/${schoolId}/classrooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newClassroom),
      });
      if (res.ok) {
        setShowAddClassroom(false);
        setNewClassroom({ name: '', age_group: '3-6' });
        fetchSchoolData();
      }
    } catch (error) {
      console.error('Failed to create classroom:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!school) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🤷</div>
          <h2 className="text-xl font-bold text-gray-900">School not found</h2>
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
            <span className="text-gray-900">{school.name}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center text-3xl">
                {school.logo_url ? (
                  <img src={school.logo_url} alt={school.name} className="w-full h-full rounded-xl object-cover" />
                ) : (
                  '🏫'
                )}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{school.name}</h1>
                <p className="text-gray-500">{school.slug}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              school.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {school.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-3xl font-bold text-emerald-600">{classrooms.length}</div>
            <div className="text-sm text-gray-500">Classrooms</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-3xl font-bold text-blue-600">
              {classrooms.reduce((acc, c) => acc + c.students_count, 0)}
            </div>
            <div className="text-sm text-gray-500">Students</div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="text-3xl font-bold text-purple-600">{teachers.length}</div>
            <div className="text-sm text-gray-500">Teachers</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex gap-1 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('classrooms')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'classrooms'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            📚 Classrooms ({classrooms.length})
          </button>
          <button
            onClick={() => setActiveTab('teachers')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'teachers'
                ? 'border-emerald-600 text-emerald-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            👩‍🏫 Teachers ({teachers.length})
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto p-6">
        {activeTab === 'classrooms' ? (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Classrooms</h2>
              <button
                onClick={() => setShowAddClassroom(true)}
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"
              >
                + Add Classroom
              </button>
            </div>

            {classrooms.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="text-5xl mb-3">📚</div>
                <p className="text-gray-500">No classrooms yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {classrooms.map((classroom) => (
                  <Link
                    key={classroom.id}
                    href={`/admin/classrooms/${classroom.id}`}
                    className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-emerald-200 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-gray-900">{classroom.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                        {classroom.age_group}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
                      <span>👶 {classroom.students_count} students</span>
                    </div>

                    {classroom.teachers.length > 0 && (
                      <div className="border-t border-gray-100 pt-3">
                        <div className="text-xs text-gray-500 mb-2">Teachers:</div>
                        <div className="flex flex-wrap gap-1">
                          {classroom.teachers.map((teacher) => (
                            <span
                              key={teacher.id}
                              className={`text-xs px-2 py-1 rounded-full ${
                                teacher.role === 'lead'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-gray-100 text-gray-600'
                              }`}
                            >
                              {teacher.name}
                              {teacher.role === 'lead' && ' ⭐'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-3 text-emerald-600 text-sm font-medium group-hover:translate-x-1 transition-transform">
                      View students →
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-900">Teachers</h2>
              <Link
                href="/admin/users"
                className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 text-sm"
              >
                + Add Teacher
              </Link>
            </div>

            {teachers.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                <div className="text-5xl mb-3">👩‍🏫</div>
                <p className="text-gray-500">No teachers yet</p>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Name</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Role</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-500">Classrooms</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {teachers.map((teacher) => (
                      <tr key={teacher.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center text-sm font-medium text-purple-600">
                              {teacher.name.charAt(0)}
                            </div>
                            <span className="font-medium text-gray-900">{teacher.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{teacher.email}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            teacher.role === 'school_admin'
                              ? 'bg-orange-100 text-orange-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {teacher.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {teacher.classrooms.length > 0
                            ? teacher.classrooms.join(', ')
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Classroom Modal */}
      {showAddClassroom && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add New Classroom</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Classroom Name
                </label>
                <input
                  type="text"
                  value={newClassroom.name}
                  onChange={(e) => setNewClassroom({ ...newClassroom, name: e.target.value })}
                  placeholder="Primary Classroom"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Group
                </label>
                <select
                  value={newClassroom.age_group}
                  onChange={(e) => setNewClassroom({ ...newClassroom, age_group: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="0-3">0-3 (Infant/Toddler)</option>
                  <option value="2-3">2-3 (Toddler)</option>
                  <option value="3-4">3-4 (Early Childhood)</option>
                  <option value="3-6">3-6 (Primary)</option>
                  <option value="4-5">4-5 (Pre-K)</option>
                  <option value="5-6">5-6 (Kindergarten)</option>
                  <option value="6-9">6-9 (Lower Elementary)</option>
                  <option value="9-12">9-12 (Upper Elementary)</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddClassroom(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={createClassroom}
                disabled={saving || !newClassroom.name}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? 'Creating...' : 'Create Classroom'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
