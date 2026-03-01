// components/montree/media/MediaDetailModal.tsx
// Modal for viewing, editing, and deleting photos
'use client';

import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import type { MontreeMedia, MontreeChild } from '@/lib/montree/media/types';
import { useI18n } from '@/lib/montree/i18n';

interface MediaDetailModalProps {
  media: MontreeMedia | null;
  children: MontreeChild[];
  onClose: () => void;
  onUpdate: (media: MontreeMedia) => void;
  onDelete: (id: string) => void;
}

export default function MediaDetailModal({
  media,
  children,
  onClose,
  onUpdate,
  onDelete,
}: MediaDetailModalProps) {
  const { t, locale } = useI18n();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Editable fields
  const [caption, setCaption] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  // Load image URL and set initial values
  useEffect(() => {
    if (!media) return;

    setCaption(media.caption || '');
    setSelectedChildId(media.child_id);

    // Fetch full-size image URL
    const fetchUrl = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/montree/media/url?path=${encodeURIComponent(media.storage_path)}`);
        const data = await response.json();
        if (data.url) {
          setImageUrl(data.url);
        }
      } catch (err) {
        console.error('Failed to fetch image URL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [media]);

  if (!media) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: media.id,
          caption: caption || null,
          child_id: selectedChildId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('media.photoUpdated'));
        onUpdate(data.media);
        onClose();
      } else {
        toast.error(data.error || t('media.failedToUpdate'));
      }
    } catch (err) {
      toast.error(t('media.failedToUpdatePhoto'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/montree/media?id=${media.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast.success(t('media.photoDeleted'));
        onDelete(media.id);
        onClose();
      } else {
        toast.error(data.error || t('media.failedToDelete'));
      }
    } catch (err) {
      toast.error(t('media.failedToDeletePhoto'));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(locale === 'zh' ? 'zh-CN' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const childName = selectedChildId
    ? children.find(c => c.id === selectedChildId)?.name
    : null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">{t('media.photoDetails')}</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 rounded-full"
          >
            ✕
          </button>
        </div>

        {/* Image */}
        <div className="bg-gray-100 aspect-video relative overflow-hidden">
          {loading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={media.caption || 'Photo'}
              className="absolute inset-0 w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              <span className="text-4xl">📷</span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Date */}
          <div className="text-sm text-gray-500">
            📅 {formatDate(media.captured_at)}
          </div>

          {/* Caption */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('media.caption')}
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('media.addCaption')}
              className="w-full p-3 border rounded-xl text-sm resize-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
              rows={2}
            />
          </div>

          {/* Child Assignment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('media.assignToChild')}
            </label>
            <select
              value={selectedChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value || null)}
              className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
            >
              <option value="">{t('media.unassignedGroupPhoto')}</option>
              {children.map((child) => (
                <option key={child.id} value={child.id}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          {/* Current child indicator */}
          {childName && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl">
              <span className="text-blue-600">👤</span>
              <span className="text-sm text-blue-800">{t('media.assignedTo').replace('{name}', childName)}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          {showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-3 bg-red-500 text-white rounded-xl font-medium hover:bg-red-600 disabled:opacity-50"
              >
                {deleting ? t('common.deleting') : t('media.confirmDelete')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-3 bg-red-100 text-red-600 rounded-xl font-medium hover:bg-red-200"
              >
                🗑️ {t('common.delete')}
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-blue-500 text-white rounded-xl font-medium hover:bg-blue-600 disabled:opacity-50"
              >
                {saving ? t('common.saving') : t('media.saveChanges')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
