'use client';

import React, { useState } from 'react';
import { useTeacherStudents } from '@/lib/hooks/useTeacherStudents';
import { useClassProgress } from '@/lib/hooks/useClassProgress';
import ClassOverview from './ClassOverview';
import StudentList from './StudentList';
import ClassAreaProgress from './ClassAreaProgress';
import RecentClassActivity from './RecentClassActivity';
import NeedsAttentionPanel from './NeedsAttentionPanel';
import StudentDetailModal from './StudentDetailModal';
import AssignWorkModal from './AssignWorkModal';

export default function TeacherDashboard() {
  const { students, total, loading: studentsLoading, refetch: refetchStudents } = useTeacherStudents();
  const { data: classProgress, loading: progressLoading, refetch: refetchProgress } = useClassProgress();
  
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignTargets, setAssignTargets] = useState<string[]>([]);

  const loading = studentsLoading || progressLoading;

  const handleViewStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
  };

  const handleAssignToStudent = (studentId: string) => {
    setAssignTargets([studentId]);
    setShowAssignModal(true);
  };

  const handleAssignToClass = () => {
    setAssignTargets(students.map(s => s.id));
    setShowAssignModal(true);
  };

  const handleAssignComplete = () => {
    setShowAssignModal(false);
    setAssignTargets([]);
    refetchStudents();
    refetchProgress();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto" />
          <p className="mt-4 text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50" style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}>
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Teacher Dashboard</h1>
              <p className="text-sm text-slate-500">
                {total} student{total !== 1 ? 's' : ''} in your class
              </p>
            </div>
            <button
              onClick={handleAssignToClass}
              disabled={students.length === 0}
              className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              Assign Work to Class
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {students.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👨‍🏫</div>
            <h2 className="text-xl font-semibold text-slate-700">No Students Yet</h2>
            <p className="text-slate-500 mt-2">
              Students will appear here once they're assigned to your class.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Row - Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <ClassOverview
                  totalStudents={classProgress?.totalStudents || 0}
                  areaProgress={classProgress?.areaProgress || []}
                />
              </div>
              <div>
                <NeedsAttentionPanel
                  students={classProgress?.needsAttention || []}
                  onViewStudent={handleViewStudent}
                />
              </div>
            </div>

            {/* Area Progress */}
            <ClassAreaProgress areaProgress={classProgress?.areaProgress || []} />

            {/* Middle Row - Students & Activity */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <StudentList
                students={students}
                onViewStudent={handleViewStudent}
                onAssignWork={handleAssignToStudent}
              />
              <RecentClassActivity
                activity={classProgress?.recentActivity || []}
                onViewStudent={handleViewStudent}
              />
            </div>
          </div>
        )}
      </main>

      {/* Student Detail Modal */}
      {selectedStudentId && (
        <StudentDetailModal
          studentId={selectedStudentId}
          onClose={() => setSelectedStudentId(null)}
          onAssignWork={() => handleAssignToStudent(selectedStudentId)}
        />
      )}

      {/* Assign Work Modal */}
      {showAssignModal && (
        <AssignWorkModal
          studentIds={assignTargets}
          studentCount={assignTargets.length}
          onClose={() => setShowAssignModal(false)}
          onComplete={handleAssignComplete}
        />
      )}
    </div>
  );
}


