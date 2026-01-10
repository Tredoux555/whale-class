'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Student {
  id: string;
  name: string;
  date_of_birth: string | null;
  age_group: string | null;
  photo_url: string | null;
  active_status: boolean;
}

interface Classroom {
  id: string;
  name: string;
  age_group: string | null;
  school_id: string;
}

interface AreaProgress {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  completedWorks: number;
  hasProgress: boolean;
}

interface StudentWithProgress extends Student {
  areaProgress: AreaProgress[];
}

interface ProgressSummaryResponse {
  childId: string;
  childName: string;
  lastUpdated: string;
  overallProgress: {
    totalWorks: number;
    completed: number;
    inProgress: number;
    percentage: number;
  };
  areas: AreaProgressData[];
}

interface AreaProgressData {
  areaId: string;
  areaName: string;
  icon: string;
  color: string;
  totalWorks: number;
  currentWorkIndex: number;
  currentWorkName: string;
  worksStatus: WorkStatusItem[];
}

interface WorkStatusItem {
  workId: string;
  name: string;
  status: 0 | 1 | 2 | 3;
  categoryName: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const CURRICULUM_AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Mathematics', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
];

const STATUS_COLORS = {
  0: { bg: '#e5e7eb', label: 'Not Started' },
  1: { bg: '#fef3c7', label: 'Presented' },
  2: { bg: '#dbeafe', label: 'Practicing' },
  3: { bg: '#d1fae5', label: 'Mastered' },
};

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );
}

function RoleTestingBanner() {
  const [currentRole, setCurrentRole] = useState<string>('principal');
  
  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <span className="text-sm text-amber-800">
          🧪 Role Testing Mode
        </span>
        <div className="flex items-center gap-2">
          <span className="text-xs text-amber-600">Viewing as:</span>
          <select
            value={currentRole}
            onChange={(e) => setCurrentRole(e.target.value)}
            className="text-sm border border-amber-300 rounded px-2 py-1 bg-white"
          >
            <option value="principal">Principal</option>
            <option value="teacher">Teacher</option>
            <option value="parent">Parent</option>
          </select>
        </div>
      </div>
    </div>
  );
}

interface ProgressDotsProps {
  areaProgress: AreaProgress[];
}

function ProgressDots({ areaProgress }: ProgressDotsProps) {
  return (
    <div className="flex items-center justify-center gap-1 mt-2">
      {CURRICULUM_AREAS.map((area) => {
        const progress = areaProgress.find(p => p.areaId === area.id);
        const hasProgress = progress?.hasProgress ?? false;
        
        return (
          <div
            key={area.id}
            className="w-3 h-3 rounded-full transition-all"
            style={{
              backgroundColor: hasProgress ? area.color : '#e5e7eb',
              border: `2px solid ${hasProgress ? area.color : '#d1d5db'}`,
            }}
            title={`${area.name}: ${hasProgress ? 'In Progress' : 'Not Started'}`}
          />
        );
      })}
    </div>
  );
}

interface StudentCardProps {
  student: StudentWithProgress;
  onClick: () => void;
}

function StudentCard({ student, onClick }: StudentCardProps) {
  const initials = student.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <button
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md hover:border-indigo-300 transition-all duration-200 flex flex-col items-center text-center w-full"
    >
      {student.photo_url ? (
        <div className="relative w-16 h-16 rounded-full overflow-hidden mb-2">
          <Image
            src={student.photo_url}
            alt={student.name}
            fill
            className="object-cover"
          />
        </div>
      ) : (
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center mb-2">
          <span className="text-white text-xl font-semibold">{initials}</span>
        </div>
      )}
      <h3 className="font-medium text-gray-900 text-sm truncate w-full">
        {student.name}
      </h3>
      {student.age_group && (
        <span className="text-xs text-gray-500">Ages {student.age_group}</span>
      )}
      <ProgressDots areaProgress={student.areaProgress} />
    </button>
  );
}

interface AddStudentCardProps {
  onClick: () => void;
}

function AddStudentCard({ onClick }: AddStudentCardProps) {
  return (
    <button
      onClick={onClick}
      className="bg-gray-50 rounded-xl border-2 border-dashed border-gray-300 p-4 hover:bg-gray-100 hover:border-indigo-400 transition-all duration-200 flex flex-col items-center justify-center min-h-[140px]"
    >
      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mb-2">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="font-medium text-gray-600 text-sm">Add Student</span>
    </button>
  );
}

// ============================================================================
// STUDENT PROGRESS PANEL (Slide-in)
// ============================================================================

