'use client';

// components/montree/voice-notes/WeeklyAdminCard.tsx
// Simplified dashboard card — links to Weekly Admin Docs page
// which auto-fills from progress + Smart Capture data on load
// Dark forest visual treatment — all wiring intact

import Link from 'next/link';
import { ClipboardList, ArrowRight } from 'lucide-react';
import { useI18n } from '@/lib/montree/i18n';

interface Child {
  id: string;
  name: string;
}

interface Props {
  classroomId: string;
  children: Child[];
}

export default function WeeklyAdminCard({ children }: Props) {
  const { t } = useI18n();

  if (children.length === 0) return null;

  return (
    <Link
      href="/montree/dashboard/weekly-admin-docs"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: 'rgba(255,255,255,0.06)',
        border: '1px solid rgba(52,211,153,0.15)',
        borderRadius: 14,
        padding: 16,
        marginBottom: 16,
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
        color: 'rgba(255,255,255,0.95)',
        transition: 'all 140ms ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        fontFamily: '"Inter", -apple-system, sans-serif',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'rgba(96,165,250,0.18)',
            border: '1px solid rgba(96,165,250,0.30)',
            color: '#60a5fa',
            flexShrink: 0,
          }}>
            <ClipboardList size={16} strokeWidth={1.75} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{
              margin: 0,
              fontFamily: 'var(--font-lora), Georgia, serif',
              fontSize: 14,
              fontWeight: 500,
              color: 'rgba(255,255,255,0.95)',
              letterSpacing: -0.1,
            }}>
              {t('weeklyAdminCard.title')}
            </h3>
            <p style={{
              margin: '3px 0 0',
              fontSize: 11,
              color: 'rgba(255,255,255,0.45)',
            }}>
              {children.length} {t('weeklyAdminCard.childrenLabel')} · {t('weeklyAdminCard.subtitle')}
            </p>
          </div>
        </div>
        <ArrowRight size={15} strokeWidth={1.75} color="#34d399" style={{ flexShrink: 0 }} />
      </div>
    </Link>
  );
}
