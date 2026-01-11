'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Teacher {
  id: string;
  name: string;
  studentCount: number;
}

interface Child {
  id: string;
  name: string;
  age_group: string;
  assignedTo: string | null;
  assignedTeacherName: string | null;
}

export default function TeacherStudentsPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/admin/teacher-students');
      const data = await res.json();
      setTeachers(data.teachers || []);
      setChildren(data.children || []);
    } catch (error) {
      console.error('Failed to fetch data:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignChild = async (childId: string, teacherId: string | null) => {
    setSaving(childId);
    try {
      const res = await fetch('/api/admin/teacher-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, teacherId }),
      });
      
      if (res.ok) {
        await fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to assign child:', error);
    } finally {
      setSaving(null);
    }
  };

  const unassignedChildren = children.filter(c => !c.assignedTo);
  const assignedChildren = children.filter(c => c.assignedTo);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/admin" className="text-gray-500 hover:text-gray-700 text-sm">
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 mt-1">
              👨‍🏫 Assign Students to Teachers
            </h1>
            <p className="text-gray-600 text-sm mt-1">
              {children.length} students • {teachers.length} teachers
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Teachers Column */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Teachers</h2>
            <div className="space-y-2">
              {teachers.map((teacher) => (
                <button
                  key={teacher.id}
                  onClick={() => setSelectedTeacher(
                    selectedTeacher === teacher.id ? null : teacher.id
                  )}
                  className={`w-full p-3 rounded-lg text-left transition-all ${
                    selectedTeacher === teacher.id
                      ? 'bg-emerald-100 border-2 border-emerald-500'
                      : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{teacher.name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      teacher.studentCount > 0 
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {teacher.studentCount} students
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {selectedTeacher && (
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                <p className="text-sm text-emerald-800">
                  Click on unassigned students to assign them to{' '}
                  <strong>{teachers.find(t => t.id === selectedTeacher)?.name}</strong>
                </p>
              </div>
            )}
          </div>

          {/* Unassigned Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Unassigned ({unassignedChildren.length})
            </h2>
            
            {unassignedChildren.length === 0 ? (
              <p className="text-gray-500 text-sm">All students are assigned!</p>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {unassignedChildren.map((child) => (
                  <div
                    key={child.id}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedTeacher
                        ? 'border-emerald-300 bg-emerald-50 cursor-pointer hover:bg-emerald-100'
                        : 'border-gray-200 bg-gray-50'
                    } ${saving === child.id ? 'opacity-50' : ''}`}
                    onClick={() => {
                      if (selectedTeacher && saving !== child.id) {
                        assignChild(child.id, selectedTeacher);
                      }
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-lg">
                        {child.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{child.name}</div>
                        <div className="text-xs text-gray-500">{child.age_group || 'Unknown age'}</div>
                      </div>
                      {selectedTeacher && saving !== child.id && (
                        <div className="ml-auto text-emerald-600">
                          + Assign
                        </div>
                      )}
                      {saving === child.id && (
                        <div className="ml-auto text-gray-400">
                          Saving...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Assigned Students */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              Assigned ({assignedChildren.length})
            </h2>
            
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {assignedChildren.map((child) => (
                <div
                  key={child.id}
                  className={`p-3 rounded-lg border-2 border-gray-200 bg-white ${
                    saving === child.id ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-lg">
                      {child.name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900">{child.name}</div>
                      <div className="text-xs text-emerald-600">
                        → {child.assignedTeacherName}
                      </div>
                    </div>
                    <button
                      onClick={() => assignChild(child.id, null)}
                      disabled={saving === child.id}
                      className="text-xs text-red-500 hover:text-red-700 px-2 py-1 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <h3 className="font-bold text-gray-900 mb-3">Teacher Overview</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {teachers.map((teacher) => {
              const teacherChildren = children.filter(c => c.assignedTo === teacher.id);
              return (
                <div key={teacher.id} className="text-center p-3 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">{teacherChildren.length}</div>
                  <div className="text-sm text-gray-600">{teacher.name}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
