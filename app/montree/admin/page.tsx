// /montree/admin/page.tsx
// Principal Cockpit — Today page.
// Hero greeting, this-week digest, attention list, quick actions.
// Replaces the old classroom-tile overview (now at /montree/admin/classrooms).
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  GraduationCap,
  Sparkles,
  UserMinus,
  Users,
} from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  goldDim: 'rgba(232,201,106,0.65)',
  goldSoft: 'rgba(232,201,106,0.10)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
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
interface Stats {
  total_classrooms: number;
  total_teachers: number;
  total_students: number;
  total_observed_this_week: number;
}
interface Digest {
  photos_confirmed_7d: number;
  active_teacher_count: number;
  total_teacher_count: number;
}
interface IdleTeacher {
  id: string;
  name: string;
  email: string;
  classroom_id: string | null;
  last_login_at: string | null;
}
interface ClassroomLite {
  id: string;
  name: string;
  icon: string;
  color: string;
}
interface IdleChild {
  id: string;
  name: string;
  classroom_id: string;
  classroom_name: string;
}
interface Attention {
  idle_teachers: IdleTeacher[];
  classrooms_without_teacher: ClassroomLite[];
  idle_children: IdleChild[];
  idle_children_total: number;
}
interface PlanSummary {
  plan_type: string;
  subscription_status: string;
  is_teacher_led: boolean;
}

