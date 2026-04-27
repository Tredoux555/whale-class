// components/montree/DashboardHeader.tsx
// Persistent top header shown on ALL dashboard screens
// Contains: Montree logo, Language toggle, Inbox, Curriculum, Guru, Student Search, Logout
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSession, clearSession, isHomeschoolParent, type MontreeSession } from '@/lib/montree/auth';
import { HOME_THEME } from '@/lib/montree/home-theme';
import { useI18n } from '@/lib/montree/i18n';
import { montreeApi } from '@/lib/montree/api';
import InboxButton from './InboxButton';
import LanguageToggle from './LanguageToggle';
import { toast } from 'sonner';
import { useFeatures } from '@/hooks/useFeatures';

interface StudentOption {
  id: string;
  name: string;
  photo_url?: string;
}

interface TeacherOption {
  id: string;
  name: string;
  role: string;
  login_code: string;
}

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const { isEnabled } = useFeatures();
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  // ── Quick Voice Note state ──
  const [isRecording, setIsRecording] = useState(false);
  const [showChildPicker, setShowChildPicker] = useState(false);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const childPickerRef = useRef<HTMLDivElement>(null);

  // Teacher selector state
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [showTeacherMenu, setShowTeacherMenu] = useState(false);
  const [showAddTeacher, setShowAddTeacher] = useState(false);
  const [newTeacherName, setNewTeacherName] = useState('');
  const [addingTeacher, setAddingTeacher] = useState(false);
  const teacherMenuRef = useRef<HTMLDivElement>(null);

  // Student search state
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Extract childId from URL when on a child's page (e.g. /montree/dashboard/[childId]/...)
  // This ensures the Guru link carries the current child context
  const childIdFromPath = useMemo(() => {
    const match = pathname.match(/\/montree\/dashboard\/([a-f0-9-]{36})/);
    return match ? match[1] : null;
  }, [pathname]);

  useEffect(() => {
    const sess = getSession();
    if (!sess) return;
    setSession(sess);
  }, []);

  // Fetch students for search bar (cached in sessionStorage, 5 min TTL)
  useEffect(() => {
    if (!session?.classroom?.id) return;
    if (isHomeschoolParent(session)) return;

    const cacheKey = `montree_students_${session.classroom.id}`;
    try {
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const { list, ts } = JSON.parse(cached);
        if (Date.now() - ts < 5 * 60 * 1000) {
          setStudents(list);
          return;
        }
      }
    } catch {}

    const controller = new AbortController();
    montreeApi(`/api/montree/children?classroom_id=${session.classroom.id}`, { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { children?: StudentOption[] }) => {
        if (controller.signal.aborted) return;
        const list = (data.children || []).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(list);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ list, ts: Date.now() })); } catch {}
      })
      .catch(() => {});
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.classroom?.id]);

  // Fetch teachers for this classroom
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
      .then((res) => res.json())
      .then((data: { teachers?: TeacherOption[] }) => {
        if (controller.signal.aborted) return;
        const list = data.teachers || [];
        setTeachers(list);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ list, ts: Date.now() })); } catch {}
      })
      .catch(() => {});
    return () => controller.abort();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.classroom?.id]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
      if (teacherMenuRef.current && !teacherMenuRef.current.contains(e.target as Node)) {
        setShowTeacherMenu(false);
        setShowAddTeacher(false);
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // PERF: Memoize filtered students to avoid re-filtering on every render
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return students;
    const q = searchQuery.toLowerCase();
    return students.filter(s => s.name.toLowerCase().includes(q));
  }, [searchQuery, students]);

  // ── Quick Voice Note handlers ──
  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4' });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        setRecordingBlob(blob);
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
  }, [locale]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const saveVoiceNote = useCallback(async (childId: string | null) => {
    setShowChildPicker(false);
    const blob = recordingBlob;
    setRecordingBlob(null);
    setRecordingSeconds(0);
    if (!blob || !session?.classroom?.id) return;

    toast.success(t('dashboard.savingMessage'), { duration: 1500 });

    // Fire-and-forget: transcribe + save in background
    (async () => {
      try {
        // Step 1: Whisper transcription
        const formData = new FormData();
        formData.append('audio', blob, 'voice-note.webm');
        const transcribeRes = await montreeApi('/api/montree/guru/transcribe', {
          method: 'POST',
          body: formData,
        });
        if (!transcribeRes.ok) {
          throw new Error(`Transcription API failed: ${transcribeRes.status}`);
        }
        const transcribeData = await transcribeRes.json();
        const text = transcribeData.text || transcribeData.transcription || '';
        if (!text.trim()) {
          console.warn('[VoiceNote] Empty transcription — skipping save');
          return;
        }

        // Step 2: Save to teacher notes
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
  }, [recordingBlob, session?.classroom?.id, locale]);

  // Close child picker on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (childPickerRef.current && !childPickerRef.current.contains(e.target as Node)) {
        // Save without child tag
        if (showChildPicker && recordingBlob) saveVoiceNote(null);
      }
    };
    if (showChildPicker) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showChildPicker, recordingBlob, saveVoiceNote]);

  const handleAddTeacher = useCallback(async () => {
    if (!newTeacherName.trim() || !session?.classroom?.id || addingTeacher) return;
    setAddingTeacher(true);
    try {
      const res = await montreeApi('/api/montree/classroom/teachers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classroom_id: session.classroom.id, name: newTeacherName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        console.error('Failed to add teacher:', data.error);
        toast.error(t('teachers.addFailed'));
        return;
      }
      toast.success(t('teachers.added'));
      // Refresh teacher list
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
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIndex(prev => (prev + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIndex(prev => (prev - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter' && highlightIndex >= 0 && highlightIndex < filtered.length) {
      e.preventDefault();
      handleStudentSelect(filtered[highlightIndex]);
    } else if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
    }
  }, [showDropdown, filtered, highlightIndex, handleStudentSelect]);

  // Don't render until we have a session (avoid flash)
  if (!session?.teacher?.id) return null;

  const isHome = isHomeschoolParent(session);
  // Hide header search on main dashboard (has its own inline search now)
  const isDashboardHome = pathname === '/montree/dashboard';
  const showStudentSearch = !isHome && !isDashboardHome && students.length > 0;

  return (
    <header className={`${isHome ? HOME_THEME.headerBg : 'bg-gradient-to-r from-emerald-500 to-teal-600'} text-white shadow-lg sticky top-0 z-50 pt-[env(safe-area-inset-top)] print:hidden`}>
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Left: Logo + classroom + teacher selector */}
        <div className="flex items-center gap-2 min-w-0 flex-shrink">
          <Link href="/montree/dashboard" data-guide="nav-home" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0 flex-shrink">
            <span className="text-xl sm:text-2xl flex-shrink-0">🌳</span>
            <span className="font-bold text-base sm:text-lg truncate">{session.classroom?.name || t('app.name')}</span>
          </Link>

          {/* Teacher selector — teachers only, when multiple teachers exist or to add new ones */}
          {!isHome && (
            <div ref={teacherMenuRef} className="relative flex-shrink-0">
              <button
                onClick={() => { setShowTeacherMenu(!showTeacherMenu); setShowAddTeacher(false); }}
                className="flex items-center gap-1 px-2 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs sm:text-sm transition-colors"
              >
                <span className="truncate max-w-[80px] sm:max-w-[120px]">{session.teacher?.name || t('teachers.teacher')}</span>
                <span className="text-white/60">▾</span>
              </button>

              {showTeacherMenu && (
                <div className="absolute top-full left-0 mt-1 bg-white rounded-lg shadow-xl overflow-hidden z-[60] min-w-[200px]">
                  {/* Teacher list */}
                  {teachers.map((teacher) => (
                    <div
                      key={teacher.id}
                      className={`flex items-center justify-between px-3 py-2.5 text-sm ${
                        teacher.id === session.teacher?.id
                          ? 'bg-emerald-50 text-emerald-700 font-semibold'
                          : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="truncate">{teacher.name}</span>
                      {teacher.id === session.teacher?.id && (
                        <span className="text-emerald-600 text-xs ml-2 flex-shrink-0">{t('teachers.you')}</span>
                      )}
                    </div>
                  ))}

                  {/* Divider */}
                  {teachers.length > 0 && <div className="border-t border-gray-100" />}

                  {/* Add teacher */}
                  {!showAddTeacher ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); setShowAddTeacher(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50 transition-colors"
                    >
                      <span>+</span>
                      <span>{t('teachers.addTeacher')}</span>
                    </button>
                  ) : (
                    <div className="p-3 space-y-2" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="text"
                        value={newTeacherName}
                        onChange={(e) => setNewTeacherName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleAddTeacher(); if (e.key === 'Escape') setShowAddTeacher(false); }}
                        placeholder={t('teachers.namePlaceholder')}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-gray-800 placeholder-gray-400 focus:border-emerald-400 focus:outline-none"
                        autoFocus
                        maxLength={100}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowAddTeacher(false)}
                          className="flex-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700"
                        >
                          {t('common.cancel')}
                        </button>
                        <button
                          onClick={handleAddTeacher}
                          disabled={!newTeacherName.trim() || addingTeacher}
                          className="flex-1 px-2 py-1 text-xs bg-emerald-500 text-white rounded hover:bg-emerald-600 disabled:bg-emerald-300 disabled:cursor-not-allowed"
                        >
                          {addingTeacher ? t('common.adding') : t('common.add')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Action icons — daily drivers always visible, rest in "More" dropdown */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          {/* Language toggle — always visible */}
          <LanguageToggle />

          {/* === SINGLE DAILY DRIVER — Capture only, everything else in More menu === */}
          <Link
            href="/montree/dashboard/capture"
            data-guide="nav-capture"
            className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors font-medium flex-shrink-0 ${
              pathname === '/montree/dashboard/capture' ? 'bg-white/40 ring-2 ring-white/50' : 'bg-white/20 hover:bg-white/30'
            }`}
            title={t('capture.takePhoto')}
          >
            📸
          </Link>

          {/* 🎙 Quick Voice Note — daily driver */}
          {!isHome && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors font-medium flex-shrink-0 ${
                isRecording ? 'bg-red-500 ring-2 ring-red-300 animate-pulse' : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isRecording ? t('dashboard.stopRecording') : t('dashboard.quickVoiceNote')}
            >
              {isRecording ? '⏹' : '🎙'}
            </button>
          )}

          {/* === MORE MENU — everything else === */}
          {!isHome && (
            <div ref={moreMenuRef} className="relative flex-shrink-0">
              <button
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-lg transition-colors font-medium flex-shrink-0 ${
                  showMoreMenu ? 'bg-white/40 ring-2 ring-white/50' : 'bg-white/20 hover:bg-white/30'
                }`}
                title={t('nav.more') || 'More tools'}
              >
                ⋯
              </button>

              {showMoreMenu && (
                <div className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-y-auto z-[60] min-w-[200px] py-1 max-h-[calc(100vh-80px)]">
                  {/* Inbox (moved from daily-driver bar) */}
                  <div className="px-4 py-2" onClick={() => setShowMoreMenu(false)}>
                    <InboxButton
                      conversationId={session.teacher.id}
                      userName={session.teacher.name || 'Teacher'}
                      data-tutorial="inbox-button"
                    />
                  </div>
                  <div className="border-t border-gray-100 my-1" />
                  <Link
                    href="/montree/dashboard/notes"
                    data-guide="nav-notes"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/notes' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">📝</span>
                    <span>{t('nav.notes')}</span>
                  </Link>
                  <Link
                    href="/montree/dashboard/focus"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/focus' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">🎯</span>
                    <span>{t('dashboard.focusList')}</span>
                  </Link>
                  <Link
                    href="/montree/dashboard/photo-audit"
                    data-guide="nav-setup"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname?.startsWith('/montree/dashboard/photo-audit') ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">🔍</span>
                    <span>{t('audit.title')}</span>
                  </Link>
                  <Link
                    href={childIdFromPath ? `/montree/dashboard/guru?child=${childIdFromPath}` : '/montree/dashboard/guru'}
                    data-tutorial="guru-link"
                    data-guide="nav-guru"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/guru' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">🧠</span>
                    <span>{t('nav.guru')}</span>
                  </Link>
                  <Link
                    href="/montree/dashboard/curriculum"
                    data-guide="nav-curriculum"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/curriculum' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">📚</span>
                    <span>{t('nav.curriculum')}</span>
                  </Link>
                  <Link
                    href="/montree/dashboard/classroom-overview"
                    data-guide="nav-overview"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/classroom-overview' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">📋</span>
                    <span>{t('nav.classroomOverview')}</span>
                  </Link>
                  {isEnabled('weekly_admin_docs') && (
                    <Link
                      href="/montree/dashboard/weekly-admin-docs"
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        pathname === '/montree/dashboard/weekly-admin-docs' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">📄</span>
                      <span>{t('dashboard.weeklyPlan')}</span>
                    </Link>
                  )}
                  <Link
                    href="/montree/dashboard/albums"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/albums' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">🖼️</span>
                    <span>{t('albums.title')}</span>
                  </Link>
                  <Link
                    href="/montree/dashboard/students"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/students' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">✏️</span>
                    <span>{t('students.manageStudents') || 'Manage Students'}</span>
                  </Link>
                  {isEnabled('raz_reading_tracker') && (
                    <Link
                      href="/montree/dashboard/raz"
                      data-guide="nav-raz"
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        pathname === '/montree/dashboard/raz' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">📖</span>
                      <span>{t('nav.razReadingTracker')}</span>
                    </Link>
                  )}
                  {isEnabled('english_corner') && (
                    <Link
                      href="/montree/dashboard/language-tracker"
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        pathname === '/montree/dashboard/language-tracker' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-base">🇬🇧</span>
                      <span>{t('dashboard.englishCorner')}</span>
                    </Link>
                  )}

                  <Link
                    href="/montree/dashboard/language-semester"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/language-semester' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">📄</span>
                    <span>{t('dashboard.languageSemester')}</span>
                  </Link>

                  <Link
                    href="/montree/dashboard/progress-overview"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/progress-overview' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">📊</span>
                    <span>{locale === 'zh' ? '班级进度总览' : 'Class Progress'}</span>
                  </Link>

                  {isEnabled('paperwork_tracker') && (
                    <Link
                      href="/montree/dashboard/paperwork"
                      onClick={() => setShowMoreMenu(false)}
                      className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors text-gray-700 hover:bg-gray-50`}
                    >
                      <span className="text-base">📋</span>
                      <span>{t('dashboard.paperworkTracker')}</span>
                    </Link>
                  )}

                  {/* Divider */}
                  <div className="border-t border-gray-100 my-1" />

                  <Link
                    href="/montree/dashboard/classroom-builder"
                    onClick={() => setShowMoreMenu(false)}
                    className={`flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                      pathname === '/montree/dashboard/classroom-builder' ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-gray-500 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-base">🏗️</span>
                    <span>{t('nav.classroomBuilder') || 'Classroom Setup'}</span>
                  </Link>

                  {/* Divider before logout */}
                  <div className="border-t border-gray-100 my-1" />

                  <button
                    onClick={() => { setShowMoreMenu(false); clearSession(); router.push('/montree/login'); }}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors w-full text-left"
                  >
                    <span className="text-base">🚪</span>
                    <span>{t('auth.logout')}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Recording indicator bar — shows when mic is active */}
      {isRecording && (
        <div className="bg-red-500/90 text-white text-center py-1.5 text-sm font-medium flex items-center justify-center gap-2">
          <span className="inline-block w-2.5 h-2.5 bg-white rounded-full animate-pulse" />
          <span>{t('dashboard.recording')} {recordingSeconds}s</span>
          <button onClick={stopRecording} className="ml-3 px-2 py-0.5 bg-white/25 rounded text-xs hover:bg-white/40">
            {t('dashboard.done')}
          </button>
        </div>
      )}

      {/* Child picker — appears after recording stops */}
      {showChildPicker && recordingBlob && (
        <div ref={childPickerRef} className="bg-white shadow-lg border-t border-gray-100 px-4 py-3">
          <p className="text-sm text-gray-600 mb-2 font-medium">{t('dashboard.tagChild')}</p>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {students.map(s => (
              <button
                key={s.id}
                onClick={() => saveVoiceNote(s.id)}
                className="px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-medium hover:bg-emerald-100 transition-colors"
              >
                {s.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => saveVoiceNote(null)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            {t('dashboard.skipTag')}
          </button>
        </div>
      )}

      {/* Student search bar — below icons, teachers only */}
      {showStudentSearch && (
        <div className="max-w-6xl mx-auto px-4 pb-2">
          <div ref={searchRef} className="relative max-w-xs ml-auto">
            <div className="flex items-center bg-white/15 rounded-lg overflow-hidden">
              <span className="pl-3 text-white/70 text-sm">🔍</span>
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  setHighlightIndex(-1);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleSearchKeyDown}
                placeholder={t('nav.searchStudents') || 'Jump to student...'}
                className="w-full bg-transparent text-white placeholder-white/50 text-sm px-2 py-1.5 outline-none"
                autoComplete="off"
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
                  className="pr-3 text-white/50 hover:text-white text-sm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown */}
            {showDropdown && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl overflow-hidden z-[60] max-h-64 overflow-y-auto">
                {filtered.map((student, idx) => (
                  <button
                    key={student.id}
                    onClick={() => handleStudentSelect(student)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-800 text-sm transition-colors ${
                      idx === highlightIndex ? 'bg-emerald-50' : 'hover:bg-gray-50'
                    } ${student.id === childIdFromPath ? 'font-semibold text-emerald-700' : ''}`}
                  >
                    {student.photo_url ? (
                      <img src={student.photo_url} alt="" loading="lazy" decoding="async" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{student.name}</span>
                    {student.id === childIdFromPath && (
                      <span className="ml-auto text-emerald-600 text-xs">{t('nav.currentStudent') || 'current'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {showDropdown && searchQuery.trim() && filtered.length === 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl p-3 z-[60]">
                <p className="text-gray-400 text-sm text-center">{t('nav.noStudentsFound') || 'No students found'}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
