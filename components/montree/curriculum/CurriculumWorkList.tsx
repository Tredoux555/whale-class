// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { Work, AREA_COLORS } from './types';
import AreaBadge from '../shared/AreaBadge';
import { toast } from 'sonner';

interface CurriculumWorkListProps {
  selectedArea: string;
  works: Work[];
  expandedWork: string | null;
  setExpandedWork: (id: string | null) => void;
  onEditWork: (work: Work) => void;
  onDeleteWork: (work: Work) => void;
  onOpenFullDetails?: (workName: string) => void;
  highlightedWorkId?: string | null;
  reordering: boolean;
  onDragStart: (e: React.DragEvent, work: Work) => void;
  onDragOver: (e: React.DragEvent, workId: string) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent, work: Work) => void;
  onDragEnd: () => void;
  draggedWork: Work | null;
  dragOverId: string | null;
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  startAutoScroll: (direction: 'up' | 'down', speed: number) => void;
  stopAutoScroll: () => void;
  onWorkUpdated?: () => void;
}

export default function CurriculumWorkList({
  selectedArea,
  works,
  expandedWork,
  setExpandedWork,
  onEditWork,
  onDeleteWork,
  onOpenFullDetails,
  highlightedWorkId,
  reordering,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  draggedWork,
  dragOverId,
  scrollContainerRef,
  startAutoScroll,
  stopAutoScroll,
  onWorkUpdated,
}: CurriculumWorkListProps) {
  const { t } = useI18n();
  // Scroll to highlighted work when it changes (from search)
  useEffect(() => {
    if (!highlightedWorkId) return;
    const timer = setTimeout(() => {
      const el = document.querySelector(`[data-work-id="${highlightedWorkId}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [highlightedWorkId]);

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800 capitalize flex items-center gap-2">
          <AreaBadge area={selectedArea} size="md" /> {selectedArea.replace('_', ' ')}
        </h3>
        <span className="text-xs text-gray-400 flex items-center gap-1">
          {reordering && <span className="animate-spin">⏳</span>}
          ↕️ {t('curriculum.dragToReorder')}
        </span>
      </div>
      <div
        ref={scrollContainerRef}
        className="space-y-2 max-h-[60vh] overflow-y-auto scroll-smooth"
      >
        {works.map(work => {
          const isExpanded = expandedWork === work.id;
          const isDragging = draggedWork?.id === work.id;
          const isDragOver = dragOverId === work.id;
          const isHighlighted = highlightedWorkId === work.id;
          return (
            <div
              key={work.id}
              data-work-id={work.id}
              draggable
              onDragStart={(e) => onDragStart(e, work)}
              onDragOver={(e) => onDragOver(e, work.id)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, work)}
              onDragEnd={onDragEnd}
              className={`bg-gray-50 rounded-xl overflow-hidden transition-all
                ${isDragging ? 'opacity-50 scale-95' : ''}
                ${isDragOver ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
                ${isHighlighted ? 'ring-2 ring-emerald-500 ring-offset-2 bg-emerald-50 animate-pulse' : ''}`}
            >
              {/* Work Header */}
              <div className="flex items-center gap-2 p-3">
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 px-1">
                  ⋮⋮
                </div>
                <button
                  onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                  className="flex-1 flex items-center gap-3 text-left hover:bg-gray-100 rounded-lg transition-colors"
                >
                  {/* Photo thumbnail or color bar */}
                  {work.photo_url ? (
                    <img src={work.photo_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-200" />
                  ) : (
                    <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${AREA_COLORS[selectedArea]}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800">{work.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">{work.age_range || '3-6'}</span>
                    <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▼</span>
                  </div>
                </button>
                {/* Edit button */}
                <button onClick={() => onEditWork(work)}
                  className="w-8 h-8 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center hover:bg-blue-200">
                  ✏️
                </button>
                {/* Delete button */}
                <button onClick={() => onDeleteWork(work)}
                  className="w-8 h-8 bg-gray-100 text-gray-500 rounded-lg flex items-center justify-center hover:bg-red-100 hover:text-red-600"
                  title={t('curriculum.deleteWork')}>
                  🗑️
                </button>
              </div>

              {/* Expanded Details — key forces state reset per work */}
              {isExpanded && (
                <ExpandedWorkDetails
                  key={work.id}
                  work={work}
                  selectedArea={selectedArea}
                  onOpenFullDetails={onOpenFullDetails}
                  onWorkUpdated={onWorkUpdated}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Extracted expanded details with photo upload
function ExpandedWorkDetails({
  work,
  selectedArea,
  onOpenFullDetails,
  onWorkUpdated,
}: {
  work: Work;
  selectedArea: string;
  onOpenFullDetails?: (workName: string) => void;
  onWorkUpdated?: () => void;
}) {
  const { t } = useI18n();
  const [uploading, setUploading] = useState(false);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(work.photo_url || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error(t('curriculum.photoTooLarge'));
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.set('work_id', work.id);
      formData.set('photo', file);

      const res = await fetch('/api/montree/curriculum/photo', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.photo_url) {
        setCurrentPhotoUrl(data.photo_url);
        toast.success(t('curriculum.photoAdded'));
        onWorkUpdated?.();
      } else {
        toast.error(data.error || t('curriculum.failedToUpload'));
      }
    } catch {
      toast.error(t('curriculum.uploadFailed'));
    }
    setUploading(false);
    // Reset the input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemovePhoto = async () => {
    if (!confirm(t('curriculum.removePhotoConfirm'))) return;
    try {
      const res = await fetch('/api/montree/curriculum/photo', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ work_id: work.id }),
      });
      if (res.ok) {
        setCurrentPhotoUrl(null);
        toast.success(t('curriculum.photoRemoved'));
        onWorkUpdated?.();
      }
    } catch {
      toast.error(t('curriculum.failedToRemovePhoto'));
    }
  };

  return (
    <div className="px-4 pb-4 pt-2 border-t border-gray-200 space-y-3">
      {/* Photo section */}
      <div className="flex items-start gap-3">
        {currentPhotoUrl ? (
          <div className="relative group">
            <img src={currentPhotoUrl} alt={work.name} className="w-32 h-24 object-cover rounded-xl border border-gray-200" />
            <button
              onClick={handleRemovePhoto}
              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full text-xs flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm"
              title={t('curriculum.removePhoto')}
            >
              ×
            </button>
            <label className="absolute bottom-1 right-1 w-6 h-6 bg-white/90 text-gray-600 rounded-full text-xs flex items-center justify-center cursor-pointer sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shadow-sm hover:bg-white" title={t('curriculum.changePhoto')}>
              📷
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center w-32 h-24 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${uploading ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/50'}`}>
            {uploading ? (
              <span className="text-sm text-emerald-600 animate-pulse">{t('curriculum.uploading')}</span>
            ) : (
              <>
                <span className="text-xl">📷</span>
                <span className="text-xs text-gray-400 mt-1">{t('curriculum.addPhoto')}</span>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
          </label>
        )}

        <div className="flex-1 min-w-0">
          {/* QUICK GUIDE */}
          {work.quick_guide && (
            <div className="bg-gradient-to-r from-amber-50 to-yellow-50 p-3 rounded-xl border border-amber-200">
              <div className="flex items-center justify-between mb-1">
                <p className="font-bold text-amber-800 text-sm flex items-center gap-1">
                  ⚡ {t('curriculum.quickGuide')}
                </p>
                <a
                  href={`https://youtube.com/results?search_query=${encodeURIComponent('montessori ' + work.name + ' presentation')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 transition-colors"
                >
                  🎬 {t('curriculum.video')}
                </a>
              </div>
              <div className="text-xs text-amber-900 space-y-0.5">
                {work.quick_guide.split('\n').map((line, i) => (
                  <p key={i} className="leading-relaxed">{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video button if no quick guide */}
      {!work.quick_guide && (
        <a
          href={`https://youtube.com/results?search_query=${encodeURIComponent('montessori ' + work.name + ' presentation')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors"
        >
          🎬 {t('curriculum.watchPresentationVideo')}
        </a>
      )}

      {/* Full Details Button */}
      {onOpenFullDetails && (
        <button
          onClick={() => onOpenFullDetails(work.name)}
          className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:from-emerald-600 hover:to-teal-700 active:scale-[0.98] transition-all shadow-sm"
        >
          📚 {t('curriculum.fullDetails')}
        </button>
      )}

      {/* Teacher Notes (if any) */}
      {work.teacher_notes && (
        <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <p className="font-semibold text-yellow-700 text-xs mb-1">📝 {t('curriculum.teacherNotes')}</p>
          <p className="text-sm text-yellow-800">{work.teacher_notes}</p>
        </div>
      )}

      {/* Parent Description */}
      {work.parent_description && (
        <div className="bg-emerald-50 p-3 rounded-lg">
          <p className="font-semibold text-emerald-700 text-xs mb-1">👨‍👩‍👧 {t('curriculum.forParents')}</p>
          <p className="text-sm text-emerald-800">{work.parent_description}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
        {work.direct_aims?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700 mb-1">🎯 {t('curriculum.directAims')}</p>
            <ul className="text-gray-600 space-y-0.5">
              {work.direct_aims.map((aim: string, i: number) => (
                <li key={i} className="text-xs">• {aim}</li>
              ))}
            </ul>
          </div>
        )}

        {work.indirect_aims?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700 mb-1">🌱 {t('curriculum.indirectAims')}</p>
            <ul className="text-gray-600 space-y-0.5">
              {work.indirect_aims.map((aim: string, i: number) => (
                <li key={i} className="text-xs">• {aim}</li>
              ))}
            </ul>
          </div>
        )}

        {work.materials?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700 mb-1">🧰 {t('curriculum.materials')}</p>
            <ul className="text-gray-600 space-y-0.5">
              {work.materials.map((item: string, i: number) => (
                <li key={i} className="text-xs">• {item}</li>
              ))}
            </ul>
          </div>
        )}

        {work.prerequisites?.length > 0 && (
          <div>
            <p className="font-semibold text-gray-700 mb-1">✅ {t('curriculum.prerequisites')}</p>
            <ul className="text-gray-600 space-y-0.5">
              {work.prerequisites.map((item: string, i: number) => (
                <li key={i} className="text-xs">• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {work.why_it_matters && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="font-semibold text-blue-700 text-xs mb-1">💡 {t('curriculum.whyItMatters')}</p>
          <p className="text-sm text-blue-800">{work.why_it_matters}</p>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {work.age_range && (
          <span className="text-xs px-2 py-1 bg-gray-200 text-gray-700 rounded-full">
            {t('curriculum.age')}: {work.age_range}
          </span>
        )}
        {work.control_of_error && (
          <span className="text-xs px-2 py-1 bg-amber-100 text-amber-700 rounded-full">
            {t('curriculum.control')}: {work.control_of_error}
          </span>
        )}
      </div>
    </div>
  );
}
