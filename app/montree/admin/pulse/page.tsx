// /montree/admin/pulse/page.tsx
// Pulse hub — surfaces school activity, weekly digest, and reports.
// Mirrors the People hub design: 3 cards linking to existing pages.
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Camera,
  FileText,
} from 'lucide-react';

const T = {
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.75)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface TodayResponse {
  stats: {
    total_observed_this_week: number;
    total_students: number;
  };
  digest: {
    photos_confirmed_7d: number;
    active_teacher_count: number;
    total_teacher_count: number;
  };
}

export default function PulsePage() {
  const router = useRouter();
  const [data, setData] = useState<TodayResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const principalData = localStorage.getItem('montree_principal');
    if (!principalData) {
      router.replace('/montree/login-select');
      return;
    }
    fetch('/api/montree/admin/today', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [router]);

  return (
    <div style={{ fontFamily: T.sans, color: T.textPrimary }}>
      <div style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontFamily: T.serif,
            fontSize: 'clamp(26px, 4vw, 36px)',
            fontWeight: 500,
            letterSpacing: -0.4,
            color: T.textPrimary,
            margin: 0,
          }}
        >
          Pulse
        </h1>
        <p
          style={{
            color: T.textSecondary,
            fontSize: 14,
            marginTop: 8,
            margin: '8px 0 0 0',
          }}
        >
          School activity, observations, and reports.
        </p>
      </div>

      {loading ? (
        <div
          style={{
            padding: '40px 0',
            textAlign: 'center',
            color: T.textMuted,
            fontSize: 14,
          }}
        >
          Loading…
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 16,
          }}
        >
          <HubCard
            icon={<Camera size={22} strokeWidth={1.75} color={T.emerald} />}
            title="This week"
            value={data ? `${data.digest.photos_confirmed_7d}` : '—'}
            sublabel={
              data
                ? `photos confirmed · ${data.stats.total_observed_this_week} of ${data.stats.total_students} children observed`
                : ''
            }
            cta="See activity"
            onClick={() => router.push('/montree/admin/activity')}
          />
          <HubCard
            icon={<FileText size={22} strokeWidth={1.75} color={T.emerald} />}
            title="Reports"
            value="—"
            sublabel="Weekly wraps · parent letters · semester reports"
            cta="Open reports"
            onClick={() => router.push('/montree/admin/reports')}
          />
          <HubCard
            icon={<BarChart3 size={22} strokeWidth={1.75} color={T.emerald} />}
            title="Billing"
            value="—"
            sublabel="School plan, invoices, payment history"
            cta="View billing"
            onClick={() => router.push('/montree/admin/billing')}
          />
          <HubCard
            icon={<Activity size={22} strokeWidth={1.75} color={T.emerald} />}
            title="Engagement"
            value={
              data
                ? `${data.digest.active_teacher_count}/${data.digest.total_teacher_count}`
                : '—'
            }
            sublabel="Teachers active this week"
            cta="See activity"
            onClick={() => router.push('/montree/admin/activity')}
          />
        </div>
      )}
    </div>
  );
}

function HubCard({
  icon,
  title,
  value,
  sublabel,
  cta,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  sublabel: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: T.cardBg,
        backdropFilter: 'blur(18px)',
        border: T.cardBorder,
        borderRadius: 16,
        padding: '22px 22px 18px 22px',
        textAlign: 'left',
        cursor: 'pointer',
        fontFamily: T.sans,
        color: T.textPrimary,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        transition: 'background 0.15s ease',
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background =
          T.cardBgStrong)
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLButtonElement).style.background = T.cardBg)
      }
    >
      <div>{icon}</div>
      <div>
        <div
          style={{
            fontSize: 12,
            color: T.emeraldDim,
            textTransform: 'uppercase',
            letterSpacing: 1.2,
            fontWeight: 600,
            marginBottom: 4,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontFamily: T.serif,
            fontSize: 32,
            fontWeight: 600,
            color: T.textPrimary,
            letterSpacing: -0.5,
            fontVariantNumeric: 'tabular-nums',
            lineHeight: 1,
          }}
        >
          {value}
        </div>
        <div
          style={{
            color: T.textSecondary,
            fontSize: 13,
            marginTop: 8,
          }}
        >
          {sublabel}
        </div>
      </div>
      <div
        style={{
          marginTop: 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: T.emeraldDim,
          fontSize: 13,
          fontWeight: 500,
          paddingTop: 8,
          borderTop: '1px solid rgba(52,211,153,0.10)',
        }}
      >
        {cta}
        <ArrowRight size={14} strokeWidth={2} />
      </div>
    </button>
  );
}
