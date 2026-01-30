'use client';

// Curriculum Import Onboarding Page
// Three-phase wizard: Curriculum → Students → Works
// Session: Curriculum Import System

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Upload, Check, AlertCircle, ChevronRight, FileText, Users, BookOpen } from 'lucide-react';

interface OnboardingStatus {
  classroom: {
    id: string;
    name: string;
    onboardingPhase: 'curriculum' | 'students' | 'works' | 'complete';
    curriculumLocked: boolean;
    completedAt?: string;
  };
  counts: {
    curriculumItems: number;
    students: number;
    works: {
      total: number;
      matched: number;
      needsReview: number;
    };
  };
  canProceedToStudents: boolean;
  canProceedToWorks: boolean;
  canComplete: boolean;
}

interface WorkItem {
  id: string;
  filename: string;
  fileType: string;
  extractedStudentName?: string;
  student?: { id: string; name: string };
  curriculumItem?: { id: string; name: string; area: string };
  matchStatus: string;
  studentConfidence?: number;
  curriculumConfidence?: number;
  aiReasoning?: string;
}

// Main page component with Suspense wrapper
export default function CurriculumImportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    }>
      <CurriculumImportContent />
    </Suspense>
  );
}

// Inner component that uses useSearchParams
function CurriculumImportContent() {
  const searchParams = useSearchParams();
  const classroomId = searchParams.get('classroom_id');

  const [status, setStatus] = useState<OnboardingStatus | null>(null);
  const [works, setWorks] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Fetch onboarding status
  const fetchStatus = useCallback(async () => {
    if (!classroomId) return;

    try {
      const res = await fetch(`/api/curriculum-import/onboarding?classroom_id=${classroomId}`);
      const data = await res.json();
      if (data.success) {
        setStatus(data);
      }
    } catch (error) {
      console.error('Failed to fetch status:', error);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  // Fetch works
  const fetchWorks = useCallback(async () => {
    if (!classroomId) return;

    try {
      const res = await fetch(`/api/curriculum-import/works?classroom_id=${classroomId}`);
      const data = await res.json();
      if (data.success) {
        setWorks(data.works);
      }
    } catch (error) {
      console.error('Failed to fetch works:', error);
    }
  }, [classroomId]);

  useEffect(() => {
    fetchStatus();
    fetchWorks();
  }, [fetchStatus, fetchWorks]);

  // Handle phase actions
  const handlePhaseAction = async (action: string) => {
    try {
      const res = await fetch('/api/curriculum-import/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroomId, action })
      });
      const data = await res.json();

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error || data.warning });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Action failed' });
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    if (!classroomId || files.length === 0) return;

    setUploading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('classroom_id', classroomId);
    Array.from(files).forEach(file => formData.append('files', file));

    try {
      const res = await fetch('/api/curriculum-import/works', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();

      if (data.success) {
        setMessage({
          type: 'success',
          text: `Uploaded ${data.uploaded} files. Auto: ${data.autoMatched}, Review: ${data.suggested + data.unmatched}`
        });
        fetchWorks();
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Upload failed' });
    } finally {
      setUploading(false);
    }
  };

  // Handle work actions
  const handleWorkAction = async (workId: string, action: string, extra?: object) => {
    try {
      const res = await fetch('/api/curriculum-import/works', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, action, ...extra })
      });
      const data = await res.json();

      if (data.success) {
        fetchWorks();
        fetchStatus();
      } else {
        setMessage({ type: 'error', text: data.error });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Action failed' });
    }
  };

  if (!classroomId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">No classroom selected. Add ?classroom_id=UUID to the URL.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const phase = status?.classroom.onboardingPhase || 'curriculum';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold">Classroom Onboarding</h1>
          <p className="text-indigo-200">{status?.classroom.name}</p>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center">
            <PhaseStep
              icon={<BookOpen className="w-5 h-5" />}
              label="Curriculum"
              active={phase === 'curriculum'}
              completed={phase !== 'curriculum'}
              count={status?.counts.curriculumItems || 0}
            />
            <div className={`flex-1 h-1 mx-2 ${phase !== 'curriculum' ? 'bg-green-500' : 'bg-gray-200'}`} />
            <PhaseStep
              icon={<Users className="w-5 h-5" />}
              label="Students"
              active={phase === 'students'}
              completed={['works', 'complete'].includes(phase)}
              count={status?.counts.students || 0}
            />
            <div className={`flex-1 h-1 mx-2 ${['works', 'complete'].includes(phase) ? 'bg-green-500' : 'bg-gray-200'}`} />
            <PhaseStep
              icon={<FileText className="w-5 h-5" />}
              label="Works"
              active={phase === 'works'}
              completed={phase === 'complete'}
              count={status?.counts.works.total || 0}
            />
          </div>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className="max-w-6xl mx-auto px-4 pt-4">
          <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {phase === 'complete' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Onboarding Complete!</h2>
            <p className="text-gray-600">Your classroom is ready for use.</p>
          </div>
        )}

        {phase === 'curriculum' && (
          <CurriculumPhase
            classroomId={classroomId}
            count={status?.counts.curriculumItems || 0}
            onLock={() => handlePhaseAction('lock_curriculum')}
          />
        )}

        {phase === 'students' && (
          <StudentsPhase
            classroomId={classroomId}
            count={status?.counts.students || 0}
            onProceed={() => handlePhaseAction('proceed_to_works')}
          />
        )}

        {phase === 'works' && (
          <WorksPhase
            works={works}
            summary={status?.counts.works || { total: 0, matched: 0, needsReview: 0 }}
            uploading={uploading}
            onUpload={handleFileUpload}
            onWorkAction={handleWorkAction}
            onComplete={() => handlePhaseAction('complete_onboarding')}
            canComplete={status?.canComplete || false}
          />
        )}
      </main>
    </div>
  );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function PhaseStep({ icon, label, active, completed, count }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  completed: boolean;
  count: number;
}) {
  return (
    <div className={`flex items-center ${active ? 'text-indigo-600' : completed ? 'text-green-600' : 'text-gray-400'}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        active ? 'bg-indigo-100' : completed ? 'bg-green-100' : 'bg-gray-100'
      }`}>
        {completed ? <Check className="w-5 h-5" /> : icon}
      </div>
      <div className="ml-2">
        <p className="font-medium">{label}</p>
        <p className="text-xs">{count} items</p>
      </div>
    </div>
  );
}

