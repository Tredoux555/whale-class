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

interface StudentOption {
  id: string;
  name: string;
  photo_url?: string;
}

export default function DashboardHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();
  const [session, setSession] = useState<MontreeSession | null>(null);
  const [voiceObsEnabled, setVoiceObsEnabled] = useState(false);
  const [razTrackerEnabled, setRazTrackerEnabled] = useState(false);
  const [aiBudget, setAiBudget] = useState<{ spent: number; budget: number; percentage: number } | null>(null);

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

    // Check if voice observations feature is enabled for this school
    // PERF: Cache in sessionStorage (5 min TTL) to avoid API call on every page navigation
    if (sess.school?.id) {
      const cacheKey = `montree_features_${sess.school.id}`;
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const { voice, raz, ts } = JSON.parse(cached);
          if (Date.now() - ts < 5 * 60 * 1000) {
            setVoiceObsEnabled(voice);
            setRazTrackerEnabled(raz);
            return;
          }
        }
      } catch {}

      montreeApi(`/api/montree/features?school_id=${sess.school.id}`)
        .then((res) => res.json())
        .then((data: { features?: { feature_key: string; enabled: boolean }[] }) => {
          const voice = data.features?.find((f) => f.feature_key === 'voice_observations')?.enabled || false;
          const raz = data.features?.find((f) => f.feature_key === 'raz_reading_tracker')?.enabled || false;
          setVoiceObsEnabled(voice);
          setRazTrackerEnabled(raz);
          try { sessionStorage.setItem(cacheKey, JSON.stringify({ voice, raz, ts: Date.now() })); } catch {}
        })
        .catch(() => {});

      // Fetch AI budget for pill display (teachers only, 60s cache)
      const budgetCacheKey = `montree_ai_budget_${sess.school.id}`;
      try {
        const budgetCached = sessionStorage.getItem(budgetCacheKey);
        if (budgetCached) {
          const { data: bd, ts } = JSON.parse(budgetCached);
          if (Date.now() - ts < 60_000) { setAiBudget(bd); return; }
        }
      } catch {}
      montreeApi(`/api/montree/admin/ai-budget?school_id=${sess.school.id}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (!data?.summary) return;
          const bd = { spent: Number(data.summary.spent) || 0, budget: Number(data.summary.budget) || 50, percentage: Number(data.summary.percentage) || 0 };
          setAiBudget(bd);
          try { sessionStorage.setItem(budgetCacheKey, JSON.stringify({ data: bd, ts: Date.now() })); } catch {}
        })
        .catch(() => {});
    }
  }, []);

  // Fetch students for search bar (cached in sessionStorage, 5 min TTL)
  useEffect(() => {
    if (!session?.classroom?.id) return;
    // Don't show search for homeschool parents (they only have 1 child)
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

    montreeApi(`/api/montree/children?classroom_id=${session.classroom.id}`)
      .then((res) => res.json())
      .then((data: { children?: StudentOption[] }) => {
        const list = (data.children || []).sort((a, b) => a.name.localeCompare(b.name));
        setStudents(list);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ list, ts: Date.now() })); } catch {}
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.classroom?.id]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
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
        {/* Left: Logo + classroom */}
        <Link href="/montree/dashboard" data-guide="nav-home" className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0 flex-shrink">
          <span className="text-xl sm:text-2xl flex-shrink-0">🌳</span>
          <span className="font-bold text-base sm:text-lg truncate">{session.classroom?.name || t('app.name')}</span>
        </Link>

        {/* Right: Action icons — overflow-x-auto prevents wrapping on narrow screens */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto flex-shrink min-w-0">
          {/* Language toggle — always visible, far left */}
          <LanguageToggle />

          {/* Primary tools — always visible */}
          <Link
            href="/montree/dashboard/capture"
            data-guide="nav-capture"
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex-shrink-0"
            title={t('capture.takePhoto')}
          >
            📸
          </Link>
          <Link
            href={childIdFromPath ? `/montree/dashboard/guru?child=${childIdFromPath}` : '/montree/dashboard/guru'}
            data-tutorial="guru-link"
            data-guide="nav-guru"
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex-shrink-0"
            title={t('nav.guru')}
          >
            🧠
          </Link>
          {!isHome && (
            <>
              <Link
                href="/montree/dashboard/classroom-overview"
                data-guide="nav-overview"
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex-shrink-0"
                title={t('nav.classroomOverview')}
              >
                📋
              </Link>
              <Link
                href="/montree/dashboard/albums"
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex-shrink-0"
                title={t('albums.title')}
              >
                🖼️
              </Link>
              <Link
                href="/montree/dashboard/photo-audit"
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex-shrink-0"
                title={t('audit.title')}
              >
                🔍
              </Link>
              <Link
                href="/montree/dashboard/classroom-setup"
                data-guide="nav-setup"
                className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex-shrink-0"
                title={t('setup.title')}
              >
                🎓
              </Link>
            </>
          )}
          {razTrackerEnabled && (
            <Link
              href="/montree/dashboard/raz"
              data-guide="nav-raz"
              className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium flex-shrink-0"
              title={t('nav.razReadingTracker')}
            >
              📖
            </Link>
          )}
          <InboxButton
            conversationId={session.teacher.id}
            userName={session.teacher.name || 'Teacher'}
            data-tutorial="inbox-button"
          />
          {/* AI Budget pill — teachers only */}
          {aiBudget && !isHome && (
            <span
              className={`px-2 py-1 rounded-full text-xs font-semibold flex-shrink-0 whitespace-nowrap ${
                aiBudget.percentage >= 100 ? 'bg-red-500/90 text-white' :
                aiBudget.percentage >= 80 ? 'bg-orange-400/90 text-white' :
                aiBudget.percentage >= 60 ? 'bg-yellow-400/90 text-gray-900' :
                'bg-white/20 text-white'
              }`}
              title={`${t('aiBudget.label')}: $${aiBudget.spent.toFixed(2)} / $${aiBudget.budget.toFixed(0)}`}
            >
              {t('aiBudget.label')}: ${aiBudget.spent.toFixed(2)}
            </span>
          )}
          <button
            onClick={() => { clearSession(); router.push('/montree/login'); }}
            className="px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors font-medium text-sm flex-shrink-0 whitespace-nowrap"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>

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
                      <img src={student.photo_url} alt="" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {student.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{student.name}</span>
                    {student.id === childIdFromPath && (
                      <span className="ml-auto text-emerald-500 text-xs">{t('nav.currentStudent') || 'current'}</span>
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
