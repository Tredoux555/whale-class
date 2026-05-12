// components/montree/media/PhotoDetailView.tsx
// Simple read-only photo viewer modal
// Dark forest visual treatment — all wiring intact
'use client';

import React from 'react';
import {
  X, Calendar, User, Camera, Pencil, Trash2,
} from 'lucide-react';
import type { MontreeMedia } from '@/lib/montree/media/types';
import { AREA_CONFIG } from '@/lib/montree/types';
import { useI18n } from '@/lib/montree/i18n';
import { getProxyUrl } from '@/lib/montree/media/proxy-url';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

interface PhotoDetailViewProps {
  media: MontreeMedia | null;
  childName?: string;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onMediaUpdated?: (updatedMedia: MontreeMedia) => void;
}

const T = {
  scrim: 'rgba(2,8,5,0.80)',
  sheet: 'rgba(7,18,12,0.97)',
  sheetBorder: 'rgba(52,211,153,0.18)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: 'rgba(255,255,255,0.10)',
  blur: 'blur(20px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberSoft: 'rgba(245,158,11,0.10)',
  amberBorder: 'rgba(245,158,11,0.30)',
  blue: '#60a5fa',
  blueSoft: 'rgba(96,165,250,0.10)',
  blueBorder: 'rgba(96,165,250,0.30)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const AREA_DOT_RGB: Record<string, string> = {
  practical_life: '236, 72, 153',
  sensorial: '20, 184, 166',
  mathematics: '168, 85, 247',
  language: '74, 222, 128',
  cultural: '249, 115, 22',
};

