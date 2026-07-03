// components/montree/DashboardHeader.tsx
// Persistent top header shown on ALL dashboard screens — dark forest aesthetic
'use client';

import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  Camera, Mic, Square, MoreHorizontal, ChevronDown,
  FileText, Target, Search, Sparkles, BookOpen,
  LayoutGrid, CalendarDays, Images, FolderOpen, TrendingUp,
  Users, BookMarked, Globe, BarChart2, Settings2, LogOut,
  MessageSquare, KeyRound, Calendar,
  // UserPlus removed Jul 3 2026 — the "Invite your principal" menu row was
  // hidden. Re-add UserPlus here if that row is ever uncommented.
} from 'lucide-react';
import { getSession, clearSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import { useMontreeData } from '@/lib/montree/cache';
// InboxButton — Tredoux-DM channel. Currently hidden from the More menu
// (Session 119, "no function"). Import preserved so the hidden JSX block
// stays uncomment-ready; remove this import if/when that block is deleted.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import InboxButton from './InboxButton';
import LanguageToggle from './LanguageToggle';
import MontreeLogo from './MonteeLogo';
import InvitePrincipalModal from './InvitePrincipalModal';
import { toast } from 'sonner';
import { useFeatures } from '@/hooks/useFeatures';
import { MENU_REGISTRY } from '@/lib/montree/menu/registry';
import type { MenuConfig } from '@/lib/montree/menu/config';

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  glassBtn:     'rgba(255,255,255,0.10)',
  glassBtnHvr:  'rgba(255,255,255,0.18)',
  border:       'rgba(52,211,153,0.15)',
  divider:      'rgba(52,211,153,0.10)',
  emerald:      '#34d399',
  emeraldSoft:  'rgba(52,211,153,0.08)',
  red:          'rgba(239,68,68,0.75)',
  textMd:       'rgba(255,255,255,0.85)',
  textLo:       'rgba(255,255,255,0.75)',
  textMute:     'rgba(255,255,255,0.50)',
  textDanger:   'rgba(239,100,100,0.8)',
  menuBg:       'rgba(8,20,12,0.95)',
};
const SERIF = "var(--font-lora), 'Iowan Old Style', Georgia, serif";
const SANS  = "'Inter', -apple-system, system-ui, sans-serif";

// ── Types ─────────────────────────────────────────────────────────────────────
interface StudentOption { id: string; name: string; photo_url?: string; }
interface TeacherOption  { id: string; name: string; role: string; login_code: string; }

// ── Glass icon button ─────────────────────────────────────────────────────────
function IconBtn({
  children, onClick, title, active = false, recording = false,
  className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  title?: string;
  active?: boolean;
  recording?: boolean;
  className?: string;
}) {
  const [hover, setHover] = useState(false);
  const bg = recording ? C.red : (hover || active ? C.glassBtnHvr : C.glassBtn);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`mt-icon-btn ${className}`.trim()}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        height: 36, padding: '8px 10px',
        background: bg, border: 0, borderRadius: 10, color: '#fff',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        transition: 'background 140ms ease', fontFamily: SANS,
      }}
    >
      {recording && (
        <span aria-hidden="true" style={{
          position: 'absolute', inset: -3, borderRadius: 13,
          border: '2px solid rgba(239,68,68,0.55)',
          animation: 'montree-pulse-ring 1.4s ease-out infinite',
          pointerEvents: 'none',
        }} />
      )}
      {children}
    </button>
  );
}

// ── Menu row ──────────────────────────────────────────────────────────────────
function MenuRow({
  icon: Icon, label, active, danger, onClick,
}: {
  icon: React.ElementType;
  label: string;
  active?: boolean;
  danger?: boolean;
  onClick?: () => void;
}) {
  const [hover, setHover] = useState(false);
  const color     = danger ? C.textDanger : (active ? C.emerald : C.textLo);
  const iconColor = danger ? C.textDanger : (active ? C.emerald : C.textMute);
  const bg        = (hover || active) ? C.emeraldSoft : 'transparent';
  return (
    <button
      type="button"
      role="menuitem"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 10px', background: bg, border: 0, borderRadius: 8,
        color, fontSize: 13, fontWeight: 500, cursor: 'pointer', textAlign: 'left',
        fontFamily: SANS, transition: 'background 120ms ease, color 120ms ease',
      }}
    >
      <Icon size={16} strokeWidth={1.75} color={iconColor} />
      <span>{label}</span>
    </button>
  );
}

// ── Divider ───────────────────────────────────────────────────────────────────
const Divider = () => (
  <div role="separator" style={{ height: 1, margin: '6px 4px', background: C.divider }} />
);

// ── Menu panel ────────────────────────────────────────────────────────────────
const MENU_PANEL_STYLE: React.CSSProperties = {
  position: 'absolute', top: 'calc(100% + 8px)', right: 0,
  width: 248, padding: 6,
  // iPad fix: respect the home-indicator safe area so the bottom item (logout)
  // isn't pushed under it.
  paddingBottom: `calc(6px + env(safe-area-inset-bottom))`,
  background: C.menuBg,
  border: `1px solid ${C.border}`,
  borderRadius: 14,
  backdropFilter: 'blur(24px) saturate(140%)',
  WebkitBackdropFilter: 'blur(24px) saturate(140%)',
  boxShadow: '0 8px 40px rgba(0,0,0,0.5)',
  zIndex: 60,
  // iPad fix: dvh (dynamic viewport height) shrinks with the Safari address bar
  // and bottom toolbar — vh doesn't, which clips the bottom of the scroll area.
  // dvh is on every iPad Safari from 15.4+ (2022).
  maxHeight: 'calc(100dvh - 80px)',
  overflowY: 'auto',
  // Smooth iOS scrolling + prevent the inner scroll bouncing past the menu
  // and snapping the logout out of view.
  WebkitOverflowScrolling: 'touch',
  overscrollBehavior: 'contain',
};

