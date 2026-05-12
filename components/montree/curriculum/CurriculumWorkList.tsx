// @ts-nocheck
'use client';

import { useEffect, useState, useRef } from 'react';
import { useI18n } from '@/lib/montree/i18n';
import { getLocalizedWorkName, getLocalizedField, getLocalizedGuideField } from '@/lib/montree/i18n/db-helpers';
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
  onOpenFullDetails?: (workName: string, chineseName?: string) => void;
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
  const { t, locale } = useI18n();
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
    <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 18, padding: 16, backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold capitalize flex items-center gap-2" style={{ fontFamily: '"Lora", Georgia, serif', fontWeight: 500, color: 'rgba(255,255,255,0.95)', fontSize: 18 }}>
          <AreaBadge area={selectedArea} size="md" /> {t(('area.' + selectedArea) as any)}
        </h3>
        <span className="flex items-center gap-1" style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
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
              style={{
                background: isHighlighted ? 'rgba(52,211,153,0.10)' : isExpanded ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${isDragOver ? 'rgba(52,211,153,0.55)' : isHighlighted ? 'rgba(52,211,153,0.40)' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 14,
                overflow: 'hidden',
                transition: 'all 140ms ease',
                opacity: isDragging ? 0.5 : 1,
                transform: isDragging ? 'scale(0.97)' : 'none',
                outline: isDragOver ? '2px solid rgba(52,211,153,0.30)' : 'none',
              }}
            >
              {/* Work Header */}
              <div className="flex items-center gap-2 p-3">
                {/* Drag Handle */}
                <div className="cursor-grab active:cursor-grabbing px-1" style={{ color: 'rgba(255,255,255,0.30)', fontSize: 16 }}>
                  ⋮⋮
                </div>
                <button
                  onClick={() => setExpandedWork(isExpanded ? null : work.id)}
                  className="flex-1 flex items-center gap-3 text-left rounded-lg transition-colors"
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px 0' }}
                >
                  {/* Photo thumbnail or color bar */}
                  {work.photo_url ? (
                    // 🚨 Tier 5.1 — explicit width/height attrs prevent CLS.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={work.photo_url} alt="" width={40} height={40} loading="lazy" decoding="async" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(52,211,153,0.20)' }} />
                  ) : (
                    <div className={`w-2 h-8 rounded-full bg-gradient-to-b ${AREA_COLORS[selectedArea]}`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 500, color: 'rgba(255,255,255,0.90)', margin: 0, fontSize: 14 }}>{getLocalizedWorkName(work, locale)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>{work.age_range || '3-6'}</span>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: 12, transition: 'transform 140ms ease', display: 'inline-block', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                  </div>
                </button>
                {/* Edit button */}
                <button onClick={() => onEditWork(work)}
                  style={{ width: 32, height: 32, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.25)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>
                  ✏️
                </button>
                {/* Delete button */}
                <button onClick={() => onDeleteWork(work)}
                  style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}
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
  onOpenFullDetails?: (workName: string, chineseName?: string) => void;
  onWorkUpdated?: () => void;
}) {
  const { t, locale } = useI18n();
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        toast.error(errData.error || t('curriculum.failedToUpload'));
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }
      const data = await res.json();
      if (data.photo_url) {
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
    <div className="space-y-3" style={{ padding: '12px 16px 16px', borderTop: '1px solid rgba(52,211,153,0.12)' }}>
      {/* Photo section */}
      <div className="flex items-start gap-3">
        {currentPhotoUrl ? (
          <div className="relative group">
            {/* 🚨 Tier 5.1 — explicit width/height attrs prevent CLS. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={currentPhotoUrl} alt={work.name} width={128} height={96} loading="lazy" decoding="async" style={{ width: 128, height: 96, objectFit: 'cover', borderRadius: 12, border: '1px solid rgba(52,211,153,0.20)' }} />
            <button
              onClick={handleRemovePhoto}
              className="absolute top-1 right-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              style={{ width: 24, height: 24, background: '#ef4444', color: 'white', borderRadius: '50%', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.4)' }}
              title={t('curriculum.removePhoto')}
            >
              ×
            </button>
            <label
              className="absolute bottom-1 right-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
              style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.85)', color: '#333', borderRadius: '50%', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}
              title={t('curriculum.changePhoto')}
            >
              📷
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" />
            </label>
          </div>
        ) : (
          <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: 128, height: 96, border: `2px dashed ${uploading ? 'rgba(52,211,153,0.50)' : 'rgba(52,211,153,0.25)'}`, borderRadius: 12, cursor: 'pointer', background: uploading ? 'rgba(52,211,153,0.06)' : 'transparent', transition: 'all 140ms ease' }}>
            {uploading ? (
              <span className="animate-pulse" style={{ fontFamily: '"Inter", sans-serif', fontSize: 12, color: '#34d399' }}>{t('curriculum.uploading')}</span>
            ) : (
              <>
                <span style={{ fontSize: 20 }}>📷</span>
                <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.40)', marginTop: 4 }}>{t('curriculum.addPhoto')}</span>
              </>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploading} />
          </label>
        )}

        <div className="flex-1 min-w-0">
          {/* QUICK GUIDE */}
          {getLocalizedGuideField<string>(work, 'quick_guide', locale) && (
            <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)', borderRadius: 12, padding: 12 }}>
              <div className="flex items-center justify-between mb-1">
                <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, color: '#f59e0b', fontSize: 12, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚡ {t('curriculum.quickGuide')}
                </p>
                <a
                  href={`https://youtube.com/results?search_query=${encodeURIComponent('montessori ' + work.name + ' presentation')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', background: '#ef4444', color: 'white', fontSize: 11, fontWeight: 700, borderRadius: 8, textDecoration: 'none' }}
                >
                  🎬 {t('curriculum.video')}
                </a>
              </div>
              <div style={{ fontFamily: '"Inter", sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                {getLocalizedGuideField<string>(work, 'quick_guide', locale)?.split('\n').map((line, i) => (
                  <p key={i} style={{ lineHeight: 1.55, margin: '2px 0' }}>{line}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video button if no quick guide (in current locale or English fallback) */}
      {!getLocalizedGuideField<string>(work, 'quick_guide', locale) && (
        <a
          href={`https://youtube.com/results?search_query=${encodeURIComponent('montessori ' + work.name + ' presentation')}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 16px', background: '#ef4444', color: 'white', fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 14, borderRadius: 12, textDecoration: 'none' }}
        >
          🎬 {t('curriculum.watchPresentationVideo')}
        </a>
      )}

      {/* Full Details Button */}
      {onOpenFullDetails && (
        <button
          onClick={() => onOpenFullDetails(work.name, work.name_chinese)}
          className="w-full active:scale-[0.98] transition-all"
          style={{ padding: '12px 16px', background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', borderRadius: 12, color: '#06281a', fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(16,185,129,0.25)' }}
        >
          📚 {t('curriculum.fullDetails')}
        </button>
      )}

      {/* Teacher Notes (if any) */}
      {work.teacher_notes && (
        <div style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.20)', borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: '#f59e0b', fontSize: 11, marginBottom: 4, marginTop: 0 }}>📝 {t('curriculum.teacherNotes')}</p>
          <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.80)', margin: 0 }}>{work.teacher_notes}</p>
        </div>
      )}

      {/* Parent Description */}
      {work.parent_description && (
        <div style={{ background: 'rgba(52,211,153,0.07)', border: '1px solid rgba(52,211,153,0.18)', borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: '#34d399', fontSize: 11, marginBottom: 4, marginTop: 0 }}>👨‍👩‍👧 {t('curriculum.forParents')}</p>
          <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{getLocalizedField(work, 'parent_description', locale)}</p>
        </div>
      )}

      {/* Details Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(() => {
          // Extract once + Array.isArray() guard. Some legacy JSONB rows may
          // store these as a string instead of an array (Haiku's oneOf schema
          // permitted both); without the guard, `.map()` would throw.
          const directAims = getLocalizedGuideField<string[]>(work, 'direct_aims', locale);
          if (!Array.isArray(directAims) || directAims.length === 0) return null;
          return (
            <div>
              <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 4, marginTop: 0 }}>🎯 {t('curriculum.directAims')}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {directAims.map((aim: string, i: number) => (
                  <li key={i} style={{ fontFamily: '"Inter", sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 2 }}>• {aim}</li>
                ))}
              </ul>
            </div>
          );
        })()}

        {(() => {
          const indirectAims = getLocalizedGuideField<string[]>(work, 'indirect_aims', locale);
          if (!Array.isArray(indirectAims) || indirectAims.length === 0) return null;
          return (
            <div>
              <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 4, marginTop: 0 }}>🌱 {t('curriculum.indirectAims')}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {indirectAims.map((aim: string, i: number) => (
                  <li key={i} style={{ fontFamily: '"Inter", sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 2 }}>• {aim}</li>
                ))}
              </ul>
            </div>
          );
        })()}

        {(() => {
          const materialsList = getLocalizedGuideField<string[]>(work, 'materials', locale);
          if (!Array.isArray(materialsList) || materialsList.length === 0) return null;
          return (
            <div>
              <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 4, marginTop: 0 }}>🧰 {t('curriculum.materials')}</p>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                {materialsList.map((item: string, i: number) => (
                  <li key={i} style={{ fontFamily: '"Inter", sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 2 }}>• {item}</li>
                ))}
              </ul>
            </div>
          );
        })()}

        {work.prerequisites?.length > 0 && (
          <div>
            <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.65)', fontSize: 12, marginBottom: 4, marginTop: 0 }}>✅ {t('curriculum.prerequisites')}</p>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {work.prerequisites.map((item: string, i: number) => (
                <li key={i} style={{ fontFamily: '"Inter", sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, marginBottom: 2 }}>• {item}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {work.why_it_matters && (
        <div style={{ background: 'rgba(96,165,250,0.07)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: 10, padding: 12 }}>
          <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(147,197,253,0.90)', fontSize: 11, marginBottom: 4, marginTop: 0 }}>💡 {t('curriculum.whyItMatters')}</p>
          <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.75)', margin: 0 }}>{getLocalizedField(work, 'why_it_matters', locale)}</p>
        </div>
      )}

      {/* Tags */}
      <div className="flex flex-wrap gap-2">
        {work.age_range && (
          <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, padding: '4px 10px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 999, color: 'rgba(255,255,255,0.55)' }}>
            {t('curriculum.age')}: {work.age_range}
          </span>
        )}
        {getLocalizedGuideField<string>(work, 'control_of_error', locale) && (
          <span style={{ fontFamily: '"Inter", sans-serif', fontSize: 11, padding: '4px 10px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 999, color: '#f59e0b' }}>
            {t('curriculum.control')}: {getLocalizedGuideField<string>(work, 'control_of_error', locale)}
          </span>
        )}
      </div>
    </div>
  );
}