export default function AdminTodayPage() {
  const router = useRouter();
  const { locale } = useI18n();
  const [school, setSchool] = useState<School | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [digest, setDigest] = useState<Digest | null>(null);
  const [attention, setAttention] = useState<Attention | null>(null);
  const [plan, setPlan] = useState<PlanSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const principalData = localStorage.getItem('montree_principal');
    if (!principalData) {
      router.replace('/montree/login-select');
      return;
    }
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchData = async () => {
    try {
      const res = await fetch('/api/montree/admin/today', {
        credentials: 'include',
      });
      if (res.status === 401) {
        router.replace('/montree/login-select');
        return;
      }
      if (!res.ok) {
        console.error('Failed to load Today:', res.status);
        return;
      }
      const data = await res.json();
      setSchool(data.school);
      setPrincipal(data.principal);
      setStats(data.stats);
      setDigest(data.digest);
      setAttention(data.attention);
      setPlan(data.plan || null);
    } catch (err) {
      console.error('[Today] fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: '60px 0',
          textAlign: 'center',
          color: T.textSecondary,
          fontFamily: T.sans,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: '2px solid rgba(52,211,153,0.20)',
            borderTopColor: T.emerald,
            borderRadius: '50%',
            margin: '0 auto 14px',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        Loading your school…
        <style jsx>{`
          @keyframes spin {
            to {
              transform: rotate(360deg);
            }
          }
        `}</style>
      </div>
    );
  }

  const firstName = (principal?.name || '').split(' ')[0] || '';
  const now = new Date();
  const intlLocale = locale === 'en' ? 'en-US' : locale;
  const weekday = now.toLocaleDateString(intlLocale, { weekday: 'long' });
  const dateLabel = now.toLocaleDateString(intlLocale, {
    month: 'long',
    day: 'numeric',
  });

  const greeting = firstName
    ? `Welcome back, ${firstName}.`
    : 'Welcome back.';
  const dateLine = `It's ${weekday}, ${dateLabel}.`;

  // Build the digest paragraph in plain English.
  const digestSentence = digest
    ? buildDigestSentence(digest, stats)
    : '';

  const observedRate =
    stats && stats.total_students > 0
      ? Math.round((stats.total_observed_this_week / stats.total_students) * 100)
      : 0;

  const hasAttention =
    attention &&
    (attention.idle_teachers.length > 0 ||
      attention.classrooms_without_teacher.length > 0 ||
      attention.idle_children.length > 0);

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      {/* Hero — school name in serif + welcome */}
      <div style={{ marginBottom: 36 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 500,
            letterSpacing: -0.6,
            color: T.textPrimary,
            margin: 0,
            lineHeight: 1.1,
          }}
        >
          {school?.name || 'Your school'}
        </h1>
        <p
          style={{
            color: T.emeraldDim,
            fontSize: 14,
            marginTop: 10,
            fontFamily: T.sans,
            letterSpacing: 0.2,
          }}
        >
          <span style={{ color: T.textPrimary }}>{greeting}</span>{' '}
          <span style={{ color: T.textSecondary }}>{dateLine}</span>
        </p>
      </div>

      {/* Viewer banner — shown when this is a teacher-led school the principal
          was invited to. Frames the experience as "you're looking at their
          classroom" and explains the upgrade path without nagging. */}
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
              background: '#E8C96A',
              marginTop: 8,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.55, color: 'rgba(255,255,255,0.78)' }}>
            <strong style={{ color: '#E8C96A' }}>You're a viewer.</strong>{' '}
            This is a teacher's classroom — you can browse everything below
            for free. To add your own classrooms or invite your other teachers,{' '}
            <a
              href="https://montree.xyz/pricing"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#E8C96A', textDecoration: 'underline' }}
            >
              upgrade to a school plan
            </a>
            .
          </div>
        </div>
      )}

      {/* Digest paragraph */}
      {digestSentence && (
        <div
          style={{
            background: T.cardBg,
            backdropFilter: 'blur(18px)',
            border: T.cardBorder,
            borderRadius: 18,
            padding: '22px 26px',
            marginBottom: 24,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.emeraldDim,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              marginBottom: 10,
            }}
          >
            This week so far
          </div>
          <p
            style={{
              fontFamily: T.serif,
              fontSize: 19,
              lineHeight: 1.55,
              color: T.textPrimary,
              margin: 0,
              fontWeight: 400,
            }}
          >
            {digestSentence}
          </p>
        </div>
      )}

      {/* Metric tile row */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 14,
            marginBottom: 32,
          }}
        >
          <Tile
            icon={<Users size={18} strokeWidth={1.75} color={T.emerald} />}
            value={stats.total_students}
            label="children"
          />
          <Tile
            icon={<GraduationCap size={18} strokeWidth={1.75} color={T.emerald} />}
            value={stats.total_classrooms}
            label="classrooms"
          />
          <Tile
            icon={
              <Sparkles size={18} strokeWidth={1.75} color={T.emerald} />
            }
            value={`${digest?.active_teacher_count ?? 0}/${
              digest?.total_teacher_count ?? 0
            }`}
            label="teachers active this week"
          />
          <Tile
            icon={<Camera size={18} strokeWidth={1.75} color={T.emerald} />}
            value={`${observedRate}%`}
            label="children observed"
          />
        </div>
      )}

      {/* Wants your attention */}
      {hasAttention ? (
        <section
          style={{
            background: T.cardBg,
            backdropFilter: 'blur(18px)',
            border: '1px solid rgba(232,201,106,0.22)',
            borderRadius: 18,
            padding: '22px 26px',
            marginBottom: 28,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: T.goldDim,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              marginBottom: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AlertCircle size={14} strokeWidth={2} color={T.gold} />
            Wants your attention
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {attention?.classrooms_without_teacher.map((c) => (
              <AttentionRow
                key={`cwt-${c.id}`}
                title={`${c.icon} ${c.name} — no teacher assigned`}
                subtitle="Assign a lead teacher so families can be invited."
                cta="Assign"
                onClick={() => router.push(`/montree/admin/classrooms/${c.id}`)}
              />
            ))}

            {attention?.idle_teachers.map((tch) => (
              <AttentionRow
                key={`it-${tch.id}`}
                icon={<UserMinus size={16} strokeWidth={1.75} color={T.gold} />}
                title={`${tch.name} — no login in 3+ days`}
                subtitle={
                  tch.last_login_at
                    ? `Last seen ${formatRelative(tch.last_login_at)}`
                    : 'Never logged in'
                }
                cta="Open"
                onClick={() =>
                  tch.classroom_id &&
                  router.push(`/montree/admin/classrooms/${tch.classroom_id}`)
                }
              />
            ))}

            {attention && attention.idle_children.length > 0 && (
              <AttentionRow
                icon={<Camera size={16} strokeWidth={1.75} color={T.gold} />}
                title={`${attention.idle_children_total} ${
                  attention.idle_children_total === 1 ? 'child' : 'children'
                } not observed in 8+ days`}
                subtitle={
                  attention.idle_children
                    .slice(0, 5)
                    .map((c) => c.name)
                    .join(', ') +
                  (attention.idle_children_total > 5 ? '…' : '')
                }
                cta="View"
                onClick={() => router.push('/montree/admin/classrooms')}
              />
            )}
          </div>
        </section>
      ) : stats && stats.total_classrooms > 0 ? (
        <section
          style={{
            background: T.cardBg,
            backdropFilter: 'blur(18px)',
            border: T.cardBorder,
            borderRadius: 18,
            padding: '22px 26px',
            marginBottom: 28,
            color: T.textSecondary,
            fontSize: 14,
          }}
        >
          <span style={{ color: T.emerald, fontWeight: 600 }}>All clear.</span>{' '}
          Every classroom has a teacher and every child has been observed this
          week.
        </section>
      ) : null}

      {/* Quick actions */}
      <section style={{ marginBottom: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: T.emeraldDim,
            textTransform: 'uppercase',
            letterSpacing: 1.4,
            marginBottom: 12,
          }}
        >
          Quick actions
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 12,
          }}
        >
          <ActionCard
            label="Open classrooms"
            sublabel="Drill into any class"
            onClick={() => router.push('/montree/admin/classrooms')}
          />
          <ActionCard
            label="Ask Guru"
            sublabel="Your school advisor"
            onClick={() => router.push('/montree/admin/guru')}
          />
          <ActionCard
            label="Settings"
            sublabel="School & profile"
            onClick={() => router.push('/montree/admin/settings')}
          />
        </div>
      </section>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function buildDigestSentence(d: Digest, s: Stats | null): string {
  const parts: string[] = [];
  if (s && s.total_students > 0) {
    parts.push(
      `${s.total_observed_this_week} of ${s.total_students} children have moments to share`
    );
  }
  if (d.photos_confirmed_7d > 0) {
    parts.push(
      `${d.photos_confirmed_7d} ${
        d.photos_confirmed_7d === 1 ? 'photo' : 'photos'
      } confirmed`
    );
  } else if (s && s.total_students > 0) {
    parts.push(`no photos confirmed yet this week`);
  }
  if (d.total_teacher_count > 0) {
    parts.push(
      `${d.active_teacher_count} of ${d.total_teacher_count} teachers logged in`
    );
  }
  if (parts.length === 0) return '';
  // Sentence case + period.
  const joined =
    parts.length === 1
      ? parts[0]
      : parts.length === 2
        ? `${parts[0]} and ${parts[1]}`
        : `${parts.slice(0, -1).join(', ')}, and ${parts[parts.length - 1]}`;
  return joined.charAt(0).toUpperCase() + joined.slice(1) + '.';
}

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return `${Math.floor(days / 30)} months ago`;
}

