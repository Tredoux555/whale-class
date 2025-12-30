'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';

interface Work {
  area: string;
  workNameChinese: string;
  workNameEnglish: string;
  matchedWorkId?: string;
}

interface Assignment {
  childName: string;
  works: Work[];
}

interface TranslatedPlan {
  weekNumber: number;
  startDate?: string;
  endDate?: string;
  assignments: Assignment[];
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  year: number;
  status: string;
  translated_content: TranslatedPlan;
  created_at: string;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'bg-amber-100 text-amber-800 border-amber-300',
  sensorial: 'bg-pink-100 text-pink-800 border-pink-300',
  mathematics: 'bg-blue-100 text-blue-800 border-blue-300',
  language: 'bg-green-100 text-green-800 border-green-300',
  culture: 'bg-purple-100 text-purple-800 border-purple-300',
};

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Math',
  language: 'Language',
  culture: 'Culture',
};

export default function WeeklyPlanningPage() {
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<TranslatedPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [weekNumber, setWeekNumber] = useState(getCurrentWeek());
  const [year, setYear] = useState(new Date().getFullYear());
  const [existingPlans, setExistingPlans] = useState<WeeklyPlan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WeeklyPlan | null>(null);
  const [filterArea, setFilterArea] = useState<string>('all');

  useEffect(() => {
    fetchExistingPlans();
  }, []);

  async function fetchExistingPlans() {
    try {
      const res = await fetch('/api/weekly-planning/list');
      if (res.ok) {
        const data = await res.json();
        setExistingPlans(data.plans || []);
      }
    } catch (err) {
      console.error('Failed to fetch plans:', err);
    }
  }

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    setUploading(true);
    setError(null);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('weekNumber', weekNumber.toString());
    formData.append('year', year.toString());

    try {
      const res = await fetch('/api/weekly-planning/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadResult(data.translatedContent);
      fetchExistingPlans();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  }, [weekNumber, year]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
  });

  const displayPlan = selectedPlan?.translated_content || uploadResult;

  const filteredAssignments = displayPlan?.assignments.map(a => ({
    ...a,
    works: filterArea === 'all' 
      ? a.works 
      : a.works.filter(w => w.area === filterArea)
  })).filter(a => a.works.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">📅 Weekly Planning</h1>
          <p className="text-gray-600 mt-2">
            Upload Chinese weekly plans → Auto-translate → Track progress
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Upload & Settings */}
          <div className="lg:col-span-1 space-y-6">
            {/* Week Selector */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Select Week</h2>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Week</label>
                  <input
                    type="number"
                    value={weekNumber}
                    onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                    min={1}
                    max={52}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm text-gray-600 mb-1">Year</label>
                  <input
                    type="number"
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Upload Zone */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Upload Weekly Plan</h2>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors
                  ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
                  ${uploading ? 'opacity-50 pointer-events-none' : ''}`}
              >
                <input {...getInputProps()} />
                {uploading ? (
                  <div className="flex flex-col items-center">
                    <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mb-3" />
                    <p className="text-gray-600">Translating & processing...</p>
                  </div>
                ) : isDragActive ? (
                  <p className="text-blue-600 text-lg">Drop the file here!</p>
                ) : (
                  <div>
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-gray-600">Drag & drop your .docx file</p>
                    <p className="text-gray-400 text-sm mt-1">or click to select</p>
                  </div>
                )}
              </div>
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>

            {/* Existing Plans */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold mb-4">Previous Plans</h2>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {existingPlans.length === 0 ? (
                  <p className="text-gray-400 text-sm">No plans uploaded yet</p>
                ) : (
                  existingPlans.map((plan) => (
                    <button
                      key={plan.id}
                      onClick={() => setSelectedPlan(plan)}
                      className={`w-full text-left px-4 py-3 rounded-lg transition-colors
                        ${selectedPlan?.id === plan.id 
                          ? 'bg-blue-100 border-blue-300' 
                          : 'bg-gray-50 hover:bg-gray-100'} border`}
                    >
                      <div className="font-medium">Week {plan.week_number}, {plan.year}</div>
                      <div className="text-sm text-gray-500">
                        {plan.translated_content?.assignments?.length || 0} students
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Plan View */}
          <div className="lg:col-span-2">
            {displayPlan ? (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold">
                    Week {displayPlan.weekNumber} Plan
                    {displayPlan.startDate && (
                      <span className="text-gray-500 text-sm ml-2">
                        ({displayPlan.startDate} - {displayPlan.endDate})
                      </span>
                    )}
                  </h2>
                  
                  {/* Area Filter */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setFilterArea('all')}
                      className={`px-3 py-1 rounded-full text-sm transition-colors
                        ${filterArea === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}
                    >
                      All
                    </button>
                    {Object.entries(AREA_LABELS).map(([key, label]) => (
                      <button
                        key={key}
                        onClick={() => setFilterArea(key)}
                        className={`px-3 py-1 rounded-full text-sm transition-colors
                          ${filterArea === key ? AREA_COLORS[key] : 'bg-gray-100 hover:bg-gray-200'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Student Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredAssignments?.map((assignment) => (
                    <StudentCard key={assignment.childName} assignment={assignment} />
                  ))}
                </div>

                {/* Summary Stats */}
                <div className="mt-6 pt-6 border-t">
                  <div className="flex gap-6 text-sm text-gray-600">
                    <div>
                      <span className="font-medium">{displayPlan.assignments.length}</span> students
                    </div>
                    <div>
                      <span className="font-medium">
                        {displayPlan.assignments.reduce((sum, a) => sum + a.works.length, 0)}
                      </span> total works assigned
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-xl font-medium text-gray-700 mb-2">No Plan Selected</h3>
                <p className="text-gray-500">
                  Upload a new weekly plan or select an existing one from the sidebar
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StudentCard({ assignment }: { assignment: Assignment }) {
  const [expanded, setExpanded] = useState(false);
  const worksByArea = groupBy(assignment.works, 'area');

  return (
    <div className="border rounded-xl p-4 bg-gray-50 hover:bg-white transition-colors">
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="font-semibold text-lg">{assignment.childName}</h3>
        <span className="text-gray-400">{assignment.works.length} works</span>
      </div>
      
      {/* Work Pills */}
      <div className="mt-3 flex flex-wrap gap-2">
        {assignment.works.slice(0, expanded ? undefined : 4).map((work, i) => (
          <span
            key={i}
            className={`px-2 py-1 rounded-full text-xs border ${AREA_COLORS[work.area]}`}
            title={`${work.workNameChinese} - ${work.matchedWorkId ? '✓ Matched' : '⚠ Not matched'}`}
          >
            {work.workNameEnglish}
            {work.matchedWorkId && <span className="ml-1">✓</span>}
          </span>
        ))}
        {!expanded && assignment.works.length > 4 && (
          <span className="px-2 py-1 text-xs text-gray-500">
            +{assignment.works.length - 4} more
          </span>
        )}
      </div>

      {/* Expanded View */}
      {expanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {Object.entries(worksByArea).map(([area, works]) => (
            <div key={area}>
              <div className="text-xs font-medium text-gray-500 uppercase mb-1">
                {AREA_LABELS[area] || area}
              </div>
              <ul className="space-y-1">
                {(works as Work[]).map((work, i) => (
                  <li key={i} className="text-sm flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${work.matchedWorkId ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    {work.workNameEnglish}
                    <span className="text-gray-400 text-xs">({work.workNameChinese})</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helpers
function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 1000 * 60 * 60 * 24 * 7;
  return Math.ceil(diff / oneWeek);
}

function groupBy<T>(arr: T[], key: keyof T): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const k = String(item[key]);
    (acc[k] = acc[k] || []).push(item);
    return acc;
  }, {} as Record<string, T[]>);
}
