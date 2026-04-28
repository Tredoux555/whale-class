'use client';

// /montree/dashboard/earnings/page.tsx — Teacher revenue share earnings view

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface EarningsRow {
  id: string;
  month: string;
  school_revenue: number;
  share_pct: number;
  teacher_earnings: number;
  status: 'pending' | 'paid' | 'cancelled';
  paid_at: string | null;
  notes: string | null;
}

interface EarningsData {
  isFounding: boolean;
  isActive: boolean;
  sharePct: number;
  school: { id: string; name: string } | null;
  studentCount: number;
  estimatedMonthlyShare: number;
  totalPaid: number;
  totalPending: number;
  earnings: EarningsRow[];
}

const STATUS_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  paid:      { bg: 'rgba(39,129,90,0.2)',  text: '#62C396', label: 'Paid' },
  pending:   { bg: 'rgba(232,201,106,0.15)', text: '#E8C96A', label: 'Pending' },
  cancelled: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.3)', label: 'Cancelled' },
};

function formatMonth(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/montree/teacher/earnings')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '2px solid rgba(130,217,174,0.2)', borderTopColor: '#62C396', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Not a founding teacher
  if (data && !data.isFounding) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', padding: '80px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: 48, marginBottom: 24 }}>🌿</div>
        <h1 style={{ fontFamily: '"Lora", Georgia, serif', fontWeight: 400, fontSize: '1.875rem', color: 'rgba(255,255,255,0.9)', marginBottom: 16, letterSpacing: '-0.015em' }}>
          Revenue Share
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.4)', lineHeight: 1.8, marginBottom: 32 }}>
          You&apos;re not currently enrolled in the Montree Teacher Revenue Share programme.
          If you brought Montree to your school and believe you should be the founding teacher,
          get in touch.
        </p>
        <a
          href="/montree/for-teachers"
          style={{
            display: 'inline-block', padding: '12px 28px', borderRadius: 999,
            background: 'linear-gradient(180deg, #27815a 0%, #1D6B48 100%)',
            color: '#fff', textDecoration: 'none', fontSize: '0.9375rem', fontWeight: 500,
            border: '1px solid rgba(130,217,174,0.18)',
          }}
        >
          Learn about the programme →
        </a>
      </div>
    );
  }

  const d = data!;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 32px 80px' }}>

      {/* Back */}
      <Link href="/montree/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: 'rgba(255,255,255,0.35)', fontSize: '0.875rem', textDecoration: 'none', marginBottom: 40 }}>
        ← Dashboard
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 48 }}>
        <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: '#E8C96A', fontWeight: 500 }}>
          Teacher revenue share
        </span>
        <h1 style={{ fontFamily: '"Lora", Georgia, serif', fontWeight: 400, fontSize: 'clamp(2rem, 5vw, 2.75rem)', color: '#ffffff', lineHeight: 1.1, letterSpacing: '-0.022em', marginTop: 12 }}>
          Your earnings
        </h1>
        {d.school && (
          <p style={{ marginTop: 8, color: 'rgba(255,255,255,0.4)', fontSize: '0.9375rem' }}>
            Founding teacher · {d.school.name}
          </p>
        )}
      </div>

      {/* Status banner */}
      <div style={{
        padding: '20px 24px', borderRadius: 14, marginBottom: 40,
        background: d.isActive ? 'rgba(39,129,90,0.15)' : 'rgba(232,201,106,0.1)',
        border: `1px solid ${d.isActive ? 'rgba(130,217,174,0.2)' : 'rgba(232,201,106,0.18)'}`,
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 20 }}>{d.isActive ? '✅' : '⏳'}</span>
        <div>
          <p style={{ color: d.isActive ? '#62C396' : '#E8C96A', fontWeight: 500, fontSize: '0.9375rem' }}>
            {d.isActive ? 'Revenue share active' : 'Awaiting school conversion'}
          </p>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', marginTop: 2 }}>
            {d.isActive
              ? `${d.sharePct}% of your school's monthly subscription`
              : 'Your share activates when your school moves to a paid plan.'}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 48 }}>
        {[
          { label: 'Est. monthly share', value: `$${d.estimatedMonthlyShare}`, sub: `${d.studentCount} students × $7 × ${d.sharePct}%` },
          { label: 'Total paid out', value: `$${d.totalPaid.toFixed(2)}`, sub: 'All time' },
          { label: 'Pending', value: `$${d.totalPending.toFixed(2)}`, sub: 'Awaiting payment' },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: '20px 20px',
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 12,
          }}>
            <p style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>{stat.label}</p>
            <p style={{ fontSize: '1.5rem', fontWeight: 500, color: '#ffffff' }}>{stat.value}</p>
            <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.28)', marginTop: 4 }}>{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Earnings table */}
      {d.earnings.length > 0 ? (
        <div>
          <p style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(255,255,255,0.28)', marginBottom: 16 }}>
            Earnings history
          </p>
          <div style={{ border: '1px solid rgba(255,255,255,0.07)', borderRadius: 12, overflow: 'hidden' }}>
            {d.earnings.map((row, i) => {
              const s = STATUS_STYLES[row.status] || STATUS_STYLES.pending;
              return (
                <div key={row.id} style={{
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: 16, padding: '18px 20px', alignItems: 'center',
                  borderTop: i > 0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                }}>
                  <div>
                    <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.9375rem' }}>{formatMonth(row.month)}</p>
                    <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.8rem', marginTop: 2 }}>
                      School revenue: ${Number(row.school_revenue).toFixed(2)}
                    </p>
                  </div>
                  <span style={{
                    padding: '4px 12px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 500,
                    background: s.bg, color: s.text,
                  }}>
                    {s.label}
                  </span>
                  <p style={{ color: '#62C396', fontWeight: 500, fontSize: '1rem', textAlign: 'right' }}>
                    ${Number(row.teacher_earnings).toFixed(2)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div style={{
          padding: '48px 32px', textAlign: 'center',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)', borderRadius: 14,
        }}>
          <p style={{ color: 'rgba(255,255,255,0.3)', fontSize: '0.9375rem' }}>
            No earnings recorded yet. Once your school converts to a paid plan, earnings will appear here each month.
          </p>
        </div>
      )}

      {/* Help */}
      <p style={{ marginTop: 40, color: 'rgba(255,255,255,0.2)', fontSize: '0.8rem', textAlign: 'center' }}>
        Questions about your earnings? Email{' '}
        <a href="mailto:tredoux555@gmail.com" style={{ color: 'rgba(130,217,174,0.5)', textDecoration: 'none' }}>
          tredoux555@gmail.com
        </a>
      </p>
    </div>
  );
}
