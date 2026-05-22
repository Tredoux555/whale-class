'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { Camera } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';
import MontreeLogo from '@/components/montree/MonteeLogo';
import LanguageToggle from '@/components/montree/LanguageToggle';
import PhotoLightbox from '@/components/montree/media/PhotoLightbox';
import { getThumbnailUrl, getThumbnailSrcSet } from '@/lib/montree/media/proxy-url';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

interface Photo {
  id: string;
  storage_path: string;
  thumbnail_url: string | null;
  caption: string | null;
  captured_at: string;
  work_id: string | null;
}

function ParentPhotosContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const childIdParam = searchParams.get('child');

  const [loading, setLoading] = useState(true);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState<Photo | null>(null);
  const [fullImageUrl, setFullImageUrl] = useState<string | null>(null);
  const [childName, setChildName] = useState('');
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  // 🚨 Session 113 V2 Parent audit F-1.3 — cookie-based auth gate.
  // The localStorage entry was forgeable and out-of-sync with the cookie.
  // The httpOnly cookie is the only authority on parent identity.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRes = await fetch('/api/montree/parent/auth/access-code', {
          credentials: 'same-origin',
        });
        if (cancelled) return;
        if (!sessionRes.ok) {
          router.push('/montree/parent/login');
          return;
        }
        const sessionData = await sessionRes.json();
        if (!sessionData?.authenticated) {
          router.push('/montree/parent/login');
          return;
        }

        // Resolve which child's photos to load. Priority:
        //   1. ?child_id= URL param (explicit user navigation)
        //   2. localStorage hint (multi-child parent's last selection — UX
        //      only, server still validates via cookie)
        //   3. The session's JWT-stamped child as a final fallback
        let resolvedChildId: string | null = null;
        let resolvedName: string | null = null;
        if (childIdParam) {
          resolvedChildId = childIdParam;
        } else {
          try {
            const hint = localStorage.getItem('montree_selected_child');
            if (hint) {
              const parsed = JSON.parse(hint);
              if (parsed?.id) {
                resolvedChildId = parsed.id;
                resolvedName = parsed.name || null;
              }
            }
          } catch {}
          if (!resolvedChildId && sessionData.child_id) {
            resolvedChildId = sessionData.child_id;
            resolvedName = sessionData.child_name || null;
          }
        }

        if (!resolvedChildId) {
          toast.error(t('common.noChildSelected'));
          router.push('/montree/parent/dashboard');
          return;
        }

        if (resolvedName) setChildName(resolvedName);
        loadPhotos(resolvedChildId);
      } catch (err) {
        if (cancelled) return;
        console.error('Parent photos auth check failed:', err);
        router.push('/montree/parent/login');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [router, childIdParam, t]);

  const loadPhotos = async (childId: string, append = false) => {
    try {
      const currentOffset = append ? offset : 0;
      const res = await fetch(`/api/montree/parent/photos?child_id=${childId}&limit=12&offset=${currentOffset}`);
      if (!res.ok) {
        throw new Error('Failed to fetch photos');
      }
      const data = await res.json();

      if (data.success) {
        if (append) {
          setPhotos(prev => [...prev, ...data.photos]);
        } else {
          setPhotos(data.photos);
        }
        setHasMore(data.hasMore);
        setOffset(currentOffset + 12);
      }
    } catch (err) {
      console.error('Failed to load photos:', err);
      toast.error(t('parentPhotos.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoClick = async (photo: Photo) => {
    setSelectedPhoto(photo);
    setFullImageUrl(null);

    try {
      const res = await fetch(`/api/montree/media/url?path=${encodeURIComponent(photo.storage_path)}`);
      if (!res.ok) {
        throw new Error('Failed to fetch image URL');
      }
      const data = await res.json();
      if (data.url) {
        setFullImageUrl(data.url);
      }
    } catch (err) {
      console.error('Failed to load full image:', err);
      toast.error(t('parentPhotos.errorLoadImage'));
    }
  };

  if (loading) {
    return <PhotosSplash />;
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      color: T.textPrimary,
      fontFamily: T.sans,
    }}>
      <Toaster position="top-center" />

      {/* Header */}
      <header style={{
        background: 'linear-gradient(180deg, rgba(7,18,12,0.96), rgba(7,18,12,0.90))',
        borderBottom: T.cardBorder,
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{
          maxWidth: 880,
          margin: '0 auto',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Link
            href="/montree/parent/dashboard"
            aria-label="Montree home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',
              color: T.textPrimary,
            }}
          >
            <MontreeLogo size={26} />
            <span style={{ fontFamily: T.serif, fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>Montree</span>
          </Link>
          <div style={{ minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 18,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('parentPhotos.title')}
            </h1>
            <p style={{
              margin: '2px 0 0',
              fontFamily: T.sans,
              fontSize: 12,
              color: T.textMuted,
            }}>
              {childName ? `${childName}'s ${t('parentPhotos.photos')}` : t('parentPhotos.sharedByTeachers')}
            </p>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <LanguageToggle />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: 16 }}>
        {photos.length === 0 ? (
          <div style={{
            background: T.card,
            border: T.cardBorder,
            borderRadius: 18,
            backdropFilter: T.blur,
            WebkitBackdropFilter: T.blur,
            padding: '40px 24px',
            textAlign: 'center',
          }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: T.emeraldStrong,
              border: '1px solid rgba(52,211,153,0.40)',
              color: T.emerald,
              marginBottom: 14,
            }}>
              <Camera size={26} strokeWidth={1.75} />
            </div>
            <h2 style={{
              margin: '0 0 6px',
              fontFamily: T.serif,
              fontSize: 20,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.3,
            }}>
              {t('parentPhotos.noPhotosTitle')}
            </h2>
            <p style={{
              margin: 0,
              fontFamily: T.sans,
              fontSize: 13,
              color: T.textMuted,
              lineHeight: 1.55,
            }}>
              {t('parentPhotos.noPhotosDescription')}
            </p>
          </div>
        ) : (
          <>
            {/* Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: 10,
            }}>
              {photos.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => handlePhotoClick(photo)}
                  style={{
                    aspectRatio: '1 / 1',
                    overflow: 'hidden',
                    background: T.card,
                    border: T.cardBorder,
                    borderRadius: 14,
                    backdropFilter: T.blur,
                    WebkitBackdropFilter: T.blur,
                    padding: 0,
                    cursor: 'pointer',
                    transition: 'transform 140ms ease, border-color 140ms ease',
                    contentVisibility: 'auto',
                    containIntrinsicSize: '1px 200px',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.borderColor = 'rgba(52,211,153,0.40)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.borderColor = 'rgba(52,211,153,0.15)';
                  }}
                >
                  {photo.storage_path ? (
                    <img
                      src={getThumbnailUrl(photo.storage_path, 400)}
                      srcSet={getThumbnailSrcSet(photo.storage_path, 400)}
                      sizes="(max-width: 640px) 50vw, 400px"
                      alt={photo.caption || 'Photo'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : photo.thumbnail_url ? (
                    <img
                      src={photo.thumbnail_url}
                      alt={photo.caption || 'Photo'}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: T.textMuted,
                    }}>
                      <Camera size={28} strokeWidth={1.5} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Load more */}
            {hasMore && (
              <div style={{ marginTop: 24, textAlign: 'center' }}>
                <button
                  onClick={() => {
                    const childId = childIdParam || JSON.parse(localStorage.getItem('montree_selected_child') || '{}').id;
                    if (childId) loadPhotos(childId, true);
                  }}
                  style={{
                    padding: '10px 24px',
                    borderRadius: 12,
                    background: T.emeraldStrong,
                    border: '1px solid rgba(52,211,153,0.45)',
                    color: T.emerald,
                    fontFamily: T.sans,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 120ms ease',
                  }}
                >
                  {t('common.loadMore')}
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Lightbox */}
      <PhotoLightbox
        isOpen={!!selectedPhoto}
        onClose={() => setSelectedPhoto(null)}
        src={fullImageUrl || ''}
        alt={selectedPhoto?.caption || 'Photo'}
        photos={photos.map(p => ({
          url: p.thumbnail_url || '',
          caption: p.caption,
          date: p.captured_at,
        }))}
        currentIndex={selectedPhoto ? photos.findIndex(p => p.id === selectedPhoto.id) : 0}
        onNavigate={(idx) => {
          if (photos[idx]) handlePhotoClick(photos[idx]);
        }}
      />
    </div>
  );
}

function PhotosSplash() {
  const { t } = useI18n();
  return (
    <div style={{
      minHeight: '100dvh',
      background: T.bg,
      backgroundImage: T.glow,
      backgroundAttachment: 'fixed',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: T.sans,
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 56,
          height: 56,
          borderRadius: '50%',
          background: T.emeraldStrong,
          border: '1px solid rgba(52,211,153,0.40)',
          color: T.emerald,
          marginBottom: 12,
          animation: 'pp-pulse 1.6s ease-in-out infinite',
        }}>
          <Camera size={24} strokeWidth={1.75} />
        </div>
        <p style={{ margin: 0, color: T.textMuted, fontSize: 13 }}>
          {t('parentPhotos.loadingPhotos')}
        </p>
        <style>{`@keyframes pp-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    </div>
  );
}

export default function ParentPhotosPage() {
  return (
    <Suspense fallback={<PhotosSplash />}>
      <ParentPhotosContent />
    </Suspense>
  );
}
