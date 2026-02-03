// components/montree/media/PhotoEditModal.tsx
// Modal for editing photo metadata (caption, work, tags, child)
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { MontreeMedia } from '@/lib/montree/media/types';
import { AREA_CONFIG } from '@/lib/montree/types';

interface PhotoEditModalProps {
  media: MontreeMedia | null;
  childName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (updatedMedia: MontreeMedia) => void;
}

interface EditFormData {
  caption: string;
  work_id: string | null;
  tags: string[];
  child_id: string | null;
}

export default function PhotoEditModal({
  media,
  childName,
  isOpen,
  onClose,
  onSave,
}: PhotoEditModalProps) {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [availableChildren, setAvailableChildren] = useState<Array<{ id: string; name: string }>>([]);
  const [availableWorks, setAvailableWorks] = useState<Array<{ id: string; name: string; area: string }>>([]);
  const [formData, setFormData] = useState<EditFormData>({
    caption: '',
    work_id: null,
    tags: [],
    child_id: null,
  });
  const [tagInput, setTagInput] = useState('');

  // Load image URL and fetch available data
  useEffect(() => {
    if (!media || !isOpen) return;

    setLoading(true);
    
    // Load image
    const fetchImage = async () => {
      try {
        const response = await fetch(
          `/api/montree/media/url?path=${encodeURIComponent(media.storage_path)}`
        );
        const data = await response.json();
        if (data.url) {
          setImageUrl(data.url);
        }
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

    // Fetch available children and works
    const fetchData = async () => {
      try {
        // Get children from the same classroom/school
        const childrenRes = await fetch(
          `/api/montree/children?school_id=${media.school_id}&classroom_id=${media.classroom_id || ''}`
        );
        if (childrenRes.ok) {
          const childrenData = await childrenRes.json();
          setAvailableChildren(childrenData.children || []);
        }

        // Get available works
        const worksRes = await fetch('/api/montree/works');
        if (worksRes.ok) {
          const worksData = await worksRes.json();
          setAvailableWorks(worksData.works || []);
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

  const handleAddTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
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
        throw new Error(error.error || 'Failed to save changes');
      }

      const result = await response.json();
      if (result.media) {
        // Enhance media object with area and work_name
        const enhancedMedia = {
          ...result.media,
          area: availableWorks.find(w => w.id === result.media.work_id)?.area || media.area,
          work_name: availableWorks.find(w => w.id === result.media.work_id)?.name || media.work_name,
        };
        onSave?.(enhancedMedia);
        toast.success('Photo updated successfully');
        onClose();
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen || !media) return null;

  // Get selected work info
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
          <h2 className="text-lg font-bold text-gray-800">Edit Photo</h2>
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
                alt={media.caption || 'Photo'}
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
              Caption
            </label>
            <textarea
              value={formData.caption}
              onChange={(e) => setFormData(prev => ({ ...prev, caption: e.target.value }))}
              placeholder="Add a caption or notes about this photo..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
              rows={3}
            />
          </div>

          {/* Assign Child */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Child Assignment {formData.child_id && <span className="text-xs text-gray-500">(Group photo)</span>}
            </label>
            {availableChildren.length > 0 ? (
              <select
                value={formData.child_id || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  child_id: e.target.value || null
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">No specific child (group photo)</option>
                {availableChildren.map(child => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50">
                No children available
              </div>
            )}
            {selectedChild && (
              <p className="text-xs text-gray-600 mt-1">Selected: {selectedChild.name}</p>
            )}
          </div>

          {/* Assign Work */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Curriculum Work
            </label>
            {availableWorks.length > 0 ? (
              <select
                value={formData.work_id || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  work_id: e.target.value || null
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                <option value="">No work assigned</option>
                {availableWorks.map(work => (
                  <option key={work.id} value={work.id}>
                    {work.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-500 bg-gray-50">
                No works available
              </div>
            )}
            {selectedWork && areaConfig && (
              <div className="mt-2 p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                <div className="flex items-center gap-2">
                  <span>{areaConfig.icon}</span>
                  <div>
                    <p className="font-semibold text-emerald-900">{selectedWork.name}</p>
                    <p className="text-emerald-700">{areaConfig.name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tags
            </label>
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Add a tag (e.g., 'concentration', 'focus')..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              />
              <button
                onClick={handleAddTag}
                className="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition-colors"
              >
                Add
              </button>
            </div>

            {/* Tag Pills */}
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map(tag => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className="ml-1 text-emerald-600 hover:text-emerald-800 font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Metadata */}
          <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 border border-gray-200">
            <p className="font-semibold mb-1 text-gray-700">Metadata</p>
            <p>ID: {media.id}</p>
            <p>Captured: {new Date(media.captured_at).toLocaleString()}</p>
            <p>By: {media.captured_by}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={onClose}
            disabled={isSaving}
            className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>✓ Save Changes</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
