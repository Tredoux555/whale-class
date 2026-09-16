// components/montree/reports/MonthlySummaryPanel.tsx
//
// The Monthly Summary tab of /montree/dashboard/weekly-admin-docs (2026-09-15).
//
// Until now the Monthly Summary only existed inside WeeklyAdminTab, which is
// mounted on the Photo Audit page — the standalone Weekly Admin page (the one
// teachers actually open) is a separate implementation with just two tabs, so
// the feature was invisible there. This panel is self-contained so the page
// can mount it next to "Weekly Summary" without touching the weekly flow.
//
// Text comes from /monthly-auto-fill?areas=language — one English-area
// sentence per child built from the tracking ledger. PURE ENGLISH (owner,
// 2026-09-16): one English box per child, no Chinese anywhere. Auto-fill only
// fills EMPTY boxes (the batch-1 rule): a teacher's edit is never overwritten;
// clear a box and Auto-fill again to regenerate it.
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Sparkles, Download, Save, AlertTriangle } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import {
  currentMonthStart,
  dayInTz,
  isDateKey,
  monthEnd,
  monthKeyLabel,
  shiftMonth,
} from '@/lib/montree/week-key';

interface PanelChild {
  id: string;
  name: string;
}

/** childId → the English sentence in that child's box. */
type MonthlyNotes = Record<string, string>;

type AreaMode = 'language' | 'all';

const C = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  redBorder: 'rgba(239,68,68,0.30)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.25)',
  inputBorder: 'rgba(52,211,153,0.18)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const SHORT_MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "1 Sep – 15 Sep 2026" (this month, so far) or "1 Aug – 31 Aug 2026". */
function periodHint(ms: string): string {
  const today = dayInTz();
  const end = ms.slice(0, 7) === today.slice(0, 7) ? today : monthEnd(ms);
  const m = SHORT_MONTH[Number(ms.slice(5, 7)) - 1];
  return `1 ${m} – ${Number(end.slice(8, 10))} ${m} ${ms.slice(0, 4)}`;
}

function readMonthFromUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = new URLSearchParams(window.location.search).get('month');
    const key = raw && /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01` : raw;
    return key && isDateKey(key) && key.endsWith('-01') ? key : null;
  } catch {
    return null;
  }
}

function writeMonthToUrl(ms: string): void {
  if (typeof window === 'undefined') return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('month', ms.slice(0, 7));
    window.history.replaceState(window.history.state, '', url.toString());
  } catch {
    // non-fatal
  }
}

export default function MonthlySummaryPanel({
  classroomId,
  childList,
}: {
  classroomId: string;
  childList: PanelChild[];
}) {
  const { t } = useI18n();
  const [monthStart, setMonthStartState] = useState<string>(() => readMonthFromUrl() ?? currentMonthStart());
  const [notes, setNotes] = useState<MonthlyNotes>({});
  const [mode, setMode] = useState<AreaMode>('language');
  const [loading, setLoading] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [migrationPending, setMigrationPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const mountedRef = useRef(true);
  const monthRef = useRef(monthStart);
  monthRef.current = monthStart;
  const notesRef = useRef(notes);
  notesRef.current = notes;
  // t() via a ref so autoFill's identity (and the load effect) never depends
  // on the i18n hook returning a stable function.
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const thisMonth = currentMonthStart();
  const setMonthStart = (ms: string) => {
    setMonthStartState(ms);
    writeMonthToUrl(ms);
  };

  const flash = (msg: string) => {
    setSuccess(msg);
    setTimeout(() => { if (mountedRef.current) setSuccess(''); }, 3000);
  };

  /** Fill EMPTY boxes only. Returns how many boxes were filled. */
  const autoFill = useCallback(async (areaMode: AreaMode, base?: MonthlyNotes) => {
    if (!classroomId) return 0;
    const requested = monthRef.current;
    setAutoFilling(true);
    setError('');
    try {
      const res = await montreeApi(
        `/api/montree/weekly-admin-docs/monthly-auto-fill?classroom_id=${classroomId}&month_start=${requested}&areas=${areaMode}`,
      );
      if (!res.ok) {
        setError(tRef.current('weeklyAdmin.autoFillFailed'));
        return 0;
      }
      const data = await res.json();
      if (monthRef.current !== requested || !mountedRef.current) return 0; // stale
      const current = { ...(base ?? notesRef.current) };
      let filled = 0;
      for (const c of (data.children || []) as Array<{ childId: string; body?: string }>) {
        const prev = current[c.childId] ?? '';
        if (!prev.trim() && c.body) {
          current[c.childId] = c.body;
          filled++;
        }
      }
      setNotes(current);
      return filled;
    } catch {
      if (mountedRef.current) setError(tRef.current('weeklyAdmin.autoFillFailed'));
      return 0;
    } finally {
      if (mountedRef.current) setAutoFilling(false);
    }
  }, [classroomId]);

  // Load saved notes for the month, then fill whatever is still empty.
  useEffect(() => {
    if (!classroomId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      setNotes({});
      try {
        const res = await montreeApi(
          `/api/montree/weekly-admin-docs/monthly-notes?classroom_id=${classroomId}&month_start=${monthStart}`,
        );
        if (cancelled) return;
        if (res.status === 503) {
          const errData = await res.json().catch(() => ({}));
          if (errData?.migration_pending) {
            setMigrationPending(true);
            return;
          }
        }
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setMigrationPending(false);
        const saved: MonthlyNotes = {};
        for (const row of (data.notes || []) as Array<{ child_id: string; english_text: string | null }>) {
          saved[row.child_id] = row.english_text || '';
        }
        setNotes(saved);
        notesRef.current = saved;
        setLoading(false);
        // The first open of a month fills the empty boxes in English-area mode.
        await autoFill('language');
      } catch {
        // soft fail — the teacher can Auto-fill by hand
      } finally {
        if (!cancelled && mountedRef.current) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [classroomId, monthStart, autoFill]);

  const payload = () =>
    Object.entries(notes)
      .filter(([, en]) => en.trim().length > 0)
      .map(([child_id, en]) => ({ child_id, english_text: en }));

  /** POST the boxes. Returns false (and says why) when nothing was saved. */
  const persist = async (): Promise<boolean> => {
    const rows = payload();
    if (rows.length === 0) {
      setError(t('weeklyAdmin.noNotes'));
      return false;
    }
    const res = await fetch('/api/montree/weekly-admin-docs/monthly-notes', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ classroom_id: classroomId, month_start: monthStart, notes: rows }),
    });
    if (res.status === 503) {
      const errData = await res.json().catch(() => ({}));
      if (errData?.migration_pending) {
        setMigrationPending(true);
        setError(t('weeklyAdmin.monthlyMigrationPending'));
        return false;
      }
    }
    if (!res.ok) {
      setError(t('weeklyAdmin.saveFailed'));
      return false;
    }
    return true;
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (await persist()) flash(t('weeklyAdmin.saved'));
    } catch {
      setError(t('weeklyAdmin.saveFailed'));
    } finally {
      if (mountedRef.current) setSaving(false);
    }
  };

  const handleAutoFill = async () => {
    setSuccess('');
    const filled = await autoFill(mode);
    flash(
      filled > 0
        ? `${t('weeklyAdmin.autoFilled')} (${filled})`
        : 'Every box already has text — clear a box to regenerate it.',
    );
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      // Save first so the .docx reflects what is on screen.
      if (!(await persist())) return;
      const res = await fetch('/api/montree/weekly-admin-docs/monthly-generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: classroomId, month_start: monthStart, mode }),
      });
      if (!res.ok) {
        setError(t('weeklyAdmin.generateFailed'));
        return;
      }
      const blob = await res.blob();
      let filename = `Monthly_Summary_${monthStart}.docx`;
      const m = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
      if (m) filename = m[1];
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      flash(t('weeklyAdmin.monthlyDownloaded'));
    } catch {
      setError(t('weeklyAdmin.generateFailed'));
    } finally {
      if (mountedRef.current) setGenerating(false);
    }
  };

  const update = (childId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [childId]: value }));
  };

  const busy = autoFilling || migrationPending;
  const textareaStyle = {
    width: '100%',
    padding: '10px 12px',
    borderRadius: 12,
    background: C.inputBg,
    border: `1px solid ${C.inputBorder}`,
    color: C.textPrimary,
    fontFamily: C.sans,
    fontSize: 13,
    lineHeight: 1.5,
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  };

  return (
    <div>
      {/* Month picker + actions */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(7,18,12,0.55)',
        borderBottom: '1px solid rgba(52,211,153,0.15)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
      }}>
        <label style={{ fontFamily: C.sans, fontSize: 12, fontWeight: 600, color: C.textSecondary, letterSpacing: 0.3, textTransform: 'uppercase' }}>
          {t('weeklyAdmin.monthlyPeriod')}:
        </label>
        <button
          onClick={() => setMonthStart(shiftMonth(monthStart, -1))}
          aria-label="Previous month"
          className="btn btn-secondary btn-icon btn-sm"
        >
          <ChevronLeft size={14} strokeWidth={1.75} />
        </button>
        <span
          title={monthStart}
          style={{
            minWidth: 150,
            textAlign: 'center',
            fontFamily: C.serif,
            fontSize: 15,
            fontWeight: 500,
            color: C.textPrimary,
            padding: '5px 12px',
            borderRadius: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          {monthKeyLabel(monthStart)}
        </span>
        <button
          onClick={() => { const next = shiftMonth(monthStart, 1); if (next <= thisMonth) setMonthStart(next); }}
          disabled={monthStart >= thisMonth}
          aria-label="Next month"
          className="btn btn-secondary btn-icon btn-sm"
        >
          <ChevronRight size={14} strokeWidth={1.75} />
        </button>
        {monthStart !== thisMonth && (
          <button onClick={() => setMonthStart(thisMonth)} className="btn btn-secondary btn-sm">
            This month
          </button>
        )}
        <span style={{ fontFamily: C.sans, fontSize: 11, color: C.textMuted }}>
          {periodHint(monthStart)}
        </span>

        <div style={{ flex: 1 }} />

        <div style={{ display: 'inline-flex', borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.10)' }}>
          {(['language', 'all'] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              disabled={busy}
              style={{
                padding: '7px 12px',
                fontFamily: C.sans,
                fontSize: 12,
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: mode === m ? C.emeraldStrong : 'rgba(255,255,255,0.06)',
                color: mode === m ? C.emerald : C.textSecondary,
              }}
            >
              {m === 'language' ? t('weeklyAdmin.areasLanguageOnly') : t('weeklyAdmin.areasAll')}
            </button>
          ))}
        </div>
        <button onClick={handleAutoFill} disabled={busy} className="btn btn-gold btn-sm">
          <Sparkles size={12} strokeWidth={1.75} />
          {autoFilling ? '...' : t('weeklyAdmin.autoFill')}
        </button>
        <button onClick={handleGenerate} disabled={generating || migrationPending} className="btn btn-primary btn-sm">
          <Download size={12} strokeWidth={2} />
          {generating ? t('weeklyAdmin.generating') : t('weeklyAdmin.generate')}
        </button>
        <button onClick={handleSave} disabled={saving || migrationPending} className="btn btn-primary btn-sm">
          <Save size={12} strokeWidth={2} />
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>

      {error && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: C.redSoft, border: `1px solid ${C.redBorder}`, color: C.red, fontFamily: C.sans, fontSize: 13, borderRadius: 12 }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ margin: '12px 16px 0', padding: '10px 14px', background: C.emeraldStrong, border: '1px solid rgba(52,211,153,0.40)', color: C.emerald, fontFamily: C.sans, fontSize: 13, borderRadius: 12 }}>
          {success}
        </div>
      )}

      <div style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {migrationPending && (
          <div style={{ padding: '12px 14px', background: C.amberSoft, border: `1px solid ${C.amberBorder}`, borderRadius: 12, color: C.amber, fontFamily: C.sans, fontSize: 13 }}>
            <AlertTriangle size={14} strokeWidth={1.75} style={{ display: 'inline', verticalAlign: '-2px', marginRight: 6 }} />
            {t('weeklyAdmin.monthlyMigrationPending')}
          </div>
        )}

        {(loading || autoFilling) && Object.keys(notes).length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, fontFamily: C.sans, fontSize: 13, padding: '20px 0' }}>
            {t('common.loading')}
          </div>
        )}

        {childList.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textMuted, fontFamily: C.sans, fontSize: 14, padding: '40px 0' }}>
            {t('weeklyAdmin.noChildren')}
          </div>
        )}

        {childList.map((child) => {
          const en = notes[child.id] ?? '';
          return (
            <div
              key={child.id}
              style={{ background: C.card, border: C.cardBorder, borderRadius: 18, backdropFilter: C.blur, WebkitBackdropFilter: C.blur, padding: 16 }}
            >
              <h3 style={{ margin: '0 0 12px', fontFamily: C.serif, fontSize: 17, fontWeight: 500, color: C.textPrimary, letterSpacing: -0.2 }}>
                {child.name}
              </h3>
              <textarea
                className="wad-textarea"
                value={en}
                onChange={(e) => update(child.id, e.target.value)}
                placeholder="One sentence on this month's English work."
                rows={2}
                style={textareaStyle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
