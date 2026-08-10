// app/potato/teacher/onboarding/page.tsx — read a family's form, accept it,
// print the paper.
//
// Three states on one screen:
//   list    → every child in the class with the state of their form.
//   review  → one family's whole submission, read-only, then Accept.
//   (print) → the six sheets, rendered from the shared core components.
//
// 🚨 NOTHING IS APPLIED UNTIL ACCEPT. The teacher reads first. That is the
// entire product promise on this screen and the copy says so out loud.
//
// 🚨 Screen is warm scrapbook; PAPER IS WHITE. The printed sheets come from
// lib/onboarding-core/print/* — neutral, inline-styled, shared with Montree —
// and are wrapped in a block that is display:none on screen and the only
// visible thing on paper.
//
// 🚨 No <style jsx> anywhere: page CSS goes through a plain
// <style dangerouslySetInnerHTML>, as everywhere else in /potato.

'use client';

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, IconBack, IconPrint, IconCheck, IconChevron } from '@/components/potato/PotatoBits';
import { getJson, patchJson, messageFrom, PotatoApiError } from '@/lib/potato/client';
import {
  EN,
  ageFromDob,
  criticalAllergens,
  type IntakeForm,
  type IntakeStatus,
} from '@/lib/onboarding-core';
import LabelSheets, { type LabelItem, type LabelType } from '@/lib/onboarding-core/print/LabelSheets';
import PickupSheets, {
  type PickupSheetChild,
  type PickupSheetKind,
} from '@/lib/onboarding-core/print/PickupSheets';

const S = EN;

type RowStatus = IntakeStatus | 'none';

interface ListRow {
  childId: string;
  childName: string;
  faceUrl: string | null;
  status: RowStatus;
  submittedAt: string | null;
  committedAt: string | null;
}

interface DetailResponse {
  child: { id: string; name: string; faceUrl: string | null };
  className: string | null;
  status: RowStatus;
  form: IntakeForm | null;
  urls: Record<string, string>;
}

interface PrintChild extends PickupSheetChild {
  childId: string;
}

type PrintTarget =
  | { mode: 'labels'; labelType: LabelType }
  | { mode: 'pickup'; kind: PickupSheetKind };

const STATUS_LABEL: Record<RowStatus, string> = {
  none: 'Not started',
  draft: 'In progress',
  submitted: 'Waiting for you',
  committed: 'Accepted',
};

/* ─── read-only display bits ──────────────────────────────────────────── */

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="ptin-block">
      <h3>{title}</h3>
      {children}
    </div>
  );
}

/** One fact. Renders nothing at all when there is nothing to say — a review
 *  screen full of empty labels is harder to read than a short one. */
function Line({ label, value }: { label: string; value: string | null | undefined }) {
  const text = (value ?? '').toString().trim();
  if (!text) return null;
  return (
    <div className="ptin-line">
      <span>{label}</span>
      <b>{text}</b>
    </div>
  );
}

function DocLink({ label, url }: { label: string; url: string | null }) {
  if (!url) return null;
  return (
    <a className="ptin-doc" href={url} target="_blank" rel="noreferrer">
      {label} <IconChevron size={13} />
    </a>
  );
}

function statusClass(status: RowStatus): string {
  if (status === 'submitted') return 'ptin-chip ptin-chip--wait';
  if (status === 'committed') return 'ptin-chip ptin-chip--done';
  if (status === 'draft') return 'ptin-chip ptin-chip--draft';
  return 'ptin-chip';
}

/* ─── the page ────────────────────────────────────────────────────────── */