function CurriculumPhase({ classroomId, count, onLock }: {
  classroomId: string;
  count: number;
  onLock: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Step 1: Import Curriculum</h2>
      <p className="text-gray-600 mb-6">
        Upload your curriculum structure. This must be completed before importing students.
      </p>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">Curriculum items: <span className="font-bold">{count}</span></p>
        <p className="text-sm text-gray-500">
          Go to <a href={`/admin/curriculum-editor?classroom_id=${classroomId}`} className="text-indigo-600 underline">Curriculum Editor</a> to add items
        </p>
      </div>

      <button
        onClick={onLock}
        disabled={count === 0}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
          count > 0
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Lock Curriculum & Continue
        <ChevronRight className="w-5 h-5 ml-2" />
      </button>
    </div>
  );
}

function StudentsPhase({ classroomId, count, onProceed }: {
  classroomId: string;
  count: number;
  onProceed: () => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-semibold mb-4">Step 2: Import Students</h2>
      <p className="text-gray-600 mb-6">
        Add your students. AI will match uploaded works to these students.
      </p>

      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center mb-6">
        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-600 mb-2">Students: <span className="font-bold">{count}</span></p>
        <p className="text-sm text-gray-500">
          Go to <a href={`/admin/children?classroom_id=${classroomId}`} className="text-indigo-600 underline">Children Management</a> to add students
        </p>
      </div>

      <button
        onClick={onProceed}
        disabled={count === 0}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
          count > 0
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        Continue to Works Import
        <ChevronRight className="w-5 h-5 ml-2" />
      </button>
    </div>
  );
}

