// app/lens/visits/[id]/report/page.tsx — compose, over tea.
//
// The whole afternoon loop lives here: draft from the moments, edit inline,
// regenerate a paragraph, translate, rate, read the debrief questions, finalise.
//
// 🚨 SAVING IS EXPLICIT, AND ON PURPOSE.
// An autosave on every keystroke would be a PATCH per character on hotel wifi
// and, worse, would make "undo" mean nothing. She edits, she taps Save, the
// whole content block goes at once and is re-validated server-side against the
// same schema the model's output goes through.
//
// 🚨 THE LANGUAGE TOGGLE IS A VIEW, NOT A MODE. EN / ZH / both changes what is
// shown and what the editor writes into; it never converts one into the other.
// Chinese only exists where the translate pass has put it, and a section with no
// Chinese says so rather than showing an empty box that looks like data loss.

'use client';

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { lensApi, LensApiError } from '@/lib/lens/client';
import { readCarried, clearCarried } from '@/lib/lens/carried';
import { BTN_GHOST, BTN_PRIMARY, BTN_SECONDARY, CARD, RULE } from '@/lib/lens/ui';
import {
  ACTION_ITEM_STATUSES,
  ACTION_ITEM_STATUS_LABELS,
  ENGAGEMENT_LABELS,
  RATING_DOMAINS,
  RATING_LABELS,
  RATING_LEVELS,
  SUBJECT_LABELS,
  type LensActionItem,
  type LensClassroom,
  type LensSchool,
  type LensStaff,
  type LensVisit,
  type RatingDomain,
  type RatingLevel,
} from '@/lib/lens/types';
import {
  emptyReportContent,
  type LensReportContent,
  type ReportListItem,
  type SectionTemplate,
} from '@/lib/lens/reports/schema';
import { ErrorNote, LensHeader } from '@/components/lens/LensChrome';
import { EvidenceChips, type MomentWithUrl } from '@/components/lens/EvidenceChips';
import { GuruPanel, type GuruRequest } from '@/components/lens/GuruPanel';

type Lang = 'en' | 'zh' | 'both';

interface ReportBundle {
  report: {
    id: string;
    classroom_id: string | null;
    status: string;
    version: number;
    languages: string[];
    content: LensReportContent;
  };
  visit: LensVisit;
  school: LensSchool;
  classroom: LensClassroom | null;
  classrooms: LensClassroom[];
  staff: LensStaff[];
  moments: MomentWithUrl[];
  actionItems: LensActionItem[];
  template: SectionTemplate[];
}

const LIST_KEYS = ['commendations', 'recommendations', 'required_actions', 'next_steps'] as const;
type ListKey = (typeof LIST_KEYS)[number];

const LIST_LABELS: Record<ListKey, string> = {
  commendations: 'Commendations',
  recommendations: 'Recommendations',
  required_actions: 'Required actions',
  next_steps: 'Agreed next steps',
};

