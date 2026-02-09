// components/home/HomeQuickGuide.tsx
// Parent-focused "10-second guide" modal
// Ultra-simple: what you need, what to do, what to watch for
// Amber/yellow sticky-note styling

'use client';

import React from 'react';

export interface QuickGuideData {
  quick_guide?: string;
  materials?: string[];
  video_search_term?: string;
}

interface HomeQuickGuideProps {
  isOpen: boolean;
  onClose: () => void;
  workName: string;
  guideData: QuickGuideData | null;
  loading?: boolean;
  onOpenFullDetails?: () => void;
}

export default function HomeQuickGuide({
  isOpen,
  onClose,
  workName,
  guideData,
  loading = false,
  onOpenFullDetails,
}: HomeQuickGuideProps) {
  if (!isOpen) return null;

  const openYouTubeDemo = () => {
    const query = encodeURIComponent(guideData?.video_search_term || workName + ' Montessori');
    window.open(`https://www.youtube.com/results?search_query=${query}`, '_blank');
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-amber-50 w-full max-w-md rounded-2xl sm:rounded-3xl overflow-hidden shadow-2xl border-2 border-amber-200 animate-in slide-in-from-bottom-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky note fold effect */}
        <div
          className="absolute top-0 right-0 w-8 h-8 bg-amber-200"
          style={{
            clipPath: 'polygon(100% 0, 0 100%, 100% 100%)',
            boxShadow: 'inset -2px 2px 4px rgba(0,0,0,0.1)',
          }}
        />

        {/* Header */}
        <div className="relative p-5 border-b-2 border-amber-300 bg-gradient-to-r from-amber-100 to-yellow-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <h2 className="text-lg font-bold text-amber-900">10-Second Guide</h2>
            </div>
            <button
              onClick={onClose}
              className="text-amber-700 hover:text-amber-900 text-2xl font-light"
            >
              ×
            </button>
          </div>
          <p className="text-sm text-amber-800 mt-2 font-semibold">{workName}</p>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="text-center py-6">
              <div className="animate-bounce text-3xl mb-2">📖</div>
              <p className="text-amber-800 text-sm">Loading guide...</p>
            </div>
          ) : guideData?.quick_guide ? (
            <>
              {/* Quick Guide Text */}
              <div>
                <h3 className="text-sm font-bold text-amber-900 mb-2">What to Do:</h3>
                <p className="text-sm text-amber-900 leading-relaxed whitespace-pre-line">
                  {guideData.quick_guide}
                </p>
              </div>

              {/* Materials List */}
              {guideData.materials && guideData.materials.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-amber-900 mb-2">You'll Need:</h3>
                  <ul className="space-y-1">
                    {guideData.materials.map((material, idx) => (
                      <li key={idx} className="text-sm text-amber-900 flex items-start gap-2">
                        <span>•</span>
                        <span>{material}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* What to Watch For */}
              <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-3">
                <h3 className="text-sm font-bold text-yellow-900 mb-1">👀 Watch For:</h3>
                <p className="text-sm text-yellow-900">
                  Signs of interest, focus, repetition, and independent problem-solving
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-6">
              <p className="text-amber-700 text-sm">No quick guide available yet</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t-2 border-amber-200 bg-amber-100/50 flex gap-2">
          <button
            onClick={openYouTubeDemo}
            className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors active:scale-95"
          >
            ▶️ Watch
          </button>
          <button
            onClick={() => {
              onOpenFullDetails?.();
              onClose();
            }}
            className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-semibold text-sm transition-colors active:scale-95"
          >
            📚 Details
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-white border-2 border-amber-300 text-amber-700 hover:bg-amber-50 rounded-lg font-semibold text-sm transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
