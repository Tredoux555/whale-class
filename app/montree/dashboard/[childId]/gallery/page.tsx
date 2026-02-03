// /montree/dashboard/[childId]/gallery/page.tsx
// Photo gallery browser for a student
// Shows all photos in chronological order, organized by work/area
'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import MediaGallery from '@/components/montree/media/MediaGallery';
import PhotoDetailView from '@/components/montree/media/PhotoDetailView';
import PhotoEditModal from '@/components/montree/media/PhotoEditModal';
import DeleteConfirmDialog from '@/components/montree/media/DeleteConfirmDialog';
import { AREA_CONFIG } from '@/lib/montree/types';
import type { MontreeMedia } from '@/lib/montree/media/types';

type FilterTab = 'all' | 'area' | 'work';

interface GalleryItem extends MontreeMedia {
  area?: string;
  work_name?: string;
}

interface GroupedPhotos {
  [key: string]: GalleryItem[];
}

export default function GalleryPage() {
  const params = useParams();
  const childId = params.childId as string;

  // State
  const [photos, setPhotos] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [selectedWork, setSelectedWork] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryItem | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<GalleryItem | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<GalleryItem | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectionMode, setSelectionMode] = useState(false);
  const [childName, setChildName] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);

  // Fetch child info
  useEffect(() => {
    if (!childId) return;

    fetch(`/api/montree/children/${childId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.child?.name) {
          setChildName(data.child.name);
        }
      })
      .catch(() => {});
  }, [childId]);

  // Fetch photos
  useEffect(() => {
    if (!childId) return;

    setLoading(true);
    fetch(`/api/montree/media?child_id=${childId}&limit=1000`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch photos');
        return r.json();
      })
      .then(data => {
        // Sort by captured_at descending (newest first)
        const sorted = (data.media || []).sort((a: GalleryItem, b: GalleryItem) => {
          return new Date(b.captured_at).getTime() - new Date(a.captured_at).getTime();
        });
        setPhotos(sorted);
      })
      .catch(err => {
        console.error('Error fetching photos:', err);
        toast.error('Failed to load photos');
      })
      .finally(() => setLoading(false));
  }, [childId]);

  // Get unique areas and works from photos
  const uniqueAreas = Array.from(new Set(photos.map(p => p.area).filter(Boolean)));
  const uniqueWorks = Array.from(new Set(photos.map(p => p.work_name || p.work_id).filter(Boolean)));

  // Filter photos based on selected tab and filters
  const getFilteredPhotos = (): GalleryItem[] => {
    let filtered = [...photos];

    if (filterTab === 'area') {
      if (selectedArea) {
        filtered = filtered.filter(p => p.area === selectedArea);
      }
    } else if (filterTab === 'work') {
      if (selectedWork) {
        filtered = filtered.filter(p =>
          (p.work_name === selectedWork || p.work_id === selectedWork)
        );
      }
    }

    return filtered;
  };

  const filteredPhotos = getFilteredPhotos();

  // Group photos for display
  const groupPhotosByWorkAndArea = (items: GalleryItem[]): GroupedPhotos => {
    const grouped: GroupedPhotos = {};

    items.forEach(item => {
      const area = item.area || 'Untagged';
      const work = item.work_name || item.work_id || 'No work tagged';
      const key = `${area}|${work}`;

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    });

    return grouped;
  };

  const groupedPhotos = filterTab === 'all' ? groupPhotosByWorkAndArea(filteredPhotos) : null;

  // Handle selection
  const handleSelectionChange = (id: string, selected: boolean) => {
    const newSelection = new Set(selectedIds);
    if (selected) {
      newSelection.add(id);
    } else {
      newSelection.delete(id);
    }
    setSelectedIds(newSelection);
  };

  // Handle select all
  const handleSelectAll = () => {
    if (selectedIds.size === filteredPhotos.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredPhotos.map(p => p.id)));
    }
  };

  const getAreaConfig = (area: string) => {
    return AREA_CONFIG[area as keyof typeof AREA_CONFIG] || { name: area, icon: '📋', color: '#888' };
  };

  // Handle single photo delete
  const handleDeletePhoto = async () => {
    if (!photoToDelete) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/montree/media?id=${photoToDelete.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete photo');
      }

      setPhotos(photos.filter(p => p.id !== photoToDelete.id));
      toast.success('Photo deleted successfully');
      setPhotoToDelete(null);
      setSelectedPhoto(null);
    } catch (err) {
      console.error('Delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete photo');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;

    setIsDeleting(true);
    try {
      const idsArray = Array.from(selectedIds);
      const response = await fetch(`/api/montree/media?ids=${idsArray.join(',')}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete photos');
      }

      setPhotos(photos.filter(p => !selectedIds.has(p.id)));
      toast.success(`${selectedIds.size} photo${selectedIds.size !== 1 ? 's' : ''} deleted successfully`);
      setSelectedIds(new Set());
      setShowBulkDeleteConfirm(false);
      setSelectionMode(false);
    } catch (err) {
      console.error('Bulk delete error:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to delete photos');
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle photo update after edit
  const handlePhotoUpdated = (updatedMedia: MontreeMedia) => {
    const updatedPhotos = photos.map(p =>
      p.id === updatedMedia.id ? { ...updatedMedia, area: updatedMedia.area, work_name: updatedMedia.work_name } : p
    ) as GalleryItem[];
    setPhotos(updatedPhotos);
    setEditingPhoto(null);
    setSelectedPhoto({ ...updatedMedia, area: updatedMedia.area, work_name: updatedMedia.work_name } as GalleryItem);
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{childName ? `${childName}'s Gallery` : 'Photo Gallery'}</h1>
          <p className="text-sm text-gray-500 mt-1">{photos.length} photos total</p>
        </div>

        {/* Selection mode toggle */}
        {filteredPhotos.length > 0 && (
          <button
            onClick={() => {
              setSelectionMode(!selectionMode);
              setSelectedIds(new Set());
            }}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              selectionMode
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {selectionMode ? '✓ Select' : 'Select'}
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <button
          onClick={() => {
            setFilterTab('all');
            setSelectedArea(null);
            setSelectedWork(null);
          }}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
            filterTab === 'all'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          All Photos
        </button>

        <button
          onClick={() => {
            setFilterTab('area');
            setSelectedWork(null);
            if (!selectedArea && uniqueAreas.length > 0) {
              setSelectedArea(uniqueAreas[0]);
            }
          }}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
            filterTab === 'area'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          By Area
        </button>

        <button
          onClick={() => {
            setFilterTab('work');
            setSelectedArea(null);
            if (!selectedWork && uniqueWorks.length > 0) {
              setSelectedWork(uniqueWorks[0]);
            }
          }}
          className={`px-4 py-2 rounded-full whitespace-nowrap font-medium transition-colors ${
            filterTab === 'work'
              ? 'bg-emerald-500 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          By Work
        </button>
      </div>

      {/* Sub-filters for Area/Work selection */}
      {filterTab === 'area' && uniqueAreas.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {uniqueAreas.map(area => {
            const config = getAreaConfig(area || '');
            const count = photos.filter(p => p.area === area).length;
            return (
              <button
                key={area}
                onClick={() => setSelectedArea(area || null)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors flex items-center gap-2 ${
                  selectedArea === area
                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <span>{config.icon}</span>
                <span>{config.name}</span>
                <span className="text-xs opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {filterTab === 'work' && uniqueWorks.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {uniqueWorks.map(work => {
            const count = photos.filter(p => p.work_name === work || p.work_id === work).length;
            return (
              <button
                key={work}
                onClick={() => setSelectedWork(work || null)}
                className={`px-3 py-2 rounded-lg whitespace-nowrap text-sm font-medium transition-colors ${
                  selectedWork === work
                    ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-500'
                    : 'bg-gray-100 text-gray-700 border-2 border-transparent hover:bg-gray-200'
                }`}
              >
                <span className="truncate">{work}</span>
                <span className="text-xs opacity-75 ml-1">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Selection toolbar */}
      {selectionMode && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center justify-between">
          <div className="text-sm font-medium text-blue-900">
            {selectedIds.size} photo{selectedIds.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleSelectAll}
              className="text-sm px-3 py-1 bg-blue-200 text-blue-800 rounded hover:bg-blue-300"
            >
              {selectedIds.size === filteredPhotos.length ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={() => {
                // TODO: Wire to reports later
                toast.success(`Selected ${selectedIds.size} photos for report`);
                setSelectionMode(false);
              }}
              className="text-sm px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Add to Report
            </button>
            <button
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="text-sm px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              🗑️ Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Gallery Display */}
      {filterTab === 'all' ? (
        // Grouped view (all)
        <div className="space-y-6">
          {Object.keys(groupedPhotos || {}).length === 0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-gray-500">No photos yet</p>
            </div>
          ) : (
            Object.entries(groupedPhotos || {}).map(([groupKey, items]) => {
              const [area, work] = groupKey.split('|');
              const areaConfig = getAreaConfig(area || '');

              return (
                <div key={groupKey} className="bg-white rounded-lg overflow-hidden shadow-sm">
                  {/* Group header */}
                  <div className="bg-gradient-to-r from-emerald-50 to-teal-50 px-4 py-3 border-l-4 border-emerald-500">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{areaConfig.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold text-gray-800">{work}</p>
                        <p className="text-xs text-gray-500">{areaConfig.name}</p>
                      </div>
                      <span className="text-xs bg-white px-2 py-1 rounded-full text-gray-600 font-medium">
                        {items.length} photo{items.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>

                  {/* Photos grid */}
                  <div className="p-4">
                    <MediaGallery
                      media={items}
                      loading={false}
                      onMediaClick={selectionMode ? undefined : setSelectedPhoto}
                      onMediaEdit={(media) => setEditingPhoto(media as GalleryItem)}
                      onMediaDelete={(media) => setPhotoToDelete(media as GalleryItem)}
                      emptyMessage="No photos"
                      selectedIds={selectedIds}
                      onSelectionChange={handleSelectionChange}
                      selectionMode={selectionMode}
                      showActions={!selectionMode}
                    />
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        // Simple grid view (area/work filtered)
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <MediaGallery
            media={filteredPhotos}
            loading={loading}
            onMediaClick={selectionMode ? undefined : setSelectedPhoto}
            onMediaEdit={(media) => setEditingPhoto(media as GalleryItem)}
            onMediaDelete={(media) => setPhotoToDelete(media as GalleryItem)}
            emptyMessage={loading ? 'Loading photos...' : 'No photos in this filter'}
            selectedIds={selectedIds}
            onSelectionChange={handleSelectionChange}
            selectionMode={selectionMode}
            showActions={!selectionMode}
          />
        </div>
      )}

      {/* Photo Detail Modal */}
      <PhotoDetailView
        media={selectedPhoto}
        childName={childName}
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        onEdit={() => {
          setEditingPhoto(selectedPhoto);
          setSelectedPhoto(null);
        }}
        onDelete={() => {
          setPhotoToDelete(selectedPhoto);
          setSelectedPhoto(null);
        }}
      />

      {/* Photo Edit Modal */}
      <PhotoEditModal
        media={editingPhoto}
        childName={childName}
        isOpen={!!editingPhoto}
        onClose={() => setEditingPhoto(null)}
        onSave={handlePhotoUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={!!photoToDelete}
        count={1}
        onConfirm={handleDeletePhoto}
        onCancel={() => setPhotoToDelete(null)}
        isDeleting={isDeleting}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={showBulkDeleteConfirm}
        count={selectedIds.size}
        onConfirm={handleBulkDelete}
        onCancel={() => setShowBulkDeleteConfirm(false)}
        isDeleting={isDeleting}
      />
    </div>
  );
}