export default function LensReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: visitId } = use(params);
  const search = useSearchParams();
  const router = useRouter();
  const reportId = search.get('report');

  const [bundle, setBundle] = useState<ReportBundle | null>(null);
  const [content, setContent] = useState<LensReportContent>(emptyReportContent());
  const [dirty, setDirty] = useState(false);
  const [lang, setLang] = useState<Lang>('en');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [debrief, setDebrief] = useState<{ stage: string; question: string }[]>([]);
  const [guruOpen, setGuruOpen] = useState(false);
  const [guruRequest, setGuruRequest] = useState<GuruRequest | null>(null);

  const load = useCallback(async () => {
    if (!reportId) {
      setError('No report was named in the link.');
      setLoading(false);
      return;
    }
    try {
      const data = await lensApi<ReportBundle>(`/api/lens/reports/${reportId}`);
      setBundle(data);
      setContent(data.report.content);
      setDirty(false);
      setLang(data.report.languages.includes('zh') ? 'both' : 'en');
      setError(null);
    } catch (err) {
      if (err instanceof LensApiError && err.status === 401) {
        router.replace('/lens');
        return;
      }
      setError(err instanceof LensApiError ? err.message : 'Could not load that report.');
    } finally {
      setLoading(false);
    }
  }, [reportId, router]);

  useEffect(() => {
    load();
  }, [load]);

  const isFinal = bundle?.report.status === 'final';
  const showEn = lang === 'en' || lang === 'both';
  const showZh = lang === 'zh' || lang === 'both';

  /** Which section keys the report carries, in template order plus per-staff. */
  const orderedSections = useMemo(() => content.sections, [content.sections]);

  const uncited = useMemo(
    () => content.recommendations.filter((r) => r.evidence.length === 0).length,
    [content.recommendations],
  );

  // ---------------------------------------------------------------- actions --

  async function save() {
    if (!reportId) return;
    setBusy('save');
    setError(null);
    try {
      const result = await lensApi<{ warnings: string[]; report: ReportBundle['report'] }>(
        `/api/lens/reports/${reportId}`,
        { method: 'PATCH', json: { content } },
      );
      setWarnings(result.warnings ?? []);
      if (result.report) setContent(result.report.content);
      setDirty(false);
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not save.');
    } finally {
      setBusy(null);
    }
  }

  async function draft(sectionKey?: string) {
    if (!reportId) return;
    setBusy(sectionKey ? `draft:${sectionKey}` : 'draft');
    setError(null);
    try {
      const url = sectionKey
        ? `/api/lens/reports/${reportId}/draft?section=${encodeURIComponent(sectionKey)}`
        : `/api/lens/reports/${reportId}/draft`;
      const result = await lensApi<{ content: LensReportContent; warnings: string[] }>(url, {
        method: 'POST',
      });
      setContent(result.content);
      setWarnings(result.warnings ?? []);
      setDirty(false);
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'The Guru couldn’t draft that.');
    } finally {
      setBusy(null);
    }
  }

  async function translate() {
    if (!reportId) return;
    setBusy('translate');
    setError(null);
    try {
      const result = await lensApi<{ warnings: string[]; report: ReportBundle['report'] }>(
        `/api/lens/reports/${reportId}/translate`,
        { method: 'POST' },
      );
      setWarnings(result.warnings ?? []);
      if (result.report) setContent(result.report.content);
      setLang('both');
      setDirty(false);
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not translate.');
    } finally {
      setBusy(null);
    }
  }

  async function loadDebrief(regenerate = false) {
    if (!reportId) return;
    setBusy('debrief');
    setError(null);
    try {
      const result = await lensApi<{ questions: { stage: string; question: string }[] }>(
        `/api/lens/reports/${reportId}/debrief`,
        regenerate ? { method: 'POST' } : undefined,
      );
      setDebrief(result.questions);
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not write the debrief.');
    } finally {
      setBusy(null);
    }
  }

  async function finalise() {
    if (!reportId) return;
    if (dirty) {
      setError('Save your edits before finalising.');
      return;
    }
    setBusy('finalise');
    setError(null);
    try {
      // Whatever she ticked at visit-start, handed over now. The server
      // re-proves every id — this is a convenience, not an authorisation.
      const carried = readCarried(visitId);
      const result = await lensApi<{ seeded: number }>(
        `/api/lens/reports/${reportId}/finalise`,
        { method: 'POST', json: { carried } },
      );
      clearCarried(visitId);
      setWarnings([
        `Finalised. ${result.seeded} action item${result.seeded === 1 ? '' : 's'} created.`,
      ]);
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not finalise.');
    } finally {
      setBusy(null);
    }
  }

  async function reopen() {
    if (!reportId) return;
    setBusy('reopen');
    try {
      await lensApi(`/api/lens/reports/${reportId}`, { method: 'PATCH', json: { status: 'review' } });
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not reopen.');
    } finally {
      setBusy(null);
    }
  }

  // ------------------------------------------------------------------ edits --

  function patchSection(key: string, patch: { body_en?: string; body_zh?: string }) {
    setContent((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
    setDirty(true);
  }

  function patchListItem(listKey: ListKey, index: number, patch: Partial<ReportListItem>) {
    setContent((prev) => ({
      ...prev,
      [listKey]: prev[listKey].map((item, i) => (i === index ? { ...item, ...patch } : item)),
    }));
    setDirty(true);
  }

  function addListItem(listKey: ListKey) {
    setContent((prev) => ({
      ...prev,
      [listKey]: [...prev[listKey], { text_en: '', evidence: [] }],
    }));
    setDirty(true);
  }

  function removeListItem(listKey: ListKey, index: number) {
    setContent((prev) => ({
      ...prev,
      [listKey]: prev[listKey].filter((_, i) => i !== index),
    }));
    setDirty(true);
  }

  function setRating(domain: RatingDomain, level: RatingLevel | null) {
    setContent((prev) => {
      const ratings = { ...prev.ratings };
      if (level) ratings[domain] = level;
      else delete ratings[domain];
      return { ...prev, ratings };
    });
    setDirty(true);
  }

  async function updateActionItem(item: LensActionItem, patch: Partial<LensActionItem>) {
    try {
      await lensApi(`/api/lens/action-items/${item.id}`, { method: 'PATCH', json: patch });
      await load();
    } catch (err) {
      setError(err instanceof LensApiError ? err.message : 'Could not update that item.');
    }
  }

  // ------------------------------------------------------------------ render --

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 pb-16">
        <LensHeader title="Report" back={`/lens/visits/${visitId}`} />
        <p className="text-sm text-forest-muted">Loading…</p>
      </main>
    );
  }

  if (!bundle) {
    return (
      <main className="mx-auto w-full max-w-3xl px-5 pb-16">
        <LensHeader title="Report" back={`/lens/visits/${visitId}`} />
        <ErrorNote message={error ?? 'That report could not be opened.'} />
      </main>
    );
  }

  const title = bundle.classroom ? bundle.classroom.name : 'Level report';
  const showRequiredActions = bundle.visit.engagement_type === 'consultation';

  return (
    <main className="mx-auto w-full max-w-3xl px-5 pb-40">
      <LensHeader
        title={title}
        subtitle={`${bundle.school.name} · ${
          ENGAGEMENT_LABELS[bundle.visit.engagement_type] ?? bundle.visit.engagement_type
        } · ${bundle.report.status} v${bundle.report.version}`}
        back={`/lens/visits/${visitId}`}
      />

      <ErrorNote message={error} />

      {warnings.length > 0 && (
        <div className={`${CARD} mb-4 border-[rgba(232,201,106,0.35)]`}>
          <ul className="flex flex-col gap-1">
            {warnings.map((w, i) => (
              <li key={i} className="text-[13px] leading-snug text-forest-gold">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Controls */}
      <div className="ln-noprint mb-5 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={BTN_PRIMARY}
          disabled={!!busy || isFinal}
          onClick={() => draft()}
        >
          {busy === 'draft' ? 'Drafting…' : orderedSections.length ? 'Redraft all' : 'Draft the report'}
        </button>
        <button type="button" className={BTN_SECONDARY} disabled={!!busy || isFinal || !dirty} onClick={save}>
          {busy === 'save' ? 'Saving…' : dirty ? 'Save changes' : 'Saved'}
        </button>
        <button type="button" className={BTN_SECONDARY} disabled={!!busy || isFinal} onClick={translate}>
          {busy === 'translate' ? 'Translating…' : '中文'}
        </button>
        <button type="button" className={BTN_SECONDARY} onClick={() => setGuruOpen(true)}>
          Ask the Guru
        </button>
        <a
          className={BTN_SECONDARY}
          href={`/api/lens/reports/${bundle.report.id}/pdf?lang=${lang}`}
          target="_blank"
          rel="noreferrer"
        >
          PDF
        </a>
        <div className="ml-auto flex gap-1">
          {(['en', 'zh', 'both'] as Lang[]).map((option) => (
            <button
              key={option}
              type="button"
              className="ln-chip !py-1.5 !text-[12px]"
              data-on={lang === option ? '1' : '0'}
              onClick={() => setLang(option)}
            >
              {option === 'both' ? 'EN + 中文' : option === 'en' ? 'EN' : '中文'}
            </button>
          ))}
        </div>
      </div>

      {uncited > 0 && !isFinal && (
        <p className="mb-4 rounded-xl border border-[rgba(232,201,106,0.35)] bg-[rgba(232,201,106,0.08)] px-3 py-2 text-[13px] text-forest-gold">
          {uncited} recommendation{uncited === 1 ? '' : 's'} cite no moment. Attach evidence
          or delete the claim before you sign this.
        </p>
      )}

      {/* Sections */}
      <section className="flex flex-col gap-4">
        {orderedSections.length === 0 ? (
          <div className={CARD}>
            <p className="text-[14px] leading-relaxed text-forest-muted">
              Nothing drafted yet. The Guru writes only from the moments on this visit —
              it will not produce a sentence your timeline does not support.
            </p>
          </div>
        ) : (
          orderedSections.map((section) => (
            <article key={section.key} className={CARD}>
              <div className="mb-2 flex items-start justify-between gap-2">
                <h2 className="font-serif text-[17px] text-forest-text">{section.title}</h2>
                {!isFinal && (
                  <div className="ln-noprint flex shrink-0 gap-1">
                    <button
                      type="button"
                      className={BTN_GHOST}
                      disabled={!!busy}
                      onClick={() => draft(section.key)}
                    >
                      {busy === `draft:${section.key}` ? '…' : 'Regenerate'}
                    </button>
                    <button
                      type="button"
                      className={BTN_GHOST}
                      onClick={() => {
                        setGuruRequest({
                          mode: 'tighten',
                          text: section.body_en,
                          sectionKey: section.key,
                        });
                        setGuruOpen(true);
                      }}
                    >
                      Guru
                    </button>
                  </div>
                )}
              </div>

              {showEn && (
                <textarea
                  className="ln-field"
                  rows={Math.min(20, Math.max(4, Math.ceil(section.body_en.length / 70)))}
                  value={section.body_en}
                  readOnly={isFinal}
                  onChange={(e) => patchSection(section.key, { body_en: e.target.value })}
                />
              )}

              {showZh &&
                (section.body_zh !== undefined ? (
                  <textarea
                    className={`ln-field ${showEn ? 'mt-2' : ''}`}
                    rows={Math.min(20, Math.max(4, Math.ceil((section.body_zh?.length ?? 0) / 40)))}
                    value={section.body_zh ?? ''}
                    readOnly={isFinal}
                    onChange={(e) => patchSection(section.key, { body_zh: e.target.value })}
                  />
                ) : (
                  <p className="mt-2 text-[12px] text-forest-muted">
                    No Chinese for this section yet — run 中文.
                  </p>
                ))}

              <EvidenceChips
                evidence={section.evidence}
                moments={bundle.moments}
                emptyNote="No moment cited."
              />
            </article>
          ))
        )}
      </section>

      {/* Ratings */}
      <section className="mt-8">
        <h2 className="mb-1 font-serif text-lg text-forest-text">Ratings</h2>
        <div className={RULE} />
        <p className="mt-2 text-[12px] leading-snug text-forest-muted">
          Leave a domain blank when you did not see enough of it to rate. A guessed
          rating is worse than a missing one.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          {RATING_DOMAINS.map((domain) => (
            <div key={domain} className="flex flex-wrap items-center gap-2">
              <span className="w-32 shrink-0 text-[13px] text-forest-text">
                {SUBJECT_LABELS[domain]}
              </span>
              {RATING_LEVELS.map((level) => (
                <button
                  key={level}
                  type="button"
                  className="ln-chip !py-1.5 !text-[12px]"
                  data-on={content.ratings[domain] === level ? '1' : '0'}
                  disabled={isFinal}
                  onClick={() =>
                    setRating(domain, content.ratings[domain] === level ? null : level)
                  }
                >
                  {RATING_LABELS[level]}
                </button>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* Lists */}
      {LIST_KEYS.filter((key) => key !== 'required_actions' || showRequiredActions).map((listKey) => (
        <section key={listKey} className="mt-8">
          <h2 className="mb-1 font-serif text-lg text-forest-text">{LIST_LABELS[listKey]}</h2>
          <div className={RULE} />
          {listKey === 'required_actions' && (
            <p className="mt-2 text-[12px] leading-snug text-forest-muted">
              Compliance-critical only. An ordinary improvement is a recommendation —
              putting it here devalues the instrument.
            </p>
          )}
          <div className="mt-3 flex flex-col gap-3">
            {content[listKey].map((item, index) => (
              <div key={index} className={CARD}>
                {showEn && (
                  <textarea
                    className="ln-field"
                    rows={2}
                    value={item.text_en}
                    readOnly={isFinal}
                    onChange={(e) => patchListItem(listKey, index, { text_en: e.target.value })}
                  />
                )}
                {showZh &&
                  (item.text_zh !== undefined ? (
                    <textarea
                      className={`ln-field ${showEn ? 'mt-2' : ''}`}
                      rows={2}
                      value={item.text_zh ?? ''}
                      readOnly={isFinal}
                      onChange={(e) => patchListItem(listKey, index, { text_zh: e.target.value })}
                    />
                  ) : null)}
                <EvidenceChips
                  evidence={item.evidence}
                  moments={bundle.moments}
                  emptyNote={
                    listKey === 'recommendations' || listKey === 'required_actions'
                      ? 'No moment cited — attach evidence or delete this.'
                      : undefined
                  }
                />
                {!isFinal && (
                  <button
                    type="button"
                    className={`${BTN_GHOST} ln-noprint mt-1`}
                    onClick={() => removeListItem(listKey, index)}
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
            {!isFinal && (
              <button
                type="button"
                className={`${BTN_SECONDARY} ln-noprint`}
                onClick={() => addListItem(listKey)}
              >
                + Add
              </button>
            )}
          </div>
        </section>
      ))}

      {/* Debrief */}
      <section className="mt-8">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif text-lg text-forest-text">Debrief script</h2>
          <div className="ln-noprint flex gap-1">
            <button type="button" className={BTN_GHOST} disabled={!!busy} onClick={() => loadDebrief(false)}>
              {busy === 'debrief' ? '…' : debrief.length ? 'Reload' : 'Write it'}
            </button>
            {debrief.length > 0 && (
              <button type="button" className={BTN_GHOST} disabled={!!busy} onClick={() => loadDebrief(true)}>
                Regenerate
              </button>
            )}
          </div>
        </div>
        <div className={RULE} />
        {debrief.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-forest-muted">
            The GROW-shaped questions you ask the guide once she has read this. Open
            questions only, ending in one testable thing agreed before the next visit.
          </p>
        ) : (
          <ol className="mt-3 flex flex-col gap-2">
            {debrief.map((q, i) => (
              <li key={i} className="text-[14px] leading-snug text-forest-text">
                <span className="mr-2 text-[11px] uppercase tracking-wider text-forest-gold">
                  {q.stage}
                </span>
                {q.question}
              </li>
            ))}
          </ol>
        )}
        <a
          className={`${BTN_GHOST} ln-noprint mt-2 inline-block`}
          href={`/api/lens/reports/${bundle.report.id}/debrief`}
          target="_blank"
          rel="noreferrer"
        >
          Open as JSON
        </a>
      </section>

      {/* Action items */}
      <section className="mt-8">
        <h2 className="mb-1 font-serif text-lg text-forest-text">Action items</h2>
        <div className={RULE} />
        {bundle.actionItems.length === 0 ? (
          <p className="mt-3 text-[13px] leading-relaxed text-forest-muted">
            These are seeded from the recommendations when you finalise, and surface on
            the next visit to this classroom.
          </p>
        ) : (
          <div className="mt-3 flex flex-col gap-2">
            {bundle.actionItems.map((item) => (
              <div key={item.id} className={CARD}>
                <p className="text-[14px] leading-snug text-forest-text">{item.text}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <input
                    className="ln-field !w-auto !py-1.5 !text-[13px]"
                    placeholder="Owner"
                    defaultValue={item.owner ?? ''}
                    onBlur={(e) =>
                      e.target.value !== (item.owner ?? '') &&
                      updateActionItem(item, { owner: e.target.value || null })
                    }
                  />
                  <input
                    type="date"
                    className="ln-field !w-auto !py-1.5 !text-[13px]"
                    defaultValue={item.due_date ?? ''}
                    onBlur={(e) =>
                      e.target.value !== (item.due_date ?? '') &&
                      updateActionItem(item, { due_date: e.target.value || null })
                    }
                  />
                  <select
                    className="ln-field !w-auto !py-1.5 !text-[13px]"
                    value={item.status}
                    onChange={(e) =>
                      updateActionItem(item, { status: e.target.value as LensActionItem['status'] })
                    }
                  >
                    {ACTION_ITEM_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {ACTION_ITEM_STATUS_LABELS[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* The signing bar */}
      <div className="ln-noprint fixed inset-x-0 bottom-0 z-20 border-t border-[rgba(52,211,153,0.18)] bg-[#0A1A0F]/97 px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+12px)] backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2">
          <Link href={`/lens/visits/${visitId}/capture`} className={BTN_GHOST}>
            Back to capture
          </Link>
          <div className="ml-auto flex gap-2">
            {isFinal ? (
              <button type="button" className={BTN_SECONDARY} disabled={!!busy} onClick={reopen}>
                {busy === 'reopen' ? '…' : 'Reopen (bumps version)'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  className={BTN_SECONDARY}
                  disabled={!!busy || !dirty}
                  onClick={save}
                >
                  {busy === 'save' ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  className={BTN_PRIMARY}
                  disabled={!!busy || orderedSections.length === 0}
                  onClick={finalise}
                >
                  {busy === 'finalise' ? 'Finalising…' : 'Finalise'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <GuruPanel
        visitId={visitId}
        reportId={bundle.report.id}
        open={guruOpen}
        pending={guruRequest}
        onClose={() => {
          setGuruOpen(false);
          setGuruRequest(null);
        }}
        onUse={(text, sectionKey) => {
          if (sectionKey) patchSection(sectionKey, { body_en: text });
          setGuruOpen(false);
          setGuruRequest(null);
        }}
      />
    </main>
  );
}
