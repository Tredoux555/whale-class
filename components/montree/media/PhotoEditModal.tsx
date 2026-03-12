// components/montree/media/PhotoEditModal.tsx
// Modal for editing photo metadata — searchable work picker + self-learning correction recording
'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import type { MontreeMedia } from '@/lib/montree/media/types';
import { AREA_CONFIG } from '@/lib/montree/types';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';

interface PhotoEditModalProps {
  media: MontreeMedia | null;
  childName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedMedia: MontreeMedia) => void;
}

interface AvailableWork {
  id: string;
  name: string;
  chinese_name?: string;
  area: string;
  area_name: string;
  area_color: string;
  sequence: number;
}

interface EditFormData {
  caption: string;
  work_id: string | null;
  tags: string[];
  child_id: string | null;
}

// Track original Guru identification for correction recording
interface OriginalIdentification {
  work_name: string | null;
  work_id: string | null;
  area: string | null;
  confidence: number | null;
}

export default function PhotoEditModal({
  media,
  childName,
  isOpen,
  onClose,
  onSave,
}: PhotoEditModalProps) {
  const { t, locale } = useI18n();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availableChildren, setAvailableChildren] = useState<Array<{ id: string; name: string }>>([]);
  const [availableWorks, setAvailableWorks] = useState<AvailableWork[]>([]);
  const [formData, setFormData] = useState<EditFormData>({
    caption: '',
    work_id: null,
    tags: [],
    child_id: null,
  });
  const [tagInput, setTagInput] = useState('');

  // Searchable work picker state
  const [workSearch, setWorkSearch] = useState('');
  const [workPickerOpen, setWorkPickerOpen] = useState(false);
  const workSearchRef = useRef<HTMLInputElement>(null);

  // Track what Guru originally identified (for correction recording)
  const [originalId, setOriginalId] = useState<OriginalIdentification>({
    work_name: null, work_id: null, area: null, confidence: null,
  });

  // Load image URL and fetch available data
  useEffect(() => {
    if (!media || !isOpen) return;

    setLoading(true);
    setWorkSearch('');
    setWorkPickerOpen(false);

    // Load image
    const fetchImage = async () => {
      try {
        const response = await fetch(
          `/api/montree/media/url?path=${encodeURIComponent(media.storage_path)}`
        );
        const data = await response.json();
        if (data.url) setImageUrl(data.url);
      } catch (err) {
        console.error('Failed to fetch image URL:', err);
      }
    };

    // Initialize form with current media data
    setFormData({
      caption: media.caption || '',
      work_id: media.work_id || null,
      tags: media.tags || [],
      child_id: media.child_id || null,
    });

    // Track original identification for self-learning corrections
    // work_name is looked up from availableWorks at correction time (line 188)
    setOriginalId({
      work_name: null,
      work_id: media.work_id || null,
      area: null,
      confidence: null,
    });

    // Fetch available children and works
    const fetchData = async () => {
      try {
        const childrenRes = await montreeApi(
          `/api/montree/children?school_id=${media.school_id}&classroom_id=${media.classroom_id || ''}`
        );
        if (childrenRes.ok) {
          const childrenData = await childrenRes.json();
          setAvailableChildren(Array.isArray(childrenData?.children) ? childrenData.children : []);
        }

        const worksRes = await montreeApi('/api/montree/works');
        if (worksRes.ok) {
          const worksData = await worksRes.json();
          setAvailableWorks(Array.isArray(worksData?.works) ? worksData.works : []);
        }
      } catch (err) {
        console.error('Failed to fetch available data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
    fetchData();
  }, [media, isOpen]);

  // Filter works by search query — grouped by area
  const filteredWorks = useMemo(() => {
    const query = workSearch.toLowerCase().trim();
    const works = query
      ? availableWorks.filter(w =>
          w.name.toLowerCase().includes(query) ||
          (w.chinese_name && w.chinese_name.includes(query)) ||
          w.area_name.toLowerCase().includes(query)
        )
      : availableWorks;

    // Group by area
    const grouped: Record<string, AvailableWork[]> = {};
    for (const w of works) {
      const key = w.area_name || t('photoEdit.other');
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(w);
    }
    return grouped;
  }, [availableWorks, workSearch]);

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ ...prev, tags: [...prev.tags, tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
  };

  const handleSelectWork = (work: AvailableWork) => {
    setFormData(prev => ({ ...prev, work_id: work.id }));
    setWorkPickerOpen(false);
    setWorkSearch('');
  };

  const handleClearWork = () => {
    setFormData(prev => ({ ...prev, work_id: null }));
  };

  // Record correction to self-learning system if teacher changed the work
  const recordCorrectionIfNeeded = async (newWorkId: string | null) => {
    // Only record if teacher changed from Guru's original identification
    if (!media || !originalId.work_id || originalId.work_id === newWorkId) return;

    const newWork = availableWorks.find(w => w.id === newWorkId);
    const originalWork = availableWorks.find(w => w.id === originalId.work_id);

    try {
      await montreeApi('/api/montree/guru/corrections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_id: media.id,
          child_id: media.child_id,
          original_work_name: originalWork?.name || originalId.work_name,
          original_work_id: originalId.work_id,
          original_area: originalWork?.area || originalId.area,
          original_confidence: originalId.confidence,
          corrected_work_name: newWork?.name || null,
          corrected_work_id: newWorkId,
          corrected_area: newWork?.area || null,
          correction_type: 'work_mismatch',
        }),
      });
    } catch {
      // Non-fatal — correction recording is best-effort
      console.error('[PhotoEditModal] Failed to record correction');
    }
  };

  const handleSave = async () => {
    if (!media) return;

    setIsSaving(true);
    try {
      const response = await fetch('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: media.id,
          caption: formData.caption || null,
          work_id: formData.work_id || null,
          tags: formData.tags,
          child_id: formData.child_id || null,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || t('photoEdit.saveFailed'));
      }

      const result = await response.json();
      if (result.media) {
        // Record correction for self-learning (fire-and-forget)
        if (formData.work_id !== originalId.work_id) {
          recordCorrectionIfNeeded(formData.work_id);
        }

        const selectedWork = availableWorks.find(w => w.id === result.media.work_id);
        const enhancedMedia = {
          ...result.media,
          area: selectedWork?.area ?? (media as Record<string, unknown>).area ?? null,
          work_name: selectedWork?.name ?? null,
        };
        onSave?.(enhancedMedia);
        toast.success(t('photoEdit.saveSuccess'));
        onClose();
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : t('photoEdit.saveFailed'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !media) return null;

  const selectedWork = availableWorks.find(w => w.id === formData.work_id);
  const selectedChild = availableChildren.find(c => c.id === formData.child_id);
  const areaConfig = selectedWork
    ? AREA_CONFIG[selectedWork.area as keyof typeof AREA_CONFIG]
    : null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-emerald-50 to-teal-50">
          <h2 className="text-lg font-bold text-gray-800">{t('photoEdit.title')}</h2>
          <button
            onClick={onClose}
            disabled={isSaving}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-white/50 rounded-full transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Photo Thumbnail */}
          <div className="bg-gray-100 rounded-lg overflow-hidden">
            {loading && !imageUrl ? (
              <div className="aspect-video flex items-center justify-center bg-gray-200">
                <div className="w-8 h-8 border-2 border-gray-300 border-t-emerald-500 rounded-full animate-spin" />
              </div>
            ) : imageUrl ? (
              <img
                src={imageUrl}
                alt={media.caption || t('photoEdit.photo')}
                className="w-full aspect-video object-cover"
              />
            ) : (
              <div className="aspect-video flex items-center justify-center bg-gray-200 text-gray-400">
                <span className="text-4xl">📷</span>
              </div>
            )}
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('photoEdit.caption')}
            </label>
            <textarea
              value={formData.caption}
              onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
              placeholder={t('placeholder.photoCaption')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Assign Child */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('photoEdit.childAssignment')}
            </label>
            {availableChildren.length > 0 ? (
              <select
                value={formData.child_id || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, child_id: e.target.value || null }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">{t('photoEdit.noSpecificChild')}</option>
                {availableChildren.map(child => (
                  <option key={child.id} value={child.id}>{child.name}</option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50">
                {t('photoEdit.noChildrenAvailable')}
              </div>
            )}
            {selectedChild && (
              <p className="text-xs text-gray-600 mt-1">{t('photoEdit.selected', { name: selectedChild.name })}</p>
            )}
          </div>

          {/* Assign Work — Searchable Picker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('photoEdit.curriculumWork')}
            </label>

            {/* Currently selected work display */}
            {selectedWork && areaConfig ? (
              <div className="mb-2 p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: selectedWork.area_color || areaConfig.color }}
                  >
                    {selectedWork.area_name?.charAt(0) || 'W'}
                  </div>
                  <div>
                    <p className="font-semibold text-emerald-900 text-sm">
                      {locale === 'zh' && selectedWork.chinese_name ? selectedWork.chinese_name : selectedWork.name}
                    </p>
                    <p className="text-emerald-700 text-xs">{selectedWork.area_name}</p>
                  </div>
                </div>
                <button
                  onClick={handleClearWork}
                  className="text-gray-400 hover:text-red-500 text-lg px-1"
                  aria-label="Clear work"
                >
                  ✕
                </button>
              </div>
            ) : null}

            {/* Search input */}
            <div className="relative">
              <input
                ref={workSearchRef}
                type="text"
                value={workSearch}
                onChange={(e) => {
                  setWorkSearch(e.target.value);
                  if (!workPickerOpen) setWorkPickerOpen(true);
                }}
                onFocus={() => setWorkPickerOpen(true)}
                placeholder={selectedWork
                  ? t('photoEdit.changeWork')
                  : t('photoEdit.searchWorks')
                }
                className="w-full px-3 py-2 pl-9 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            </div>

            {/* Dropdown work list */}
            {workPickerOpen && availableWorks.length > 0 && (
              <div className="mt-1 border border-gray-200 rounded-lg shadow-lg bg-white max-h-64 overflow-y-auto z-10 relative">
                {/* Clear option */}
                <button
                  onClick={() => { handleClearWork(); setWorkPickerOpen(false); setWorkSearch(''); }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b"
                >
                  {t('photoEdit.noWorkAssigned')}
                </button>

                {Object.entries(filteredWorks).map(([areaName, works]) => (
                  <div key={areaName}>
                    {/* Area header */}
                    <div className="px-3 py-1.5 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider sticky top-0">
                      {areaName}
                    </div>
                    {works.map(work => {
                      const isSelected = formData.work_id === work.id;
                      return (
                        <button
                          key={work.id}
                          onClick={() => handleSelectWork(work)}
                          className={`w-full px-3 py-2 text-left text-sm hover:bg-emerald-50 flex items-center gap-2 ${
                            isSelected ? 'bg-emerald-100 font-semibold' : ''
                          }`}
                        >
                          <div
                            className="w-5 h-5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: work.area_color || '#666' }}
                          />
                          <span className="truncate">
                            {locale === 'zh' && work.chinese_name ? work.chinese_name : work.name}
                          </span>
                          {isSelected && <span className="ml-auto text-emerald-600">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                ))}

                {Object.keys(filteredWorks).length === 0 && (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">
                    {t('photoEdit.noMatchingWorks')}
                  </div>
                )}
              </div>
            )}

            {availableWorks.length === 0 && !loading && (
              <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50">
                {t('photoEdit.noWorksAvailable')}
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              {t('photoEdit.tags')}
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); }
                }}
                placeholder={t('placeholder.addTag')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                {t('photoEdit.addButton')}
              </button>
            </div>

            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm">
                    {tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-1 text-emerald-600 hover:text-emerald-800 font-bold">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 border border-gray-200">
            <p className="font-semibold mb-1 text-gray-700">{t('photoEdit.metadata')}</p>
            <p>ID: {media.id}</p>
            <p>{t('photoEdit.captured', { timestamp: new Date(media.captured_at).toLocaleString() })}</p>
            <p>{t('photoEdit.by', { teacher: media.captured_by || t('photoEdit.unknown') })}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            {t('photoEdit.cancel')}
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {t('photoEdit.saving')}
              </>
            ) : (
              <>{t('photoEdit.saveChanges')}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