// ── Main component ────────────────────────────────────────────────────────────
function DashboardHeader() {
  const router   = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const { isEnabled } = useFeatures();

  const [showMoreMenu,    setShowMoreMenu]    = useState(false);
  const [showInvitePrincipal, setShowInvitePrincipal] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // Customizable menu config (per-teacher, settings.menu). null = no custom
  // config → render the legacy flag-gated menu below (existing schools
  // untouched). New signups are seeded with the minimal default at signup.
  const [menuConfig, setMenuConfig] = useState<MenuConfig | null>(null);

  // Voice note state
  const [isRecording,      setIsRecording]      = useState(false);
  const [showChildPicker,  setShowChildPicker]  = useState(false);
  const [recordingBlob,    setRecordingBlob]    = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const childPickerRef   = useRef<HTMLDivElement>(null);

  // Teacher selector state
  const [teachers,       setTeachers]       = useState<TeacherOption[]>([]);
  const [showTeacherMenu,setShowTeacherMenu] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [addingTeacher,  setAddingTeacher]  = useState(false);
  const teacherMenuRef = useRef<HTMLDivElement>(null);

  // Student search state
  const [searchQuery,     setSearchQuery]    = useState('');
  const [showDropdown,    setShowDropdown]   = useState(false);
  const [highlightIndex,  setHighlightIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef  = useRef<HTMLInputElement>(null);

  // Extract childId from URL for Guru link context
  const childIdFromPath = useMemo(() => {
    const match = pathname.match(/\/montree\/dashboard\/([a-f0-9-]{36})/);
    return match ? match[1] : null;
  }, [pathname]);

  // Derive active page from pathname for menu highlighting
  const activePage = useMemo(() => {
    if (pathname?.startsWith('/montree/dashboard/messages'))  return 'messages';
    if (pathname?.startsWith('/montree/dashboard/parent-chats')) return 'messages';
    if (pathname === '/montree/dashboard/parent-codes')       return 'parent-codes';
    if (pathname?.startsWith('/montree/dashboard/conversations')) return 'conversations';
    if (pathname?.startsWith('/montree/dashboard/appointments')) return 'appointments';
    if (pathname?.startsWith('/montree/dashboard/games'))      return 'games';
    if (pathname === '/montree/dashboard/notes')              return 'notes';
    if (pathname === '/montree/dashboard/focus')              return 'focus-list';
    if (pathname?.startsWith('/montree/dashboard/photo-audit')) return 'photo-audit';
    if (pathname === '/montree/dashboard/guru')               return 'guru';
    if (pathname === '/montree/dashboard/curriculum')         return 'curriculum';
    if (pathname === '/montree/dashboard/classroom-overview') return 'class-overview';
    if (pathname?.startsWith('/montree/calendar')) return 'calendar';
    if (pathname === '/montree/dashboard/weekly-admin-docs')  return 'weekly-plan';
    if (pathname === '/montree/dashboard/albums')             return 'albums';
    if (pathname?.startsWith('/montree/library'))             return 'library';
    if (pathname === '/montree/dashboard/earnings')           return 'earnings';
    if (pathname === '/montree/dashboard/students')           return 'manage-students';
    if (pathname === '/montree/dashboard/raz')                return 'raz-reading';
    if (pathname === '/montree/dashboard/language-tracker')   return 'language-tracker';
    if (pathname === '/montree/dashboard/progress-overview')  return 'class-progress';
    if (pathname === '/montree/dashboard/classroom-builder')  return 'classroom-setup';
    if (pathname === '/montree/dashboard/language-semester')  return 'language-semester';
    if (pathname?.includes('/language-presentation'))        return 'language-presentation';
    if (pathname === '/montree/dashboard/menu-setup')        return 'menu-setup';
    return null;
  }, [pathname]);

  // Load this teacher's custom menu config (if any). Only sets state when a
  // config exists — otherwise menuConfig stays null and the legacy menu renders.
  useEffect(() => {
    const tid = session?.teacher?.id;
    if (!tid) return;
    let cancelled = false;
    montreeApi('/api/montree/teacher/menu')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (!cancelled && d && d.menu) setMenuConfig(d.menu as MenuConfig); })
      .catch(() => { /* no config / offline → legacy menu */ });
    return () => { cancelled = true; };
  }, [session?.teacher?.id]);

  useEffect(() => {
    const sess = getSession();
    if (!sess) return;
    setSession(sess);
  }, []);

  // Students for the search dropdown — shared SWR cache, NOT a raw fetch.
  // 🚨 Perf (PERF_PASS_JUN13.md Finding 3): this used to be a raw montreeApi
  // GET of the exact URL the dashboard page fetches via useMontreeData, so
  // every cold dashboard load fired the same /children query twice (the old
  // sessionStorage TTL only hid it on revisits). useMontreeData dedupes
  // in-flight requests, so both consumers now share a single GET — and the
  // in-memory cache replaces the sessionStorage layer entirely.
  const studentsUrl =
    session?.classroom?.id && !isHomeschoolParent(session)
      ? `/api/montree/children?classroom_id=${session.classroom.id}`
      : null;
  const { data: studentsData } = useMontreeData<{ children?: StudentOption[] }>(studentsUrl);
  const students = useMemo(
    () => [...(studentsData?.children || [])].sort((a, b) => a.name.localeCompare(b.name)),
    [studentsData]
  );

  // Fetch teachers (cached, 5 min TTL)
  useEffect(() => {
    if (!session?.classroom?.id) return;
    if (isHomeschoolParent(session)) return;
    const cacheKey = `montree_teachers_${session.classroom.id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { list, ts } = JSON.parse(cached);
        if (Date.now() - ts < 5 * 60 * 1000) { setTeachers(list); return; }
      }
    } catch {}
    const controller = new AbortController();
    montreeApi(`/api/montree/classroom/teachers?classroom_id=${session.classroom.id}`, { signal: controller.signal })
      .then(res => res.json())
      .then((data: { teachers?: TeacherOption[] }) => {
        if (controller.signal.aborted) return;
        const list = data.teachers || [];
        setTeachers(list);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ list, ts: Date.now() })); } catch {}
      }).catch(() => {});
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.classroom?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (searchRef.current     && !searchRef.current.contains(e.target as Node))     setShowDropdown(false);
      if (teacherMenuRef.current && !teacherMenuRef.current.contains(e.target as Node)) { setShowTeacherMenu(false); setShowAddTeacher(false); }
      if (moreMenuRef.current   && !moreMenuRef.current.contains(e.target as Node))   setShowMoreMenu(false);
    };
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q));
  }, [searchQuery, students]);

  // ── Voice recording handlers ──────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4',
      });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        setRecordingBlob(new Blob(chunksRef.current, { type: recorder.mimeType }));
        setShowChildPicker(true);
        setIsRecording(false);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000);
    } catch {
      toast.error(t('dashboard.micAccessError'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
  }, []);

  const saveVoiceNote = useCallback(async (childId: string | null) => {
    setShowChildPicker(false);
    const blob = recordingBlob;
    setRecordingBlob(null);
    setRecordingSeconds(0);
    if (!blob || !session?.classroom?.id) return;
    toast.success(t('dashboard.savingMessage'), { duration: 1500 });
    (async () => {
      try {
        const formData = new FormData();
        formData.append('audio', blob, 'voice-note.webm');
        const transcribeRes = await montreeApi('/api/montree/guru/transcribe', { method: 'POST', body: formData });
        if (!transcribeRes.ok) throw new Error(`Transcription failed: ${transcribeRes.status}`);
        const transcribeData = await transcribeRes.json();
        const text = transcribeData.text || transcribeData.transcription || '';
        if (!text.trim()) return;
        await montreeApi('/api/montree/teacher-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classroom_id: session.classroom?.id,
            content: text.trim(),
            transcription: text.trim(),
            child_id: childId,
          }),
        });
        toast.success(t('dashboard.noteSaved'), { duration: 2000 });
      } catch (err) {
        console.error('[VoiceNote] Background save failed:', err);
        toast.error(t('dashboard.saveFailed'));
      }
    })();
  }, [recordingBlob, session?.classroom?.id, t]);

  useEffect(() => {
    const handle = (e: MouseEvent) => {
      if (childPickerRef.current && !childPickerRef.current.contains(e.target as Node)) {
        if (showChildPicker && recordingBlob) saveVoiceNote(null);
      }
    };
    if (showChildPicker) document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, [showChildPicker, recordingBlob, saveVoiceNote]);

  const handleAddTeacher = useCallback(async () => {
    if (!newTeacherName.trim() || !session?.classroom?.id || addingTeacher) return;
    setAddingTeacher(true);
    try {
      const res  = await montreeApi('/api/montree/classroom/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: session.classroom.id, name: newTeacherName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(t('teachers.addFailed')); return; }
      toast.success(t('teachers.added'));
      setTeachers(prev => [...prev, data.teacher]);
      try { sessionStorage.removeItem(`montree_teachers_${session.classroom?.id}`); } catch {}
      setNewTeacherName('');
      setShowAddTeacher(false);
    } catch (err) {
      console.error('Add teacher error:', err);
    } finally {
      setAddingTeacher(false);
    }
  }, [newTeacherName, session?.classroom?.id, addingTeacher, t]);

  const handleStudentSelect = useCallback((student: StudentOption) => {
    setSearchQuery('');
    setShowDropdown(false);
    setHighlightIndex(-1);
    router.push(`/montree/dashboard/${student.id}`);
  }, [router]);

  const handleSearchKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!showDropdown || filtered.length === 0) return;
    if (e.key === 'ArrowDown')  { e.preventDefault(); setHighlightIndex(prev => (prev + 1) % filtered.length); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightIndex(prev => (prev - 1 + filtered.length) % filtered.length); }
    else if (e.key === 'Enter' && highlightIndex >= 0) { e.preventDefault(); handleStudentSelect(filtered[highlightIndex]); }
    else if (e.key === 'Escape') { setShowDropdown(false); inputRef.current?.blur(); }
  }, [showDropdown, filtered, highlightIndex, handleStudentSelect]);

  if (!session?.teacher?.id) return null;

  const isHome         = isHomeschoolParent(session);
  const isDashboardHome = pathname === '/montree/dashboard';
  const showStudentSearch = !isHome && !isDashboardHome && students.length > 0;

  // ── Parent portal — original HOME_THEME header (unchanged) ───────────────
  if (isHome) {
    return (
      <header data-dashboard-header className={`${HOME_THEME.headerBg} text-white shadow-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)] print:hidden`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/montree/dashboard" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
            <span className="text-xl sm:text-2xl">🌳</span>
            <span className="font-bold text-base sm:text-lg truncate">{session.classroom?.name || t('app.name')}</span>
          </Link>
          <LanguageToggle />
        </div>
      </header>
    );
  }

  // ── Teacher dark forest header ─────────────────────────────────────────────
  return (
    <>
      <style>{`
        @keyframes montree-pulse-ring {
          0%   { transform: scale(1);    opacity: 0.8; }
          70%  { transform: scale(1.15); opacity: 0;   }
          100% { transform: scale(1.15); opacity: 0;   }
        }

        /* Session 119 — mobile header tightening.
           Yesterday's Messages icon (Session 117) brought the right-cluster
           to 5 elements (LanguageToggle + Camera + Messages + Mic + More).
           On iPhone viewports (≤ 640px) that overflowed past the teacher
           pill on the left. Three changes restore breathing room without
           losing any feature:
           1. Hide the inline Messages icon on mobile — the More menu still
              has a labelled entry for it (same as before Session 117).
           2. Reduce inter-icon gap from 8px to 4px.
           3. Shrink IconBtn horizontal padding from 10px to 6px.
           4. Cap the teacher-pill text at 56px (was 100px). */
        @media (max-width: 640px) {
          .mt-header-right-cluster { gap: 4px !important; }
          .mt-header-right-cluster .mt-icon-btn { padding-left: 6px !important; padding-right: 6px !important; }
          .mt-header-icon-messages-inline { display: none !important; }
          .mt-header-teacher-name { max-width: 56px !important; }
          /* Session 140 — at phone widths the right-cluster still overlapped
             the wordmark + teacher pill (the logo block is flexShrink:0 and the
             wordmark only capped at min(40vw,200px) ≈ 156px @390px). Tighten the
             row padding/gap and hard-cap the wordmark so it truncates instead of
             colliding with the EN toggle / camera / mic. */
          .mt-header-row { padding-left: 10px !important; padding-right: 10px !important; gap: 8px !important; }
          .mt-header-wordmark { max-width: 92px !important; }
        }
        @media (max-width: 380px) {
          /* Very narrow phones: drop the wordmark entirely, keep the logo mark
             so the action icons never overlap. */
          .mt-header-wordmark { display: none !important; }
        }
      `}</style>

      <header
        data-dashboard-header
        className="print:hidden"
        style={{
          position: 'sticky', top: 0, zIndex: 50,
          background: 'linear-gradient(180deg, rgba(7,18,12,0.96) 0%, rgba(7,18,12,0.90) 100%)',
          borderBottom: `1px solid ${C.border}`,
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
          color: '#fff',
          paddingTop: 'env(safe-area-inset-top)',
          fontFamily: SANS,
        }}
      >
        {/* ── Main row ── */}
        <div className="mt-header-row" style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 18px', maxWidth: 1152, margin: '0 auto',
        }}>

          {/* Left: logo + name + teacher pill */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
            <Link href="/montree/dashboard" data-guide="nav-home" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', flexShrink: 0 }}>
              <MontreeLogo size={28} />
              <span className="mt-header-wordmark" style={{
                fontFamily: SERIF, fontWeight: 500, fontSize: 17, color: '#fff',
                letterSpacing: 0.3, overflow: 'hidden', textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                // Mobile: tight cap so the toggle / icons can't overlap.
                // Desktop: roomier — see CSS below.
                maxWidth: 'min(40vw, 200px)',
              }}>{session.classroom?.name || t('app.name')}</span>
            </Link>

            {/* Teacher selector */}
            <div ref={teacherMenuRef} style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => { setShowTeacherMenu(!showTeacherMenu); setShowAddTeacher(false); }}
                onMouseEnter={e => (e.currentTarget.style.background = C.glassBtnHvr)}
                onMouseLeave={e => (e.currentTarget.style.background = C.glassBtn)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  height: 28, padding: '0 8px 0 10px',
                  background: C.glassBtn, border: 0, borderRadius: 8,
                  color: C.textMd, fontFamily: SANS, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', transition: 'background 140ms ease',
                }}
              >
                <span className="mt-header-teacher-name" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {session.teacher?.name || t('teachers.teacher')}
                </span>
                <ChevronDown size={13} strokeWidth={1.75} style={{ opacity: 0.7 }} />
              </button>

              {showTeacherMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                  minWidth: 200, padding: 6,
                  background: C.menuBg, border: `1px solid ${C.border}`,
                  borderRadius: 12,
                  backdropFilter: 'blur(24px)', WebkitBackdropFilter: 'blur(24px)',
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)', zIndex: 60, fontFamily: SANS,
                }}>
                  {teachers.map(teacher => (
                    <div key={teacher.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '9px 10px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                      color: teacher.id === session.teacher?.id ? C.emerald : C.textLo,
                      background: teacher.id === session.teacher?.id ? C.emeraldSoft : 'transparent',
                    }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{teacher.name}</span>
                      {teacher.id === session.teacher?.id && (
                        <span style={{ fontSize: 11, color: C.emerald, opacity: 0.8, marginLeft: 8, flexShrink: 0 }}>{t('teachers.you')}</span>
                      )}
                    </div>
                  ))}
                  {teachers.length > 0 && <Divider />}
                  {!showAddTeacher ? (
                    <button
                      onClick={e => { e.stopPropagation(); setShowAddTeacher(true); }}
                      onMouseEnter={e => (e.currentTarget.style.background = C.emeraldSoft)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                        padding: '9px 10px', background: 'transparent', border: 0, borderRadius: 8,
                        color: C.emerald, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                        fontFamily: SANS, transition: 'background 120ms ease',
                      }}>
                      <span>+</span><span>{t('teachers.addTeacher')}</span>
                    </button>
                  ) : (
                    <div style={{ padding: '8px 10px' }} onClick={e => e.stopPropagation()}>
                      <input
                        type="text" value={newTeacherName}
                        onChange={e => setNewTeacherName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddTeacher(); if (e.key === 'Escape') setShowAddTeacher(false); }}
                        placeholder={t('teachers.namePlaceholder')}
                        autoFocus maxLength={100}
                        style={{
                          width: '100%', padding: '6px 10px', marginBottom: 8,
                          background: 'rgba(255,255,255,0.08)', border: `1px solid ${C.border}`,
                          borderRadius: 7, color: '#fff', fontSize: 13,
                          fontFamily: SANS, outline: 'none', boxSizing: 'border-box',
                        }}
                      />
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setShowAddTeacher(false)} style={{
                          flex: 1, padding: '5px 0', background: 'transparent',
                          border: `1px solid ${C.divider}`, borderRadius: 6,
                          color: C.textMute, fontSize: 12, cursor: 'pointer', fontFamily: SANS,
                        }}>{t('common.cancel')}</button>
                        <button onClick={handleAddTeacher} disabled={!newTeacherName.trim() || addingTeacher} style={{
                          flex: 1, padding: '5px 0',
                          background: 'rgba(52,211,153,0.15)', border: `1px solid ${C.border}`,
                          borderRadius: 6, color: C.emerald, fontSize: 12, cursor: 'pointer',
                          fontFamily: SANS, opacity: !newTeacherName.trim() || addingTeacher ? 0.45 : 1,
                        }}>{addingTeacher ? t('common.adding') : t('common.add')}</button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: language + camera + mic + more */}
          <div className="mt-header-right-cluster" style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <LanguageToggle />

            <IconBtn
              title={t('capture.takePhoto')}
              active={pathname === '/montree/dashboard/capture'}
              onClick={() => router.push('/montree/dashboard/capture')}
            >
              <Camera size={18} strokeWidth={1.75} color="#fff" />
            </IconBtn>

            {/* Messages — promoted from the More menu to a first-class icon
                so principals + parents can reach this channel in one tap.
                Same destination as the More-menu entry below (which stays for
                discoverability + a labelled affordance).
                Session 119: hidden on ≤640px viewports (CSS media query on
                .mt-header-icon-messages-inline) because the 5-element right
                cluster overflowed the iPhone width. The More menu still
                surfaces it on mobile — same one-tap path as before Session 117. */}
            <IconBtn
              title={t('nav.messages') || 'Messages'}
              active={activePage === 'messages'}
              onClick={() => router.push('/montree/dashboard/parent-chats')}
              className="mt-header-icon-messages-inline"
            >
              <MessageSquare size={18} strokeWidth={1.75} color="#fff" />
            </IconBtn>

            <IconBtn
              title={isRecording ? t('dashboard.stopRecording') : t('dashboard.quickVoiceNote')}
              onClick={isRecording ? stopRecording : startRecording}
              recording={isRecording}
            >
              {isRecording
                ? <Square size={18} strokeWidth={1.75} color="#fff" fill="#fff" />
                : <Mic    size={18} strokeWidth={1.75} color="#fff" />}
            </IconBtn>

            {/* More menu */}
            <div ref={moreMenuRef} style={{ position: 'relative' }}>
              <IconBtn
                title={t('nav.more') || 'More'}
                active={showMoreMenu}
                onClick={() => setShowMoreMenu(v => !v)}
              >
                <MoreHorizontal size={18} strokeWidth={1.75} color="#fff" />
              </IconBtn>

              {showMoreMenu && (
                <div role="menu" style={MENU_PANEL_STYLE}>
                  {/* Customizable section. When the teacher has a saved menu
                      config (settings.menu), render from it — order + visibility,
                      config is the source of truth. Otherwise fall back to the
                      legacy flag-gated render below, so existing schools (which
                      have no config) are byte-for-byte unchanged. The utility
                      items (Invite principal / Menu Management / Logout) below
                      the divider are always shown in both branches. */}
                  {menuConfig ? (
                    menuConfig.items.filter((i) => i.visible).map((i) => {
                      const def = MENU_REGISTRY[i.id];
                      if (!def) return null;
                      const label = def.labelKey ? t(def.labelKey) : def.label;
                      const route = def.id === 'guru' && childIdFromPath
                        ? `/montree/dashboard/guru?child=${childIdFromPath}`
                        : def.route;
                      const active = pathname === def.route
                        || (def.route !== '/montree/dashboard' && !!pathname?.startsWith(def.route));
                      return (
                        <MenuRow
                          key={def.id}
                          icon={def.icon}
                          label={label}
                          active={active}
                          onClick={() => { setShowMoreMenu(false); router.push(route); }}
                        />
                      );
                    })
                  ) : (
                  <>
                  {/* Session 119: Classroom Overview pinned to the TOP of the
                      menu (was buried in "extras" behind menu_classroom_overview
                      flag). Tredoux explicitly asked for this — it's the most
                      reached-for surface during planning. Ungated so every
                      school sees it. */}
                  <MenuRow
                    icon={LayoutGrid}
                    label={t('nav.classroomOverview')}
                    active={activePage === 'class-overview'}
                    onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/classroom-overview'); }}
                  />

                  {/* Calendar — Calendar Plan (May 25): universal aggregation
                      lens across appointments, reports, events, observations,
                      milestones, meeting notes, terms, attention flags. */}
                  <MenuRow
                    icon={Calendar}
                    label={t('nav.calendar') || 'Calendar'}
                    active={activePage === 'calendar'}
                    onClick={() => { setShowMoreMenu(false); router.push('/montree/calendar'); }}
                  />

                  {/* Messages — Session 103: principal + parent threaded comms */}
                  <MenuRow
                    icon={MessageSquare}
                    label={t('nav.messages') || 'Messages'}
                    active={activePage === 'messages'}
                    onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/parent-chats'); }}
                  />

                  {/* Parent Manager — Session 119 rename per Tredoux. The
                      page at /montree/dashboard/parent-codes handles per-child
                      code generation + bulk generate + welcome message.
                      Session 119 also adds the WeChat-style chat overview
                      surface, reachable from the chat icon on the Parent
                      Manager page (see parent-codes/page.tsx). */}
                  <MenuRow
                    icon={KeyRound}
                    label="Parent Manager"
                    active={activePage === 'parent-codes'}
                    onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/parent-codes'); }}
                  />

                  {/* Meeting Notes — HIDDEN Jul 3 2026 per Tredoux menu cleanup.
                      Route stays on disk (hide-don't-delete rule #56); the item
                      remains in MENU_REGISTRY so teachers can re-enable it via
                      Menu Management. To restore here: uncomment.
                  <MenuRow
                    icon={Mic}
                    label="Meeting Notes"
                    active={activePage === 'conversations'}
                    onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/conversations'); }}
                  />
                  */}

                  {/* Games — REMOVED Jul 3 2026 per Tredoux: "makes the app
                      look amateur — off the table completely". Also removed
                      from MENU_REGISTRY, Settings quick-access, and Tools.
                      Routes stay on disk (hide-don't-delete). */}

                  {/* Appointments — HIDDEN Session 129 follow-up per user
                      consolidation request: "the two should be consolidated
                      in the best way that keeps functionality for both but
                      roots in the calendar page".
                      The Calendar (/montree/calendar) is now the singular
                      nav entry. The legacy Appointments page still handles
                      recurring availability + time-away editing — reachable
                      via a "Set my availability →" link inside the Calendar
                      page (next to Summarise this month). Route file stays
                      on disk (hide-don't-delete per rule #56) so direct URLs
                      and the existing "+ Add → Parent appointment" deep-link
                      still work.
                      To re-enable as a sibling menu entry: uncomment below. */}
                  {/*
                  <MenuRow
                    icon={Calendar}
                    label={t('nav.appointments') || 'Appointments'}
                    active={activePage === 'appointments'}
                    onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/appointments'); }}
                  />
                  */}

                  {/* Help — HIDDEN Session 119 per Tredoux: "no function".
                      Kept in code (hide-don't-delete per CLAUDE.md rule #56) in
                      case the Tredoux-DM channel becomes relevant again.
                      To re-enable: uncomment the block below + remove this note.
                  <div style={{ padding: '4px 10px 8px' }} onClick={() => setShowMoreMenu(false)}>
                    <InboxButton
                      conversationId={session.teacher.id}
                      userName={session.teacher.name || 'Teacher'}
                      data-tutorial="inbox-button"
                    />
                  </div>
                  */}
                  <Divider />

                  {/* Essentials — Notes, Curriculum, Guru, Wrap Up, Manage Students */}
                  {isEnabled('menu_notes') && (
                    <MenuRow icon={FileText}  label={t('nav.notes')}          active={activePage === 'notes'}       onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/notes'); }} />
                  )}
                  {isEnabled('menu_curriculum') && (
                    <MenuRow icon={BookOpen}    label={t('nav.curriculum')}        active={activePage === 'curriculum'}    onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/curriculum'); }} />
                  )}
                  {isEnabled('menu_guru') && (
                    <MenuRow icon={Sparkles}  label={t('nav.guru')}            active={activePage === 'guru'}        onClick={() => { setShowMoreMenu(false); router.push(childIdFromPath ? `/montree/dashboard/guru?child=${childIdFromPath}` : '/montree/dashboard/guru'); }} />
                  )}
                  {isEnabled('menu_photo_audit') && (
                    <MenuRow icon={Search}    label={t('audit.title')}         active={activePage === 'photo-audit'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/photo-audit'); }} />
                  )}
                  {isEnabled('menu_manage_students') && (
                    <MenuRow icon={Users}       label={t('students.manageStudents') || 'Manage Students'} active={activePage === 'manage-students'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/students'); }} />
                  )}

                  {/* Extras — all gated, off by default for new schools.
                      Note: Classroom Overview was here behind menu_classroom_overview;
                      Session 119 promoted it to the TOP of the menu (always
                      visible) per Tredoux's ask. Don't re-add it here. */}
                  {isEnabled('menu_focus_list') && (
                    <MenuRow icon={Target}    label={t('dashboard.focusList')} active={activePage === 'focus-list'}  onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/focus'); }} />
                  )}
                  {isEnabled('weekly_admin_docs') && (
                    <MenuRow icon={CalendarDays} label={t('dashboard.weeklyPlan')} active={activePage === 'weekly-plan'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/weekly-admin-docs'); }} />
                  )}
                  {isEnabled('menu_photo_albums') && (
                    <MenuRow icon={Images}      label={t('albums.title')}           active={activePage === 'albums'}   onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/albums'); }} />
                  )}
                  {isEnabled('menu_library') && (
                    <MenuRow icon={FolderOpen}  label={t('nav.library') || 'Library'} active={activePage === 'library'} onClick={() => { setShowMoreMenu(false); router.push('/montree/library'); }} />
                  )}
                  {isEnabled('menu_class_progress') && (
                    <MenuRow icon={BarChart2}   label={locale === 'zh' ? '班级进度总览' : 'Class Progress'} active={activePage === 'class-progress'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/progress-overview'); }} />
                  )}
                  {isEnabled('menu_language_semester') && (
                    <MenuRow icon={CalendarDays} label={t('dashboard.languageSemester')} active={activePage === 'language-semester'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/language-semester'); }} />
                  )}
                  {isEnabled('language_presentation') && childIdFromPath && (
                    <MenuRow icon={Mic} label={t('childPage.present')} active={activePage === 'language-presentation'} onClick={() => { setShowMoreMenu(false); router.push(`/montree/dashboard/${childIdFromPath}/language-presentation`); }} />
                  )}
                  {isEnabled('menu_earnings') && (
                    <MenuRow icon={TrendingUp}  label="My Earnings"                           active={activePage === 'earnings'}         onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/earnings'); }} />
                  )}
                  {isEnabled('raz_reading_tracker') && (
                    <MenuRow icon={BookMarked} label={t('nav.razReadingTracker')} active={activePage === 'raz-reading'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/raz'); }} />
                  )}
                  {isEnabled('english_corner') && (
                    <MenuRow icon={Globe} label={t('dashboard.englishCorner')} active={activePage === 'language-tracker'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/language-tracker'); }} />
                  )}
                  {isEnabled('paperwork_tracker') && (
                    <MenuRow icon={FileText} label={t('dashboard.paperworkTracker')} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/paperwork'); }} />
                  )}
                  {isEnabled('menu_classroom_setup') && (
                    <MenuRow icon={Settings2} label={t('nav.classroomBuilder') || 'Classroom Setup'} active={activePage === 'classroom-setup'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/classroom-builder'); }} />
                  )}
                  </>
                  )}
                  <Divider />

                  {/* Invite your principal — REMOVED from the menu Jul 3 2026 per
                      Tredoux ("advise verbally; simplicity is king"). The modal +
                      InvitePrincipalModal + showInvitePrincipal state stay wired
                      below (hide-don't-delete rule #56) so the capability is one
                      uncomment away. To restore:
                  <MenuRow icon={UserPlus} label="Invite your principal" onClick={() => { setShowMoreMenu(false); setShowInvitePrincipal(true); }} />
                  */}
                  {/* Menu Management — HIDDEN Jul 3 2026 per Tredoux (the /menu-setup
                      page renders a broken light theme + the menu is now a fixed,
                      curated set so per-teacher reordering isn't needed). Route
                      stays on disk (hide-don't-delete). To restore:
                  <MenuRow icon={Settings2} label="Menu Management" active={activePage === 'menu-setup'} onClick={() => { setShowMoreMenu(false); router.push('/montree/dashboard/menu-setup'); }} />
                  */}
                  <MenuRow icon={LogOut} label={t('auth.logout')} danger onClick={() => { setShowMoreMenu(false); clearSession(); router.push('/montree/login'); }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recording indicator bar */}
        {isRecording && (
          <div style={{
            background: 'rgba(239,68,68,0.85)', color: '#fff',
            textAlign: 'center', padding: '6px 0', fontSize: 13, fontWeight: 500,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: SANS,
          }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#fff', display: 'inline-block',
              animation: 'montree-pulse-ring 1.4s ease-out infinite',
            }} />
            <span>{t('dashboard.recording')} {recordingSeconds}s</span>
            <button onClick={stopRecording} style={{
              marginLeft: 8, padding: '2px 10px', background: 'rgba(255,255,255,0.25)',
              border: 0, borderRadius: 5, color: '#fff', fontSize: 12,
              cursor: 'pointer', fontFamily: SANS,
            }}>{t('dashboard.done')}</button>
          </div>
        )}

        {/* Child picker after recording */}
        {showChildPicker && recordingBlob && (
          <div ref={childPickerRef} style={{
            background: 'rgba(8,20,12,0.97)', borderTop: `1px solid ${C.border}`,
            padding: '12px 18px', fontFamily: SANS,
          }}>
            <p style={{ fontSize: 13, color: C.textMute, marginBottom: 8, fontWeight: 500 }}>
              {t('dashboard.tagChild')}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
              {students.map(s => (
                <button key={s.id} onClick={() => saveVoiceNote(s.id)} style={{
                  padding: '4px 12px', background: C.emeraldSoft,
                  border: `1px solid ${C.border}`, borderRadius: 20,
                  color: C.emerald, fontSize: 12, fontWeight: 500,
                  cursor: 'pointer', fontFamily: SANS,
                }}>{s.name}</button>
              ))}
            </div>
            <button onClick={() => saveVoiceNote(null)} style={{
              background: 'none', border: 0, color: C.textMute,
              fontSize: 12, cursor: 'pointer', fontFamily: SANS,
            }}>{t('dashboard.skipTag')}</button>
          </div>
        )}

        {/* Student search bar — on sub-pages only */}
        {showStudentSearch && (
          <div style={{ padding: '0 18px 10px', maxWidth: 1152, margin: '0 auto' }}>
            <div ref={searchRef} style={{ position: 'relative', maxWidth: 280, marginLeft: 'auto' }}>
              <div style={{
                display: 'flex', alignItems: 'center',
                background: 'rgba(255,255,255,0.08)', borderRadius: 10,
                border: `1px solid ${C.border}`, overflow: 'hidden',
              }}>
                <Search size={14} strokeWidth={1.75} color={C.textMute} style={{ marginLeft: 10, flexShrink: 0 }} />
                <input
                  ref={inputRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => { setSearchQuery(e.target.value); setShowDropdown(true); setHighlightIndex(-1); }}
                  onFocus={() => setShowDropdown(true)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder={t('nav.searchStudents') || 'Jump to student...'}
                  autoComplete="off"
                  style={{
                    flex: 1, background: 'transparent', color: '#fff',
                    border: 0, outline: 0, fontSize: 13, padding: '7px 8px',
                    fontFamily: SANS,
                  }}
                />
                {searchQuery && (
                  <button onClick={() => { setSearchQuery(''); setShowDropdown(false); }} style={{
                    padding: '0 10px', background: 'none', border: 0,
                    color: C.textMute, cursor: 'pointer', fontSize: 14,
                  }}>✕</button>
                )}
              </div>

              {/* Search results */}
              {showDropdown && filtered.length > 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  background: 'rgba(8,20,12,0.97)', border: `1px solid ${C.border}`,
                  borderRadius: 10, overflow: 'hidden', zIndex: 60,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                  maxHeight: 256, overflowY: 'auto',
                }}>
                  {filtered.map((student, idx) => (
                    <button key={student.id} onClick={() => handleStudentSelect(student)}
                      onMouseEnter={e => (e.currentTarget.style.background = C.emeraldSoft)}
                      onMouseLeave={e => (e.currentTarget.style.background = idx === highlightIndex ? C.emeraldSoft : 'transparent')}
                      style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '9px 12px',
                        background: idx === highlightIndex ? C.emeraldSoft : 'transparent',
                        border: 0, cursor: 'pointer', textAlign: 'left', fontFamily: SANS,
                        transition: 'background 100ms ease',
                      }}>
                      {student.photo_url ? (
                        // 🚨 Tier 5.1 — explicit width/height attrs prevent CLS while the avatar loads.
                        // Supabase signed URL, native <img> is correct (avoid Next/Image config overhead for tiny avatars).
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={student.photo_url} alt="" width={28} height={28} loading="lazy" decoding="async" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                      ) : (
                        <span style={{
                          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                          background: C.emeraldSoft, border: `1px solid ${C.border}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 600, color: C.emerald,
                        }}>{student.name.charAt(0).toUpperCase()}</span>
                      )}
                      <span style={{
                        fontSize: 13,
                        fontWeight: student.id === childIdFromPath ? 600 : 500,
                        color: student.id === childIdFromPath ? C.emerald : C.textLo,
                      }}>{student.name}</span>
                      {student.id === childIdFromPath && (
                        <span style={{ marginLeft: 'auto', fontSize: 11, color: C.emerald, opacity: 0.7 }}>
                          {t('nav.currentStudent') || 'current'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {showDropdown && searchQuery.trim() && filtered.length === 0 && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
                  background: 'rgba(8,20,12,0.97)', border: `1px solid ${C.border}`,
                  borderRadius: 10, padding: 12, zIndex: 60,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                }}>
                  <p style={{ fontSize: 13, color: C.textMute, textAlign: 'center', margin: 0, fontFamily: SANS }}>
                    {t('nav.noStudentsFound') || 'No students found'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Invite Principal modal — opened from More menu */}
      <InvitePrincipalModal
        isOpen={showInvitePrincipal}
        onClose={() => setShowInvitePrincipal(false)}
      />
    </>
  );
}

// memo() so the header doesn't re-render on every parent state change.
// It takes no props, so shallow-equals always returns true.
export default memo(DashboardHeader);
