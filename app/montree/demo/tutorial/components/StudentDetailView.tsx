'use client';

import { Student, TutorialStep } from '../types';
import { WeekTabDemo } from './WeekTabDemo';
import { ProgressTabDemo } from './ProgressTabDemo';
import { ReportsTabDemo } from './ReportsTabDemo';

export function StudentDetailView({
  selectedStudent,
  step,
  activeTab,
  onTabClick,
  onBack,
  onSkipTutorial,
  showOverlay,
  onNext,
}: {
  selectedStudent: Student;
  step: TutorialStep | null;
  activeTab: 'week' | 'progress' | 'reports';
  onTabClick: (tab: 'week' | 'progress' | 'reports') => void;
  onBack: () => void;
  onSkipTutorial: () => void;
  showOverlay: boolean;
  onNext: () => void;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="w-12 h-12 bg-white/30 rounded-full flex items-center justify-center font-bold text-lg">
              {selectedStudent.name.charAt(0)}
            </div>

            <div className="flex-1">
              <h1 className="text-xl font-bold">{selectedStudent.name}</h1>
            </div>

            {showOverlay && (
              <button
                onClick={onSkipTutorial}
                className="text-sm text-white/70 hover:text-white transition-colors"
              >
                Skip
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm sticky top-[88px] z-30">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            {[
              { id: 'week', label: 'This Week', icon: '📋' },
              { id: 'progress', label: 'Progress', icon: '📊' },
              { id: 'reports', label: 'Reports', icon: '📄' },
            ].map((tab) => (
              <button
                key={tab.id}
                data-tab={tab.id}
                onClick={() => onTabClick(tab.id as any)}
                className={`flex-1 py-3 px-4 rounded-xl font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'text-gray-600 hover:bg-gray-100'
                } ${
                  step?.target === `[data-tab="${tab.id}"]` && step?.highlight
                    ? 'ring-2 ring-emerald-400 animate-pulse'
                    : ''
                }`}
              >
                <span>{tab.icon}</span>
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <main className="max-w-4xl mx-auto px-4 py-4">
        {activeTab === 'week' && (
          <WeekTabDemo student={selectedStudent} step={step} onNext={onNext} />
        )}
        {activeTab === 'progress' && (
          <ProgressTabDemo student={selectedStudent} step={step} onNext={onNext} />
        )}
        {activeTab === 'reports' && (
          <ReportsTabDemo student={selectedStudent} step={step} onNext={onNext} />
        )}
      </main>
    </div>
  );
}
