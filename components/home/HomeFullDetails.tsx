// components/home/HomeFullDetails.tsx
// Complete work teaching guide for parents
// Step-by-step presentation, materials list with photos, observations, extensions, mistakes

'use client';

import React from 'react';

export interface PresentationStep {
  step: number;
  title: string;
  description: string;
  tip?: string;
}

export interface FullGuideData {
  quick_guide?: string;
  presentation_steps?: PresentationStep[];
  direct_aims?: string[];
  indirect_aims?: string[];
  materials?: string[];
  control_of_error?: string;
  common_mistakes?: string[];
  extensions?: string[];
  why_it_matters?: string;
}

interface HomeFullDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  workName: string;
  guideData: FullGuideData | null;
  loading?: boolean;
}

export default function HomeFullDetails({
  isOpen,
  onClose,
  workName,
  guideData,
  loading = false,
}: HomeFullDetailsProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center hover:bg-white/20 rounded-full transition-colors"
          >
            ✕
          </button>
          <h2 className="text-2xl font-bold pr-8">{workName}</h2>
          <p className="text-emerald-100 text-sm mt-1">Complete Parent Guide</p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-emerald-200 border-t-emerald-500 mx-auto mb-4" />
                <p className="text-gray-500">Loading guide...</p>
              </div>
            </div>
          ) : guideData ? (
            <div className="p-6 space-y-6">
              {/* Quick Guide Summary */}
              {guideData.quick_guide && (
                <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                  <h3 className="text-sm font-bold text-amber-900 mb-2">⚡ Quick Overview</h3>
                  <p className="text-sm text-amber-900 leading-relaxed">
                    {guideData.quick_guide}
                  </p>
                </div>
              )}

              {/* Goals Section */}
              <div className="grid gap-4 md:grid-cols-2">
                {guideData.direct_aims && guideData.direct_aims.length > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-green-800 mb-3">🎯 What Your Child Learns</h3>
                    <ul className="space-y-2">
                      {guideData.direct_aims.map((aim, idx) => (
                        <li key={idx} className="text-sm text-green-900 flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{aim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {guideData.indirect_aims && guideData.indirect_aims.length > 0 && (
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-sm font-bold text-purple-800 mb-3">✨ Hidden Benefits</h3>
                    <ul className="space-y-2">
                      {guideData.indirect_aims.map((aim, idx) => (
                        <li key={idx} className="text-sm text-purple-900 flex items-start gap-2">
                          <span className="mt-0.5">•</span>
                          <span>{aim}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Materials */}
              {guideData.materials && guideData.materials.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-slate-800 mb-3">🧰 Materials You'll Need</h3>
                  <ul className="space-y-2">
                    {guideData.materials.map((material, idx) => (
                      <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                        <span>•</span>
                        <span>{material}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Step-by-Step Instructions */}
              {guideData.presentation_steps && guideData.presentation_steps.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold text-gray-800 mb-4">📋 How to Present</h3>
                  <div className="space-y-4">
                    {guideData.presentation_steps.map((step) => (
                      <div
                        key={step.step}
                        className="border-l-4 border-emerald-500 bg-emerald-50/50 rounded-r-lg p-4"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm">
                            {step.step}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-800 mb-1">
                              {step.title}
                            </h4>
                            <p className="text-sm text-gray-700 mb-2 leading-relaxed">
                              {step.description}
                            </p>
                            {step.tip && (
                              <div className="bg-amber-100/70 border-l-2 border-amber-400 pl-3 py-2 rounded-sm">
                                <p className="text-xs font-semibold text-amber-900 mb-1">
                                  💡 Parent Tip:
                                </p>
                                <p className="text-xs text-amber-900">{step.tip}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Why It Matters */}
              {guideData.why_it_matters && (
                <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-indigo-800 mb-2">💭 Why This Matters</h3>
                  <p className="text-sm text-indigo-900 leading-relaxed">
                    {guideData.why_it_matters}
                  </p>
                </div>
              )}

              {/* Control of Error */}
              {guideData.control_of_error && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-blue-800 mb-2">✓ How They Know If They're Right</h3>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {guideData.control_of_error}
                  </p>
                </div>
              )}

              {/* Common Mistakes */}
              {guideData.common_mistakes && guideData.common_mistakes.length > 0 && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-orange-800 mb-3">⚠️ Common Mistakes to Avoid</h3>
                  <ul className="space-y-2">
                    {guideData.common_mistakes.map((mistake, idx) => (
                      <li key={idx} className="text-sm text-orange-900 flex items-start gap-2">
                        <span>×</span>
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Extensions */}
              {guideData.extensions && guideData.extensions.length > 0 && (
                <div className="bg-pink-50 border border-pink-200 rounded-lg p-4">
                  <h3 className="text-sm font-bold text-pink-800 mb-3">🚀 How to Extend It</h3>
                  <ul className="space-y-2">
                    {guideData.extensions.map((extension, idx) => (
                      <li key={idx} className="text-sm text-pink-900 flex items-start gap-2">
                        <span>→</span>
                        <span>{extension}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <p className="text-gray-500">No guide available yet</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
          <a
            href="https://www.youtube.com/results?search_query=Montessori+presentation"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <span>▶️</span> Watch Demo
          </a>
        </div>
      </div>
    </div>
  );
}
