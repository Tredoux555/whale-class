'use client';

import { useState } from 'react';
import { Student, TutorialStep } from '../types';

export function WeekTabDemo({
  student,
  step,
  onNext,
}: {
  student: Student;
  step: TutorialStep | null;
  onNext: () => void;
}) {
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  // FIX: Works in state so changes persist
  const [works, setWorks] = useState([
    { id: '1', name: 'Pouring Water', area: 'practical_life', status: 'practicing' },
    { id: '2', name: 'Pink Tower', area: 'sensorial', status: 'mastered' },
    { id: '3', name: 'Sandpaper Letters', area: 'language', status: 'presented' },
    { id: '4', name: 'Number Rods', area: 'mathematics', status: 'not_started' },
    { id: '5', name: 'Land & Water Forms', area: 'cultural', status: 'practicing' },
  ]);

  const AREA_CONFIG: Record<string, { letter: string; bg: string; color: string }> = {
    practical_life: { letter: 'P', bg: 'bg-pink-100', color: 'text-pink-700' },
    sensorial: { letter: 'S', bg: 'bg-purple-100', color: 'text-purple-700' },
    mathematics: { letter: 'M', bg: 'bg-blue-100', color: 'text-blue-700' },
    language: { letter: 'L', bg: 'bg-green-100', color: 'text-green-700' },
    cultural: { letter: 'C', bg: 'bg-orange-100', color: 'text-orange-700' },
  };

  const STATUS_ORDER = ['not_started', 'presented', 'practicing', 'mastered'];

  const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
    not_started: { label: '○', bg: 'bg-gray-200', color: 'text-gray-600' },
    presented: { label: 'P', bg: 'bg-amber-200', color: 'text-amber-800' },
    practicing: { label: 'Pr', bg: 'bg-blue-200', color: 'text-blue-800' },
    mastered: { label: 'M', bg: 'bg-green-200', color: 'text-green-800' },
  };

  // FIX: Actually cycle the status
  const handleStatusClick = (workId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    setWorks((prev) =>
      prev.map((work) => {
        if (work.id === workId) {
          const currentIndex = STATUS_ORDER.indexOf(work.status);
          const nextIndex = (currentIndex + 1) % STATUS_ORDER.length;
          return { ...work, status: STATUS_ORDER[nextIndex] };
        }
        return work;
      })
    );

    if (step?.id === 'tap-status') {
      onNext();
    }
  };

  const handleWorkClick = (workId: string) => {
    setExpandedWork((prev) => (prev === workId ? null : workId));
    if (step?.id === 'expand-work') {
      onNext();
    }
  };

  const completed = works.filter((w) => w.status === 'mastered').length;
  const percentComplete = Math.round((completed / works.length) * 100);

  return (
    <div className="space-y-2">
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-gray-900">Week 4, 2026</h3>
            <p className="text-sm text-gray-500">{works.length} works assigned</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{percentComplete}%</div>
            <p className="text-xs text-gray-500">
              {completed}/{works.length} complete
            </p>
          </div>
        </div>
      </div>

      {works.map((work, index) => {
        const area = AREA_CONFIG[work.area];
        const status = STATUS_CONFIG[work.status];
        const isExpanded = expandedWork === work.id;
        const isFirstWork = index === 0;

        return (
          <div
            key={work.id}
            className={`bg-white rounded-xl shadow-sm overflow-hidden transition-all ${
              isExpanded ? 'ring-2 ring-emerald-500' : ''
            }`}
          >
            <div
              data-work-row={isFirstWork ? true : undefined}
              onClick={() => handleWorkClick(work.id)}
              className={`flex items-center p-3 gap-3 cursor-pointer hover:bg-gray-50 active:bg-gray-100 ${
                step?.target === '[data-work-row]' && step?.highlight && isFirstWork
                  ? 'ring-2 ring-inset ring-emerald-400'
                  : ''
              }`}
            >
              <div
                data-area-icon={isFirstWork ? true : undefined}
                className={`w-10 h-10 rounded-xl ${area.bg} flex items-center justify-center ${area.color} font-bold flex-shrink-0 ${
                  step?.target === '[data-area-icon]' && step?.highlight && isFirstWork
                    ? 'ring-2 ring-emerald-400 animate-pulse'
                    : ''
                }`}
              >
                {area.letter}
              </div>

              <button
                data-status-badge={isFirstWork ? true : undefined}
                onClick={(e) => handleStatusClick(work.id, e)}
                className={`w-10 h-10 rounded-full ${status.bg} ${status.color} flex items-center justify-center font-bold text-sm flex-shrink-0 transition-all hover:scale-110 active:scale-95 ${
                  step?.target === '[data-status-badge]' && step?.highlight && isFirstWork
                    ? 'ring-2 ring-emerald-400 animate-pulse'
                    : ''
                }`}
              >
                {status.label}
              </button>

              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{work.name}</p>
              </div>

              <svg
                className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                  isExpanded ? 'rotate-180' : ''
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </div>

            {isExpanded && (
              <div className="border-t bg-gradient-to-r from-emerald-50 to-teal-50 p-4">
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    📝 Notes
                  </label>
                  <textarea
                    data-notes-input
                    placeholder="Add observation notes..."
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 bg-white ${
                      step?.target === '[data-notes-input]' && step?.highlight
                        ? 'ring-2 ring-emerald-400'
                        : ''
                    }`}
                    rows={2}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    data-demo-button
                    onClick={(e) => e.stopPropagation()}
                    className={`flex-1 py-3 bg-red-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-red-600 active:scale-95 ${
                      step?.target === '[data-demo-button]' && step?.highlight
                        ? 'ring-2 ring-emerald-400 animate-pulse'
                        : ''
                    }`}
                  >
                    <span>▶️</span>
                    <span>Demo</span>
                  </button>

                  <button
                    data-capture-button
                    onClick={(e) => e.stopPropagation()}
                    className={`flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 active:scale-95 ${
                      step?.target === '[data-capture-button]' && step?.highlight
                        ? 'ring-2 ring-white ring-offset-2 animate-pulse'
                        : ''
                    }`}
                  >
                    <span>📸</span>
                    <span>Capture</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
