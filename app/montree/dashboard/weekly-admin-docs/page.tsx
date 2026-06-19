// Weekly Admin Documents — Generate pixel-perfect Summary & Plan .docx files
// Teachers input English + Chinese notes per child, then generate & download.
// Dark forest visual treatment — all wiring intact
'use client';

import { useState, useEffect, useCallback, useRef, CSSProperties } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, ChevronLeft, ChevronRight, Sparkles,
  Download, Save, FileText, ClipboardList, AlertTriangle,
} from 'lucide-react';
import { getSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';
import { useFeatures } from '@/hooks/useFeatures';
import { sortChildrenByCustomOrder } from '@/lib/montree/weekly-admin/child-order';
import VoiceDictate from '@/components/montree/voice/VoiceDictate';
import { toast } from 'sonner';
import { AREA_KEYS, getAreaLabel } from '@/lib/montree/i18n/area-labels';

const AREAS = AREA_KEYS.map(key => ({
  key,
  label: getAreaLabel(key, 'en'),
  zh: getAreaLabel(key, 'zh'),
}));

interface Child {
  id: string;
  name: string;
}

interface NoteData {
  english_text: string;
  chinese_text: string;
}

type SummaryNotes = Record<string, NoteData>;
type PlanNotes = Record<string, Record<string, NoteData>>;

// Dark forest tokens
const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  toolbarBg: 'linear-gradient(180deg, rgba(7,18,12,0.96), rgba(7,18,12,0.90))',
  toolbarBorder: '1px solid rgba(52,211,153,0.15)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  cardRadius: 18,
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldDeep: '#10b981',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  violet: '#c4b5fd',
  violetSoft: 'rgba(139,92,246,0.18)',
  violetBorder: 'rgba(139,92,246,0.45)',
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
  mono: '"SF Mono", Menlo, Consolas, monospace',
};

const ctaPrimary: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  background: 'linear-gradient(180deg, #34d399, #10b981)',
  border: '1px solid rgba(52,211,153,0.55)',
  color: '#06281a',
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
};

const ctaViolet: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  background: T.violetSoft,
  border: `1px solid ${T.violetBorder}`,
  color: T.violet,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ctaAmber: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  padding: '8px 14px',
  borderRadius: 10,
  background: T.amberSoft,
  border: `1px solid ${T.amberBorder}`,
  color: T.amber,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const ghostBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  padding: '6px 10px',
  borderRadius: 8,
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.10)',
  color: T.textPrimary,
  fontFamily: T.sans,
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};

