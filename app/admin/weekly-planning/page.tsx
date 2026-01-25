'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import AISuggestions from './AISuggestions';

interface ParsedAssignment {
  childName: string;
  works: {
    area: string;
    workNameChinese: string;
    workNameEnglish: string;
  }[];
}

interface UploadResult {
  success: boolean;
  plan?: any;
  translatedContent?: {
    weekNumber: number;
    assignments: ParsedAssignment[];
  };
  error?: string;
  debug?: {
    childrenCount: number;
    totalWorks: number;
    assignmentsCreated: number;
    curriculumSync: {
      matched: number;
      autoAdded: number;
      childrenSynced: number;
      backfilled: number;
    };
  };
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  year: number;
  status: string;
  original_filename?: string;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'bg-amber-100 text-amber-800',
  sensorial: 'bg-pink-100 text-pink-800',
  mathematics: 'bg-blue-100 text-blue-800',
  language: 'bg-green-100 text-green-800',
  culture: 'bg-purple-100 text-purple-800',
};

const AREA_LABELS: Record<string, string> = {
  practical_life: 'P',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  culture: 'C',
};

export default function WeeklyPlanningPage() {
  const [existingPlans, setExistingPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

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
  }, []);

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
      // Week number will be auto-detected from document

      const res = await fetch('/api/weekly-planning/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        setUploadResult(result);
        loadPlans(); // Refresh list
      } else {
        setUploadError(result.error || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setUploadError('Failed to upload file');
    }
    
    setUploading(false);
  }

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
            <p className="text-gray-600 mt-1">Drop your Chinese weekly plan - week number auto-detected from document</p>
          </div>
          <Link
            href="/admin/classroom"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
          >
            🐋 Open Classroom View →
          </Link>
        </div>

        {/* AI Suggestions Panel */}
        <div className="mb-6">
          <AISuggestions />
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-12 mb-6 transition-all text-center
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
              <p className="text-sm text-gray-500">Reading week number, translating works, matching to curriculum</p>
            </div>
          ) : (
            <>
              <div className="text-6xl mb-4">📄</div>
              <p className="text-xl font-medium text-gray-700 mb-2">
                Drop your weekly plan here
              </p>
              <p className="text-gray-500 mb-6">
                Week number is automatically read from the document (e.g., "Week 17")
              </p>
              <label className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg cursor-pointer hover:bg-blue-700 transition-colors font-medium text-lg">
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
            <h3 className="text-xl font-bold text-green-800 mb-4">
              ✅ Week {uploadResult.translatedContent?.weekNumber} Plan Created!
            </h3>
            
            <p className="text-green-700 mb-4">
              {uploadResult.translatedContent?.assignments?.length || 0} children • {' '}
              {uploadResult.translatedContent?.assignments?.reduce((sum, a) => sum + a.works.length, 0) || 0} total works assigned
            </p>

            {/* Curriculum Sync Indicator */}
            {uploadResult.debug?.curriculumSync && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                <span className="font-semibold text-blue-800">🔄 Curriculum Synced:</span>
                <span className="text-blue-700 ml-2">
                  {uploadResult.debug.curriculumSync.matched || 0} matched
                  {uploadResult.debug.curriculumSync.autoAdded > 0 && (
                    <> • {uploadResult.debug.curriculumSync.autoAdded} auto-added</>
                  )}
                  {uploadResult.debug.curriculumSync.backfilled > 0 && (
                    <> • {uploadResult.debug.curriculumSync.backfilled} progress backfilled</>
                  )}
                </span>
              </div>
            )}

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
              {uploadResult.translatedContent?.assignments?.slice(0, 8).map((assignment, i) => (
                <div key={i} className="bg-white rounded-lg p-3 shadow-sm">
                  <p className="font-semibold text-gray-800 mb-2">{assignment.childName}</p>
                  <div className="flex flex-wrap gap-1">
                    {assignment.works.map((work, j) => (
                      <span key={j} className={`px-2 py-0.5 rounded text-xs ${AREA_COLORS[work.area] || 'bg-gray-100'}`}>
                        {AREA_LABELS[work.area] || '?'}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {(uploadResult.translatedContent?.assignments?.length || 0) > 8 && (
              <p className="text-sm text-gray-600 mb-4">
                +{(uploadResult.translatedContent?.assignments?.length || 0) - 8} more children...
              </p>
            )}

            <div className="flex items-center gap-3">
              <Link
                href={`/admin/classroom/print?week=${uploadResult.translatedContent?.weekNumber}&year=${new Date().getFullYear()}`}
                target="_blank"
                className="inline-block px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                🖨️ Print
              </Link>
              <Link
                href={`/admin/classroom?week=${uploadResult.translatedContent?.weekNumber}&year=${new Date().getFullYear()}`}
                className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                🐋 View Week {uploadResult.translatedContent?.weekNumber} in Classroom →
              </Link>
            </div>
          </div>
        )}

        {/* Existing Plans */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4">📚 Uploaded Plans</h2>
          
          {existingPlans.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No plans uploaded yet - drop a document above!</p>
          ) : (
            <div className="space-y-2">
              {existingPlans.map(plan => (
                <div 
                  key={plan.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div>
                    <p className="font-semibold text-lg">
                      Week {plan.week_number}, {plan.year}
                    </p>
                    <p className="text-sm text-gray-500">
                      {plan.original_filename || 'Manual entry'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/admin/classroom/print?week=${plan.week_number}&year=${plan.year}`}
                      target="_blank"
                      className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm"
                    >
                      🖨️ Print
                    </Link>
                    <Link
                      href={`/admin/classroom?week=${plan.week_number}&year=${plan.year}`}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                    >
                      Open →
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
