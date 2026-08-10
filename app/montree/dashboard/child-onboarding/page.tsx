// app/montree/dashboard/child-onboarding/page.tsx
//
// Child Onboarding, teacher side. Three states:
//
//   list   → every family intake, submissions first
//   review → one submission in full, read-only, allergies in red, documents
//            openable, and the Commit button
//   print  → the paper: cubby / toothbrush / bed / table labels and the two
//            pickup sheets, rendered by the SHARED CORE components
//
// 🚨 Nothing reaches montree_children until Commit. The review screen is the
// product, exactly as it is in Photo Onboarding.
//
// Screen is dark; paper is white. The printable block is the only white thing
// on the page and it is `hidden print:block`.

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { ClipboardList, Printer, ArrowLeft } from 'lucide-react';
import { getSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
import LabelSheets, { type LabelItem, type LabelType } from '@/lib/onboarding-core/print/LabelSheets';
import PickupSheets, { type PickupSheetChild, type PickupSheetKind } from '@/lib/onboarding-core/print/PickupSheets';
import {
  EN,
  normalizeIntake,
  type IntakeForm,
  type IntakeStatus,
} from '@/lib/onboarding-core';

type PageState = 'list' | 'review' | 'print';

interface ListItem {
  id: string;
  child_id: string;
  child_name: string;
  status: IntakeStatus;
  submitted_at: string | null;
  committed_at: string | null;
  updated_at: string;
}

interface PrintChildRow {
  childId: string;
  childName: string;
  photoUrl: string | null;
  guardians: string[];
  pickupPersons: Array<{ name: string; relation: string; phone: string; photoUrl: string | null }>;
  allergies: string[];
}

type PrintTarget =
  | { mode: 'labels'; labelType: LabelType }
  | { mode: 'pickup'; kind: PickupSheetKind };

const STATUS_TONE: Record<IntakeStatus, { bg: string; border: string; color: string }> = {
  submitted: { bg: 'rgba(245,158,11,0.14)', border: 'rgba(245,158,11,0.45)', color: '#fbbf24' },
  draft: { bg: 'rgba(255,255,255,0.06)', border: 'rgba(255,255,255,0.14)', color: 'rgba(255,255,255,0.55)' },
  committed: { bg: 'rgba(52,211,153,0.12)', border: 'rgba(52,211,153,0.40)', color: '#34d399' },
};

function ReadRow({ label, value }: { label: string; value?: string | null }) {
  const v = (value || '').trim();
  if (!v) return null;
  return (
    <div style={{ display: 'flex', gap: 12, padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
      <span style={{ minWidth: 150, fontSize: 12, color: 'rgba(255,255,255,0.40)' }}>{label}</span>
      <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.90)', whiteSpace: 'pre-wrap', flex: 1 }}>{v}</span>
    </div>
  );
}

function ReviewSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section
      style={{
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(52,211,153,0.15)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
      }}
    >
      <h2 style={{ fontSize: 12, letterSpacing: 0.8, textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: 10 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ChildOnboardingPage() {
  const router = useRouter();
  const { t } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();

  const [loading, setLoading] = useState(true);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [classroomId, setClassroomId] = useState('');
  const [pageState, setPageState] = useState<PageState>('list');

  const [items, setItems] = useState<ListItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeForm, setActiveForm] = useState<IntakeForm | null>(null);
  const [activeChildName, setActiveChildName] = useState('');
  const [activeStatus, setActiveStatus] = useState<IntakeStatus>('draft');
  const [documentUrls, setDocumentUrls] = useState<Record<string, string>>({});
  const [committing, setCommitting] = useState(false);

  const [printRows, setPrintRows] = useState<PrintChildRow[]>([]);
  const [printTarget, setPrintTarget] = useState<PrintTarget>({ mode: 'labels', labelType: 'cubby' });
  const [printLoading, setPrintLoading] = useState(false);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    if (sess.classroom?.id) setClassroomId(sess.classroom.id);
  }, [router]);

  // ── List ────────────────────────────────────────────────────────────────
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await montreeApi('/api/montree/child-onboarding');
      const data = await res.json().catch(() => ({}));
      if (res.status === 403 && data?.error === 'feature_disabled') {
        setFeatureDisabled(true);
        return;
      }
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      setItems(Array.isArray(data.items) ? data.items : []);
    } catch (err) {
      console.error('[child-onboarding] list failed:', err);
      toast.error(t('childOnboarding.loadFailed'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadList(); }, [loadList]);

  // ── Review ──────────────────────────────────────────────────────────────
  const openReview = useCallback(async (item: ListItem) => {
    setActiveId(item.id);
    setActiveChildName(item.child_name);
    setActiveStatus(item.status);
    setActiveForm(null);
    setDocumentUrls({});
    setPageState('review');
    try {
      const res = await montreeApi(`/api/montree/child-onboarding/${item.id}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      setActiveForm(normalizeIntake(data.data));
      setDocumentUrls(data.documentUrls || {});
      if (data?.intake?.status) setActiveStatus(data.intake.status as IntakeStatus);
      if (data?.child?.name) setActiveChildName(data.child.name);
    } catch (err) {
      console.error('[child-onboarding] review load failed:', err);
      toast.error(t('childOnboarding.loadFailed'));
      setPageState('list');
    }
  }, [t]);

  const commit = useCallback(async () => {
    if (!activeId) return;
    setCommitting(true);
    try {
      const res = await montreeApi(`/api/montree/child-onboarding/${activeId}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'commit' }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      setActiveStatus('committed');
      toast.success(t('childOnboarding.committedToast'));
      await loadList();
    } catch (err) {
      console.error('[child-onboarding] commit failed:', err);
      toast.error(err instanceof Error ? err.message : t('childOnboarding.commitFailed'));
    } finally {
      setCommitting(false);
    }
  }, [activeId, loadList, t]);

  // ── Print ───────────────────────────────────────────────────────────────
  const openPrint = useCallback(async () => {
    setPageState('print');
    setPrintLoading(true);
    try {
      const qs = classroomId ? `?classroomId=${encodeURIComponent(classroomId)}` : '';
      const res = await montreeApi(`/api/montree/child-onboarding/print-data${qs}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      setPrintRows(Array.isArray(data.children) ? data.children : []);
    } catch (err) {
      console.error('[child-onboarding] print data failed:', err);
      toast.error(t('childOnboarding.loadFailed'));
    } finally {
      setPrintLoading(false);
    }
  }, [classroomId, t]);

  const doPrint = useCallback((target: PrintTarget) => {
    if (printRows.length === 0) {
      toast.error(t('childOnboarding.nothingToPrint'));
      return;
    }
    setPrintTarget(target);
    // Let React paint the chosen sheet before the print dialog snapshots it.
    window.setTimeout(() => window.print(), 60);
  }, [printRows.length, t]);

  const labelItems: LabelItem[] = useMemo(
    () => printRows.map((r) => ({ childName: r.childName, photoUrl: r.photoUrl })),
    [printRows]
  );
  const pickupRows: PickupSheetChild[] = useMemo(
    () => printRows.map((r) => ({
      childName: r.childName,
      photoUrl: r.photoUrl,
      guardians: r.guardians,
      pickupPersons: r.pickupPersons,
      allergies: r.allergies,
    })),
    [printRows]
  );

  // ── Render ──────────────────────────────────────────────────────────────
  const glow = (
    <div
      aria-hidden
      className="fixed inset-0 pointer-events-none print:hidden"
      style={{ background: 'radial-gradient(circle at 50% 0%, rgba(39,129,90,0.32), transparent 60%)' }}
    />
  );

  if (featuresLoading) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isEnabled('child_onboarding') || featureDisabled) {
    return (
      <div className="min-h-screen bg-[#0a1a0f] p-6 relative">
        {glow}
        <Toaster position="top-center" />
        <div className="relative max-w-lg mx-auto text-center py-20">
          <ClipboardList className="w-12 h-12 mx-auto mb-4 text-emerald-400/70" />
          <h1 className="text-2xl font-bold text-white/95 mb-3">{t('childOnboarding.disabledTitle')}</h1>
          <p className="text-white/60 mb-6">{t('childOnboarding.disabledBody')}</p>
          <p className="text-sm text-white/40">{t('childOnboarding.contactAdmin')}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#0a1a0f] relative print:hidden">
        {glow}
        <Toaster position="top-center" />

        {/* Header */}
        <div className="relative bg-[rgba(7,18,12,0.9)] border-b border-[rgba(52,211,153,0.15)] px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => (pageState === 'list' ? router.push('/montree/dashboard/students') : setPageState('list'))}
            className="btn btn-ghost btn-icon btn-sm"
            aria-label={t('common.back')}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-lg font-semibold text-white/95 flex items-center gap-2 flex-1 min-w-0">
            <ClipboardList className="w-5 h-5 text-emerald-400" />
            <span className="truncate">{t('childOnboarding.title')}</span>
          </h1>
          {pageState === 'list' && (
            <button onClick={() => void openPrint()} className="btn btn-secondary btn-sm">
              <Printer className="w-4 h-4" />
              {t('childOnboarding.print')}
            </button>
          )}
        </div>

        <div className="relative max-w-2xl mx-auto p-4 pb-28">
          {/* ── LIST ── */}
          {pageState === 'list' && (
            loading ? (
              <div className="text-center py-16 text-white/40">{t('common.loading')}</div>
            ) : items.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-white/70 mb-2">{t('childOnboarding.emptyTitle')}</p>
                <p className="text-white/40 text-sm">{t('childOnboarding.emptyBody')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((item) => {
                  const tone = STATUS_TONE[item.status];
                  const statusText =
                    item.status === 'committed'
                      ? t('childOnboarding.statusCommitted')
                      : item.status === 'submitted'
                        ? t('childOnboarding.statusSubmitted')
                        : t('childOnboarding.statusDraft');
                  return (
                    <button
                      key={item.id}
                      onClick={() => void openReview(item)}
                      className="w-full text-left rounded-2xl border border-[rgba(52,211,153,0.15)] bg-white/[0.06] px-4 py-3 flex items-center gap-3"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-white/95 font-medium truncate">{item.child_name}</span>
                        <span className="block text-xs text-white/40 mt-0.5">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </span>
                      </span>
                      <span
                        className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ background: tone.bg, border: `1px solid ${tone.border}`, color: tone.color }}
                      >
                        {statusText}
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          )}

          {/* ── REVIEW ── */}
          {pageState === 'review' && (
            !activeForm ? (
              <div className="text-center py-16 text-white/40">{t('common.loading')}</div>
            ) : (
              <div>
                <div className="mb-4">
                  <h2 className="text-xl font-bold text-white/95">{activeChildName}</h2>
                  <p className="text-xs text-white/40 mt-1">
                    {activeStatus === 'committed'
                      ? t('childOnboarding.statusCommitted')
                      : activeStatus === 'submitted'
                        ? t('childOnboarding.statusSubmitted')
                        : t('childOnboarding.statusDraft')}
                  </p>
                </div>

                {/* Allergies get the loudest position on the page. */}
                {activeForm.health.allergies.length > 0 && (
                  <div
                    className="rounded-2xl px-4 py-3 mb-3"
                    style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.45)' }}
                  >
                    <div className="text-xs uppercase tracking-wide text-red-300/80 mb-2">{EN.allergies}</div>
                    {activeForm.health.allergies.map((a, i) => (
                      <div key={i} className="text-sm text-white/90 mb-1">
                        <strong>{a.allergen}</strong>
                        <span className="text-white/60"> — {a.severity}</span>
                        {a.action ? <span className="text-white/60"> · {a.action}</span> : null}
                      </div>
                    ))}
                  </div>
                )}

                <ReviewSection title={EN.sectionIdentity}>
                  <ReadRow label={EN.legalName} value={activeForm.identity.legalName} />
                  <ReadRow label={EN.preferredName} value={activeForm.identity.preferredName} />
                  <ReadRow label={EN.dob} value={activeForm.identity.dob} />
                  <ReadRow label={EN.sex} value={activeForm.identity.sex} />
                  <ReadRow label={EN.nationality} value={activeForm.identity.nationality} />
                  <ReadRow label={EN.homeLanguages} value={(activeForm.identity.homeLanguages || []).join(', ')} />
                </ReviewSection>

                <ReviewSection title={EN.sectionFamily}>
                  {activeForm.family.guardians.map((g, i) => (
                    <ReadRow
                      key={i}
                      label={`${EN.guardian} ${i + 1}`}
                      value={[g.name, g.relation, g.phone, g.wechat, g.email].filter(Boolean).join(' · ')}
                    />
                  ))}
                  <ReadRow label={EN.homeAddress} value={activeForm.family.homeAddress} />
                </ReviewSection>

                <ReviewSection title={EN.sectionEmergency}>
                  {activeForm.emergency.contacts.map((c, i) => (
                    <ReadRow key={i} label={`${i + 1}`} value={[c.name, c.relation, c.phone].filter(Boolean).join(' · ')} />
                  ))}
                </ReviewSection>

                <ReviewSection title={EN.sectionPickup}>
                  {activeForm.pickup.persons.map((p, i) => (
                    <div key={i} className="flex items-center gap-3 py-2 border-b border-white/5">
                      {documentUrls[`pickup-${i}`] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={documentUrls[`pickup-${i}`]} alt="" className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-white/10 flex-shrink-0" />
                      )}
                      <div className="min-w-0 text-sm text-white/90">
                        <div className="truncate">{p.name || '—'}</div>
                        <div className="text-xs text-white/40">{[p.relation, p.phone].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                  ))}
                  <ReadRow label={EN.pickupNotes} value={activeForm.pickup.notes} />
                </ReviewSection>

                <ReviewSection title={EN.sectionHealth}>
                  <ReadRow label={EN.dietaryRestrictions} value={activeForm.health.dietaryRestrictions} />
                  <ReadRow label={EN.conditions} value={activeForm.health.conditions} />
                  <ReadRow label={EN.medications} value={activeForm.health.medications} />
                  <ReadRow label={EN.physicianName} value={activeForm.health.physicianName} />
                  <ReadRow label={EN.physicianPhone} value={activeForm.health.physicianPhone} />
                  <ReadRow label={EN.bloodType} value={activeForm.health.bloodType} />
                </ReviewSection>

                <ReviewSection title={EN.sectionDocuments}>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { key: 'facePhoto', label: EN.facePhoto },
                      { key: 'vaccinationBooklet', label: EN.vaccinationBooklet },
                      { key: 'healthCheck', label: EN.healthCheck },
                      ...(activeForm.documents.medicalCertPaths || []).map((_, i) => ({
                        key: `medical-${i}`,
                        label: `${EN.medicalCerts} ${i + 1}`,
                      })),
                    ].map((doc) =>
                      documentUrls[doc.key] ? (
                        <a
                          key={doc.key}
                          href={documentUrls[doc.key]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                        >
                          {doc.label}
                        </a>
                      ) : null
                    )}
                  </div>
                </ReviewSection>

                <ReviewSection title={EN.sectionConsents}>
                  {Object.entries(activeForm.consents).map(([key, rec]) => (
                    <div key={key} className="flex items-center gap-2 py-1.5 text-sm">
                      <span style={{ color: rec.granted ? '#34d399' : 'rgba(255,255,255,0.35)' }}>
                        {rec.granted ? '✓' : '✕'}
                      </span>
                      <span className="text-white/70">{key.replace(/_/g, ' ')}</span>
                    </div>
                  ))}
                </ReviewSection>

                <ReviewSection title={EN.sectionDevelopment}>
                  <ReadRow label={EN.temperamentNotes} value={activeForm.development.temperamentNotes} />
                  <ReadRow label={EN.strengths} value={activeForm.development.strengths} />
                  <ReadRow label={EN.growthAreas} value={activeForm.development.growthAreas} />
                  <ReadRow label={EN.fears} value={activeForm.development.fears} />
                  <ReadRow label={EN.comfortItems} value={activeForm.development.comfortItems} />
                  <ReadRow label={EN.toileting} value={activeForm.development.toileting} />
                  <ReadRow label={EN.napHabits} value={activeForm.development.napHabits} />
                  <ReadRow label={EN.eatingHabits} value={activeForm.development.eatingHabits} />
                  <ReadRow label={EN.separationHistory} value={activeForm.development.separationHistory} />
                  <ReadRow label={EN.priorCare} value={activeForm.development.priorCare} />
                  <ReadRow label={EN.otherNotes} value={activeForm.development.otherNotes} />
                </ReviewSection>

                <div className="flex gap-2 mt-4">
                  <button onClick={() => setPageState('list')} className="btn btn-secondary btn-md">
                    {t('common.back')}
                  </button>
                  <button
                    onClick={() => void commit()}
                    disabled={committing || activeStatus === 'draft'}
                    className="btn btn-primary btn-md btn-full"
                  >
                    {committing ? t('common.loading') : t('childOnboarding.commit')}
                  </button>
                </div>
                {activeStatus === 'draft' && (
                  <p className="text-xs text-white/40 mt-2">{t('childOnboarding.cannotCommitDraft')}</p>
                )}
              </div>
            )
          )}

          {/* ── PRINT PICKER ── */}
          {pageState === 'print' && (
            <div>
              <h2 className="text-xl font-bold text-white/95 mb-1">{t('childOnboarding.printTitle')}</h2>
              <p className="text-sm text-white/50 mb-4">
                {printLoading
                  ? t('common.loading')
                  : t('childOnboarding.printReady').replace('{count}', String(printRows.length))}
              </p>

              <div className="grid grid-cols-2 gap-2 mb-3">
                {([
                  { type: 'cubby' as LabelType, label: EN.printCubbyTitle },
                  { type: 'toothbrush' as LabelType, label: EN.printToothbrushTitle },
                  { type: 'bed' as LabelType, label: EN.printBedTitle },
                  { type: 'table' as LabelType, label: EN.printTableTitle },
                ]).map((b) => (
                  <button
                    key={b.type}
                    onClick={() => doPrint({ mode: 'labels', labelType: b.type })}
                    className="btn btn-secondary btn-md"
                  >
                    {b.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-2">
                <button onClick={() => doPrint({ mode: 'pickup', kind: 'authorization' })} className="btn btn-primary btn-md btn-full">
                  {EN.printPickupAuthTitle}
                </button>
                <button onClick={() => doPrint({ mode: 'pickup', kind: 'signinout' })} className="btn btn-primary btn-md btn-full">
                  {EN.printSignInOutTitle}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── PAPER — the only white surface, print-only ── */}
      <div className="hidden print:block">
        {printTarget.mode === 'labels' ? (
          <LabelSheets items={labelItems} labelType={printTarget.labelType} />
        ) : (
          <PickupSheets rows={pickupRows} kind={printTarget.kind} />
        )}
      </div>
    </>
  );
}
