// /montree/admin/students/page.tsx
// Session 88: Student Management - Add, edit, move students
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
  date_of_birth?: string;
  classroom_id: string;
  classroom_name?: string;
  classroom_icon?: string;
}

interface Classroom {
  id: string;
  name: string;
  icon: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClassroom, setSelectedClassroom] = useState<string>('all');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [formName, setFormName] = useState('');
  const [formDob, setFormDob] = useState('');
  const [formClassroom, setFormClassroom] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch students
      const studentsRes = await fetch('/api/montree/admin/students');
      const studentsData = await studentsRes.json();
      setStudents(studentsData.students || []);

      // Fetch classrooms
      const classroomsRes = await fetch('/api/montree/admin/overview');
      const classroomsData = await classroomsRes.json();
      setClassrooms(classroomsData.classrooms || []);
      
      // Set default classroom for new students
      if (classroomsData.classrooms?.length > 0) {
        setFormClassroom(classroomsData.classrooms[0].id);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingStudent(null);
    setFormName('');
    setFormDob('');
    setFormClassroom(classrooms[0]?.id || '');
    setShowAddModal(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFormName(student.name);
    setFormDob(student.date_of_birth || '');
    setFormClassroom(student.classroom_id);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingStudent(null);
  };

  const handleSave = async () => {
    if (!formName.trim() || !formClassroom) return;
    
    setSaving(true);
    try {
      const payload = {
        name: formName.trim(),
        date_of_birth: formDob || null,
        classroom_id: formClassroom,
      };

      const url = editingStudent 
        ? `/api/montree/admin/students/${editingStudent.id}`
        : '/api/montree/admin/students';
      
      const method = editingStudent ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save');

      // Refresh data
      await fetchData();
      closeModal();
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (studentId: string, studentName: string) => {
    if (!confirm(`Remove ${studentName} from the school?`)) return;

    try {
      const res = await fetch(`/api/montree/admin/students/${studentId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');

      // Refresh data
      await fetchData();
    } catch (err) {
      console.error('Delete error:', err);
      alert('Failed to remove student');
    }
  };

  // Filter students
  const filteredStudents = selectedClassroom === 'all' 
    ? students 
    : students.filter(s => s.classroom_id === selectedClassroom);

  // Group by classroom for display
  const groupedStudents = filteredStudents.reduce((acc, student) => {
    const key = student.classroom_id || 'unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(student);
    return acc;
  }, {} as Record<string, Student[]>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="h-8 w-32 bg-slate-700 rounded animate-pulse mb-6"></div>
          <div className="space-y-4">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-16 bg-slate-800 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/montree/admin" className="text-slate-400 text-sm hover:text-white mb-1 inline-block">
              ← Back to Admin
            </Link>
            <h1 className="text-2xl font-bold text-white">Students</h1>
            <p className="text-slate-400 text-sm">{students.length} total</p>
          </div>
          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors"
          >
            + Add Student
          </button>
        </div>

        {/* Filter */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedClassroom('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              selectedClassroom === 'all'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            All ({students.length})
          </button>
          {classrooms.map(c => {
            const count = students.filter(s => s.classroom_id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClassroom(c.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedClassroom === c.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {c.icon} {c.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Students List */}
        {filteredStudents.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <span className="text-5xl mb-4 block">👶</span>
            <h3 className="text-white font-semibold mb-2">No students yet</h3>
            <p className="text-slate-400 mb-6">Add your first student to get started</p>
            <button
              onClick={openAddModal}
              className="px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              + Add Student
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedStudents).map(([classroomId, classStudents]) => {
              const classroom = classrooms.find(c => c.id === classroomId);
              return (
                <div key={classroomId}>
                  {selectedClassroom === 'all' && (
                    <h2 className="text-slate-400 text-sm font-medium mb-3 flex items-center gap-2">
                      <span>{classroom?.icon || '📚'}</span>
                      <span>{classroom?.name || 'Unassigned'}</span>
                      <span className="text-slate-500">({classStudents.length})</span>
                    </h2>
                  )}
                  <div className="space-y-2">
                    {classStudents.map(student => (
                      <div
                        key={student.id}
                        className="bg-slate-800/50 border border-slate-700 rounded-xl p-4 flex items-center justify-between hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-lg">
                            {student.photo_url ? (
                              <img src={student.photo_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
                            ) : (
                              student.name.charAt(0)
                            )}
                          </div>
                          <div>
                            <h3 className="text-white font-medium">{student.name}</h3>
                            {student.date_of_birth && (
                              <p className="text-slate-400 text-sm">
                                Born: {new Date(student.date_of_birth).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openEditModal(student)}
                            className="px-3 py-1.5 bg-slate-700 text-slate-300 rounded-lg text-sm hover:bg-slate-600 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(student.id, student.name)}
                            className="px-3 py-1.5 bg-slate-700 text-red-400 rounded-lg text-sm hover:bg-red-900/30 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add/Edit Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-2xl p-6 max-w-md w-full">
              <h2 className="text-xl font-bold text-white mb-6">
                {editingStudent ? 'Edit Student' : 'Add Student'}
              </h2>
              
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Name *</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Rachel"
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                    autoFocus
                  />
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={formDob}
                    onChange={(e) => setFormDob(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                {/* Classroom */}
                <div>
                  <label className="block text-slate-400 text-sm mb-1">Classroom *</label>
                  <select
                    value={formClassroom}
                    onChange={(e) => setFormClassroom(e.target.value)}
                    className="w-full p-3 bg-slate-900 border border-slate-700 rounded-lg text-white focus:border-emerald-500 focus:outline-none"
                  >
                    {classrooms.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={closeModal}
                  className="flex-1 py-3 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={!formName.trim() || !formClassroom || saving}
                  className="flex-1 py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : editingStudent ? 'Save Changes' : 'Add Student'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