function WorksPhase({ works, summary, uploading, onUpload, onWorkAction, onComplete, canComplete }: {
  works: WorkItem[];
  summary: { total: number; matched: number; needsReview: number };
  uploading: boolean;
  onUpload: (files: FileList) => void;
  onWorkAction: (workId: string, action: string, extra?: object) => void;
  onComplete: () => void;
  canComplete: boolean;
}) {
  const needsReview = works.filter(w => ['unmatched', 'suggested'].includes(w.matchStatus));

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Step 3: Import Student Works</h2>

        <label className="block border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-indigo-500 transition">
          <input
            type="file"
            multiple
            accept=".pdf,.docx,.doc,.txt,.pptx"
            className="hidden"
            onChange={(e) => e.target.files && onUpload(e.target.files)}
            disabled={uploading}
          />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${uploading ? 'text-indigo-400 animate-pulse' : 'text-gray-400'}`} />
          <p className="text-gray-600">
            {uploading ? 'Uploading & matching...' : 'Click to upload student works'}
          </p>
          <p className="text-sm text-gray-500 mt-1">PDF, Word, PowerPoint, Text</p>
        </label>

        {/* Summary */}
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          <div className="bg-gray-50 rounded p-3">
            <p className="text-2xl font-bold">{summary.total}</p>
            <p className="text-sm text-gray-500">Total</p>
          </div>
          <div className="bg-green-50 rounded p-3">
            <p className="text-2xl font-bold text-green-600">{summary.matched}</p>
            <p className="text-sm text-gray-500">Matched</p>
          </div>
          <div className="bg-yellow-50 rounded p-3">
            <p className="text-2xl font-bold text-yellow-600">{summary.needsReview}</p>
            <p className="text-sm text-gray-500">Needs Review</p>
          </div>
        </div>
      </div>

      {/* Review Section */}
      {needsReview.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold mb-4">Works Needing Review ({needsReview.length})</h3>

          <div className="space-y-4">
            {needsReview.map(work => (
              <div key={work.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{work.filename}</p>
                    {work.extractedStudentName && (
                      <p className="text-sm text-gray-500">Name found: "{work.extractedStudentName}"</p>
                    )}
                  </div>
                  <span className={`text-xs px-2 py-1 rounded ${
                    work.matchStatus === 'suggested' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {work.matchStatus}
                  </span>
                </div>

                {work.student && (
                  <p className="text-sm mt-2">
                    <span className="text-gray-500">Student:</span>{' '}
                    <span className="font-medium">{work.student.name}</span>
                    <span className="text-gray-400 text-xs ml-1">
                      ({Math.round((work.studentConfidence || 0) * 100)}%)
                    </span>
                  </p>
                )}

                {work.curriculumItem && (
                  <p className="text-sm">
                    <span className="text-gray-500">Assignment:</span>{' '}
                    <span className="font-medium">{work.curriculumItem.name}</span>
                    <span className="text-gray-400 text-xs ml-1">
                      ({Math.round((work.curriculumConfidence || 0) * 100)}%)
                    </span>
                  </p>
                )}

                {work.aiReasoning && (
                  <p className="text-xs text-gray-500 mt-1 italic">{work.aiReasoning}</p>
                )}

                <div className="mt-3 flex gap-2">
                  {work.student && work.curriculumItem && (
                    <button
                      onClick={() => onWorkAction(work.id, 'confirm')}
                      className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
                    >
                      Confirm
                    </button>
                  )}
                  <button
                    onClick={() => onWorkAction(work.id, 'reject')}
                    className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Complete Button */}
      <button
        onClick={onComplete}
        disabled={!canComplete}
        className={`w-full py-3 rounded-lg font-medium flex items-center justify-center ${
          canComplete
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
        }`}
      >
        <Check className="w-5 h-5 mr-2" />
        Complete Onboarding
      </button>
      {!canComplete && summary.needsReview > 0 && (
        <p className="text-center text-sm text-gray-500">
          Review all works before completing
        </p>
      )}
    </div>
  );
}
