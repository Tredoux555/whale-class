'use client';

import { Student, TutorialStep } from '../types';

export function ProgressTabDemo({
  student,
  step,
  onNext,
}: {
  student: Student;
  step: TutorialStep | null;
  onNext: () => void;
}) {
  const areas = [
    {
      name: 'Practical Life',
      icon: '🧹',
      color: 'from-pink-500 to-rose-500',
      stats: { total: 20, mastered: 8, practicing: 5, presented: 3 },
    },
    {
      name: 'Sensorial',
      icon: '👁️',
      color: 'from-purple-500 to-violet-500',
      stats: { total: 15, mastered: 6, practicing: 4, presented: 2 },
    },
    {
      name: 'Mathematics',
      icon: '🔢',
      color: 'from-blue-500 to-indigo-500',
      stats: { total: 25, mastered: 3, practicing: 7, presented: 5 },
    },
    {
      name: 'Language',
      icon: '📖',
      color: 'from-green-500 to-emerald-500',
      stats: { total: 30, mastered: 10, practicing: 8, presented: 4 },
    },
    {
      name: 'Cultural',
      icon: '🌍',
      color: 'from-orange-500 to-amber-500',
      stats: { total: 18, mastered: 4, practicing: 3, presented: 2 },
    },
  ];

  const overallStats = areas.reduce(
    (acc, area) => ({
      total: acc.total + area.stats.total,
      mastered: acc.mastered + area.stats.mastered,
      practicing: acc.practicing + area.stats.practicing,
      presented: acc.presented + area.stats.presented,
    }),
    { total: 0, mastered: 0, practicing: 0, presented: 0 }
  );

  const progressPercent = Math.round(
    ((overallStats.mastered + overallStats.practicing + overallStats.presented) /
      overallStats.total) *
      100
  );

  return (
    <div className="space-y-4">
      {/* Overall Progress */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900">Overall Progress</h3>
          <div className="text-right">
            <div className="text-2xl font-bold text-emerald-600">{progressPercent}%</div>
            <p className="text-xs text-gray-500">works started</p>
          </div>
        </div>

        <div className="h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
          <div className="h-full flex">
            <div
              className="bg-green-500"
              style={{ width: `${(overallStats.mastered / overallStats.total) * 100}%` }}
            />
            <div
              className="bg-blue-500"
              style={{ width: `${(overallStats.practicing / overallStats.total) * 100}%` }}
            />
            <div
              className="bg-yellow-400"
              style={{ width: `${(overallStats.presented / overallStats.total) * 100}%` }}
            />
          </div>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-500">{overallStats.total} total works</span>
          <div className="flex gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-yellow-400" />
              {overallStats.presented}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              {overallStats.practicing}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              {overallStats.mastered}
            </span>
          </div>
        </div>
      </div>

      {/* Areas */}
      {areas.map((area) => {
        const started = area.stats.mastered + area.stats.practicing + area.stats.presented;
        return (
          <div key={area.name} className="bg-white rounded-xl shadow-sm p-4">
            <div className="flex items-center gap-3">
              <div
                className={`w-12 h-12 bg-gradient-to-br ${area.color} rounded-xl flex items-center justify-center text-2xl shadow`}
              >
                {area.icon}
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{area.name}</h4>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-1">
                  <div className="h-full flex">
                    <div
                      className="bg-green-500"
                      style={{ width: `${(area.stats.mastered / area.stats.total) * 100}%` }}
                    />
                    <div
                      className="bg-blue-500"
                      style={{ width: `${(area.stats.practicing / area.stats.total) * 100}%` }}
                    />
                    <div
                      className="bg-yellow-400"
                      style={{ width: `${(area.stats.presented / area.stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-gray-600">
                {started}/{area.stats.total}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
