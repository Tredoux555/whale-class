// /montree/admin/page.tsx
//
// Principal home — search-first redesign (May 3 2026).
//
// The principal opens her phone, a parent has just stopped her in the
// corridor and asked about their child. She types the child's name. The
// child appears. She taps. She gets a 30-second AI briefing + a box to
// answer the parent's question in her own voice. That's the whole job.
//
// What used to live here (digest paragraph, stats tiles, attention list,
// quick actions grid) was real, but it was reading-the-newspaper work, not
// answering-a-parent work. It's been removed in favor of the one thing the
// principal absolutely cannot fake in the moment.
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, X } from 'lucide-react';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  emeraldGlow: 'rgba(52,211,153,0.22)',
  gold: '#E8C96A',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface School {
  id: string;
  name: string;
}
interface Principal {
  id: string;
  name: string;
  email: string;
}
interface PlanSummary {
  plan_type: string;
  subscription_status: string;
  is_teacher_led: boolean;
}
interface SearchResult {
  id: string;
  name: string;
  photo_url: string | null;
  age: number | null;
  classroom_id: string;
  classroom_name: string;
  classroom_icon: string;
}

const RECENT_KEY = 'montree.admin.recentChildren';
const RECENT_MAX = 6;

interface RecentEntry {
  id: string;
  name: string;
  classroom_name: string;
  viewed_at: string; // ISO
}

function readRecent(): RecentEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.slice(0, RECENT_MAX);
  } catch {
    return [];
  }
}

