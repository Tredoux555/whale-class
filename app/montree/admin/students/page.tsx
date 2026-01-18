// /montree/admin/students/page.tsx
// BULLETPROOF IMPORT UI
// Exception-first design with confidence-based color coding

'use client';

import { useState, useCallback, useEffect } from 'react';
import * as mammoth from 'mammoth';

interface WorkPreview {
  area: string;
  area_label: string;
  work_id: string | null;
  work_name: string | null;
  work_chinese?: string;
  original_text: string | null;
  status: 'auto' | 'suggest' | 'manual' | 'missing';
  confidence: number;
  match_source?: string;
  suggestions: { work_id: string; work_name: string; confidence: number }[];
}

interface ChildPreview {
  name: string;
  name_chinese: string | null;
  age: number | null;
  works: WorkPreview[];
  warnings: string[];
  auto_matched: number;
  needs_review: number;
  manual_required: number;
  missing: number;
  total_areas: number;
  has_warnings: boolean;
  is_complete: boolean;
  confidence_avg: number;
}

interface PreviewSummary {
  total_children: number;
  total_works: number;
  auto_matched: number;
  needs_review: number;
  manual_required: number;
  missing: number;
  auto_rate: number;
  total_warnings: number;
  all_matched: boolean;
  ready_to_import: boolean;
  processing_time_ms: number;
}

interface PreviewData {
  children: ChildPreview[];
  summary: PreviewSummary;
  thresholds: { AUTO_ACCEPT: number; HIGH_CONFIDENCE: number; SUGGEST: number };
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'bg-amber-500',
  sensorial: 'bg-pink-500',
  mathematics: 'bg-blue-500',
  language: 'bg-green-500',
  cultural: 'bg-purple-500',
};

const AREA_LETTERS: Record<string, string> = {
  practical_life: 'P',
  sensorial: 'S',
  mathematics: 'M',
  language: 'L',
  cultural: 'C',
};

// Confidence badge colors
function getConfidenceColor(confidence: number, status: string): string {
  if (status === 'auto' || confidence >= 95) return 'bg-emerald-500';
  if (status === 'suggest' || confidence >= 70) return 'bg-amber-500';
  return 'bg-red-500';
}

function getRowBgColor(status: string, confidence: number): string {
  if (status === 'auto' || confidence >= 95) return 'bg-emerald-900/20 border-emerald-500/30';
  if (status === 'suggest' || confidence >= 70) return 'bg-amber-900/20 border-amber-500/30';
  if (status === 'missing') return 'bg-gray-800/30 border-gray-700';
  return 'bg-red-900/20 border-red-500/30';
}