export default function WeeklyAdminDocsPage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  const { isEnabled, loading: featuresLoading } = useFeatures();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoFilling, setAutoFilling] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [weekStart, setWeekStart] = useState(() => getCurrentMonday());

  const [activeTab, setActiveTab] = useState<'summary' | 'plan'>('summary');

  const [summaryNotes, setSummaryNotes] = useState<SummaryNotes>({});
  const [planNotes, setPlanNotes] = useState<PlanNotes>({});

  const [staleChildren, setStaleChildren] = useState<Array<{
    child_id: string;
    child_name: string;
    missing_works: string[];
  }>>([]);

  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const weekRef = useRef(weekStart);
  weekRef.current = weekStart;

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    const sess = getSession();
    if (!sess) {
      router.push('/montree/login');
      return;
    }
    if (isHomeschoolParent(sess)) {
      router.push('/montree/dashboard');
      return;
    }
    if (!featuresLoading && !isEnabled('weekly_admin_docs')) {
      router.push('/montree/dashboard');
      return;
    }
    setSession(sess);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, featuresLoading]);

  const fetchData = useCallback(async () => {
    if (!session?.classroom?.id) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError('');

    try {
      const [childrenRes, notesRes] = await Promise.all([
        montreeApi(`/api/montree/children?classroom_id=${session.classroom?.id}`),
        montreeApi(`/api/montree/weekly-admin-docs/notes?classroom_id=${session.classroom?.id}&week_start=${weekStart}`),
      ]);

      if (controller.signal.aborted) return;

      const childrenData = await childrenRes.json();
      const notesData = notesRes.ok ? await notesRes.json() : { notes: [] };

      if (controller.signal.aborted) return;

      if (childrenData.children) {
        const sorted = sortChildrenByCustomOrder(childrenData.children as Child[]);
        setChildren(sorted);
      }

      const sNotes: SummaryNotes = {};
      const pNotes: PlanNotes = {};

      const hasAnyNotes = notesData.notes && notesData.notes.length > 0;

      if (notesData.notes) {
        for (const note of notesData.notes) {
          if (note.doc_type === 'summary') {
            sNotes[note.child_id] = {
              english_text: note.english_text || '',
              chinese_text: note.chinese_text || '',
            };
          } else if (note.doc_type === 'plan') {
            if (!pNotes[note.child_id]) pNotes[note.child_id] = {};
            if (note.area === null) {
              pNotes[note.child_id]['_chinese'] = {
                english_text: note.english_text || '',
                chinese_text: note.chinese_text || '',
              };
            } else if (note.area === 'notes') {
              pNotes[note.child_id]['_notes'] = {
                english_text: note.english_text || '',
                chinese_text: note.chinese_text || '',
              };
            } else {
              pNotes[note.child_id][note.area] = {
                english_text: note.english_text || '',
                chinese_text: note.chinese_text || '',
              };
            }
          }
        }
      }

      setSummaryNotes(sNotes);
      setPlanNotes(pNotes);
      setStaleChildren(notesData.stale_children || []);
      setLoading(false);

      if (!hasAnyNotes && !controller.signal.aborted) {
        handleAutoFill();
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      if (!controller.signal.aborted) {
        setError('Failed to load data');
        setLoading(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.classroom?.id, weekStart]);

  useEffect(() => {
    if (featuresLoading || !isEnabled('weekly_admin_docs')) return;
    fetchData();
    return () => { abortRef.current?.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchData, featuresLoading]);

  const saveNotes = async (silent = false): Promise<boolean> => {
    if (!session?.classroom?.id) return false;
    if (!silent) { setSaving(true); setError(''); setSuccess(''); }

    try {
      const notes: Array<{
        child_id: string;
        doc_type: string;
        area: string | null;
        english_text: string | null;
        chinese_text: string | null;
      }> = [];

      for (const child of children) {
        const sn = summaryNotes[child.id];
        if (sn && (sn.english_text || sn.chinese_text)) {
          notes.push({
            child_id: child.id,
            doc_type: 'summary',
            area: null,
            english_text: sn.english_text || null,
            chinese_text: sn.chinese_text || null,
          });
        }
      }

      for (const child of children) {
        const pn = planNotes[child.id];
        if (pn) {
          for (const area of AREAS) {
            const an = pn[area.key];
            if (an && an.english_text) {
              notes.push({
                child_id: child.id,
                doc_type: 'plan',
                area: area.key,
                english_text: an.english_text || null,
                chinese_text: null,
              });
            }
          }
          const chNote = pn['_chinese'];
          if (chNote && chNote.chinese_text) {
            notes.push({
              child_id: child.id,
              doc_type: 'plan',
              area: null,
              english_text: null,
              chinese_text: chNote.chinese_text || null,
            });
          }
          const notesEntry = pn['_notes'];
          if (notesEntry && notesEntry.english_text) {
            notes.push({
              child_id: child.id,
              doc_type: 'plan',
              area: 'notes',
              english_text: notesEntry.english_text || null,
              chinese_text: null,
            });
          }
        }
      }

      if (notes.length === 0) {
        if (!silent) { setError(t('weeklyAdmin.noNotes')); setSaving(false); }
        return false;
      }

      const res = await montreeApi('/api/montree/weekly-admin-docs/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom?.id,
          week_start: weekStart,
          notes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        if (!silent) { setSuccess(t('weeklyAdmin.saved')); setTimeout(() => setSuccess(''), 3000); }
        return true;
      } else {
        if (!silent) setError(data.error || t('weeklyAdmin.saveFailed'));
        return false;
      }
    } catch {
      if (!silent) setError(t('weeklyAdmin.saveFailed'));
      return false;
    } finally {
      if (!silent) setSaving(false);
    }
  };

  const handleSave = () => saveNotes(false);

  const handleGenerate = async (docType: 'summary' | 'plan') => {
    if (!session?.classroom?.id) return;
    setGenerating(docType);
    setError('');

    const saved = await saveNotes(true);
    if (!saved) {
      // If nothing to save, still try generate (DB may have notes from earlier)
    }

    try {
      const res = await fetch('/api/montree/weekly-admin-docs/generate', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          classroom_id: session.classroom?.id,
          week_start: weekStart,
          doc_type: docType,
          locale,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setError(errData.error || t('weeklyAdmin.generateFailed'));
        return;
      }

      const blob = await res.blob();
      const filename = docType === 'summary'
        ? `Weekly_Summary_${weekStart}.docx`
        : `Weekly_Plan_${weekStart}.docx`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccess(`${t('weeklyAdmin.downloaded')} ${filename}`);
      setTimeout(() => setSuccess(''), 3000);
    } catch {
      setError(t('weeklyAdmin.generateFailed'));
    } finally {
      setGenerating(null);
    }
  };

  const handleAutoFill = async () => {
    if (!session?.classroom?.id) return;
    const requestedWeek = weekStart;
    setAutoFilling(true);
    setError('');
    setSuccess('');

    try {
      const res = await montreeApi(
        `/api/montree/weekly-admin-docs/auto-fill?classroom_id=${session.classroom?.id}&week_start=${requestedWeek}&locale=${locale}`
      );

      if (!mountedRef.current || weekRef.current !== requestedWeek) return;

      if (!res.ok) {
        setError(t('weeklyAdmin.autoFillFailed'));
        return;
      }

      const data = await res.json();
      if (!mountedRef.current || weekRef.current !== requestedWeek) return;

      if (!data.children || !Array.isArray(data.children)) {
        setError(t('weeklyAdmin.autoFillFailed'));
        return;
      }

      let filledCount = 0;

      const newSummary: SummaryNotes = {};
      for (const suggestion of data.children) {
        if (suggestion.summaryEnglish || suggestion.summaryChinese) filledCount++;
        newSummary[suggestion.childId] = {
          english_text: suggestion.summaryEnglish || '',
          chinese_text: suggestion.summaryChinese || '',
        };
      }

      const newPlan: PlanNotes = {};
      for (const suggestion of data.children) {
        if (!newPlan[suggestion.childId]) newPlan[suggestion.childId] = {};
        const zhAreas = suggestion.planAreasZh || {};
        for (const [area, workName] of Object.entries(suggestion.planAreas || {})) {
          if (workName) filledCount++;
          newPlan[suggestion.childId][area] = {
            english_text: workName as string,
            chinese_text: (zhAreas[area] as string) || '',
          };
        }
      }

      setSummaryNotes((prev) => ({ ...prev, ...newSummary }));
      setPlanNotes((prev) => {
        const merged = { ...prev };
        for (const [childId, areas] of Object.entries(newPlan)) {
          merged[childId] = { ...(merged[childId] || {}), ...areas };
        }
        return merged;
      });

      setStaleChildren([]);

      setSuccess(`${t('weeklyAdmin.autoFilled')} (${filledCount})`);
      setTimeout(() => { if (mountedRef.current) setSuccess(''); }, 3000);
    } catch {
      if (mountedRef.current) setError(t('weeklyAdmin.autoFillFailed'));
    } finally {
      if (mountedRef.current) setAutoFilling(false);
    }
  };

  const updateSummaryNote = (childId: string, field: 'english_text' | 'chinese_text', value: string) => {
    setSummaryNotes((prev) => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || { english_text: '', chinese_text: '' }),
        [field]: value,
      },
    }));
  };

  const updatePlanNote = (childId: string, area: string, field: 'english_text' | 'chinese_text', value: string) => {
    setPlanNotes((prev) => ({
      ...prev,
      [childId]: {
        ...(prev[childId] || {}),
        [area]: {
          ...(prev[childId]?.[area] || { english_text: '', chinese_text: '' }),
          [field]: value,
        },
      },
    }));
  };

  if (!session) return null;

  const isMaxWeek = weekStart >= (activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday());

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      backgroundImage: T.glow,
      paddingBottom: 80,
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <style>{`.wad-textarea::placeholder, .wad-input::placeholder { color: rgba(255,255,255,0.30); }`}</style>

      {/* Sticky header */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 10,
        background: T.toolbarBg,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        borderBottom: T.toolbarBorder,
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <button
            onClick={() => router.push('/montree/dashboard')}
            aria-label={t('common.back')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <h1 style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 18,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
          }}>
            {t('weeklyAdmin.title')}
          </h1>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            ...ctaPrimary,
            opacity: saving ? 0.55 : 1,
            cursor: saving ? 'not-allowed' : 'pointer',
          }}
        >
          <Save size={12} strokeWidth={2} />
          {saving ? t('common.loading') : t('common.save')}
        </button>
      </div>

      {/* Week selector */}
      <div style={{
        padding: '12px 16px',
        background: 'rgba(7,18,12,0.55)',
        borderBottom: T.toolbarBorder,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}>
        <label style={{
          fontFamily: T.sans,
          fontSize: 12,
          fontWeight: 600,
          color: T.textSecondary,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}>
          {t('weeklyAdmin.week')}:
        </label>
        <button
          onClick={() => setWeekStart(shiftWeek(weekStart, -1))}
          aria-label="Previous week"
          style={{
            ...ghostBtn,
            width: 28,
            height: 28,
            padding: 0,
          }}
        >
          <ChevronLeft size={14} strokeWidth={1.75} />
        </button>
        <span style={{
          minWidth: 130,
          textAlign: 'center',
          fontFamily: T.mono,
          fontSize: 13,
          fontWeight: 500,
          color: T.textPrimary,
          padding: '5px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}>
          {weekStart}
        </span>
        <button
          onClick={() => {
            const next = shiftWeek(weekStart, 1);
            const maxWeek = activeTab === 'plan' ? shiftWeek(getCurrentMonday(), 1) : getCurrentMonday();
            if (next <= maxWeek) setWeekStart(next);
          }}
          disabled={isMaxWeek}
          aria-label="Next week"
          style={{
            ...ghostBtn,
            width: 28,
            height: 28,
            padding: 0,
            opacity: isMaxWeek ? 0.30 : 1,
            cursor: isMaxWeek ? 'not-allowed' : 'pointer',
          }}
        >
          <ChevronRight size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* Tabs + actions */}
      <div style={{
        padding: '10px 16px',
        background: 'rgba(7,18,12,0.40)',
        borderBottom: T.toolbarBorder,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
      }}>
        {[
          { id: 'summary' as const, label: t('weeklyAdmin.summaryTab'), icon: FileText },
          { id: 'plan' as const, label: t('weeklyAdmin.planTab'), icon: ClipboardList },
        ].map(opt => {
          const active = activeTab === opt.id;
          const Icon = opt.icon;
          const isViolet = opt.id === 'plan';
          return (
            <button
              key={opt.id}
              onClick={() => setActiveTab(opt.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: 10,
                background: active
                  ? (isViolet ? T.violetSoft : T.emeraldStrong)
                  : 'rgba(255,255,255,0.06)',
                border: `1px solid ${active
                  ? (isViolet ? T.violetBorder : 'rgba(52,211,153,0.45)')
                  : 'rgba(255,255,255,0.10)'}`,
                color: active
                  ? (isViolet ? T.violet : T.emerald)
                  : T.textSecondary,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 120ms ease',
              }}
            >
              <Icon size={14} strokeWidth={1.75} />
              {opt.label}
            </button>
          );
        })}

        <div style={{ flex: 1 }} />

        <button
          onClick={handleAutoFill}
          disabled={autoFilling}
          style={{
            ...ctaAmber,
            opacity: autoFilling ? 0.55 : 1,
            cursor: autoFilling ? 'not-allowed' : 'pointer',
          }}
        >
          <Sparkles size={12} strokeWidth={1.75} />
          {autoFilling ? '...' : t('weeklyAdmin.autoFill')}
        </button>

        <button
          onClick={() => handleGenerate(activeTab)}
          disabled={generating !== null}
          style={{
            ...(activeTab === 'plan' ? ctaViolet : ctaPrimary),
            opacity: generating !== null ? 0.55 : 1,
            cursor: generating !== null ? 'not-allowed' : 'pointer',
          }}
        >
          <Download size={12} strokeWidth={2} />
          {generating === activeTab ? t('weeklyAdmin.generating') : t('weeklyAdmin.generate')}
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: T.redSoft,
          border: `1px solid ${T.redBorder}`,
          color: T.red,
          fontFamily: T.sans,
          fontSize: 13,
          borderRadius: 12,
        }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{
          margin: '12px 16px 0',
          padding: '10px 14px',
          background: T.emeraldStrong,
          border: '1px solid rgba(52,211,153,0.40)',
          color: T.emerald,
          fontFamily: T.sans,
          fontSize: 13,
          borderRadius: 12,
        }}>
          {success}
        </div>
      )}

      {/* Stale-notes banner */}
      {(() => {
        if (loading || autoFilling) return null;
        if (staleChildren.length === 0) return null;
        return (
          <div style={{
            margin: '12px 16px 0',
            padding: '10px 14px',
            background: T.amberSoft,
            border: `1px solid ${T.amberBorder}`,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <AlertTriangle size={15} strokeWidth={1.75} color={T.amber} style={{ flexShrink: 0 }} />
            <span style={{
              flex: 1,
              fontFamily: T.sans,
              fontSize: 12,
              color: T.amber,
              lineHeight: 1.4,
            }}>
              {t('weeklyAdmin.staleBanner')}
            </span>
            <button
              onClick={handleAutoFill}
              disabled={autoFilling}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                background: T.amber,
                border: 'none',
                borderRadius: 999,
                color: '#1a1206',
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                cursor: autoFilling ? 'not-allowed' : 'pointer',
                opacity: autoFilling ? 0.55 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={11} strokeWidth={1.75} />
              {t('weeklyAdmin.refreshAutoFill')}
            </button>
          </div>
        );
      })()}

      {loading && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '60px 0',
          color: T.textMuted,
          fontFamily: T.sans,
          fontSize: 13,
        }}>
          {t('common.loading')}
        </div>
      )}

      {/* Children cards */}
      {!loading && (
        <div style={{
          padding: '20px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {children.length === 0 && (
            <div style={{
              textAlign: 'center',
              color: T.textMuted,
              fontFamily: T.sans,
              fontSize: 14,
              padding: '40px 0',
            }}>
              {t('weeklyAdmin.noChildren')}
            </div>
          )}

          {children.map((child) => (
            <div
              key={child.id}
              style={{
                background: T.card,
                border: T.cardBorder,
                borderRadius: T.cardRadius,
                backdropFilter: T.blur,
                WebkitBackdropFilter: T.blur,
                padding: 16,
              }}
            >
              <h3 style={{
                margin: '0 0 12px',
                fontFamily: T.serif,
                fontSize: 17,
                fontWeight: 500,
                color: T.textPrimary,
                letterSpacing: -0.2,
              }}>
                {child.name}
              </h3>

              {activeTab === 'summary' ? (
                <SummaryCard
                  childId={child.id}
                  notes={summaryNotes[child.id] || { english_text: '', chinese_text: '' }}
                  onUpdate={updateSummaryNote}
                />
              ) : (
                <PlanCard
                  childId={child.id}
                  notes={planNotes[child.id] || {}}
                  onUpdate={updatePlanNote}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Summary Card ────────────────────────────────────────────

function SummaryCard({
  childId,
  notes,
  onUpdate,
}: {
  childId: string;
  notes: NoteData;
  onUpdate: (childId: string, field: 'english_text' | 'chinese_text', value: string) => void;
}) {
  const { t, locale } = useI18n();

  const DISPLAY_FIELD_MAP: Record<string, 'english_text' | 'chinese_text'> = {
    en: 'english_text',
    zh: 'chinese_text',
    es: 'english_text',
  };
  const displayField = DISPLAY_FIELD_MAP[locale] || 'english_text';
  const displayValue = notes[displayField] || '';
  const PLACEHOLDER_MAP: Record<string, string> = {
    en: 'Practical Life: ...\nSensorial: ...\nMathematics: ...\nLanguage: ...\nCultural: ...',
    zh: '日常生活：...\n感官：...\n数学：...\n语言：...\n文化：...',
    es: 'Practical Life: ...\nSensorial: ...\nMathematics: ...\nLanguage: ...\nCultural: ...',
  };
  const placeholder = PLACEHOLDER_MAP[locale] || PLACEHOLDER_MAP.en;

  return (
    <div>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <label style={{
          fontFamily: T.sans,
          fontSize: 11,
          fontWeight: 700,
          color: T.textMuted,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        }}>
          {t('weeklyAdmin.thisWeekActivities')}
        </label>
        <VoiceDictate
          size="sm"
          onAppend={(text) => onUpdate(childId, displayField, displayValue ? displayValue + ' ' + text : text)}
          onError={(msg) => toast.error(msg)}
        />
      </div>
      <textarea
        className="wad-textarea"
        value={displayValue}
        onChange={(e) => onUpdate(childId, displayField, e.target.value)}
        placeholder={placeholder}
        rows={5}
        style={{
          width: '100%',
          padding: '10px 12px',
          borderRadius: 12,
          background: T.inputBg,
          border: `1px solid ${T.inputBorder}`,
          color: T.textPrimary,
          fontFamily: T.sans,
          fontSize: 13,
          lineHeight: 1.5,
          outline: 'none',
          resize: 'vertical',
          boxSizing: 'border-box',
        }}
      />
    </div>
  );
}

// ─── Plan Card ───────────────────────────────────────────────

function PlanCard({
  childId,
  notes,
  onUpdate,
}: {
  childId: string;
  notes: Record<string, NoteData>;
  onUpdate: (childId: string, area: string, field: 'english_text' | 'chinese_text', value: string) => void;
}) {
  const { t, locale } = useI18n();
  const chineseNote = notes['_chinese'] || { english_text: '', chinese_text: '' };
  const notesEntry = notes['_notes'] || { english_text: '', chinese_text: '' };

  const LOCALE_FIELD: Record<string, 'chinese_text' | 'english_text'> = { zh: 'chinese_text' };
  const displayField = LOCALE_FIELD[locale] || 'english_text';

  const labelStyle: CSSProperties = {
    fontFamily: T.sans,
    fontSize: 11,
    fontWeight: 700,
    color: T.textMuted,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Per-area work names */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: 8,
      }}>
        {AREAS.map((area) => {
          const areaNote = notes[area.key] || { english_text: '', chinese_text: '' };
          const displayValue = areaNote[displayField] || areaNote.english_text || '';
          const areaLabel = getAreaLabel(area.key, locale);
          return (
            <div key={area.key}>
              <div style={{
                ...labelStyle,
                fontSize: 10,
                textAlign: 'center',
                marginBottom: 4,
              }}>
                {areaLabel}
              </div>
              <input
                className="wad-input"
                type="text"
                value={displayValue}
                onChange={(e) => onUpdate(childId, area.key, displayField, e.target.value)}
                placeholder={areaLabel}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: T.inputBg,
                  border: `1px solid ${T.inputBorder}`,
                  color: T.textPrimary,
                  fontFamily: T.sans,
                  fontSize: 12,
                  lineHeight: 1.4,
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Developmental note + additional notes */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 12,
      }}>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 5,
          }}>
            <label style={labelStyle}>
              {t('weeklyAdmin.developmentalNote')}
            </label>
            <VoiceDictate
              size="sm"
              onAppend={(text) => onUpdate(childId, '_chinese', 'chinese_text', chineseNote.chinese_text ? chineseNote.chinese_text + ' ' + text : text)}
              onError={(msg) => toast.error(msg)}
            />
          </div>
          <textarea
            className="wad-textarea"
            value={chineseNote.chinese_text}
            onChange={(e) => onUpdate(childId, '_chinese', 'chinese_text', e.target.value)}
            placeholder={t('weeklyAdmin.developmentalNotePlaceholder')}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 10,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 12,
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
        <div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 5,
          }}>
            <label style={labelStyle}>
              {t('weeklyAdmin.notes')}
            </label>
            <VoiceDictate
              size="sm"
              onAppend={(text) => onUpdate(childId, '_notes', 'english_text', notesEntry.english_text ? notesEntry.english_text + ' ' + text : text)}
              onError={(msg) => toast.error(msg)}
            />
          </div>
          <textarea
            className="wad-textarea"
            value={notesEntry.english_text}
            onChange={(e) => onUpdate(childId, '_notes', 'english_text', e.target.value)}
            placeholder={t('weeklyAdmin.notesPlaceholder')}
            rows={3}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 10,
              background: T.inputBg,
              border: `1px solid ${T.inputBorder}`,
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 12,
              lineHeight: 1.5,
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function getCurrentMonday(): string {
  const now = new Date();
  const beijing = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  const day = beijing.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  beijing.setUTCDate(beijing.getUTCDate() + diff);
  return beijing.toISOString().slice(0, 10);
}

function shiftWeek(weekStart: string, weeks: number): string {
  const d = new Date(`${weekStart}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + weeks * 7);
  return d.toISOString().slice(0, 10);
}
