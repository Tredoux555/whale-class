// components/montree/media/MediaDetailModal.tsx
// Modal for viewing, editing, and deleting photos
// Dark forest visual treatment — all wiring intact
'use client';

import React, { useState, useEffect } from 'react';
import {
  X, Calendar, User, Camera, Trash2, Check,
} from 'lucide-react';
import { toast } from 'sonner';
import type { MontreeMedia, MontreeChild } from '@/lib/montree/media/types';
import { useI18n } from '@/lib/montree/i18n';
import { getIntlLocale } from '@/lib/montree/i18n/locales';

interface MediaDetailModalProps {
  media: MontreeMedia | null;
  children: MontreeChild[];
  onClose: () => void;
  onUpdate: (media: MontreeMedia) => void;
  onDelete: (id: string) => void;
}

const T = {
  scrim: 'rgba(2,8,5,0.80)',
  sheet: 'rgba(7,18,12,0.97)',
  sheetBorder: 'rgba(52,211,153,0.18)',
  blur: 'blur(20px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  blue: '#60a5fa',
  blueSoft: 'rgba(96,165,250,0.10)',
  blueBorder: 'rgba(96,165,250,0.30)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.18)',
  redBorder: 'rgba(239,68,68,0.45)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: 'rgba(52,211,153,0.20)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

export default function MediaDetailModal({
  media,
  children,
  onClose,
  onUpdate,
  onDelete,
}: MediaDetailModalProps) {
  const { t, locale } = useI18n();
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const [caption, setCaption] = useState('');
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);

  useEffect(() => {
    if (!media) return;

    setCaption(media.caption || '');
    setSelectedChildId(media.child_id);

    const fetchUrl = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/montree/media/url?path=${encodeURIComponent(media.storage_path)}`);
        if (!response.ok) throw new Error('Failed to fetch image URL');
        const data = await response.json();
        if (data.url) {
          setImageUrl(data.url);
        }
      } catch (err) {
        console.error('Failed to fetch image URL:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUrl();
  }, [media]);

  if (!media) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/montree/media', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: media.id,
          caption: caption || null,
          child_id: selectedChildId,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || t('media.failedToUpdate'));
        return;
      }
      const data = await response.json();

      if (data.success) {
        toast.success(t('media.photoUpdated'));
        onUpdate(data.media);
        onClose();
      } else {
        toast.error(data.error || t('media.failedToUpdate'));
      }
    } catch (err) {
      toast.error(t('media.failedToUpdatePhoto'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await fetch(`/api/montree/media?id=${media.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        toast.error(errData.error || t('media.failedToDelete'));
        return;
      }
      const data = await response.json();

      if (data.success) {
        toast.success(t('media.photoDeleted'));
        onDelete(media.id);
        onClose();
      } else {
        toast.error(data.error || t('media.failedToDelete'));
      }
    } catch (err) {
      toast.error(t('media.failedToDeletePhoto'));
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(getIntlLocale(locale), {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const childName = selectedChildId
    ? children.find(c => c.id === selectedChildId)?.name
    : null;

  return (
    <div style={{
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
    }}>
      <div style={{
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
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
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
            {t('media.photoDetails')}
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
            }}
          >
            <X size={15} strokeWidth={1.75} />
          </button>
        </div>

        {/* Image */}
        <div style={{
          background: '#000',
          aspectRatio: '16 / 9',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {loading ? (
            <div style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <div style={{
                width: 28,
                height: 28,
                border: `2px solid rgba(52,211,153,0.40)`,
                borderTopColor: T.emerald,
                borderRadius: '50%',
                animation: 'mdm-spin 0.9s linear infinite',
              }} />
              <style>{`@keyframes mdm-spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={media.caption || 'Photo'}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block',
              }}
            />
          ) : (
            <div style={{
              position: 'absolute',
              inset: 0,
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
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontFamily: T.sans,
            fontSize: 12,
            color: T.textMuted,
          }}>
            <Calendar size={13} strokeWidth={1.75} />
            {formatDate(media.captured_at)}
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.textSecondary,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>
              {t('media.caption')}
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('media.addCaption')}
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                background: T.inputBg,
                border: `1px solid ${T.inputBorder}`,
                color: T.textPrimary,
                fontFamily: T.sans,
                fontSize: 13,
                lineHeight: 1.55,
                outline: 'none',
                resize: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              marginBottom: 6,
              fontFamily: T.sans,
              fontSize: 11,
              fontWeight: 700,
              color: T.textSecondary,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
            }}>
              {t('media.assignToChild')}
            </label>
            <select
              value={selectedChildId || ''}
              onChange={(e) => setSelectedChildId(e.target.value || null)}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: 12,
                background: T.inputBg,
                border: `1px solid ${T.inputBorder}`,
                color: T.textPrimary,
                fontFamily: T.sans,
                fontSize: 13,
                outline: 'none',
                appearance: 'none',
                backgroundImage: `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.40)' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 12px center',
                paddingRight: 32,
              }}
            >
              <option value="" style={{ background: '#0a1a0f' }}>{t('media.unassignedGroupPhoto')}</option>
              {children.map((child) => (
                <option key={child.id} value={child.id} style={{ background: '#0a1a0f' }}>
                  {child.name}
                </option>
              ))}
            </select>
          </div>

          {childName && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 9,
              padding: 12,
              borderRadius: 12,
              background: T.blueSoft,
              border: `1px solid ${T.blueBorder}`,
            }}>
              <User size={14} strokeWidth={1.75} color={T.blue} />
              <span style={{
                fontFamily: T.sans,
                fontSize: 13,
                color: T.blue,
              }}>
                {t('media.assignedTo').replace('{name}', childName)}
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div style={{
          padding: 14,
          borderTop: `1px solid ${T.sheetBorder}`,
          background: 'rgba(0,0,0,0.20)',
          display: 'flex',
          gap: 10,
        }}>
          {showDeleteConfirm ? (
            <>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  flex: 1,
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
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
                  cursor: deleting ? 'wait' : 'pointer',
                  opacity: deleting ? 0.55 : 1,
                }}
              >
                <Trash2 size={13} strokeWidth={1.75} />
                {deleting ? t('common.deleting') : t('media.confirmDelete')}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
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
                {t('common.delete')}
              </button>
              <button
                onClick={onClose}
                style={{
                  flex: 1,
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
                {t('common.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
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
                  cursor: saving ? 'wait' : 'pointer',
                  opacity: saving ? 0.55 : 1,
                  boxShadow: saving ? 'none' : '0 4px 14px rgba(16,185,129,0.25)',
                }}
              >
                <Check size={13} strokeWidth={2.5} />
                {saving ? t('common.saving') : t('media.saveChanges')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
