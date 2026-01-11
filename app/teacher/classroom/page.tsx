'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  age_group: string;
  photo_url: string | null;
  age: number;
  progress: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
}

export default function TeacherClassroomPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', birthDate: '', ageGroup: '3-4' });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) {
      router.push('/teacher');
      return;
    }
    setTeacherName(name);
    
    // Only Tredoux (admin) sees the full student list
    // Other teachers start with empty classroom
    if (name === 'Tredoux') {
      fetchChildren();
    } else {
      // Load teacher-specific students from localStorage for now
      const savedStudents = localStorage.getItem(`classroom_${name}`);
      if (savedStudents) {
        setChildren(JSON.parse(savedStudents));
      }
      setLoading(false);
    }
  }, [router]);

  const fetchChildren = async () => {
    try {
      const res = await fetch('/api/teacher/classroom');
      const data = await res.json();
      setChildren(data.children || []);
    } catch (error) {
      console.error('Failed to fetch children:', error);
    } finally {
      setLoading(false);
    }
  };

  const addStudent = async () => {
    if (!newStudent.name || !teacherName) return;
    
    setAdding(true);
    
    // Create a local student (for non-admin teachers)
    const student: Child = {
      id: `local_${Date.now()}`,
      name: newStudent.name,
      date_of_birth: newStudent.birthDate || new Date().toISOString().split('T')[0],
      age_group: newStudent.ageGroup,
      photo_url: null,
      age: newStudent.birthDate ? calculateAge(newStudent.birthDate) : 3,
      progress: { presented: 0, practicing: 0, mastered: 0, total: 0 }
    };
    
    const updatedChildren = [...children, student];
    setChildren(updatedChildren);
    
    // Save to localStorage for this teacher
    localStorage.setItem(`classroom_${teacherName}`, JSON.stringify(updatedChildren));
    
    setNewStudent({ name: '', birthDate: '', ageGroup: '3-4' });
    setShowAddStudent(false);
    setAdding(false);
  };

  const calculateAge = (birthDate: string) => {
    const dob = new Date(birthDate);
    const today = new Date();
    return (today.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  };

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getProgressPercentage = (child: Child) => {
    const totalWorks = 268;
    return Math.round(((child.progress?.mastered || 0) / totalWorks) * 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading classroom...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">👥 My Classroom</h1>
          <p className="text-gray-600">{children.length} students • {teacherName}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddStudent(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            ➕ Add Student
          </button>
          {children.length > 0 && (
            <Link
              href="/teacher/progress"
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              📊 Track Progress
            </Link>
          )}
        </div>
      </div>

      {/* Search */}
      {children.length > 0 && (
        <div className="mb-6">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      )}

      {/* Empty State */}
      {children.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No students yet</h2>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Add students to your classroom to track their Montessori progress and generate reports.
          </p>
          <button
            onClick={() => setShowAddStudent(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            ➕ Add Your First Student
          </button>
        </div>
      )}

      {/* Children Grid */}
      {filteredChildren.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredChildren.map((child) => (
            <div
              key={child.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="p-4 flex items-center gap-3">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
                  {child.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{child.name}</h3>
                  <p className="text-sm text-gray-500">
                    Age {child.age?.toFixed(1) || '?'} • {child.age_group || 'Unknown'}
                  </p>
                </div>
              </div>

              <div className="px-4 pb-2">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Progress</span>
                  <span>{getProgressPercentage(child)}% mastered</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div className="bg-green-500" style={{ width: `${((child.progress?.mastered || 0) / 268) * 100}%` }} />
                    <div className="bg-blue-500" style={{ width: `${((child.progress?.practicing || 0) / 268) * 100}%` }} />
                    <div className="bg-yellow-500" style={{ width: `${((child.progress?.presented || 0) / 268) * 100}%` }} />
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                <div className="flex justify-between text-xs">
                  <div className="text-center">
                    <div className="font-semibold text-yellow-600">{child.progress?.presented || 0}</div>
                    <div className="text-gray-500">Presented</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-blue-600">{child.progress?.practicing || 0}</div>
                    <div className="text-gray-500">Practicing</div>
                  </div>
                  <div className="text-center">
                    <div className="font-semibold text-green-600">{child.progress?.mastered || 0}</div>
                    <div className="text-gray-500">Mastered</div>
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                <Link
                  href={`/teacher/progress?child=${child.id}`}
                  className="flex-1 text-center text-sm bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2 rounded-lg transition-colors"
                >
                  📊 Progress
                </Link>
                <Link
                  href={`/admin/child-progress/${child.id}`}
                  className="flex-1 text-center text-sm bg-gray-50 text-gray-700 hover:bg-gray-100 py-2 rounded-lg transition-colors"
                >
                  📋 Report
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Add Student</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  placeholder="Enter name"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={newStudent.birthDate}
                  onChange={(e) => setNewStudent({ ...newStudent, birthDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Age Group</label>
                <select
                  value={newStudent.ageGroup}
                  onChange={(e) => setNewStudent({ ...newStudent, ageGroup: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="2-3">2-3 years</option>
                  <option value="3-4">3-4 years</option>
                  <option value="4-5">4-5 years</option>
                  <option value="5-6">5-6 years</option>
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddStudent(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addStudent}
                disabled={!newStudent.name || adding}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