export default function TeacherOnboardingPage() {
  const router = useRouter();
  const [rows, setRows] = useState<ListRow[]>([]);
  const [className, setClassName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fatal, setFatal] = useState<string | null>(null);

  const [detail, setDetail] = useState<DetailResponse | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [committing, setCommitting] = useState(false);

  const [printRows, setPrintRows] = useState<PrintChild[]>([]);
  const [printTarget, setPrintTarget] = useState<PrintTarget>({ mode: 'labels', labelType: 'cubby' });
  const [printLoading, setPrintLoading] = useState(false);

  const [toast, setToast] = useState<{ text: string; bad?: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((text: string, bad = false) => {
    setToast({ text, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3400);
  }, []);
  useEffect(
    () => () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    },
    [],
  );

  const load = useCallback(async () => {
    try {
      const data = await getJson<{ className: string | null; children: ListRow[] }>(
        '/api/potato/teacher/intake',
      );
      setRows(data.children ?? []);
      setClassName(data.className ?? null);
      setFatal(null);
    } catch (err) {
      if (err instanceof PotatoApiError && err.status === 401) {
        router.replace('/potato/teacher/login');
        return;
      }
      setFatal(messageFrom(err, 'Could not load the forms.'));
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  /** Print data is fetched once and refreshed after every Accept, so the
   *  sheets always match what the teacher has actually approved. */
  const loadPrintData = useCallback(async () => {
    setPrintLoading(true);
    try {
      const data = await getJson<{ children: PrintChild[] }>(
        '/api/potato/teacher/intake/print-data',
      );
      setPrintRows(data.children ?? []);
    } catch (err) {
      console.error('[potato/onboarding] print data failed:', err);
    } finally {
      setPrintLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPrintData();
  }, [loadPrintData]);

  const openChild = useCallback(
    async (childId: string) => {
      setDetailLoading(true);
      setDetail(null);
      try {
        const data = await getJson<DetailResponse>(
          `/api/potato/teacher/intake/${encodeURIComponent(childId)}`,
        );
        setDetail(data);
      } catch (err) {
        showToast(messageFrom(err, 'Could not open that form.'), true);
      } finally {
        setDetailLoading(false);
      }
    },
    [showToast],
  );

  const commit = useCallback(async () => {
    if (!detail || committing) return;
    setCommitting(true);
    try {
      await patchJson(`/api/potato/teacher/intake/${encodeURIComponent(detail.child.id)}`, {
        action: 'commit',
      });
      showToast('Accepted. Their photo is on the class list now.');
      setDetail(null);
      await Promise.all([load(), loadPrintData()]);
    } catch (err) {
      showToast(messageFrom(err, 'Could not accept that form.'), true);
    } finally {
      setCommitting(false);
    }
  }, [detail, committing, load, loadPrintData, showToast]);

  const doPrint = useCallback(
    (target: PrintTarget) => {
      if (printRows.length === 0) {
        showToast('Nothing to print yet — accept a form first.', true);
        return;
      }
      setPrintTarget(target);
      // Let React paint the chosen sheet before the dialog snapshots the page.
      window.setTimeout(() => window.print(), 80);
    },
    [printRows.length, showToast],
  );

  const labelItems: LabelItem[] = useMemo(
    () => printRows.map((r) => ({ childName: r.childName, photoUrl: r.photoUrl })),
    [printRows],
  );
  const pickupRows: PickupSheetChild[] = useMemo(
    () =>
      printRows.map((r) => ({
        childName: r.childName,
        photoUrl: r.photoUrl,
        guardians: r.guardians,
        pickupPersons: r.pickupPersons,
        allergies: r.allergies,
      })),
    [printRows],
  );

  const waiting = rows.filter((r) => r.status === 'submitted').length;

  /* ── REVIEW ─────────────────────────────────────────────────────────── */
  if (detail) {
    const f = detail.form;
    const child = detail.child;
    const flags = f ? criticalAllergens(f) : [];
    const age = f ? ageFromDob(f.identity.dob) : null;
    const url = (p?: string) => (p ? detail.urls[p] ?? null : null);

    return (
      <div className="pt-app">
        <div className="pt-topbar">
          <button type="button" className="pt-iconbtn" aria-label="Back" onClick={() => setDetail(null)}>
            <IconBack size={20} />
          </button>
          <div className="pt-topbar__txt">
            <h1 className="pt-topbar__title">{child.name}</h1>
          </div>
          <Avatar
            name={child.name}
            seed={child.id}
            url={url(f?.documents.facePhotoPath) ?? child.faceUrl}
            size="xs"
            empty={!child.faceUrl && !f?.documents.facePhotoPath}
          />
        </div>

        <div className="pt-scroll">
          {!f ? (
            <div className="pt-empty">{'This family hasn’t started their form yet.'}</div>
          ) : (
            <>
              <div className={statusClass(detail.status)} style={{ marginBottom: 14 }}>
                {STATUS_LABEL[detail.status]}
              </div>

              {flags.length > 0 ? (
                <div className="ptin-alert">
                  <b>{S.printAllergyFlag}</b>
                  {flags.join(' · ')}
                </div>
              ) : null}

              <Block title={S.sectionIdentity}>
                <Line label={S.legalName} value={f.identity.legalName} />
                <Line label={S.preferredName} value={f.identity.preferredName} />
                <Line label={S.dob} value={f.identity.dob + (age !== null ? ` · ${age}` : '')} />
                <Line
                  label={S.sex}
                  value={
                    f.identity.sex === 'male' ? S.sexMale : f.identity.sex === 'female' ? S.sexFemale : ''
                  }
                />
                <Line label={S.nationality} value={f.identity.nationality} />
                <Line label={S.homeLanguages} value={(f.identity.homeLanguages ?? []).join(', ')} />
              </Block>

              <Block title={S.sectionFamily}>
                {f.family.guardians
                  .filter((g) => g.name?.trim())
                  .map((g, i) => (
                    <div className="ptin-person" key={`g-${i}`}>
                      <b>{g.name}</b>
                      <small>
                        {[g.relation, g.phone, g.wechat, g.email].filter(Boolean).join(' · ')}
                      </small>
                    </div>
                  ))}
                <Line label={S.homeAddress} value={f.family.homeAddress} />
              </Block>

              <Block title={S.sectionEmergency}>
                {f.emergency.contacts
                  .filter((c) => c.name?.trim())
                  .map((c, i) => (
                    <div className="ptin-person" key={`e-${i}`}>
                      <b>{c.name}</b>
                      <small>{[c.relation, c.phone].filter(Boolean).join(' · ')}</small>
                    </div>
                  ))}
              </Block>

              <Block title={S.sectionPickup}>
                {f.pickup.persons.filter((p) => p.name?.trim()).length === 0 ? (
                  <p className="ptin-none">{S.printNoPickupPersons}</p>
                ) : null}
                {f.pickup.persons
                  .filter((p) => p.name?.trim())
                  .map((p, i) => (
                    <div className="ptin-person ptin-person--face" key={`p-${i}`}>
                      <Avatar
                        name={p.name}
                        seed={`${child.id}-p${i}`}
                        url={url(p.photoPath)}
                        size="xs"
                        empty={!p.photoPath}
                      />
                      <div>
                        <b>{p.name}</b>
                        <small>{[p.relation, p.phone].filter(Boolean).join(' · ')}</small>
                      </div>
                    </div>
                  ))}
                <Line label={S.pickupNotes} value={f.pickup.notes} />
              </Block>

              <Block title={S.sectionHealth}>
                {f.health.allergies.length === 0 ? <p className="ptin-none">{S.noAllergies}</p> : null}
                {f.health.allergies
                  .filter((a) => a.allergen?.trim())
                  .map((a, i) => (
                    <div
                      className={`ptin-allergy ${a.severity === 'severe' ? 'ptin-allergy--bad' : ''}`.trim()}
                      key={`a-${i}`}
                    >
                      <b>
                        {a.allergen}
                        <i>
                          {a.severity === 'severe'
                            ? S.severitySevere
                            : a.severity === 'moderate'
                              ? S.severityModerate
                              : S.severityMild}
                        </i>
                      </b>
                      {a.action?.trim() ? <small>{a.action}</small> : null}
                    </div>
                  ))}
                <Line label={S.dietaryRestrictions} value={f.health.dietaryRestrictions} />
                <Line label={S.conditions} value={f.health.conditions} />
                <Line label={S.medications} value={f.health.medications} />
                <Line label={S.physicianName} value={f.health.physicianName} />
                <Line label={S.physicianPhone} value={f.health.physicianPhone} />
                <Line label={S.bloodType} value={f.health.bloodType} />
              </Block>

              <Block title={S.sectionDocuments}>
                <DocLink label={S.facePhoto} url={url(f.documents.facePhotoPath)} />
                <DocLink label={S.vaccinationBooklet} url={url(f.documents.vaccinationBookletPath)} />
                <DocLink label={S.healthCheck} url={url(f.documents.healthCheckPath)} />
                {(f.documents.medicalCertPaths ?? []).map((p, i) => (
                  <DocLink key={`d-${i}`} label={`${S.medicalCerts} ${i + 1}`} url={url(p)} />
                ))}
              </Block>

              <Block title={S.sectionConsents}>
                {(
                  [
                    ['photo_internal', S.consentPhotoInternal],
                    ['photo_marketing', S.consentPhotoMarketing],
                    ['emergency_treatment', S.consentEmergencyTreatment],
                    ['sunscreen_medication', S.consentSunscreenMedication],
                    ['data_privacy', S.consentDataPrivacy],
                  ] as const
                ).map(([key, label]) => (
                  <div
                    className={`ptin-consent ${f.consents[key].granted ? 'ptin-consent--yes' : ''}`.trim()}
                    key={key}
                  >
                    <span>{f.consents[key].granted ? '✓' : '—'}</span>
                    {label}
                  </div>
                ))}
              </Block>

              <Block title={S.sectionDevelopment}>
                <Line label={S.temperamentNotes} value={f.development.temperamentNotes} />
                <Line label={S.strengths} value={f.development.strengths} />
                <Line label={S.growthAreas} value={f.development.growthAreas} />
                <Line label={S.fears} value={f.development.fears} />
                <Line label={S.comfortItems} value={f.development.comfortItems} />
                <Line
                  label={S.toileting}
                  value={
                    f.development.toileting === 'trained'
                      ? S.toiletingTrained
                      : f.development.toileting === 'training'
                        ? S.toiletingTraining
                        : f.development.toileting === 'diapers'
                          ? S.toiletingDiapers
                          : ''
                  }
                />
                <Line label={S.napHabits} value={f.development.napHabits} />
                <Line label={S.eatingHabits} value={f.development.eatingHabits} />
                <Line label={S.separationHistory} value={f.development.separationHistory} />
                <Line label={S.priorCare} value={f.development.priorCare} />
                <Line label={S.otherNotes} value={f.development.otherNotes} />
              </Block>

              {detail.status === 'submitted' ? (
                <div className="ptin-accept">
                  <button
                    type="button"
                    className="pt-btn pt-btn--primary pt-btn--lg"
                    disabled={committing}
                    onClick={commit}
                  >
                    {committing ? '…' : `Accept ${child.name}’s form`}
                  </button>
                  <p className="pt-foothint">
                    {'Their photo becomes the class-list photo, and they appear on the printed sheets.'}
                  </p>
                </div>
              ) : detail.status === 'committed' ? (
                <div className="ptin-ok">
                  <IconCheck size={13} color="#23395B" weight={3.6} /> {S.committed}
                </div>
              ) : (
                <div className="ptin-ok">{'Still a draft — they haven’t sent it yet.'}</div>
              )}
            </>
          )}
        </div>

        {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
        <PageStyles />
      </div>
    );
  }

  /* ── LIST ───────────────────────────────────────────────────────────── */
  return (
    <div className="pt-app">
      <div className="pt-topbar">
        <Link href="/potato/teacher" className="pt-iconbtn" aria-label="Back">
          <IconBack size={20} />
        </Link>
        <div className="pt-topbar__txt">
          <h1 className="pt-topbar__title">Child profiles</h1>
        </div>
      </div>

      <div className="pt-scroll">
        <div className="pt-hgroup">
          <h2>{className ?? 'Your class'}</h2>
          <p>
            {waiting > 0
              ? `${waiting} ${waiting === 1 ? 'form is' : 'forms are'} waiting for you.`
              : 'Families fill these in with their parent code. Nothing changes until you accept.'}
          </p>
        </div>

        {loading ? (
          <div className="pt-empty">Loading…</div>
        ) : fatal ? (
          <div className="pt-err" style={{ maxWidth: '100%' }}>{fatal}</div>
        ) : rows.length === 0 ? (
          <div className="pt-empty">
            No children yet.
            <br />
            <Link href="/potato/teacher/children" style={{ color: '#C9860B', fontWeight: 800 }}>
              Add your class first
            </Link>
          </div>
        ) : (
          <>
            {rows.map((row) => {
              const openable = row.status !== 'none';
              return (
                <button
                  type="button"
                  className="pt-lrow ptin-row"
                  key={row.childId}
                  disabled={!openable || detailLoading}
                  onClick={() => openChild(row.childId)}
                >
                  <Avatar
                    name={row.childName}
                    seed={row.childId}
                    url={row.faceUrl}
                    size="xs"
                    empty={!row.faceUrl}
                  />
                  <div className="pt-lrow__n" style={{ fontSize: 15, textAlign: 'left' }}>
                    {row.childName}
                    <small>{STATUS_LABEL[row.status]}</small>
                  </div>
                  <span className={statusClass(row.status)}>
                    {row.status === 'submitted' ? 'Review' : row.status === 'committed' ? '✓' : '—'}
                  </span>
                </button>
              );
            })}

            <div className="pt-hgroup">
              <h2>Print</h2>
              <p>
                {printLoading
                  ? 'Getting the accepted forms…'
                  : printRows.length === 0
                    ? 'Accept a form first — printed sheets carry the child’s face.'
                    : `${printRows.length} ${printRows.length === 1 ? 'child' : 'children'} ready.`}
              </p>
            </div>
            <div className="ptin-print">
              {(
                [
                  ['cubby', S.printCubbyTitle],
                  ['toothbrush', S.printToothbrushTitle],
                  ['bed', S.printBedTitle],
                  ['table', S.printTableTitle],
                ] as [LabelType, string][]
              ).map(([type, label]) => (
                <button
                  type="button"
                  key={type}
                  className="pt-btn pt-btn--ghost pt-btn--md"
                  disabled={printRows.length === 0}
                  onClick={() => doPrint({ mode: 'labels', labelType: type })}
                >
                  <IconPrint size={15} /> {label}
                </button>
              ))}
              <button
                type="button"
                className="pt-btn pt-btn--blue pt-btn--md"
                disabled={printRows.length === 0}
                onClick={() => doPrint({ mode: 'pickup', kind: 'authorization' })}
              >
                <IconPrint size={15} /> {S.printPickupAuthTitle}
              </button>
              <button
                type="button"
                className="pt-btn pt-btn--blue pt-btn--md"
                disabled={printRows.length === 0}
                onClick={() => doPrint({ mode: 'pickup', kind: 'signinout' })}
              >
                <IconPrint size={15} /> {S.printSignInOutTitle}
              </button>
            </div>
          </>
        )}
      </div>

      {/* ── PAPER ── the only white surface. Hidden on screen, and the app
          chrome is hidden on paper. The sheets themselves come from the shared
          core, inline-styled and design-system-free by contract. ── */}
      <div className="ptin-paper" aria-hidden="true">
        {printTarget.mode === 'labels' ? (
          <LabelSheets
            items={labelItems}
            labelType={printTarget.labelType}
            footerText={className ?? undefined}
          />
        ) : (
          <PickupSheets rows={pickupRows} kind={printTarget.kind} headerTitle={className ?? undefined} />
        )}
      </div>

      {toast ? <div className={`pt-toast ${toast.bad ? 'pt-toast--bad' : ''}`.trim()}>{toast.text}</div> : null}
      <PageStyles />
    </div>
  );
}

/**
 * Page CSS, shared by both states.
 *
 * 🚨 A plain <style dangerouslySetInnerHTML>, NOT styled-jsx: this component is
 * rendered from inside a conditional return branch, which is exactly the shape
 * Turbopack rejects for a <style jsx> tag.
 */
function PageStyles() {
  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
.ptin-row{width:100%;border:1.5px solid var(--pt-sand-line);cursor:pointer;font-family:inherit;color:var(--pt-ink)}
.ptin-row:disabled{cursor:default;opacity:.72}
.ptin-chip{display:inline-flex;align-items:center;justify-content:center;min-width:34px;min-height:28px;
  padding:0 11px;border-radius:999px;background:#F6F1E7;color:var(--pt-ink-35);
  font-size:12px;font-weight:800;flex:none;white-space:nowrap}
.ptin-chip--wait{background:var(--pt-honey);color:var(--pt-ink);box-shadow:0 1px 0 rgba(150,96,4,.2)}
.ptin-chip--done{background:var(--pt-blue);color:var(--pt-ink)}
.ptin-chip--draft{background:var(--pt-sky);color:var(--pt-blue-deep)}
.ptin-print{display:grid;gap:9px;margin-bottom:10px}
.ptin-block{background:var(--pt-paper);border:1.5px solid var(--pt-sand-line);border-radius:var(--pt-r-card);
  padding:13px;margin-bottom:12px;box-shadow:var(--pt-sh-card)}
.ptin-block h3{font-family:var(--pt-disp);font-weight:800;font-size:15px;margin:0 2px 10px;
  letter-spacing:-.005em;color:var(--pt-ink)}
.ptin-line{display:flex;gap:12px;align-items:baseline;padding:6px 2px;border-top:1px solid #F4EEE2}
.ptin-line:first-of-type{border-top:none}
.ptin-line span{flex:0 0 40%;font-size:11.5px;font-weight:800;color:var(--pt-ink-35);line-height:1.35}
.ptin-line b{flex:1;min-width:0;font-size:13px;font-weight:700;color:var(--pt-ink);line-height:1.45;
  white-space:pre-wrap;word-break:break-word}
.ptin-person{padding:7px 2px;border-top:1px solid #F4EEE2}
.ptin-person:first-of-type{border-top:none}
.ptin-person b{display:block;font-family:var(--pt-disp);font-weight:800;font-size:14px;line-height:1.2}
.ptin-person small{display:block;font-size:12px;font-weight:700;color:var(--pt-ink-50);margin-top:3px}
.ptin-person--face{display:flex;align-items:center;gap:11px}
.ptin-allergy{background:var(--pt-butter-soft);border-radius:14px;padding:9px 12px;margin-bottom:8px}
.ptin-allergy--bad{background:#FFF0ED}
.ptin-allergy b{display:flex;align-items:center;gap:8px;font-family:var(--pt-disp);font-weight:800;font-size:14px}
.ptin-allergy b i{font-style:normal;font-size:10.5px;font-weight:800;letter-spacing:.08em;
  text-transform:uppercase;color:var(--pt-ink-50)}
.ptin-allergy--bad b i{color:var(--pt-coral-deep)}
.ptin-allergy small{display:block;font-size:12.5px;font-weight:700;color:var(--pt-ink-70);
  margin-top:5px;line-height:1.45}
.ptin-alert{display:flex;align-items:center;gap:10px;background:#FFF0ED;border:1.5px solid rgba(214,80,63,.28);
  border-radius:16px;padding:11px 13px;margin-bottom:14px;font-size:13px;font-weight:700;color:var(--pt-ink)}
.ptin-alert b{font-family:var(--pt-disp);font-weight:800;font-size:11px;letter-spacing:.12em;
  color:var(--pt-coral-deep);flex:none}
.ptin-doc{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:10px 2px;
  border-top:1px solid #F4EEE2;font-size:13px;font-weight:800;color:var(--pt-blue-deep);text-decoration:none}
.ptin-doc:first-of-type{border-top:none}
.ptin-consent{display:flex;align-items:flex-start;gap:10px;padding:7px 2px;font-size:12.5px;
  font-weight:700;color:var(--pt-ink-35);line-height:1.45}
.ptin-consent--yes{color:var(--pt-ink)}
.ptin-consent span{flex:none;width:16px;font-weight:800;color:var(--pt-ink-35)}
.ptin-consent--yes span{color:var(--pt-blue-deep)}
.ptin-none{font-size:12.5px;font-weight:700;color:var(--pt-ink-35);margin:0 2px;line-height:1.45}
.ptin-accept{display:grid;gap:10px;margin:22px 0 8px}
.ptin-ok{display:flex;align-items:center;gap:8px;background:var(--pt-sky);border-radius:16px;
  padding:11px 13px;margin:20px 0 8px;font-size:12.5px;font-weight:700;color:var(--pt-ink)}

/* Screen: no paper. Paper: no screen. */
.ptin-paper{display:none}
@media print{
  .pt-topbar,.pt-scroll,.pt-toast{display:none !important}
  .pt-root,.pt-app{background:#fff !important}
  .pt-app{min-height:0 !important}
  .ptin-paper{display:block}
}
`,
      }}
    />
  );
}