function Tile({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
}) {
  return (
    <div
      style={{
        background: T.cardBg,
        backdropFilter: 'blur(18px)',
        border: T.cardBorder,
        borderRadius: 14,
        padding: '16px 18px',
      }}
    >
      <div style={{ marginBottom: 6 }}>{icon}</div>
      <div
        style={{
          fontFamily: T.serif,
          fontSize: 28,
          fontWeight: 600,
          color: T.textPrimary,
          letterSpacing: -0.5,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {value}
      </div>
      <div
        style={{
          color: T.textSecondary,
          fontSize: 12,
          marginTop: 4,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function AttentionRow({
  icon,
  title,
  subtitle,
  cta,
  onClick,
}: {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  cta?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '12px 14px',
        background: 'rgba(232,201,106,0.06)',
        border: '1px solid rgba(232,201,106,0.18)',
        borderRadius: 12,
        cursor: onClick ? 'pointer' : 'default',
        textAlign: 'left',
        fontFamily: T.sans,
        color: T.textPrimary,
      }}
    >
      {icon && (
        <div
          style={{
            width: 28,
            height: 28,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(232,201,106,0.10)',
            borderRadius: 8,
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: T.textPrimary,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {title}
        </div>
        {subtitle && (
          <div
            style={{
              color: T.textSecondary,
              fontSize: 12,
              marginTop: 2,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {cta && onClick && (
        <div
          style={{
            color: T.gold,
            fontSize: 13,
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            flexShrink: 0,
          }}
        >
          {cta}
          <ArrowRight size={14} strokeWidth={2} />
        </div>
      )}
    </button>
  );
}

function ActionCard({
  label,
  sublabel,
  onClick,
}: {
  label: string;
  sublabel: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: T.cardBg,
        backdropFilter: 'blur(18px)',
        border: T.cardBorder,
        borderRadius: 14,
        padding: '16px 18px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: T.sans,
        color: T.textPrimary,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = T.cardBgStrong)
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = T.cardBg)
      }
    >
      <div>
        <div style={{ fontSize: 14, fontWeight: 500, color: T.textPrimary }}>
          {label}
        </div>
        <div
          style={{
            color: T.textSecondary,
            fontSize: 12,
            marginTop: 3,
          }}
        >
          {sublabel}
        </div>
      </div>
      <ArrowRight size={16} strokeWidth={1.75} color={T.emeraldDim} />
    </button>
  );
}
