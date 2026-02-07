'use client';

import { Student, TutorialStep } from '../types';

export function ReportsTabDemo({
  student,
  step,
  onNext,
}: {
  student: Student;
  step: TutorialStep | null;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      {/* Generate Report Card */}
      <div
        data-generate-report
        className={`bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-5 shadow-lg text-white ${
          step?.target === '[data-generate-report]' && step?.highlight
            ? 'ring-4 ring-white ring-offset-2 animate-pulse'
            : ''
        }`}
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center text-3xl">
            📄
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg">Parent Report</h3>
            <p className="text-white/80 text-sm">Jan 20 - Jan 26</p>
          </div>
        </div>

        <button className="mt-4 w-full py-4 bg-white text-emerald-600 font-bold rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-center gap-2 text-lg">
          <span>✨</span>
          <span>Generate Report</span>
        </button>
      </div>

      {/* Previous Reports */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold text-gray-900">Previous Reports</h3>
        </div>

        <div className="divide-y">
          {[
            { week: 'Jan 13 - 19', status: 'sent' },
            { week: 'Jan 6 - 12', status: 'sent' },
            { week: 'Dec 30 - Jan 5', status: 'sent' },
          ].map((report, i) => (
            <div
              key={i}
              data-report-card={i === 0 ? true : undefined}
              className={`p-4 flex items-center gap-3 hover:bg-gray-50 cursor-pointer ${
                step?.target === '[data-report-card]' && step?.highlight && i === 0
                  ? 'ring-2 ring-inset ring-emerald-400'
                  : ''
              }`}
            >
              <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                📄
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">Week of {report.week}</p>
                <p className="text-sm text-gray-500">Parent Report</p>
              </div>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                {report.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