export default function PhotoDetailView({
  media,
  childName,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: PhotoDetailViewProps) {
  const { locale } = useI18n();

  if (!isOpen || !media) return null;

  const imageUrl = getProxyUrl(media.storage_path);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(getIntlLocale(locale), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getAreaConfig = (area: string | null | undefined) => {
    if (!area) return { name: 'Untagged' };
    return AREA_CONFIG[area as keyof typeof AREA_CONFIG] || { name: area };
  };

  const areaConfig = getAreaConfig(media.area);
  const areaRgb = media.area ? (AREA_DOT_RGB[media.area] || '255,255,255') : '255,255,255';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: T.scrim,
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: T.sans,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: T.sheet,
          border: `1px solid ${T.sheetBorder}`,
          borderRadius: 18,
          maxWidth: 640,
          width: '100%',
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          backdropFilter: T.blur,
          WebkitBackdropFilter: T.blur,
          boxShadow: '0 24px 60px rgba(0,0,0,0.55)',
          color: T.textPrimary,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          background: 'linear-gradient(180deg, rgba(52,211,153,0.18), rgba(52,211,153,0.06))',
          borderBottom: `1px solid ${T.sheetBorder}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <h2 style={{
            margin: 0,
            fontFamily: T.serif,
            fontSize: 16,
            fontWeight: 500,
            color: T.textPrimary,
            letterSpacing: -0.2,
          }}>
            Photo Details
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: 'pointer',
              transition: 'all 120ms ease',
            }}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Image */}
        <div style={{
          background: '#000',
          maxHeight: '50vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={media.caption || 'Photo'}
              style={{
                maxWidth: '100%',
                maxHeight: '50vh',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              width: '100%',
              height: 192,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: T.textMuted,
            }}>
              <Camera size={32} strokeWidth={1.5} />
            </div>
          )}
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: 16,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}>
          {/* Date */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: T.sans,
            fontSize: 13,
            color: T.textSecondary,
          }}>
            <Calendar size={14} strokeWidth={1.75} color={T.textMuted} />
            <span>{formatDate(media.captured_at)}</span>
          </div>

          {/* Captured by */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: T.sans,
            fontSize: 13,
            color: T.textSecondary,
          }}>
            <User size={14} strokeWidth={1.75} color={T.textMuted} />
            <span>Captured by {media.captured_by}</span>
          </div>

          {/* Area + Work */}
          {(media.area || media.work_id) && (
            <div style={{
              padding: 12,
              borderRadius: 12,
              background: `rgba(${areaRgb}, 0.08)`,
              border: `1px solid rgba(${areaRgb}, 0.30)`,
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}>
              <span style={{
                width: 22,
                height: 22,
                borderRadius: '50%',
                background: `rgba(${areaRgb}, 0.30)`,
                border: `1px solid rgba(${areaRgb}, 0.55)`,
                flexShrink: 0,
              }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                {media.area && (
                  <p style={{
                    margin: 0,
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 600,
                    color: `rgb(${areaRgb})`,
                  }}>
                    {areaConfig.name}
                  </p>
                )}
                {media.work_id && (
                  <p style={{
                    margin: '2px 0 0',
                    fontFamily: T.sans,
                    fontSize: 11,
                    color: T.textSecondary,
                  }}>
                    Work: {media.work_id}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Child */}
          {childName && (
            <div style={{
              padding: 12,
              borderRadius: 12,
              background: T.blueSoft,
              border: `1px solid ${T.blueBorder}`,
            }}>
              <p style={{
                margin: 0,
                fontFamily: T.sans,
                fontSize: 13,
                color: T.blue,
              }}>
                <span style={{ fontWeight: 700 }}>Child:</span> {childName}
              </p>
            </div>
          )}

          {/* Caption */}
          {media.caption && (
            <div style={{
              padding: 12,
              borderRadius: 12,
              background: T.amberSoft,
              border: `1px solid ${T.amberBorder}`,
            }}>
              <p style={{
                margin: '0 0 4px',
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.amber,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}>
                Caption
              </p>
              <p style={{
                margin: 0,
                fontFamily: T.sans,
                fontSize: 13,
                lineHeight: 1.55,
                color: T.textPrimary,
              }}>
                {media.caption}
              </p>
            </div>
          )}

          {/* Tags */}
          {media.tags && media.tags.length > 0 && (
            <div>
              <p style={{
                margin: '0 0 8px',
                fontFamily: T.sans,
                fontSize: 11,
                fontWeight: 700,
                color: T.textMuted,
                letterSpacing: 0.4,
                textTransform: 'uppercase',
              }}>
                Tags
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {media.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    style={{
                      padding: '3px 10px',
                      borderRadius: 999,
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.10)',
                      color: T.textSecondary,
                      fontFamily: T.sans,
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Metadata */}
          <div style={{
            paddingTop: 10,
            borderTop: '1px solid rgba(255,255,255,0.06)',
            fontFamily: T.sans,
            fontSize: 10,
            color: T.textMuted,
          }}>
            <p style={{ margin: 0 }}>ID: {media.id}</p>
          </div>
        </div>

        {/* Actions */}
        <div style={{
          padding: 14,
          borderTop: `1px solid ${T.sheetBorder}`,
          background: 'rgba(0,0,0,0.20)',
          display: 'flex',
          gap: 8,
        }}>
          {onEdit && (
            <button
              onClick={() => { onEdit(); onClose(); }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '11px 14px',
                borderRadius: 12,
                background: 'linear-gradient(180deg, #34d399, #10b981)',
                border: '1px solid rgba(52,211,153,0.55)',
                color: '#06281a',
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16,185,129,0.25)',
              }}
            >
              <Pencil size={13} strokeWidth={1.75} />
              Edit
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => { onDelete(); onClose(); }}
              style={{
                flex: 1,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 7,
                padding: '11px 14px',
                borderRadius: 12,
                background: T.redSoft,
                border: `1px solid ${T.redBorder}`,
                color: T.red,
                fontFamily: T.sans,
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              <Trash2 size={13} strokeWidth={1.75} />
              Delete
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              flex: (onEdit || onDelete) ? 1 : undefined,
              width: (onEdit || onDelete) ? undefined : '100%',
              padding: '11px 14px',
              borderRadius: 12,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              fontFamily: T.sans,
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
