'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import { getSession, isHomeschoolParent } from '@/lib/montree/auth';
import Link from 'next/link';
import TeachingToolsSection from '@/components/montree/curriculum/TeachingToolsSection';
import CurriculumWorkList from '@/components/montree/curriculum/CurriculumWorkList';
import { Work, QuickGuideData } from '@/components/montree/curriculum/types';
import { AREA_CONFIG } from '@/lib/montree/types';
import { useI18n } from '@/lib/montree/i18n';
import { SUPPORTED_LOCALES, DEFAULT_LOCALE } from '@/lib/montree/i18n/locales';
import { getLocalizedWorkName } from '@/lib/montree/i18n/db-helpers';
import AreaBadge from '@/components/montree/shared/AreaBadge';
import WorkSearchBar from '@/components/montree/shared/WorkSearchBar';
import GuruContextBubble from '@/components/montree/guru/GuruContextBubble';
import { useCurriculumDragDrop } from '@/hooks/useCurriculumDragDrop';

// Tier 5 perf: code-split modal-gated components (~1.3k lines deferred).
const AddWorkModal = dynamic(() => import('@/components/montree/AddWorkModal'), { ssr: false });
const EditWorkModal = dynamic(() => import('@/components/montree/curriculum/EditWorkModal'), { ssr: false });
const FullDetailsModal = dynamic(() => import('@/components/montree/child/FullDetailsModal'), { ssr: false });
const DuplicateSheet = dynamic(() => import('@/components/montree/curriculum/DuplicateSheet'), { ssr: false });


