// components/montree/focus/TodaysFocusStrip.tsx
// Horizontal avatar strip of today's focus children.
// Green ring + ✓ when a tagged photo has been captured for them today.
// Tap anywhere on the strip → jump to the Focus List page to manage.
// Dark forest visual treatment — all wiring intact

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Target, Check } from 'lucide-react';
import { montreeApi } from '@/lib/montree/api';
import { useI18n } from '@/lib/montree/i18n';

interface FocusChild {
  id: string;
  child_id: string;
  name: string;
  photo_url: string | null;
  confirmed: boolean;
}

interface FocusData {
  focus_date: string;
  children: FocusChild[];
  total: number;
  confirmed_count: number;
}

const T = {
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(52,211,153,0.15)',
  blur: 'blur(14px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

function Avatar({ name, photoUrl, size = 40 }: { name: string; photoUrl: string | null; size?: number }) {
  const [fallback, setFallback] = useState(!photoUrl);
  const initial = name.charAt(0).toUpperCase();
  if (!fallback && photoUrl) {
    return (
      // 🚨 Perf Tier 5.1 — explicit width/height attrs eliminate CLS shift
      // while the avatar loads. Strip mounts on every dashboard return.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        width={size}
        height={size}
        loading="lazy"
        decoding="async"
        onError={() => setFallback(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #34d399, #059669)',
        color: '#06281a',
        fontFamily: T.sans,
        fontSize: size * 0.4,
        fontWeight: 700,
      }}
    >
      {initial}
    </div>
  );
}

export default function TodaysFocusStrip({ compact = false }: { compact?: boolean }) {
  const { t } = useI18n();
  const [data, setData] = useState<FocusData | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    let aborted = false;

    async function load() {
      try {
        const res = await montreeApi('/api/montree/dashboard/daily-focus');
        if (aborted || !mountedRef.current) return;
        if (res.ok) {
          const json = await res.json();
          if (mountedRef.current) setData(json);
        }
      } catch (e) {
        if (!aborted) console.error('[TodaysFocusStrip] load error:', e);
      }
    }

    load();
    return () => {
      aborted = true;
      mountedRef.current = false;
    };
  }, []);

  if (!data || data.children.length === 0) return null;

  const avatarSize = compact ? 38 : 44;
  const tileWidth = compact ? 50 : 60;

  return (
    <Link
      href="/montree/dashboard/focus"
      style={{
        display: 'block',
        textDecoration: 'none',
        background: T.card,
        border: `1px solid ${T.cardBorder}`,
        borderRadius: 16,
        padding: compact ? 10 : 12,
        backdropFilter: T.blur,
        WebkitBackdropFilter: T.blur,
        color: T.textPrimary,
        transition: 'background 140ms ease',
      }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 7,
          fontFamily: T.sans,
          fontSize: 13,
          fontWeight: 600,
          color: T.textSecondary,
        }}>
          <Target size={13} strokeWidth={1.75} color={T.emerald} />
          <span>{t('todaysFocus.title')}</span>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 7px',
            borderRadius: 999,
            background: T.emeraldStrong,
            border: '1px solid rgba(52,211,153,0.30)',
            color: T.emerald,
            fontSize: 10,
            fontWeight: 700,
          }}>
            {data.confirmed_count}/{data.total}
          </span>
        </div>
        <div style={{
          fontFamily: T.sans,
          fontSize: 11,
          fontWeight: 600,
          color: T.emerald,
        }}>
          {t('todaysFocus.manageButton')}
        </div>
      </div>
      <div style={{
        display: 'flex',
        gap: 8,
        overflowX: 'auto',
        paddingBottom: 4,
      }}>
        {data.children.map(c => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              flexShrink: 0,
              width: tileWidth,
            }}
          >
            <div style={{
              position: 'relative',
              borderRadius: '50%',
              padding: 2,
              background: c.confirmed ? T.emerald : 'rgba(255,255,255,0.16)',
            }}>
              <Avatar name={c.name} photoUrl={c.photo_url} size={avatarSize} />
              {c.confirmed && (
                <div style={{
                  position: 'absolute',
                  bottom: -2,
                  right: -2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: T.emerald,
                  color: '#06281a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '2px solid #0a1a0f',
                }}>
                  <Check size={9} strokeWidth={3} />
                </div>
              )}
            </div>
            <div style={{
              marginTop: 5,
              fontFamily: T.sans,
              fontSize: 10,
              color: T.textSecondary,
              width: '100%',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}>
              {c.name}
            </div>
          </div>
        ))}
      </div>
    </Link>
  );
}