export default function StudentsPage() {
  const [step, setStep] = useState<'upload' | 'preview' | 'success'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [rawInput, setRawInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [editedChildren, setEditedChildren] = useState<ChildPreview[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [existingChildren, setExistingChildren] = useState<any[]>([]);
  const [classroomId, setClassroomId] = useState<string | null>(null);
  const [showOnlyWarnings, setShowOnlyWarnings] = useState(true);
  const [importLogId, setImportLogId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/montree/children')
      .then(r => r.json())
      .then(data => setExistingChildren(data.children || []))
      .catch(() => {});
    
    fetch('/api/montree/classrooms')
      .then(r => r.json())
      .then(data => {
        if (data.classrooms?.length > 0) {
          setClassroomId(data.classrooms[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handlePreview = async () => {
    if (!classroomId) {
      setError('No classroom found. Create a classroom first.');
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      let content = rawInput;
      let contentType = 'text';
      
      if (file) {
        const fileName = file.name.toLowerCase();
        
        if (file.type.includes('image') || fileName.match(/\.(png|jpg|jpeg|gif|webp)$/)) {
          const base64 = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          });
          content = base64;
          contentType = 'image';
        } else if (fileName.endsWith('.docx')) {
          const arrayBuffer = await file.arrayBuffer();
          const result = await mammoth.extractRawText({ arrayBuffer });
          content = result.value;
          contentType = 'text';
        } else {
          content = await file.text();
          contentType = 'text';
        }
      }

      if (!content?.trim()) {
        setError('Could not extract content from file.');
        setIsProcessing(false);
        return;
      }

      const response = await fetch('/api/montree/classroom/bootstrap/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, content_type: contentType }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setPreview(data.preview);
      setEditedChildren(JSON.parse(JSON.stringify(data.preview.children)));
      setImportLogId(data.import_log_id);
      setStep('preview');
      
    } catch (err: any) {
      setError(err.message || 'Failed to process');
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle work selection - also learns for future imports
  const handleSelectWork = async (childIndex: number, workIndex: number, workId: string, workName: string) => {
    const work = editedChildren[childIndex].works[workIndex];
    const originalText = work.original_text;
    
    setEditedChildren(prev => {
      const updated = [...prev];
      const w = updated[childIndex].works[workIndex];
      w.work_id = workId;
      w.work_name = workName;
      w.status = 'auto';
      w.confidence = 100;
      
      // Recalculate
      updated[childIndex].auto_matched = updated[childIndex].works.filter(x => x.status === 'auto').length;
      updated[childIndex].needs_review = updated[childIndex].works.filter(x => x.status === 'suggest').length;
      updated[childIndex].manual_required = updated[childIndex].works.filter(x => x.status === 'manual').length;
      updated[childIndex].has_warnings = updated[childIndex].works.some(x => x.status !== 'auto' && x.status !== 'missing');
      updated[childIndex].is_complete = updated[childIndex].auto_matched === updated[childIndex].total_areas;
      
      return updated;
    });
    
    // Learn from correction (async, don't block UI)
    if (originalText) {
      fetch('/api/montree/synonyms/learn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raw_text: originalText, work_id: workId }),
      }).catch(() => {}); // Silent fail OK
    }
  };

  const handleSkipWork = (childIndex: number, workIndex: number) => {
    setEditedChildren(prev => {
      const updated = [...prev];
      const w = updated[childIndex].works[workIndex];
      w.status = 'auto'; // Mark resolved
      w.work_id = null;
      
      updated[childIndex].auto_matched = updated[childIndex].works.filter(x => x.status === 'auto').length;
      updated[childIndex].needs_review = updated[childIndex].works.filter(x => x.status === 'suggest').length;
      updated[childIndex].manual_required = updated[childIndex].works.filter(x => x.status === 'manual').length;
      updated[childIndex].has_warnings = updated[childIndex].works.some(x => x.status !== 'auto' && x.status !== 'missing');
      
      return updated;
    });
  };

  const handleConfirmImport = async () => {
    if (!classroomId) return;
    
    setIsImporting(true);
    setError(null);
    
    try {
      const childrenToImport = editedChildren.map(child => ({
        name: child.name,
        name_chinese: child.name_chinese,
        age: child.age,
        works: child.works
          .filter(w => w.work_id)
          .map(w => ({ work_id: w.work_id, area: w.area })),
      }));

      const response = await fetch('/api/montree/classroom/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          classroom_id: classroomId, 
          children: childrenToImport,
          import_log_id: importLogId,
        }),
      });

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
        return;
      }

      setImportResult(data);
      setStep('success');
      
      const refreshed = await fetch('/api/montree/children').then(r => r.json());
      setExistingChildren(refreshed.children || []);
      
    } catch (err: any) {
      setError(err.message || 'Failed to import');
    } finally {
      setIsImporting(false);
    }
  };

  const handleReset = () => {
    setStep('upload');
    setFile(null);
    setRawInput('');
    setPreview(null);
    setEditedChildren([]);
    setImportResult(null);
    setError(null);
    setImportLogId(null);
  };

  const deleteChild = async (childId: string, childName: string) => {
    if (!confirm(`Delete ${childName}?`)) return;
    
    try {
      await fetch(`/api/montree/children/${childId}`, { method: 'DELETE' });
      setExistingChildren(prev => prev.filter(c => c.id !== childId));
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  };

  const deleteAllChildren = async () => {
    if (!confirm(`Delete ALL ${existingChildren.length} children?`)) return;
    
    for (const child of existingChildren) {
      await fetch(`/api/montree/children/${child.id}`, { method: 'DELETE' });
    }
    setExistingChildren([]);
  };

  // Calculate current summary
  const currentSummary = {
    total_children: editedChildren.length,
    auto_matched: editedChildren.reduce((sum, c) => sum + c.auto_matched, 0),
    needs_review: editedChildren.reduce((sum, c) => sum + c.needs_review, 0),
    manual_required: editedChildren.reduce((sum, c) => sum + c.manual_required, 0),
    total_works: editedChildren.length * 5,
    all_resolved: editedChildren.every(c => c.auto_matched + (c.works.filter(w => w.status === 'auto' && !w.work_id).length) === c.total_areas),
  };

  const childrenToShow = showOnlyWarnings 
    ? editedChildren.filter(c => c.has_warnings)
    : editedChildren;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Students</h1>
          <p className="text-gray-400 text-sm">{existingChildren.length} students enrolled</p>
        </div>
        {step !== 'upload' && (
          <button onClick={handleReset} className="text-gray-400 hover:text-white text-sm">
            ← Start Over
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-900/30 border border-red-500 rounded-xl text-red-400">
          {error}
        </div>
      )}

      {/* STEP 1: Upload */}
      {step === 'upload' && (
        <>
          {existingChildren.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Current Students</h2>
                <button onClick={deleteAllChildren} className="text-red-400 hover:text-red-300 text-sm">
                  Delete All
                </button>
              </div>
              <div className="bg-gray-900 rounded-xl border border-gray-800 divide-y divide-gray-800 max-h-60 overflow-y-auto">
                {existingChildren.map((child, i) => (
                  <div key={child.id} className="px-4 py-3 flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500 text-sm w-6">{i + 1}</span>
                      <span className="text-white">{child.name}</span>
                    </div>
                    <button
                      onClick={() => deleteChild(child.id, child.name)}
                      className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6">
            <h2 className="text-lg font-bold text-white mb-2">🚀 Import Students</h2>
            <p className="text-gray-400 text-sm mb-6">
              Upload your weekly planning. AI extracts, algorithm matches with 85-95% accuracy.
            </p>

            <div
              onDrop={(e) => { e.preventDefault(); setFile(e.dataTransfer.files[0]); }}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-input')?.click()}
              className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center hover:border-emerald-500 transition-colors cursor-pointer"
            >
              <input
                id="file-input"
                type="file"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".xlsx,.xls,.csv,.pdf,.png,.jpg,.jpeg,.txt,.docx"
              />
              {file ? (
                <div>
                  <div className="text-4xl mb-2">📄</div>
                  <div className="text-white font-medium">{file.name}</div>
                  <div className="text-gray-400 text-sm mt-1">{(file.size / 1024).toFixed(1)} KB</div>
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📁</div>
                  <div className="text-white font-medium">Drop your document</div>
                  <div className="text-gray-400 text-sm mt-1">Word, Image, Excel, PDF</div>
                </div>
              )}
            </div>

            <div className="my-4 flex items-center gap-4">
              <div className="flex-1 h-px bg-gray-800"></div>
              <span className="text-gray-500 text-sm">or paste</span>
              <div className="flex-1 h-px bg-gray-800"></div>
            </div>

            <textarea
              value={rawInput}
              onChange={(e) => setRawInput(e.target.value)}
              placeholder="Paste classroom roster..."
              className="w-full h-32 bg-gray-800 border border-gray-700 rounded-xl p-4 text-white placeholder-gray-500 resize-none focus:outline-none focus:border-emerald-500 text-sm"
            />

            <button
              onClick={handlePreview}
              disabled={isProcessing || (!file && !rawInput.trim())}
              className="mt-4 w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors"
            >
              {isProcessing ? '⚡ Analyzing...' : '⚡ Preview Import'}
            </button>
          </div>
        </>
      )}

      {/* STEP 2: Preview */}
      {step === 'preview' && preview && (
        <div className="space-y-6">
          {/* Summary Banner */}
          <div className={`p-4 rounded-xl border ${
            currentSummary.all_resolved 
              ? 'bg-emerald-900/30 border-emerald-500' 
              : 'bg-amber-900/30 border-amber-500'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-lg font-bold text-white">
                  {currentSummary.all_resolved ? '✅ Ready to Import' : '⚠️ Review Required'}
                </h2>
                <p className="text-gray-300 text-sm">
                  {currentSummary.total_children} children • {preview.summary.processing_time_ms}ms
                </p>
              </div>
              <button
                onClick={handleConfirmImport}
                disabled={isImporting}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  currentSummary.all_resolved
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-amber-600 hover:bg-amber-700 text-white'
                }`}
              >
                {isImporting ? 'Importing...' : currentSummary.all_resolved ? 'Import All' : 'Import Anyway'}
              </button>
            </div>

            {/* Stats Row */}
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-emerald-400 text-sm">{currentSummary.auto_matched} auto</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span>
                <span className="text-amber-400 text-sm">{currentSummary.needs_review} review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-red-400 text-sm">{currentSummary.manual_required} manual</span>
              </div>
              <div className="ml-auto">
                <span className="text-gray-400 text-sm">
                  {preview.summary.auto_rate}% auto-match rate
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-3 h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${(currentSummary.auto_matched / currentSummary.total_works) * 100}%` }}
              />
            </div>
          </div>

          {/* Filter Toggle */}
          {editedChildren.some(c => c.has_warnings) && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowOnlyWarnings(true)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  showOnlyWarnings ? 'bg-amber-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                ⚠️ Needs Review ({editedChildren.filter(c => c.has_warnings).length})
              </button>
              <button
                onClick={() => setShowOnlyWarnings(false)}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  !showOnlyWarnings ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
                }`}
              >
                All Children ({editedChildren.length})
              </button>
            </div>
          )}

          {/* Children List */}
          <div className="space-y-4">
            {childrenToShow.map((child, childIdx) => {
              const realIdx = editedChildren.indexOf(child);
              return (
                <div 
                  key={childIdx}
                  className={`bg-gray-900 rounded-xl border overflow-hidden ${
                    child.has_warnings ? 'border-amber-500/50' : 'border-gray-800'
                  }`}
                >
                  {/* Child Header */}
                  <div className="px-4 py-3 bg-gray-800/50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                        {child.name.charAt(0)}
                      </span>
                      <div>
                        <span className="text-white font-medium">{child.name}</span>
                        {child.name_chinese && (
                          <span className="text-gray-400 ml-2">({child.name_chinese})</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-400 text-sm">
                        {child.confidence_avg}% avg
                      </span>
                      <span className={`text-sm ${child.is_complete ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {child.auto_matched}/{child.total_areas}
                      </span>
                    </div>
                  </div>

                  {/* Works */}
                  <div className="p-4 grid gap-2">
                    {child.works.map((work, workIdx) => (
                      <div 
                        key={workIdx}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${getRowBgColor(work.status, work.confidence)}`}
                      >
                        {/* Area Badge */}
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shrink-0 ${AREA_COLORS[work.area]}`}>
                          {AREA_LETTERS[work.area]}
                        </span>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-400">{work.area_label}</span>
                            {work.confidence > 0 && (
                              <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getConfidenceColor(work.confidence, work.status)}`}>
                                {work.confidence}%
                              </span>
                            )}
                            {work.match_source === 'synonym' && (
                              <span className="text-xs text-blue-400">learned</span>
                            )}
                          </div>
                          
                          {work.status === 'auto' && work.work_id ? (
                            <div className="text-white flex items-center gap-2">
                              <span className="text-emerald-400">✓</span>
                              {work.work_name}
                              {work.original_text && work.original_text.toLowerCase() !== work.work_name?.toLowerCase() && (
                                <span className="text-gray-500 text-sm">← "{work.original_text}"</span>
                              )}
                            </div>
                          ) : work.status === 'auto' && !work.work_id ? (
                            <div className="text-gray-500 italic">Skipped</div>
                          ) : work.status === 'missing' ? (
                            <div className="flex items-center justify-between">
                              <span className="text-gray-400">Not in document</span>
                              <button
                                onClick={() => handleSkipWork(realIdx, workIdx)}
                                className="text-xs text-gray-500 hover:text-white"
                              >
                                Skip →
                              </button>
                            </div>
                          ) : (
                            <div>
                              <div className="text-amber-400 mb-2 flex items-center gap-2">
                                <span>"{work.original_text}"</span>
                                {work.status === 'suggest' && work.work_name && (
                                  <span className="text-gray-400">→ {work.work_name}?</span>
                                )}
                              </div>
                              
                              {/* Suggestions */}
                              <div className="flex flex-wrap gap-2">
                                {work.suggestions.slice(0, 3).map((sug, sugIdx) => (
                                  <button
                                    key={sugIdx}
                                    onClick={() => handleSelectWork(realIdx, workIdx, sug.work_id, sug.work_name)}
                                    className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                                      sugIdx === 0 && work.status === 'suggest'
                                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                                        : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                                    }`}
                                  >
                                    {sug.work_name} <span className="opacity-60">{sug.confidence}%</span>
                                  </button>
                                ))}
                                <button
                                  onClick={() => handleSkipWork(realIdx, workIdx)}
                                  className="px-3 py-1.5 rounded-lg text-sm bg-gray-800 hover:bg-gray-700 text-gray-400"
                                >
                                  Skip
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          {childrenToShow.length === 0 && showOnlyWarnings && (
            <div className="text-center py-12 text-gray-400">
              <div className="text-4xl mb-2">✅</div>
              <div>All children matched! Ready to import.</div>
            </div>
          )}
        </div>
      )}

      {/* STEP 3: Success */}
      {step === 'success' && importResult && (
        <div className="bg-gray-900 rounded-xl border border-emerald-500 p-8 text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-white mb-2">Import Complete!</h2>
          <p className="text-emerald-400 mb-6">
            {importResult.children_created} children • {importResult.assignments_created} assignments
          </p>
          
          <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mb-8">
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-white">{importResult.children_created}</div>
              <div className="text-xs text-gray-400">Children</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-400">{importResult.assignments_created}</div>
              <div className="text-xs text-gray-400">Current</div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <div className="text-2xl font-bold text-emerald-400">{importResult.mastered_backfilled || 0}</div>
              <div className="text-xs text-gray-400">Mastered</div>
            </div>
          </div>

          <div className="flex gap-4 justify-center">
            <button onClick={handleReset} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg">
              Import More
            </button>
            <a href="/montree/dashboard" className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              Go to Classroom →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
