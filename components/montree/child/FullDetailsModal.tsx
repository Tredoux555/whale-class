'use client';

import React from 'react';
import { QuickGuideData } from '@/components/montree/curriculum/types';

interface FullDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workName: string;
  guideData: QuickGuideData | null;
  loading: boolean;
}

export default function FullDetailsModal({
  isOpen,
  onClose,
  workName,
  guideData,
  loading,
}: FullDetailsModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 text-white rounded-3xl max-w-lg w-full mx-4 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors z-10"
          aria-label="Close modal"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Scrollable Content Container */}
        <div className="max-h-[80vh] overflow-y-auto">
          {/* Header with Emerald Gradient */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-6 rounded-t-3xl">
            <h2 className="text-2xl font-bold text-white">{workName}</h2>
          </div>

          {/* Content Sections */}
          <div className="p-6 space-y-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
              </div>
            ) : guideData ? (
              <>
                {/* Quick Guide Section */}
                {guideData.quick_guide && (
                  <div className="bg-yellow-900/40 border border-yellow-600/50 rounded-2xl p-4">
                    <h3 className="text-lg font-semibold text-yellow-300 mb-3">Quick Guide</h3>
                    <p className="text-gray-100 text-sm leading-relaxed">{guideData.quick_guide}</p>
                  </div>
                )}

                {/* Step-by-Step Presentation Section */}
                <div>
                  <h3 className="text-lg font-semibold text-emerald-400 mb-4">Step-by-Step Presentation</h3>
                  {guideData.presentation_steps && guideData.presentation_steps.length > 0 ? (
                    <div className="space-y-4">
                      {guideData.presentation_steps.map((step) => (
                        <div
                          key={step.step}
                          className="bg-slate-800 border border-slate-700 rounded-2xl p-4"
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex-shrink-0">
                              <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-emerald-500 text-slate-900 font-bold">
                                {step.step}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-white mb-2">{step.title}</h4>
                              <p className="text-gray-300 text-sm mb-3">{step.description}</p>
                              <div className="bg-slate-700/50 rounded-lg p-3 border-l-2 border-amber-400">
                                <p className="text-xs text-amber-300 font-medium mb-1">Teacher Tip:</p>
                                <p className="text-gray-200 text-sm">{step.tip}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-center">
                      <p className="text-gray-400 text-sm italic">Detailed presentation steps coming soon.</p>
                    </div>
                  )}
                </div>

                {/* Direct Aims Section */}
                {guideData.direct_aims && guideData.direct_aims.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-400 mb-3">Direct Aims</h3>
                    <ul className="space-y-2">
                      {guideData.direct_aims.map((aim, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-emerald-400 mt-1">•</span>
                          <span className="text-gray-100 text-sm">{aim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Materials Section */}
                {guideData.materials && guideData.materials.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-emerald-400 mb-3">Materials</h3>
                    <ul className="space-y-2">
                      {guideData.materials.map((material, index) => (
                        <li key={index} className="flex items-start gap-3">
                          <span className="text-emerald-400 mt-1">•</span>
                          <span className="text-gray-100 text-sm">{material}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Control of Error Section */}
                {guideData.control_of_error && (
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-2">Control of Error</h3>
                    <p className="text-gray-100 text-sm leading-relaxed">{guideData.control_of_error}</p>
                  </div>
                )}

                {/* Why It Matters Section */}
                {guideData.why_it_matters && (
                  <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4">
                    <h3 className="text-lg font-semibold text-emerald-400 mb-2">Why It Matters</h3>
                    <p className="text-gray-100 text-sm leading-relaxed">{guideData.why_it_matters}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400">No details available</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
