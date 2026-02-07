'use client';

import { Student, TutorialStep } from '../types';
import { getGradient } from '../data';

export function ClassroomView({
  students,
  step,
  onStudentClick,
  onSkipTutorial,
  showOverlay,
}: {
  students: Student[];
  step: TutorialStep | null;
  onStudentClick: (student: Student) => void;
  onSkipTutorial: () => void;
  showOverlay: boolean;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🌳</span>
              <div>
                <h1 className="text-xl font-bold">My Classroom</h1>
                <p className="text-emerald-100 text-sm">{students.length} students</p>
              </div>
            </div>

            {showOverlay && (
              <button
                onClick={onSkipTutorial}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Skip Tutorial
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Student Tiles Grid */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {students.map((student, index) => (
            <button
              key={student.id}
              data-student={student.name}
              onClick={() => onStudentClick(student)}
              className={`bg-white rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] text-center ${
                step?.target === `[data-student="${student.name}"]` && step?.highlight
                  ? 'ring-4 ring-emerald-400 ring-offset-2 animate-pulse'
                  : ''
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-16 h-16 mx-auto rounded-full bg-gradient-to-br ${getGradient(
                  index
                )} flex items-center justify-center text-white text-2xl font-bold shadow-lg mb-3`}
              >
                {student.photo_url ? (
                  <img
                    src={student.photo_url}
                    alt={student.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  student.name.charAt(0)
                )}
              </div>

              {/* Name */}
              <p className="font-semibold text-gray-800">{student.name}</p>

              {/* Progress indicator */}
              {student.progress && (
                <div className="flex justify-center gap-1 mt-2">
                  <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                    {student.progress.presented}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-blue-100 text-blue-700">
                    {student.progress.practicing}
                  </span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">
                    {student.progress.mastered}
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </main>
    </div>
  );
}