export default function CurriculumPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const [session, setSession] = useState<any>(null);
  const [curriculum, setCurriculum] = useState<Work[]>([]);
  const [byArea, setByArea] = useState<Record<string, Work[]>>({});
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [expandedWork, setExpandedWork] = useState<string | null>(null);

  // Edit modal state
  const [editingWork, setEditingWork] = useState<Work | null>(null);

  // Add work modal state
  const [showAddModal, setShowAddModal] = useState(false);

  // Highlighted work from search
  const [highlightedWorkId, setHighlightedWorkId] = useState<string | null>(null);

  // Duplicate detection sheet state
  const [showDuplicates, setShowDuplicates] = useState(false);

  // Full Details modal state
  const [fullDetailsOpen, setFullDetailsOpen] = useState(false);
  const [fullDetailsWork, setFullDetailsWork] = useState('');
  const [fullDetailsDisplayName, setFullDetailsDisplayName] = useState('');
  const [fullDetailsData, setFullDetailsData] = useState<QuickGuideData | null>(null);
  const [fullDetailsLoading, setFullDetailsLoading] = useState(false);

  useEffect(() => {
    const sess = getSession();
    if (!sess) { router.push('/montree/login'); return; }
    setSession(sess);
  }, [router]);

  async function fetchCurriculum() {
    if (!session?.classroom?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/curriculum?classroom_id=${session.classroom.id}`);
      if (!res.ok) throw new Error(`Curriculum fetch: ${res.status}`);
      const data = await res.json();
      setCurriculum(data.curriculum || []);
      setByArea(data.byArea || {});
    } catch (err) {
      toast.error(t('curriculum.failedToLoad'));
    }
    setLoading(false);
  }

  useEffect(() => {
    if (!session?.classroom?.id) return;
    fetchCurriculum();
  }, [session?.classroom?.id]);

  // Drag-drop hook
  const {
    draggedWork,
    dragOverId,
    reordering,
    scrollContainerRef,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd,
    startAutoScroll,
    stopAutoScroll,
  } = useCurriculumDragDrop({
    selectedArea,
    byArea,
    setByArea,
    session,
    fetchCurriculum,
  });

  const handleImportCurriculum = async () => {
    if (!session?.classroom?.id) return;
    if (!confirm(t('curriculum.reimportConfirm'))) return;
    
    setImporting(true);
    try {
      const res = await fetch('/api/montree/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom.id,
          action: 'seed_from_brain'
        })
      });
      if (!res.ok) throw new Error(`Import failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        toast.success(`${data.seeded} ${t('curriculum.works')}!`);
        fetchCurriculum();
      } else {
        toast.error(data.error || 'Failed to import');
      }
    } catch (err) {
      toast.error(t('curriculum.failedToImport'));
    }
    setImporting(false);
  };


  // Delete work from curriculum
  const deleteWork = async (work: Work) => {
    if (!confirm(`${t('common.delete')} "${work.name}"?`)) return;

    try {
      const res = await fetch('/api/montree/curriculum', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          work_id: work.id,
        })
      });
      if (!res.ok) throw new Error(`Delete failed: ${res.status}`);
      const data = await res.json();
      if (data.success) {
        toast.success(t('curriculum.workDeleted'));
        fetchCurriculum();
      } else {
        toast.error(data.error || t('curriculum.failedToDelete'));
      }
    } catch (err) {
      toast.error(t('curriculum.failedToDelete'));
    }
  };


  // Open Full Details modal — fetch guide data from API
  // chineseName is legacy; we resolve the localized display name from the
  // full curriculum state via getLocalizedWorkName so every supported locale
  // shows the right header text (not just Chinese).
  const openFullDetails = async (workName: string, chineseName?: string) => {
    setFullDetailsWork(workName);
    const matchedWork = curriculum.find((w) => w.name === workName) as Record<string, unknown> | undefined;
    const localizedName = matchedWork ? getLocalizedWorkName(matchedWork, locale) : workName;
    // Fall back: if locale is en, just use workName; if zh and we have the legacy
    // `chineseName` arg but no match in curriculum state, honor it.
    const displayName = localizedName || (locale === 'zh' && chineseName ? chineseName : workName);
    setFullDetailsDisplayName(displayName);
    setFullDetailsLoading(true);
    setFullDetailsOpen(true);
    try {
      const classroomId = session?.classroom?.id;
      let url = classroomId
        ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
        : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
      // Pass locale for ANY non-English supported locale. The /works/guide API
      // merges guide_content_<locale> JSONB into the flat response. Was hardcoded
      // to zh-only before, silently shipping English to es/de/fr/pt/nl/it/ja/ko/uk/ru.
      if (locale !== DEFAULT_LOCALE && (SUPPORTED_LOCALES as readonly string[]).includes(locale)) {
        url += `&locale=${locale}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Guide fetch: ${res.status}`);
      const data = await res.json();
      setFullDetailsData(data);
    } catch {
      setFullDetailsData({ error: true });
    }
    setFullDetailsLoading(false);
  };

  // Area accent colours for dark forest cards
  const AREA_RGB: Record<string, string> = {
    practical_life: '236, 72, 153',
    sensorial: '20, 184, 166',
    mathematics: '168, 85, 247',
    language: '74, 222, 128',
    cultural: '249, 115, 22',
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a1a0f', backgroundImage: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-pulse" style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
          </div>
          <p style={{ fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>Loading Curriculum…</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a1a0f', backgroundImage: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)', backgroundAttachment: 'fixed' }}>
      <Toaster position="top-center" richColors />

      {/* Contextual Tip Bubble */}
      {session && isHomeschoolParent(session) && (
        <GuruContextBubble pageKey="curriculum" role="parent" />
      )}

      {/* Page sub-header — main nav is in DashboardHeader */}
      <div style={{ background: 'rgba(7,18,12,0.95)', borderBottom: '1px solid rgba(52,211,153,0.12)', padding: '12px 16px', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', position: 'sticky', top: 0, zIndex: 10 }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 20, fontWeight: 500, color: 'rgba(255,255,255,0.95)', margin: 0, letterSpacing: -0.3 }}>{t('curriculum.title')}</h1>
            <p style={{ fontFamily: '"Inter", -apple-system, sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: '2px 0 0' }}>{curriculum.length} {t('curriculum.worksAvailable')}</p>
          </div>
          <div className="flex items-center gap-2">
            <WorkSearchBar
              curriculum={byArea}
              onSelectWork={(work, areaKey) => {
                setSelectedArea(areaKey);
                // Expand and highlight the specific work, then scroll to it
                if (work.id) {
                  setExpandedWork(work.id);
                  setHighlightedWorkId(work.id);
                  // Clear highlight after animation
                  setTimeout(() => setHighlightedWorkId(null), 2000);
                }
              }}
              placeholder={t('curriculum.searchWorks')}
            />
            <button
              onClick={() => setShowDuplicates(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, color: '#f59e0b', fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
            >
              <span>🔗</span>
              <span className="hidden sm:inline">Duplicates</span>
            </button>
            <Link
              data-tutorial="browse-guide-link"
              href="/montree/dashboard/curriculum/browse"
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 12, color: 'rgba(255,255,255,0.70)', fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 500, textDecoration: 'none' }}
            >
              <span>🔍</span>
              <span className="hidden sm:inline">{t('curriculum.browseGuide')}</span>
            </Link>
            {curriculum.length > 0 && (
              <button
                data-tutorial="curriculum-add-button"
                onClick={() => setShowAddModal(true)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', borderRadius: 12, color: '#06281a', fontFamily: '"Inter", sans-serif', fontSize: 13, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(16,185,129,0.25)' }}
              >
                <span>➕</span>
                <span className="hidden sm:inline">{t('weekview.addWork')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {curriculum.length === 0 ? (
          <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(52,211,153,0.15)', borderRadius: 18, padding: '32px 24px', textAlign: 'center', backdropFilter: 'blur(18px) saturate(140%)', WebkitBackdropFilter: 'blur(18px) saturate(140%)' }}>
            <span className="text-5xl mb-4 block">📚</span>
            <h2 style={{ fontFamily: '"Lora", Georgia, serif', fontSize: 22, fontWeight: 500, color: 'rgba(255,255,255,0.95)', marginBottom: 8 }}>{t('curriculum.noCurriculum')}</h2>
            <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 14, color: 'rgba(255,255,255,0.45)', marginBottom: 24 }}>{t('curriculum.noCurriculumDesc')}</p>
            <button onClick={handleImportCurriculum} disabled={importing}
              style={{ background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', borderRadius: 14, padding: '14px 32px', color: '#06281a', fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 15, cursor: 'pointer', boxShadow: '0 4px 20px rgba(16,185,129,0.30)', opacity: importing ? 0.5 : 1 }}>
              {importing ? t('curriculum.importing') : `📥 ${t('curriculum.importMaster')}`}
            </button>
          </div>
        ) : (
          <>
            {/* Import/Re-import button */}
            <div className="mb-4 flex justify-between items-center">
              <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 13, color: 'rgba(255,255,255,0.35)' }}>{t('curriculum.tapToEdit')}</p>
              <button onClick={handleImportCurriculum} disabled={importing}
                style={{ fontSize: 13, padding: '7px 14px', background: 'rgba(245,158,11,0.10)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 12, color: '#f59e0b', fontFamily: '"Inter", sans-serif', cursor: 'pointer', opacity: importing ? 0.5 : 1 }}>
                {importing ? t('curriculum.importing') : `📥 ${t('curriculum.reimportMaster')}`}
              </button>
            </div>

            {/* Area Cards */}
            <div data-tutorial="area-cards" className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {Object.entries(byArea).map(([area, works]) => {
                const rgb = AREA_RGB[area] || '52, 211, 153';
                const isSelected = selectedArea === area;
                return (
                  <button key={area} onClick={() => setSelectedArea(isSelected ? null : area)}
                    style={{
                      background: isSelected ? `rgba(${rgb}, 0.12)` : 'rgba(255,255,255,0.06)',
                      border: `1px solid ${isSelected ? `rgba(${rgb}, 0.50)` : 'rgba(52,211,153,0.15)'}`,
                      borderRadius: 18,
                      padding: '16px',
                      backdropFilter: 'blur(18px) saturate(140%)',
                      WebkitBackdropFilter: 'blur(18px) saturate(140%)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 140ms ease',
                      boxShadow: isSelected ? `0 0 0 1px rgba(${rgb}, 0.20)` : 'none',
                    }}>
                    <div className="mb-2 flex items-center gap-2">
                      <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: `rgb(${rgb})`, flexShrink: 0 }} />
                      <AreaBadge area={area} size="lg" />
                    </div>
                    <p style={{ fontFamily: '"Inter", sans-serif', fontWeight: 600, color: 'rgba(255,255,255,0.90)', margin: '0 0 2px', fontSize: 14 }}>{t(('area.' + area) as any)}</p>
                    <p style={{ fontFamily: '"Inter", sans-serif', fontSize: 12, color: 'rgba(255,255,255,0.40)', margin: 0 }}>{works.length} {t('curriculum.works')}</p>
                  </button>
                );
              })}
            </div>

            {/* Teaching Tools Section */}
            <TeachingToolsSection />

            {/* Selected Area Works */}
            {selectedArea && byArea[selectedArea] && (
              <div data-tutorial="curriculum-work-first">
              <CurriculumWorkList
                selectedArea={selectedArea}
                works={byArea[selectedArea]}
                expandedWork={expandedWork}
                setExpandedWork={setExpandedWork}
                onEditWork={setEditingWork}
                onDeleteWork={deleteWork}
                onOpenFullDetails={openFullDetails}
                highlightedWorkId={highlightedWorkId}
                reordering={reordering}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onDragEnd={handleDragEnd}
                draggedWork={draggedWork}
                dragOverId={dragOverId}
                scrollContainerRef={scrollContainerRef}
                startAutoScroll={startAutoScroll}
                stopAutoScroll={stopAutoScroll}
                onWorkUpdated={fetchCurriculum}
              />
              </div>
            )}
          </>
        )}
      </main>

      {/* EDIT MODAL */}
      <EditWorkModal
        editingWork={editingWork}
        onClose={() => setEditingWork(null)}
        onSaved={fetchCurriculum}
        selectedArea={selectedArea || undefined}
      />

      {/* ADD WORK MODAL */}
      {session?.classroom?.id && (
        <AddWorkModal
          classroomId={session.classroom.id}
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchCurriculum}
          defaultArea={selectedArea || undefined}
          areaWorks={byArea}
        />
      )}

      {/* Floating Add Button (mobile) */}
      {curriculum.length > 0 && (
        <button
          onClick={() => setShowAddModal(true)}
          className="fixed bottom-20 right-4 sm:hidden z-30 active:scale-95"
          style={{ width: 56, height: 56, background: 'linear-gradient(180deg, #34d399, #10b981)', border: '1px solid rgba(52,211,153,0.55)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 4px 20px rgba(16,185,129,0.35)', cursor: 'pointer' }}
        >
          ➕
        </button>
      )}

      {/* Full Details Modal */}
      <FullDetailsModal
        isOpen={fullDetailsOpen}
        onClose={() => setFullDetailsOpen(false)}
        workName={fullDetailsDisplayName || fullDetailsWork}
        guideData={fullDetailsData}
        loading={fullDetailsLoading}
      />

      {/* Duplicate Detection Sheet */}
      <DuplicateSheet
        open={showDuplicates}
        onClose={() => setShowDuplicates(false)}
        onConsolidated={() => fetchCurriculum()}
      />

    </div>
  );
}
