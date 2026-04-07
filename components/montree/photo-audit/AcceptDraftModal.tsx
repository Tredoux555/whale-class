// components/montree/photo-audit/AcceptDraftModal.tsx
// Modal that lets the teacher review + edit a Sonnet AI draft before
// adding it to the classroom curriculum as a new custom work.
'use client';

import { useState, useEffect } from 'react';

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Mathematics',
  language: 'Language',
  cultural: 'Cultural',
};

const AREA_COLORS: Record<string, string> = {
  practical_life: '#f59e0b',
  sensorial: '#ec4899',
  mathematics: '#3b82f6',
  language: '#10b981',
  cultural: '#8b5cf6',
};

export interface DraftFields {
  name: string;
  area: string;
  description: string;
  why_it_matters: string;
  materials: string[];
}

interface ExistingMatch {
  workId: string;
  workName: string;
  areaKey: string;
  similarity: number;
}

interface AcceptDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (edited: DraftFields) => Promise<void>;
  onUseExisting?: () => Promise<void>;
  existingMatch?: ExistingMatch | null;
  initialDraft: {
    proposed_name?: string;
    suggested_area?: string;
    parent_description?: string;
    why_it_matters?: string;
    key_materials?: string[];
    closest_existing_match?: { work_name?: string; similarity?: number } | null;
  };
  photoUrl?: string | null;
  saving?: boolean;
}

export default function AcceptDraftModal({
  isOpen,
  onClose,
  onSave,
  onUseExisting,
  existingMatch,
  initialDraft,
  photoUrl,
  saving = false,
}: AcceptDraftModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [whyItMatters, setWhyItMatters] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Reset form whenever a new draft is opened
  useEffect(() => {
    if (isOpen) {
      setName(initialDraft.proposed_name || '');
      setDescription(initialDraft.parent_description || '');
      setWhyItMatters(initialDraft.why_it_matters || '');
      setError(null);
    }
  }, [isOpen, initialDraft]);

  if (!isOpen) return null;

  const area = initialDraft.suggested_area || 'practical_life';
  const areaLabel = AREA_LABELS[area] || area;
  const areaColor = AREA_COLORS[area] || '#888';
  const closeMatch = initialDraft.closest_existing_match;
  const materials = initialDraft.key_materials && initialDraft.key_materials.length > 0
    ? initialDraft.key_materials
    : ['(materials inferred from photo)'];

  const handleSave = async () => {
    const trimmedName = name.trim();
    const trimmedDesc = description.trim();
    if (trimmedName.length < 3 || trimmedName.length > 60) {
      setError('Work name must be 3–60 characters');
      return;
    }
    if (trimmedDesc.length < 10) {
      setError('Description is too short');
      return;
    }
    setError(null);
    await onSave({
      name: trimmedName,
      area,
      description: trimmedDesc,
      why_it_matters: whyItMatters.trim(),
      materials,
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 pt-5 pb-3 border-b border-gray-100 flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold text-violet-700 uppercase tracking-wide">✨ Accept AI Draft</span>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{ color: areaColor, backgroundColor: areaColor + '18' }}
              >
                {areaLabel}
              </span>
            </div>
            <p className="text-xs text-gray-500">Edit anything you'd like, then add to your curriculum.</p>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            className="ml-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 disabled:opacity-30"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Photo preview */}
        {photoUrl && (
          <div className="px-5 pt-3">
            <img
              src={photoUrl}
              alt="Photo preview"
              className="w-full h-32 object-cover rounded-lg border border-gray-200"
              loading="lazy"
            />
          </div>
        )}

        {/* Similar match info — friendlier when an actionable match exists */}
        {existingMatch ? (
          <div className="mx-5 mt-3 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-[11px] text-blue-800">
              <span className="font-semibold">💡 This looks like "{existingMatch.workName}"</span>
              <span className="text-blue-600"> ({Math.round(existingMatch.similarity * 100)}% match)</span>
              {' '}— already in your curriculum. Tap below to match this photo to it instead of creating a duplicate.
            </p>
          </div>
        ) : closeMatch?.work_name && (
          <div className="mx-5 mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-[11px] text-amber-800">
              <span className="font-semibold">⚠️ Similar to "{closeMatch.work_name}"</span>
              {typeof closeMatch.similarity === 'number' && (
                <span className="text-amber-600"> ({Math.round(closeMatch.similarity * 100)}% match)</span>
              )}
              {' '}— but not currently in your curriculum.
            </p>
          </div>
        )}

        {/* Editable fields */}
        <div className="px-5 py-4 space-y-4">
          {/* Work name */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wide">Work name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              disabled={saving}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 disabled:bg-gray-50"
              placeholder="e.g. Bow Tying Frame"
            />
            <p className="text-[10px] text-gray-400 mt-1">{name.length}/60</p>
          </div>

          {/* Parent description */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Parent description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              disabled={saving}
              rows={5}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 disabled:bg-gray-50 resize-none leading-snug"
              placeholder="What the child is doing, in warm parent-friendly language..."
            />
            <p className="text-[10px] text-gray-400 mt-1">{description.length}/500</p>
          </div>

          {/* Why it matters */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wide">
              Why it matters
            </label>
            <textarea
              value={whyItMatters}
              onChange={(e) => setWhyItMatters(e.target.value)}
              maxLength={500}
              disabled={saving}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-200 disabled:bg-gray-50 resize-none leading-snug"
              placeholder="The developmental purpose of this work..."
            />
            <p className="text-[10px] text-gray-400 mt-1">{whyItMatters.length}/500</p>
          </div>

          {/* Materials (read-only summary) */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-700 mb-1 uppercase tracking-wide">Materials</label>
            <p className="text-xs text-gray-600 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg">
              {materials.join(', ')}
            </p>
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
          )}
        </div>

        {/* Footer — primary button differs based on whether an existing match exists */}
        <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 sticky bottom-0">
          {existingMatch && onUseExisting ? (
            <>
              <div className="flex items-center justify-between gap-3">
                <button
                  onClick={onClose}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30"
                >
                  Cancel
                </button>
                <button
                  onClick={onUseExisting}
                  disabled={saving}
                  className="px-5 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center gap-2"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                        <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                      </svg>
                      Matching…
                    </>
                  ) : (
                    <>🔗 Use "{existingMatch.workName}"</>
                  )}
                </button>
              </div>
              <div className="text-center mt-2">
                <button
                  onClick={handleSave}
                  disabled={saving || !name.trim() || !description.trim()}
                  className="text-[11px] text-gray-500 hover:text-violet-700 underline disabled:opacity-30"
                >
                  + Add as new work anyway
                </button>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !name.trim() || !description.trim()}
                className="px-5 py-2 bg-violet-600 text-white text-sm font-bold rounded-lg hover:bg-violet-700 disabled:opacity-40 transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Adding…
                  </>
                ) : (
                  <>✨ Add to Curriculum</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
