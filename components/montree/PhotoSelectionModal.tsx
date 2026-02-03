'use client';

import { useState } from 'react';
import { toast } from 'sonner';

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  created_at: string;
  work_name?: string;
}

interface PhotoSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedIds: string[]) => Promise<void>;
  currentPhotos: Photo[];
  availablePhotos: Photo[];
  childId: string;
  isSaving?: boolean;
}

export default function PhotoSelectionModal({
  isOpen,
  onClose,
  onSave,
  currentPhotos,
  availablePhotos,
  childId,
  isSaving = false,
}: PhotoSelectionModalProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(currentPhotos.map(p => p.id))
  );
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  const handleToggle = (photoId: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(photoId)) {
      newSelected.delete(photoId);
    } else {
      newSelected.add(photoId);
    }
    setSelectedIds(newSelected);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(Array.from(selectedIds));
      toast.success('Photos updated!');
      onClose();
    } catch (error) {
      toast.error('Failed to update photos');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  // Combine all photos (current + available) and deduplicate
  const allPhotos = Array.from(
    new Map(
      [...currentPhotos, ...availablePhotos].map(p => [p.id, p])
    ).values()
  );

  // Separate currently selected from available
  const currentlySelected = allPhotos.filter(p => selectedIds.has(p.id));
  const notSelected = allPhotos.filter(p => !selectedIds.has(p.id));

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b bg-gradient-to-r from-blue-500 to-cyan-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">📸 Edit Report Photos</h3>
              <p className="text-blue-100 text-sm">Select photos to include in this report</p>
            </div>
            <button
              onClick={onClose}
              disabled={saving}
              className="text-white/80 hover:text-white text-2xl disabled:opacity-50"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Currently Selected Photos */}
          {currentlySelected.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                ✅ In Report ({currentlySelected.length})
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {currentlySelected.map(photo => (
                  <div
                    key={photo.id}
                    className="relative rounded-lg overflow-hidden border-3 border-emerald-400 bg-emerald-50 cursor-pointer hover:border-emerald-600 transition-all"
                    onClick={() => handleToggle(photo.id)}
                  >
                    {/* Photo Image */}
                    <div className="aspect-square w-full">
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Photo'}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Checkbox Overlay */}
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                        <span className="text-white text-sm font-bold">✓</span>
                      </div>
                    </div>

                    {/* Caption */}
                    {photo.caption && (
                      <div className="p-2 bg-white/95">
                        <p className="text-xs text-gray-600 line-clamp-2">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Available Photos */}
          {notSelected.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                ○ Available ({notSelected.length})
              </h4>
              <div className="grid grid-cols-2 gap-3">
                {notSelected.map(photo => (
                  <div
                    key={photo.id}
                    className="relative rounded-lg overflow-hidden border-2 border-gray-200 bg-gray-50 cursor-pointer hover:border-gray-400 hover:bg-gray-100 transition-all"
                    onClick={() => handleToggle(photo.id)}
                  >
                    {/* Photo Image */}
                    <div className="aspect-square w-full">
                      <img
                        src={photo.url}
                        alt={photo.caption || 'Photo'}
                        className="w-full h-full object-cover opacity-70 hover:opacity-100 transition-opacity"
                      />
                    </div>

                    {/* Checkbox Overlay */}
                    <div className="absolute top-2 right-2">
                      <div className="w-6 h-6 bg-white rounded-full border-2 border-gray-400 flex items-center justify-center">
                        <span className="text-gray-400 text-xs">○</span>
                      </div>
                    </div>

                    {/* Caption */}
                    {photo.caption && (
                      <div className="p-2 bg-white/80">
                        <p className="text-xs text-gray-600 line-clamp-2">{photo.caption}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No photos message */}
          {allPhotos.length === 0 && (
            <div className="text-center py-12">
              <span className="text-4xl mb-3 block">📸</span>
              <p className="text-gray-600 font-medium">No photos available</p>
              <p className="text-gray-400 text-sm mt-1">Capture some photos from the Week view first</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 py-3 rounded-xl font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedIds.size === 0}
            className="flex-1 py-3 rounded-xl font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {saving ? '⏳ Saving...' : `✓ Save (${selectedIds.size})`}
          </button>
        </div>
      </div>
    </div>
  );
}