interface StudentProgressPanelProps {
  student: StudentWithProgress | null;
  progressData: ProgressSummaryResponse | null;
  loading: boolean;
  onClose: () => void;
  classroomId: string;
}

function StudentProgressPanel({ 
  student, 
  progressData, 
  loading, 
  onClose,
  classroomId 
}: StudentProgressPanelProps) {
  if (!student) return null;

  const initials = student.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/30 z-40 transition-opacity"
        onClick={onClose}
      />
      
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-white shadow-xl z-50 overflow-y-auto animate-slide-in-right">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {student.photo_url ? (
              <div className="relative w-12 h-12 rounded-full overflow-hidden">
                <Image
                  src={student.photo_url}
                  alt={student.name}
                  fill
                  className="object-cover"
                />
              </div>
            ) : (
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center">
                <span className="text-white text-lg font-semibold">{initials}</span>
              </div>
            )}
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{student.name}</h2>
              {student.age_group && (
                <p className="text-sm text-gray-500">Ages {student.age_group}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {loading ? (
            <LoadingSpinner />
          ) : progressData ? (
            <div className="space-y-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Overall Progress</h3>
                <div className="flex items-center gap-4">
                  <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                      style={{ width: `${progressData.overallProgress.percentage}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">
                    {progressData.overallProgress.percentage}%
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  {progressData.overallProgress.completed} of {progressData.overallProgress.totalWorks} works completed
                </p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-700">Progress by Area</h3>
                {progressData.areas.map((area) => (
                  <AreaProgressBar key={area.areaId} area={area} />
                ))}
              </div>

              <Link
                href={`/teacher/progress?studentId=${student.id}&classroomId=${classroomId}`}
                className="block w-full text-center bg-indigo-600 text-white rounded-lg py-3 font-medium hover:bg-indigo-700 transition-colors"
              >
                View in Teacher Mode
              </Link>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <p>No progress data available</p>
              <p className="text-sm mt-2">This student hasn&apos;t started any works yet.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

interface AreaProgressBarProps {
  area: AreaProgressData;
}

function AreaProgressBar({ area }: AreaProgressBarProps) {
  const [expanded, setExpanded] = useState(false);
  const progressPercentage = area.totalWorks > 0 
    ? Math.round((area.currentWorkIndex / area.totalWorks) * 100) 
    : 0;

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">{area.icon}</span>
            <span className="font-medium text-gray-900">{area.areaName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {area.currentWorkIndex}/{area.totalWorks} works
            </span>
            <svg 
              className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        
        <div className="relative h-4 bg-gray-100 rounded-full overflow-hidden">
          <div 
            className="absolute left-0 top-0 h-full transition-all duration-500"
            style={{ 
              width: `${progressPercentage}%`,
              backgroundColor: area.color,
              opacity: 0.3
            }}
          />
          
          {area.currentWorkIndex > 0 && (
            <div 
              className="absolute top-0 h-full w-1 transition-all duration-500"
              style={{ 
                left: `${progressPercentage}%`,
                backgroundColor: area.color
              }}
            />
          )}
        </div>
        
        {area.currentWorkName && (
          <p className="text-xs text-gray-500 mt-2 flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: area.color }} />
            Current: {area.currentWorkName}
          </p>
        )}
      </button>

      {expanded && area.worksStatus.length > 0 && (
        <div className="border-t border-gray-100 p-4 bg-gray-50 max-h-64 overflow-y-auto">
          <div className="space-y-2">
            {area.worksStatus.map((work, index) => (
              <div 
                key={work.workId}
                className="flex items-center gap-3 text-sm"
              >
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: STATUS_COLORS[work.status].bg }}
                  title={STATUS_COLORS[work.status].label}
                />
                <span className="text-gray-600 truncate flex-1">
                  {index + 1}. {work.name}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {work.categoryName}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ADD STUDENT MODAL
// ============================================================================

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (name: string, ageGroup: string) => Promise<void>;
}

function AddStudentModal({ isOpen, onClose, onAdd }: AddStudentModalProps) {
  const [name, setName] = useState('');
  const [ageGroup, setAgeGroup] = useState('3-4');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    setSubmitting(true);
    try {
      await onAdd(name.trim(), ageGroup);
      setName('');
      setAgeGroup('3-4');
      onClose();
    } catch (error) {
      console.error('Failed to add student:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Add New Student</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Student Name
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="Enter student name"
                required
              />
            </div>
            <div>
              <label htmlFor="ageGroup" className="block text-sm font-medium text-gray-700 mb-1">
                Age Group
              </label>
              <select
                id="ageGroup"
                value={ageGroup}
                onChange={(e) => setAgeGroup(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              >
                <option value="2-3">2-3 years</option>
                <option value="3-4">3-4 years</option>
                <option value="4-5">4-5 years</option>
                <option value="5-6">5-6 years</option>
              </select>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !name.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? 'Adding...' : 'Add Student'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function PrincipalClassroomPage() {
  const params = useParams();
  const router = useRouter();
  const classroomId = params.id as string;

  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<StudentWithProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<StudentWithProgress | null>(null);
  const [selectedStudentProgress, setSelectedStudentProgress] = useState<ProgressSummaryResponse | null>(null);
  const [loadingProgress, setLoadingProgress] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const classroomRes = await fetch(`/api/whale/classrooms/${classroomId}`);
      if (!classroomRes.ok) throw new Error('Failed to fetch classroom');
      const classroomData = await classroomRes.json();
      setClassroom(classroomData);

      const studentsRes = await fetch(`/api/whale/classrooms/${classroomId}/students`);
      if (!studentsRes.ok) throw new Error('Failed to fetch students');
      const studentsData: Student[] = await studentsRes.json();

      const studentsWithProgress = await Promise.all(
        studentsData.map(async (student) => {
          try {
            const progressRes = await fetch(`/api/whale/student/${student.id}/progress-summary`);
            if (progressRes.ok) {
              const progressData: ProgressSummaryResponse = await progressRes.json();
              return {
                ...student,
                areaProgress: progressData.areas.map(area => ({
                  areaId: area.areaId,
                  areaName: area.areaName,
                  icon: area.icon,
                  color: area.color,
                  totalWorks: area.totalWorks,
                  completedWorks: area.currentWorkIndex,
                  hasProgress: area.currentWorkIndex > 0,
                })),
              };
            }
          } catch {
            // If progress fetch fails, return student with empty progress
          }
          return {
            ...student,
            areaProgress: CURRICULUM_AREAS.map(area => ({
              areaId: area.id,
              areaName: area.name,
              icon: area.icon,
              color: area.color,
              totalWorks: 0,
              completedWorks: 0,
              hasProgress: false,
            })),
          };
        })
      );

      setStudents(studentsWithProgress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    if (classroomId) {
      fetchData();
    }
  }, [classroomId, fetchData]);

  const handleStudentClick = async (student: StudentWithProgress) => {
    setSelectedStudent(student);
    setLoadingProgress(true);
    setSelectedStudentProgress(null);

    try {
      const res = await fetch(`/api/whale/student/${student.id}/progress-summary`);
      if (res.ok) {
        const data = await res.json();
        setSelectedStudentProgress(data);
      }
    } catch (err) {
      console.error('Failed to fetch student progress:', err);
    } finally {
      setLoadingProgress(false);
    }
  };

  const handleClosePanel = () => {
    setSelectedStudent(null);
    setSelectedStudentProgress(null);
  };

  const handleAddStudent = async (name: string, ageGroup: string) => {
    const res = await fetch(`/api/whale/classrooms/${classroomId}/students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, age_group: ageGroup }),
    });

    if (!res.ok) {
      throw new Error('Failed to add student');
    }

    await fetchData();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RoleTestingBanner />
        <div className="flex items-center justify-center h-[calc(100vh-48px)]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error || !classroom) {
    return (
      <div className="min-h-screen bg-gray-50">
        <RoleTestingBanner />
        <div className="flex flex-col items-center justify-center h-[calc(100vh-48px)] p-4">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-600 text-center mb-4">{error || 'Classroom not found'}</p>
          <button
            onClick={() => router.push('/principal')}
            className="text-indigo-600 hover:text-indigo-700 font-medium"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <RoleTestingBanner />

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/principal')}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  🐼 {classroom.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {classroom.age_group && `Ages ${classroom.age_group} • `}
                  {students.length} student{students.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onClick={() => handleStudentClick(student)}
            />
          ))}
          <AddStudentCard onClick={() => setShowAddModal(true)} />
        </div>

        {students.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No students yet</h3>
            <p className="text-gray-500 mb-4">Add your first student to get started</p>
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Area with progress</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-300" />
            <span>Not started</span>
          </div>
        </div>
      </main>

      <StudentProgressPanel
        student={selectedStudent}
        progressData={selectedStudentProgress}
        loading={loadingProgress}
        onClose={handleClosePanel}
        classroomId={classroomId}
      />

      <AddStudentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddStudent}
      />

      <style jsx global>{`
        @keyframes slide-in-right {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
