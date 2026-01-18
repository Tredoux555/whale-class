// /montree/admin/students/page.tsx
// WORKING WEEKLY PLANNING - Ported from admin/weekly-planning
// Uses same API that writes to children + weekly_assignments tables
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

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
}

interface WeeklyPlan {
  id: string;
  week_number: number;
  year: number;
  status: string;
  original_filename?: string;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'bg-pink-500/20 text-pink-300',
  sensorial: 'bg-purple-500/20 text-purple-300',
  mathematics: 'bg-blue-500/20 text-blue-300',
  math: 'bg-blue-500/20 text-blue-300',
  language: 'bg-green-500/20 text-green-300',
  culture: 'bg-orange-500/20 text-orange-300',
};

const AREA_LABELS: Record<string, string> = {
  practical_life: 'P',
  sensorial: 'S',
  mathematics: 'M',
  math: 'M',
  language: 'L',
  culture: 'C',
};

export default function StudentsPage() {
  const [existingPlans, setExistingPlans] = useState<WeeklyPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [childCount, setChildCount] = useState(0);

  useEffect(() => {
    loadPlans();
    loadChildCount();
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

  async function loadChildCount() {
    try {
      const res = await fetch('/api/montree/children');
      if (res.ok) {
        const data = await res.json();
        setChildCount(data.children?.length || 0);
      }
    } catch (err) {
      console.error('Failed to load children:', err);
    }
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

      // Uses the WORKING API that writes to children + weekly_assignments
      const res = await fetch('/api/weekly-planning/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await res.json();

      if (result.success) {
        setUploadResult(result);
        loadPlans();
        loadChildCount();
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
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-gray-400">{childCount} students enrolled</p>
        </div>
        <Link
          href="/montree/dashboard"
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2"
        >
          🌳 Open Classroom →
        </Link>
      </div>

      {/* Upload Zone */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
          🚀 Import Students
        </h2>
        <p className="text-gray-400 text-sm mb-4">
          Upload your weekly planning document. Creates students and assigns works automatically.
        </p>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative border-2 border-dashed rounded-xl p-8 transition-all text-center
            ${isDragging 
              ? 'border-emerald-500 bg-emerald-500/10' 
              : 'border-gray-700 hover:border-gray-600'
            }
            ${uploading ? 'opacity-50 pointer-events-none' : ''}
          `}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mb-4" />
              <p className="text-white font-medium">Processing document...</p>
              <p className="text-sm text-gray-400">Parsing, translating, matching works</p>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-3">📄</div>
              <p className="text-white font-medium mb-1">
                Drop your document
              </p>
              <p className="text-gray-500 text-sm mb-4">
                Word, Image, Excel, PDF
              </p>
              <label className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg cursor-pointer hover:bg-emerald-700 transition-colors font-medium">
                Choose File
                <input
                  type="file"
                  accept=".docx,.doc,.pdf,.xlsx,.xls,.png,.jpg,.jpeg"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            </>
          )}
        </div>

        {/* Paste option */}
        <div className="mt-4 text-center text-gray-500 text-sm">or paste</div>
        <textarea 
          placeholder="Paste classroom roster..."
          className="mt-2 w-full bg-gray-800 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 resize-none h-24 focus:outline-none focus:border-emerald-500"
        />
      </div>

      {/* Upload Error */}
      {uploadError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
          <p className="text-red-400 font-medium">❌ {uploadError}</p>
        </div>
      )}

      {/* Upload Success */}
      {uploadResult?.success && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 mb-6">
          <h3 className="text-xl font-bold text-emerald-400 mb-4">
            ✅ Week {uploadResult.translatedContent?.weekNumber} Plan Created!
          </h3>
          
          <p className="text-emerald-300 mb-4">
            {uploadResult.translatedContent?.assignments?.length || 0} children • {' '}
            {uploadResult.translatedContent?.assignments?.reduce((sum, a) => sum + a.works.length, 0) || 0} total works assigned
          </p>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            {uploadResult.translatedContent?.assignments?.slice(0, 6).map((assignment, i) => (
              <div key={i} className="bg-gray-800 rounded-lg p-3">
                <p className="font-semibold text-white mb-2">{assignment.childName}</p>
                <div className="flex flex-wrap gap-1">
                  {assignment.works.map((work, j) => (
                    <span key={j} className={`px-2 py-0.5 rounded text-xs ${AREA_COLORS[work.area] || 'bg-gray-700 text-gray-300'}`}>
                      {AREA_LABELS[work.area] || '?'}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {(uploadResult.translatedContent?.assignments?.length || 0) > 6 && (
            <p className="text-sm text-gray-400 mb-4">
              +{(uploadResult.translatedContent?.assignments?.length || 0) - 6} more children...
            </p>
          )}

          <Link
            href="/montree/dashboard"
            className="inline-block px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
          >
            🌳 View in Classroom →
          </Link>
        </div>
      )}

      {/* Existing Plans */}
      {existingPlans.length > 0 && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-lg font-bold text-white mb-4">📚 Uploaded Plans</h2>
          
          <div className="space-y-2">
            {existingPlans.map(plan => (
              <div 
                key={plan.id}
                className="flex items-center justify-between p-4 rounded-lg bg-gray-800 hover:bg-gray-750 transition-colors"
              >
                <div>
                  <p className="font-semibold text-white">
                    Week {plan.week_number}, {plan.year}
                  </p>
                  <p className="text-sm text-gray-400">
                    {plan.original_filename || 'Manual entry'}
                  </p>
                </div>
                <Link
                  href="/montree/dashboard"
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium"
                >
                  Open →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
