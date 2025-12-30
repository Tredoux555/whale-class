'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  avatar_emoji?: string;
}

interface ParsedAssignment {
  childName: string;
  works: {
    area: string;
    workNameChinese: string;
    workNameEnglish: string;
    matchedWorkId?: string;
  }[];
  notes?: string;
  focusArea?: string;
}

interface UploadResult {
  success: boolean;
  plan?: any;
  translatedContent?: {
    weekNumber: number;
    assignments: ParsedAssignment[];
  };
  error?: string;
  debug?: any;
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  year: number;
  status: string;
  original_filename?: string;
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
  practical_life: 'Practical',
  sensorial: 'Sensorial',
  mathematics: 'Math',
  language: 'Language',
  culture: 'Culture',
};

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil(diff / oneWeek);
}

function getWeekDates(week: number, year: number): { start: string; end: string } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  };
}

export default function WeeklyPlanningPage() {
  const [weekNumber, setWeekNumber] = useState(getCurrentWeek());
  const [year, setYear] = useState(new Date().getFullYear());
  const [existingPlans, setExistingPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Upload state
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load existing plans
  useEffect(() => {
    async function loadPlans() {
      try {
        const res = await fetch('/api/weekly-planning/list');
        if (res.ok) {
          const data = await res.json();
          setExistingPlans(data.plans || []);
        }
      } catch (err) {
        console.error('Failed to load plans:', err);
      }
      setLoading(false);
    }
    loadPlans();
  }, []);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [weekNumber, year]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  };

  async function processFile(file: File) {
    if (!file.name.endsWith('.docx')) {
      setUploadError('Please upload a .docx file');
      return;
    }

    setUploading(true);
    setUploadError(null);
    setUploadResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('weekNumber', weekNumber.toString());
      formData.append('year', year.toString());

      const res = await fetch('/api/weekly-planning/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        setUploadResult(result);
        // Refresh plans list
        const plansRes = await fetch('/api/weekly-planning/list');
        if (plansRes.ok) {
          const data = await plansRes.json();
          setExistingPlans(data.plans || []);
        }
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload file');
    }
    
    setUploading(false);
  }

  const weekDates = getWeekDates(weekNumber, year);
  const currentPlan = existingPlans.find(p => p.week_number === weekNumber && p.year === year);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">📋 Weekly Planning</h1>
            <p className="text-gray-600 mt-1">Drop a weekly plan document to assign works to all children</p>
          </div>
          <Link
            href="/admin/classroom"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            🐋 Open Classroom View →
          </Link>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                min={1}
                max={53}
                className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 2025)}
                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <p className="text-lg font-semibold text-blue-600">{weekDates.start} - {weekDates.end}</p>
            </div>
            {currentPlan && (
              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                  ✓ Plan exists
                </span>
                <p className="text-xs text-gray-500 mt-1">{currentPlan.original_filename}</p>
              </div>
            )}
          </div>
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 mb-6 transition-all text-center
            ${isDragging 
              ? 'border-blue-500 bg-blue-50' 
              : 'border-gray-300 bg-white hover:border-gray-400'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent mb-4" />
              <p className="text-lg font-medium text-gray-700">Processing document...</p>
              <p className="text-sm text-gray-500">Translating and matching works to curriculum</p>
            </div>
          ) : (
            <>
              <div className="text-5xl mb-4">📄</div>
              <p className="text-lg font-medium text-gray-700 mb-2">
                Drop your weekly plan here
              </p>
              <p className="text-sm text-gray-500 mb-4">
                .docx file with Chinese weekly plan table
              </p>
              <label className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium">
                Choose File
                <input
                  type="file"
                  accept=".docx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>

        {/* Upload Error */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800 font-medium">❌ {uploadError}</p>
          </div>
        )}

        {/* Upload Success */}
        {uploadResult?.success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold text-green-800 mb-4">
              ✅ Week {uploadResult.translatedContent?.weekNumber || weekNumber} Plan Created!
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {uploadResult.translatedContent?.assignments?.slice(0, 6).map((assignment, i) => (
                <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="font-semibold text-gray-800 mb-2">{assignment.childName}</p>
                  <div className="space-y-1">
                    {assignment.works.map((work, j) => (
                      <div key={j} className="flex items-center gap-2 text-sm">
                        <span className={`px-2 py-0.5 rounded text-xs ${AREA_COLORS[work.area] || 'bg-gray-100'}`}>
                          {AREA_LABELS[work.area]?.charAt(0) || '?'}
                        </span>
                        <span className="truncate">{work.workNameEnglish}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {(uploadResult.translatedContent?.assignments?.length || 0) > 6 && (
              <p className="text-sm text-gray-600">
                +{(uploadResult.translatedContent?.assignments?.length || 0) - 6} more children...
              </p>
            )}

            <Link
              href="/admin/classroom"
              className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              🐋 View in Classroom →
            </Link>
          </div>
        )}

        {/* Existing Plans */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📚 Existing Plans</h2>
          
          {existingPlans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No plans uploaded yet</p>
          ) : (
            <div className="space-y-2">
              {existingPlans.map(plan => (
                <div 
                  key={plan.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    plan.week_number === weekNumber && plan.year === year
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      Week {plan.week_number}, {plan.year}
                    </p>
                    <p className="text-sm text-gray-500">
                      {plan.original_filename || 'Manual entry'} • {plan.status}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setWeekNumber(plan.week_number);
                        setYear(plan.year);
                      }}
                      className="px-3 py-1.5 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                    >
                      Select
                    </button>
                    <Link
                      href={`/admin/classroom?week=${plan.week_number}&year=${plan.year}`}
                      className="px-3 py-1.5 text-sm bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-lg transition-colors"
                    >
                      View
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