export default function AdminHomePage() {
  const router = useRouter();
  const [school, setSchool] = useState<School | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [headerLoading, setHeaderLoading] = useState(true);

  const [allChildren, setAllChildren] = useState<SearchResult[]>([]);
  const [childrenLoading, setChildrenLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [recent, setRecent] = useState<RecentEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Initial load ────────────────────────────────────────────────────
  useEffect(() => {
    const principalData = localStorage.getItem('montree_principal');
    if (!principalData) {
      router.replace('/montree/login-select');
      return;
    }

    setRecent(readRecent());

    // Load header (school + principal name + plan tier)
    fetch('/api/montree/admin/today', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401) {
          router.replace('/montree/login-select');
          return null;
        }
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        setSchool(data.school);
        setPrincipal(data.principal);
        setPlan(data.plan || null);
      })
      .catch((err) => console.error('[admin home] today fetch error', err))
      .finally(() => setHeaderLoading(false));

    // Load full child roster ONCE — search filters client-side. With <500
    // children per school this is faster than round-tripping every keystroke.
    fetch('/api/montree/admin/students/search', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { students: [] }))
      .then((data) => {
        setAllChildren(Array.isArray(data.students) ? data.students : []);
      })
      .catch((err) => {
        console.error('[admin home] roster fetch error', err);
        setAllChildren([]);
      })
      .finally(() => setChildrenLoading(false));

    // Auto-focus the search field on desktop after a beat (mobile keyboards
    // would pop up immediately which is rude — so we only focus on >=768px).
    const t = setTimeout(() => {
      if (typeof window !== 'undefined' && window.innerWidth >= 768) {
        inputRef.current?.focus();
      }
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Filter children by query ────────────────────────────────────────
  const trimmed = query.trim().toLowerCase();
  const matches = trimmed
    ? allChildren
        .filter((c) => c.name.toLowerCase().includes(trimmed))
        .slice(0, 12)
    : [];
  const showRoster = !trimmed && allChildren.length > 0 && allChildren.length <= 20;

  const goToChild = (c: { id: string; name: string; classroom_name: string }) => {
    // Bump into recent list before navigation
    try {
      const next: RecentEntry[] = [
        { id: c.id, name: c.name, classroom_name: c.classroom_name, viewed_at: new Date().toISOString() },
        ...readRecent().filter((r) => r.id !== c.id),
      ].slice(0, RECENT_MAX);
      localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    router.push(`/montree/admin/child/${c.id}`);
  };

  const firstName = (principal?.name || '').split(' ')[0] || '';
  const greeting = firstName ? `Welcome back, ${firstName}.` : 'Welcome back.';

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      {/* Hero: school name + warm greeting */}
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 500,
            letterSpacing: -0.6,
            color: T.textPrimary,
            margin: 0,
            lineHeight: 1.1,
            opacity: headerLoading ? 0 : 1,
            transition: 'opacity 200ms ease',
          }}
        >
          {school?.name || ' '}
        </h1>
        <p
          style={{
            color: T.emeraldDim,
            fontSize: 14,
            marginTop: 10,
            letterSpacing: 0.2,
          }}
        >
          <span style={{ color: T.textPrimary }}>{greeting}</span>{' '}
          <span style={{ color: T.textSecondary }}>
            Search any child to bring up their briefing.
          </span>
        </p>
      </div>

      {/* Viewer banner — preserved from the prior cockpit */}
      {plan?.is_teacher_led && (
        <div
          style={{
            background: 'rgba(232,201,106,0.08)',
            border: '1px solid rgba(232,201,106,0.22)',
            borderRadius: 14,
            padding: '14px 18px',
            marginBottom: 22,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 12,
          }}
        >
          <div
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: T.gold,
              marginTop: 8,
              flexShrink: 0,
            }}
          />
          <div
            style={{
              flex: 1,
              fontSize: 13,
              lineHeight: 1.55,
              color: 'rgba(255,255,255,0.78)',
            }}
          >
            <strong style={{ color: T.gold }}>You're a viewer.</strong> This is a
            teacher's classroom — you can browse everything below for free. To
            add your own classrooms or invite your other teachers,{' '}
            <a
              href="https://montree.xyz/pricing"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: T.gold, textDecoration: 'underline' }}
            >
              upgrade to a school plan
            </a>
            .
          </div>
        </div>
      )}

      {/* Search bar — the headline element */}
      <div
        style={{
          position: 'relative',
          marginBottom: 28,
        }}
      >
        <Search
          size={22}
          strokeWidth={1.75}
          color={T.emeraldDim}
          style={{
            position: 'absolute',
            left: 22,
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find any child…"
          autoComplete="off"
          spellCheck={false}
          style={{
            width: '100%',
            padding: '20px 56px 20px 60px',
            background: T.inputBg,
            border: T.inputBorder,
            borderRadius: 16,
            color: T.textPrimary,
            fontFamily: T.sans,
            fontSize: 18,
            outline: 'none',
            boxShadow: query ? `0 0 0 4px ${T.emeraldGlow}` : 'none',
            transition: 'box-shadow 150ms ease',
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'rgba(255,255,255,0.06)',
              border: 'none',
              color: T.textMuted,
              cursor: 'pointer',
              padding: 6,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        )}
      </div>

      {/* Results: matches OR recents OR full roster (small schools) */}
      {trimmed ? (
        <ChildList
          title={
            matches.length === 0
              ? `No children matching "${query}"`
              : `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`
          }
          items={matches}
          onSelect={goToChild}
          empty={
            childrenLoading ? (
              <Skeleton />
            ) : (
              <EmptyHint
                text={
                  allChildren.length === 0
                    ? 'No children in your school yet.'
                    : 'Try a shorter query or check the spelling.'
                }
              />
            )
          }
        />
      ) : recent.length > 0 ? (
        <RecentList recent={recent} onSelect={goToChild} />
      ) : showRoster ? (
        <ChildList
          title="Everyone in your school"
          items={allChildren}
          onSelect={goToChild}
          empty={null}
        />
      ) : childrenLoading ? (
        <Skeleton />
      ) : (
        <EmptyHint text="Start typing a child's name." />
      )}
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function ChildList({
  title,
  items,
  onSelect,
  empty,
}: {
  title: string;
  items: SearchResult[];
  onSelect: (c: SearchResult) => void;
  empty: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.emeraldDim,
          textTransform: 'uppercase',
          letterSpacing: 1.4,
          marginBottom: 12,
          marginLeft: 4,
        }}
      >
        {title}
      </div>
      {items.length === 0 ? (
        empty
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((c) => (
            <ChildRow key={c.id} child={c} onSelect={onSelect} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChildRow({
  child,
  onSelect,
}: {
  child: SearchResult;
  onSelect: (c: SearchResult) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(child)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '14px 16px',
        background: T.cardBg,
        backdropFilter: 'blur(18px)',
        border: T.cardBorder,
        borderRadius: 14,
        cursor: 'pointer',
        textAlign: 'left',
        width: '100%',
        color: T.textPrimary,
        fontFamily: T.sans,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.cardBgStrong;
        e.currentTarget.style.borderColor = 'rgba(52,211,153,0.32)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.cardBg;
        e.currentTarget.style.borderColor = 'rgba(52,211,153,0.18)';
      }}
    >
      {/* Photo or initial */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: '50%',
          background: child.photo_url
            ? `url(${child.photo_url}) center/cover`
            : T.emeraldSoft,
          border: '1px solid rgba(52,211,153,0.28)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: T.emerald,
          fontFamily: T.serif,
          fontSize: 18,
          fontWeight: 500,
          flexShrink: 0,
        }}
      >
        {!child.photo_url && child.name.charAt(0).toUpperCase()}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 500,
            color: T.textPrimary,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {child.name}
        </div>
        <div
          style={{
            fontSize: 12,
            color: T.textSecondary,
            marginTop: 2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {child.classroom_name}
          {child.age != null ? ` · age ${child.age}` : ''}
        </div>
      </div>
    </button>
  );
}

function RecentList({
  recent,
  onSelect,
}: {
  recent: RecentEntry[];
  onSelect: (c: { id: string; name: string; classroom_name: string }) => void;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: T.emeraldDim,
          textTransform: 'uppercase',
          letterSpacing: 1.4,
          marginBottom: 12,
          marginLeft: 4,
        }}
      >
        Recent
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recent.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() =>
              onSelect({ id: r.id, name: r.name, classroom_name: r.classroom_name })
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '12px 16px',
              background: T.cardBg,
              backdropFilter: 'blur(18px)',
              border: T.cardBorder,
              borderRadius: 14,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              color: T.textPrimary,
              fontFamily: T.sans,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: T.emeraldSoft,
                border: '1px solid rgba(52,211,153,0.28)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: T.emerald,
                fontFamily: T.serif,
                fontSize: 15,
                fontWeight: 500,
                flexShrink: 0,
              }}
            >
              {r.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 500,
                  color: T.textPrimary,
                }}
              >
                {r.name}
              </div>
              <div style={{ fontSize: 12, color: T.textSecondary, marginTop: 2 }}>
                {r.classroom_name}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            height: 64,
            background: T.cardBg,
            border: T.cardBorder,
            borderRadius: 14,
            opacity: 0.5,
          }}
        />
      ))}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div
      style={{
        padding: '28px 18px',
        textAlign: 'center',
        color: T.textMuted,
        fontSize: 14,
        background: T.cardBg,
        border: T.cardBorder,
        borderRadius: 14,
      }}
    >
      {text}
    </div>
  );
}
