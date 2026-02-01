// app/montree/dashboard/capture/page.tsx
// Main photo capture flow - Select child → Take photo → Upload
// Phase 2 - Session 53

'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import CameraCapture from '@/components/montree/media/CameraCapture';
import ChildSelector from '@/components/montree/media/ChildSelector';
import { uploadPhoto, getProgressMessage, getProgressColor } from '@/lib/montree/media/upload';
import type { MontreeChild, CapturedPhoto, UploadProgress } from '@/lib/montree/media/types';

// ============================================
// TYPES
// ============================================

type FlowStep = 'select-child' | 'camera' | 'uploading' | 'success' | 'error';

// ============================================
// LOADING FALLBACK
// ============================================

function CaptureLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
      <div className="flex flex-col items-center">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-emerald-500 border-t-transparent mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  );
}

// ============================================
// MAIN CONTENT COMPONENT
// ============================================

function CaptureContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Get pre-selected child from URL if any
  const preSelectedChildId = searchParams.get('child');
  const isGroupMode = searchParams.get('group') === 'true';
  const isClassMode = searchParams.get('class') === 'true'; // Class photo - shared with all parents

  // Get work context from URL (passed from Week view Capture button)
  const workName = searchParams.get('workName');
  const workArea = searchParams.get('area');

  // State
  const [step, setStep] = useState<FlowStep>(preSelectedChildId ? 'camera' : (isClassMode ? 'camera' : 'select-child'));
  const [children, setChildren] = useState<MontreeChild[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selectedChildIds, setSelectedChildIds] = useState<string[]>(
    preSelectedChildId ? [preSelectedChildId] : []
  );
  const [capturedPhoto, setCapturedPhoto] = useState<CapturedPhoto | null>(null);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [schoolId, setSchoolId] = useState<string>('');

  // ============================================
  // GET SCHOOL ID FROM SESSION
  // ============================================
  
  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (stored) {
      try {
        const session = JSON.parse(stored);
        if (session.school?.id) {
          setSchoolId(session.school.id);
        }
      } catch {}
    }
  }, []);

  // ============================================
  // FETCH CHILDREN
  // ============================================

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const response = await fetch('/api/montree/children');
        const data = await response.json();
        
        if (data.children) {
          setChildren(data.children);
        }
      } catch (err) {
        console.error('Failed to fetch children:', err);
      } finally {
        setLoadingChildren(false);
      }
    };

    fetchChildren();
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const handleChildSelect = (ids: string[]) => {
    setSelectedChildIds(ids);
  };

  const handleProceedToCamera = () => {
    if (selectedChildIds.length > 0) {
      setStep('camera');
    }
  };

  const handlePhotoCapture = async (photo: CapturedPhoto) => {
    setCapturedPhoto(photo);
    setStep('uploading');
    setError(null);

    // For class photos, tag all children
    const idsToTag = isClassMode ? children.map(c => c.id) : selectedChildIds;

    try {
      const result = await uploadPhoto(photo, {
        school_id: schoolId || 'default-school',
        child_id: idsToTag.length === 1 ? idsToTag[0] : undefined,
        child_ids: idsToTag.length > 1 ? idsToTag : undefined,
        is_class_photo: isClassMode, // Mark as class photo for sharing with all parents
        caption: workName || undefined, // Work name for display/matching
        tags: workArea ? [workArea] : undefined, // Area tag for categorization
        onProgress: setUploadProgress,
      });

      if (result.success) {
        setStep('success');
      } else {
        setError(result.error || 'Upload failed');
        setStep('error');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Upload failed');
      setStep('error');
    }
  };

  const handleCameraCancel = () => {
    if (preSelectedChildId || isClassMode) {
      router.back();
    } else {
      setStep('select-child');
    }
  };

  const handleTakeAnother = () => {
    setCapturedPhoto(null);
    setUploadProgress(null);
    setStep('camera');
  };

  const handleDone = () => {
    if (preSelectedChildId) {
      router.push(`/montree/dashboard/${preSelectedChildId}`);
    } else {
      router.push('/montree/dashboard');
    }
  };

  const handleRetry = () => {
    if (capturedPhoto) {
      handlePhotoCapture(capturedPhoto);
    }
  };

  // ============================================
  // RENDER
  // ============================================

  // Camera step
  if (step === 'camera') {
    return (
      <CameraCapture
        onCapture={handlePhotoCapture}
        onCancel={handleCameraCancel}
      />
    );
  }

  // Upload progress / success / error steps
  if (step === 'uploading' || step === 'success' || step === 'error') {
    const selectedChildren = children.filter(c => selectedChildIds.includes(c.id));
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-4 py-3 flex items-center gap-3">
          <span className="text-2xl">🌳</span>
          <h1 className="text-lg font-bold text-gray-800">
            {step === 'success' ? 'Photo Saved!' : step === 'error' ? 'Upload Failed' : 'Uploading...'}
          </h1>
        </header>

        {/* Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-6">
          {/* Preview */}
          {capturedPhoto && (
            <div className="w-full max-w-sm mb-6">
              <img
                src={capturedPhoto.dataUrl}
                alt="Captured"
                className="w-full rounded-2xl shadow-lg"
              />
            </div>
          )}

          {/* Tagged children */}
          {selectedChildren.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {selectedChildren.map(child => (
                <span
                  key={child.id}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm font-medium"
                >
                  <span className="w-5 h-5 bg-emerald-500 text-white rounded-full flex items-center justify-center text-xs">
                    {child.name.charAt(0)}
                  </span>
                  {child.name}
                </span>
              ))}
            </div>
          )}

          {/* Progress */}
          {step === 'uploading' && uploadProgress && (
            <div className="w-full max-w-sm">
              <div className="text-center mb-4">
                <p className="text-lg font-medium text-gray-700">
                  {getProgressMessage(uploadProgress)}
                </p>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${getProgressColor(uploadProgress.status)}`}
                  style={{ width: `${uploadProgress.progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success state */}
          {step === 'success' && (
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <p className="text-lg text-gray-600 mb-8">Photo uploaded successfully!</p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={handleTakeAnother}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                >
                  📷 Take Another Photo
                </button>
                <button
                  onClick={handleDone}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  ✓ Done
                </button>
              </div>
            </div>
          )}

          {/* Error state */}
          {step === 'error' && (
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <p className="text-lg text-gray-600 mb-2">Upload failed</p>
              <p className="text-sm text-red-500 mb-8">{error}</p>
              
              <div className="flex flex-col gap-3 w-full max-w-xs">
                <button
                  onClick={handleRetry}
                  className="w-full py-3 bg-emerald-500 text-white rounded-xl font-semibold hover:bg-emerald-600 transition-colors"
                >
                  🔄 Try Again
                </button>
                <button
                  onClick={handleTakeAnother}
                  className="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                >
                  📷 Retake Photo
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    );
  }

  // Child selection step
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex flex-col">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-emerald-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/montree/dashboard"
            className="w-10 h-10 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 rounded-xl transition-colors"
          >
            <span className="text-lg">←</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📷</span>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Take Photo</h1>
              <p className="text-xs text-gray-500">
                {isGroupMode ? 'Select children for group photo' : 'Select a child'}
              </p>
            </div>
          </div>
        </div>
        
        {/* Group mode toggle */}
        <Link
          href={isGroupMode ? '/montree/dashboard/capture' : '/montree/dashboard/capture?group=true'}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            isGroupMode 
              ? 'bg-emerald-100 text-emerald-700' 
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          👥 Group
        </Link>
      </header>

      {/* Child selector */}
      <main className="flex-1 overflow-hidden">
        <ChildSelector
          children={children}
          selectedIds={selectedChildIds}
          onSelectionChange={handleChildSelect}
          multiSelect={isGroupMode}
          loading={loadingChildren}
          maxHeight="calc(100vh - 180px)"
        />
      </main>

      {/* Bottom action bar */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-emerald-100 px-4 py-4 safe-area-bottom">
        <button
          onClick={handleProceedToCamera}
          disabled={selectedChildIds.length === 0}
          className={`
            w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all
            ${selectedChildIds.length > 0
              ? 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-98'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }
          `}
        >
          <span>📷</span>
          <span>
            {selectedChildIds.length === 0 
              ? 'Select a child first'
              : selectedChildIds.length === 1
                ? 'Take Photo'
                : `Take Photo (${selectedChildIds.length} children)`
            }
          </span>
        </button>
      </div>
    </div>
  );
}

// ============================================
// PAGE EXPORT WITH SUSPENSE
// ============================================

export default function CapturePage() {
  return (
    <Suspense fallback={<CaptureLoading />}>
      <CaptureContent />
    </Suspense>
  );
}
