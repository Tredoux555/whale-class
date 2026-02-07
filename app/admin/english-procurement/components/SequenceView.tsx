'use client';

import type { Category, Work, ExtensionDetail } from '../types';
import { grammarSymbols } from '../data';

interface SequenceViewProps {
  curriculumData: Category[];
  extensionDetails: Record<string, ExtensionDetail>;
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  selectedWork: string | null;
  setSelectedWork: (id: string | null) => void;
  copiedTerm: string | null;
  copyToClipboard: (text: string) => void;
  expandedExtension: string | null;
  setExpandedExtension: (ext: string | null) => void;
}

export default function SequenceView({
  curriculumData,
  extensionDetails,
  selectedCategory,
  setSelectedCategory,
  selectedWork,
  setSelectedWork,
  copiedTerm,
  copyToClipboard,
  expandedExtension,
  setExpandedExtension,
}: SequenceViewProps) {
  const selectedCategoryData = curriculumData.find(c => c.id === selectedCategory);
  const selectedWorkData = selectedCategoryData?.works.find(w => w.id === selectedWork);

  return (
    <>
      {/* SEQUENCE VIEW - Categories */}
      {!selectedCategory && (
        <div className="space-y-4">
          {/* AMI Note */}
          <div className="bg-amber-900/30 border border-amber-500/30 rounded-lg p-4 mb-6">
            <h3 className="font-bold text-amber-300 mb-1">⚠️ Important AMI Note</h3>
            <p className="text-amber-200/80 text-sm">
              The Pink/Blue/Green color-coded reading series is NOT official AMI - it was developed by Margaret Homfray and Phoebe Child for English.
              Authentic AMI uses the Muriel Dwyer approach with cursive script. This guide includes both for practicality, following the sequence used in most English-speaking Montessori schools.
            </p>
          </div>

          {/* Category Cards */}
          {curriculumData.map((category) => (
            <div
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 cursor-pointer hover:from-slate-600 hover:to-slate-700 transition-all duration-200 border border-slate-600 hover:border-indigo-500 hover:shadow-lg hover:shadow-indigo-500/10"
            >
              <div className="flex items-start gap-4">
                <div className="text-4xl">{category.icon}</div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2 py-0.5 rounded border border-indigo-500/30">
                      Step {category.sequence}
                    </span>
                    <h2 className="text-xl font-bold text-white">{category.name}</h2>
                  </div>
                  <p className="text-slate-300">{category.description}</p>
                  {category.amiNotes && (
                    <p className="text-amber-400 text-sm mt-2 italic">{category.amiNotes}</p>
                  )}
                  <div className="mt-3 text-sm text-slate-400">
                    {category.works.length} work{category.works.length > 1 ? 's' : ''} • Click to expand
                  </div>
                </div>
                <div className="text-indigo-400 text-2xl">›</div>
              </div>
            </div>
          ))}

          {/* Grammar Symbols Reference */}
          <div className="bg-slate-800 rounded-xl shadow-sm p-6 mt-8">
            <h2 className="text-xl font-bold mb-4">🔺 Grammar Symbols Quick Reference</h2>
            <div className="grid md:grid-cols-3 gap-3">
              {grammarSymbols.map((sym) => (
                <div key={sym.part} className="border border-slate-600 rounded-lg p-3">
                  <div className="font-bold text-lg">{sym.part}</div>
                  <div className="text-gray-300 text-sm">{sym.shape}</div>
                  <div className="text-gray-300 text-sm font-medium" style={{color: sym.color.toLowerCase().includes('black') ? '#333' : sym.color.toLowerCase().includes('blue') ? '#3b82f6' : sym.color.toLowerCase().includes('red') ? '#ef4444' : sym.color.toLowerCase().includes('orange') ? '#f97316' : sym.color.toLowerCase().includes('green') ? '#22c55e' : sym.color.toLowerCase().includes('purple') ? '#a855f7' : sym.color.toLowerCase().includes('pink') ? '#ec4899' : sym.color.toLowerCase().includes('gold') ? '#eab308' : '#666'}}>
                    {sym.color}
                  </div>
                  <div className="text-gray-400 text-xs mt-1">{sym.meaning}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SEQUENCE VIEW - Category Detail (Works List) */}
      {selectedCategory && !selectedWork && (
        <div>
          <button
            onClick={() => setSelectedCategory(null)}
            className="text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1"
          >
            ← Back to sequence
          </button>

          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-6 mb-6 border border-slate-600">
            <div className="flex items-center gap-3 mb-2">
              <span className="text-4xl">{selectedCategoryData?.icon}</span>
              <div>
                <span className="bg-indigo-500/20 text-indigo-300 text-xs font-bold px-2 py-1 rounded border border-indigo-500/30">
                  Step {selectedCategoryData?.sequence}
                </span>
                <h1 className="text-2xl font-bold text-white">{selectedCategoryData?.name}</h1>
              </div>
            </div>
            <p className="text-slate-300">{selectedCategoryData?.description}</p>
            {selectedCategoryData?.amiNotes && (
              <p className="text-amber-400 text-sm mt-2 bg-amber-900/30 p-3 rounded-lg border border-amber-500/30">{selectedCategoryData.amiNotes}</p>
            )}
          </div>

          <div className="space-y-3">
            {selectedCategoryData?.works.map((work, index) => (
              <div
                key={work.id}
                onClick={() => setSelectedWork(work.id)}
                className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-5 cursor-pointer hover:from-slate-600 hover:to-slate-700 transition-all duration-200 border border-slate-600 hover:border-indigo-500"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-indigo-500/20 text-indigo-300 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm border border-indigo-500/30">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-white">{work.name}</h3>
                    <p className="text-slate-400 text-sm">Age: {work.age}</p>
                    <p className="text-slate-300 mt-1">{work.directAim}</p>
                    <div className="mt-2 text-sm text-slate-400">
                      {work.materials.length} material{work.materials.length > 1 ? 's' : ''} • Click for full details
                    </div>
                  </div>
                  <div className="text-indigo-400 text-xl">›</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEQUENCE VIEW - Work Detail */}
      {selectedWork && selectedWorkData && (
        <div>
          <button
            onClick={() => setSelectedWork(null)}
            className="text-indigo-400 hover:text-indigo-300 mb-4 flex items-center gap-1"
          >
            ← Back to {selectedCategoryData?.name}
          </button>

          <div className="bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl overflow-hidden border border-slate-600">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4">
              <div className="text-indigo-200 text-sm">{selectedCategoryData?.icon} {selectedCategoryData?.name}</div>
              <h1 className="text-2xl font-bold">{selectedWorkData.name}</h1>
              <div className="text-indigo-200">Age: {selectedWorkData.age}</div>
            </div>

            <div className="p-6 space-y-6">
              {/* Aims */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-100 mb-2">Direct Aim</h3>
                  <p className="text-gray-300">{selectedWorkData.directAim}</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-100 mb-2">Indirect Aims</h3>
                  <ul className="text-gray-300 space-y-1">
                    {selectedWorkData.indirectAims.map((aim, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-indigo-400">•</span>
                        {aim}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Prerequisites */}
              <div className="bg-amber-900/30 border border-amber-500/40 rounded-lg p-4">
                <h3 className="font-bold text-amber-300 mb-1">Prerequisites</h3>
                <p className="text-amber-100">{selectedWorkData.prerequisites}</p>
              </div>

              {/* Video Tutorial */}
              {(selectedWorkData.videoUrl || selectedWorkData.videoSearchTerm) && (
                <div className="bg-rose-900/30 border border-rose-500/40 rounded-lg p-4">
                  <h3 className="font-bold text-rose-300 mb-2">📺 Video Tutorial</h3>
                  <a
                    href={selectedWorkData.videoSearchTerm
                      ? `https://www.youtube.com/results?search_query=${encodeURIComponent(selectedWorkData.videoSearchTerm)}`
                      : selectedWorkData.videoUrl
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-rose-300 hover:text-rose-100 underline flex items-center gap-2"
                  >
                    {selectedWorkData.videoSearchTerm
                      ? `Search YouTube: "${selectedWorkData.videoSearchTerm}" →`
                      : 'Watch presentation on YouTube →'
                    }
                  </a>
                </div>
              )}

              {/* Presentation */}
              <div>
                <h3 className="font-bold text-gray-100 mb-3">Presentation Steps</h3>
                <div className="bg-slate-700/50 rounded-lg p-4 space-y-2">
                  {selectedWorkData.presentation.map((step, i) => (
                    <div key={i} className={`${step.startsWith('GROUP') || step.startsWith('STAGE') || step.startsWith('PRESENTATION') || step.startsWith('PERIOD') || step.startsWith('LEVEL') || (step.includes(':') && step.split(':')[0].length < 20 && step.split(':')[0] === step.split(':')[0].toUpperCase()) ? 'font-bold text-cyan-400 mt-4 text-lg' : 'text-gray-200 pl-4'} ${step === '' ? 'h-2' : ''}`}>
                      {step}
                    </div>
                  ))}
                </div>
              </div>

              {/* Beginner's Guide - The Dummies Guide Section */}
              {selectedWorkData.beginnerGuide && (
                <div className="bg-gradient-to-br from-violet-900/40 to-indigo-900/40 border border-violet-500/30 rounded-xl p-6">
                  <h3 className="font-bold text-xl text-violet-300 mb-4 flex items-center gap-2">
                    📖 Complete Beginner's Guide
                    <span className="text-xs bg-violet-600 text-violet-100 px-2 py-1 rounded">For Non-Montessori Teachers</span>
                  </h3>

                  {/* What is this? */}
                  <div className="mb-5">
                    <h4 className="font-semibold text-violet-200 mb-2">What is this activity?</h4>
                    <p className="text-gray-200 leading-relaxed">{selectedWorkData.beginnerGuide.whatIsThis}</p>
                  </div>

                  {/* Why it matters */}
                  <div className="mb-5 bg-violet-800/30 rounded-lg p-4">
                    <h4 className="font-semibold text-violet-200 mb-2">Why does it matter?</h4>
                    <p className="text-gray-200 leading-relaxed">{selectedWorkData.beginnerGuide.whyItMatters}</p>
                  </div>

                  {/* Before you start */}
                  <div className="mb-5">
                    <h4 className="font-semibold text-violet-200 mb-2">Before you start, make sure:</h4>
                    <ul className="space-y-2">
                      {selectedWorkData.beginnerGuide.beforeYouStart.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-200">
                          <span className="text-emerald-400 mt-1">✓</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exact Script */}
                  <div className="mb-5 bg-slate-800/80 rounded-lg p-4 border border-slate-600">
                    <h4 className="font-semibold text-cyan-300 mb-3">📝 Exact Script (Say This Word-for-Word)</h4>
                    <div className="space-y-3 font-mono text-sm">
                      {selectedWorkData.beginnerGuide.exactScript.map((line, i) => (
                        <div key={i} className={`${line.startsWith('YOU:') ? 'text-cyan-300 pl-0' : line.startsWith('CHILD:') ? 'text-pink-300 pl-4' : line.startsWith('[') ? 'text-gray-500 italic pl-0' : 'text-gray-300 pl-4'}`}>
                          {line}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Common Mistakes */}
                  <div className="mb-5 bg-red-900/20 border border-red-500/30 rounded-lg p-4">
                    <h4 className="font-semibold text-red-300 mb-2">❌ Common Mistakes to Avoid</h4>
                    <ul className="space-y-2">
                      {selectedWorkData.beginnerGuide.commonMistakes.map((mistake, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-200">
                          <span className="text-red-400">•</span>
                          {mistake}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Success Indicators */}
                  <div className="mb-5 bg-emerald-900/20 border border-emerald-500/30 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-300 mb-2">✅ You know it's working when:</h4>
                    <ul className="space-y-2">
                      {selectedWorkData.beginnerGuide.successIndicators.map((indicator, i) => (
                        <li key={i} className="flex items-start gap-2 text-gray-200">
                          <span className="text-emerald-400">•</span>
                          {indicator}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Timing */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">Session Length</div>
                      <div className="text-lg font-semibold text-gray-100">{selectedWorkData.beginnerGuide.sessionLength}</div>
                    </div>
                    <div className="bg-slate-700/50 rounded-lg p-3">
                      <div className="text-xs text-gray-400 uppercase tracking-wide">How Often</div>
                      <div className="text-lg font-semibold text-gray-100">{selectedWorkData.beginnerGuide.frequency}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Materials */}
              <div>
                <h3 className="font-bold text-gray-100 mb-3">Materials & 1688 Search Terms</h3>
                <div className="space-y-4">
                  {selectedWorkData.materials.filter(m => m.price !== '—' && m.search1688 !== '同上').map((mat, i) => (
                    <div key={i} className={`border rounded-lg p-4 ${mat.essential ? 'border-emerald-500/50 bg-emerald-900/20' : 'border-slate-600 bg-slate-700'}`}>
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <div className="font-bold text-gray-100 flex items-center gap-2">
                            {mat.name}
                            {mat.essential && <span className="text-xs bg-emerald-600 text-emerald-100 px-2 py-0.5 rounded">Essential</span>}
                          </div>
                          <div className="text-gray-400 text-sm">{mat.nameZh}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-emerald-400">{mat.price}</div>
                        </div>
                      </div>
                      <div className="text-gray-300 text-sm mb-3">{mat.specs}</div>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(mat.search1688); }}
                        className="w-full text-left bg-slate-800 border border-slate-600 rounded-lg p-3 hover:bg-slate-600 transition"
                      >
                        <div className="text-cyan-400 font-medium">{mat.search1688}</div>
                        {mat.altSearch && (
                          <div className="text-gray-400 text-sm mt-1">Alternative: {mat.altSearch}</div>
                        )}
                        <div className="text-xs text-gray-500 mt-2">
                          {copiedTerm === mat.search1688 ? '✓ Copied to clipboard!' : 'Click to copy for 1688.com'}
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Control & Point of Interest */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold text-gray-100 mb-2">Control of Error</h3>
                  <p className="text-gray-300">{selectedWorkData.controlOfError}</p>
                </div>
                <div>
                  <h3 className="font-bold text-gray-100 mb-2">Point of Interest</h3>
                  <p className="text-gray-300">{selectedWorkData.pointOfInterest}</p>
                </div>
              </div>

              {/* Extensions */}
              <div>
                <h3 className="font-bold text-gray-100 mb-3">Extensions</h3>
                <p className="text-gray-400 text-sm mb-3">Click any extension to learn how to present it:</p>
                <div className="space-y-2">
                  {selectedWorkData.extensions.map((ext, i) => {
                    const detail = extensionDetails[ext];
                    const isExpanded = expandedExtension === ext;

                    return (
                      <div key={i} className="border border-slate-600 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setExpandedExtension(isExpanded ? null : ext)}
                          className={`w-full px-4 py-3 flex items-center justify-between transition text-left ${
                            isExpanded
                              ? 'bg-indigo-600 text-white'
                              : 'bg-slate-700 hover:bg-slate-600 text-gray-100'
                          }`}
                        >
                          <span className="font-medium">{ext}</span>
                          <span className={`text-lg transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                        </button>

                        {isExpanded && detail && (
                          <div className="bg-slate-800 p-4 space-y-4 border-t border-slate-600">
                            {/* What */}
                            <div>
                              <h5 className="text-xs uppercase tracking-wide text-indigo-400 mb-1">What is this extension?</h5>
                              <p className="text-gray-200">{detail.what}</p>
                            </div>

                            {/* How To */}
                            <div>
                              <h5 className="text-xs uppercase tracking-wide text-indigo-400 mb-1">How to present it</h5>
                              <p className="text-gray-200">{detail.howTo}</p>
                            </div>

                            {/* Materials */}
                            {detail.materials && (
                              <div>
                                <h5 className="text-xs uppercase tracking-wide text-indigo-400 mb-1">Materials needed</h5>
                                <p className="text-gray-300 bg-slate-700 px-3 py-2 rounded">{detail.materials}</p>
                              </div>
                            )}

                            {/* Readiness */}
                            <div className="bg-emerald-900/30 border border-emerald-500/30 rounded-lg p-3">
                              <h5 className="text-xs uppercase tracking-wide text-emerald-400 mb-1">✓ Child is ready when...</h5>
                              <p className="text-emerald-200">{detail.readiness}</p>
                            </div>
                          </div>
                        )}

                        {isExpanded && !detail && (
                          <div className="bg-slate-800 p-4 border-t border-slate-600">
                            <p className="text-gray-400 italic">Details for this extension coming soon. Use the main activity presentation as a guide.</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              {selectedWorkData.notes && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-700">{selectedWorkData.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
