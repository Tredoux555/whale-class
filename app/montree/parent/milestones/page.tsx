// /montree/parent/milestones/page.tsx
//
// 🚨 DEPRECATED as of Session 98 (May 9, 2026).
//
// Decision: parents do NOT need a perpetual milestones data view. Milestones
// are a teacher → parent narrative moment that belongs in the Weekly Wrap
// report and term reports — not a stand-alone surface. A scrolling list of
// milestones invites unhealthy comparison ("why isn't my kid further?") and
// misses the point that Montessori is about the child's own path, not a
// checklist.
//
// Hide-don't-delete posture: the route file remains so direct URL bookmarks
// don't 404, but the parent dashboard never links here. Future agents must
// NOT extend this page or surface it in any nav. If you need to communicate
// a milestone to a parent, use the Weekly Wrap report or (when the
// `parent_messaging` flag flips on, Session 98) start a parent_teacher thread.

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { AREA_CONFIG } from '@/lib/montree/types';
import AreaBadge, { normalizeArea } from '@/components/montree/shared/AreaBadge';
import { ArrowLeft, Star, Calendar, Sprout, Check } from 'lucide-react';
import { useI18n, getIntlLocale } from '@/lib/montree/i18n';

const T = {
  bg: '#0a1a0f',
  glow: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), transparent 60%)',
  card: 'rgba(255,255,255,0.06)',
  cardBorder: '1px solid rgba(52,211,153,0.15)',
  blur: 'blur(18px) saturate(140%)',
  emerald: '#34d399',
  emeraldStrong: 'rgba(52,211,153,0.18)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  amber: '#f59e0b',
  amberStrong: 'rgba(245,158,11,0.18)',
  amberBorder: 'rgba(245,158,11,0.35)',
  textPrimary: 'rgba(255,255,255,0.95)',
  textSecondary: 'rgba(255,255,255,0.65)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
};

const AREA_DOT_RGB: Record<string, string> = {
  practical_life: '236, 72, 153',
  sensorial: '20, 184, 166',
  mathematics: '168, 85, 247',
  language: '74, 222, 128',
  cultural: '249, 115, 22',
};

interface Milestone {
  id: string;
  type: string;
  title: string;
  area: string;
  area_label: string;
  date: string;
  icon: string;
}

interface TimelineGroup {
  month: string;
  label: string;
  items: Milestone[];
}

function ParentMilestonesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t, locale } = useI18n();
  const childIdParam = searchParams.get('child');

  const [loading, setLoading] = useState(true);
  const [timeline, setTimeline] = useState<TimelineGroup[]>([]);
  const [totalMilestones, setTotalMilestones] = useState(0);
  const [childName, setChildName] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('montree_parent_session');
    if (!sessionStr) {
      router.push('/montree/parent/login');
      return;
    }

    if (childIdParam) {
      loadMilestones(childIdParam);
    } else {
      const selectedChildStr = localStorage.getItem('montree_selected_child');
      if (selectedChildStr) {
        const child = JSON.parse(selectedChildStr);
        setChildName(child.name);
        loadMilestones(child.id);
      } else {
        toast.error(t('common.noChildSelected'));
        router.push('/montree/parent/dashboard');
      }
    }
  }, [router, childIdParam]);

  const loadMilestones = async (childId: string) => {
    try {
      const res = await fetch(`/api/montree/parent/milestones?child_id=${childId}`);
      if (!res.ok) {
        toast.error(t('parentMilestones.errorLoad'));
        return;
      }
      const data = await res.json();

      if (data.success) {
        setTimeline(data.timeline || []);
        setTotalMilestones(data.total_milestones || 0);
      }
    } catch (err) {
      console.error('Failed to load milestones:', err);
      toast.error(t('parentMilestones.errorLoad'));
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(getIntlLocale(locale), {
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
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
            background: T.amberStrong,
            border: `1px solid ${T.amberBorder}`,
            color: T.amber,
            marginBottom: 12,
            animation: 'pm-pulse 1.6s ease-in-out infinite',
          }}>
            <Star size={24} strokeWidth={1.75} />
          </div>
          <p style={{ margin: 0, color: T.textMuted, fontSize: 13, fontFamily: T.sans }}>
            {t('parentMilestones.loading')}
          </p>
          <style>{`@keyframes pm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
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
          <button
            onClick={() => router.push('/montree/parent/dashboard')}
            aria-label="Back"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              color: T.textPrimary,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={16} strokeWidth={1.75} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{
              margin: 0,
              fontFamily: T.serif,
              fontSize: 18,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.2,
            }}>
              {t('parentMilestones.title')}
            </h1>
            <p style={{
              margin: '2px 0 0',
              fontFamily: T.sans,
              fontSize: 12,
              color: T.textMuted,
            }}>
              {childName ? `${childName}'s ${t('parentMilestones.achievements')}` : t('parentMilestones.journeySubtitle')}
            </p>
          </div>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            padding: '5px 12px',
            borderRadius: 999,
            background: T.amberStrong,
            border: `1px solid ${T.amberBorder}`,
            color: T.amber,
            fontFamily: T.sans,
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 0.3,
          }}>
            <Star size={11} strokeWidth={1.75} />
            {totalMilestones}
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: '0 auto', padding: 16 }}>
        {timeline.length === 0 ? (
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
              <Sprout size={26} strokeWidth={1.75} />
            </div>
            <h2 style={{
              margin: '0 0 6px',
              fontFamily: T.serif,
              fontSize: 20,
              fontWeight: 500,
              color: T.textPrimary,
              letterSpacing: -0.3,
            }}>
              {t('parentMilestones.growingTitle')}
            </h2>
            <p style={{
              margin: 0,
              fontFamily: T.sans,
              fontSize: 13,
              color: T.textMuted,
              lineHeight: 1.55,
            }}>
              {t('parentMilestones.noMilestonesYet').replace('{childName}', childName || t('common.yourChild'))}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {timeline.map(group => (
              <div
                key={group.month}
                style={{
                  background: T.card,
                  border: T.cardBorder,
                  borderRadius: 18,
                  backdropFilter: T.blur,
                  WebkitBackdropFilter: T.blur,
                  padding: 18,
                }}
              >
                <h2 style={{
                  margin: '0 0 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 9,
                  fontFamily: T.serif,
                  fontSize: 17,
                  fontWeight: 500,
                  color: T.textPrimary,
                  letterSpacing: -0.2,
                }}>
                  <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: 30,
                    height: 30,
                    borderRadius: '50%',
                    background: T.emeraldStrong,
                    border: '1px solid rgba(52,211,153,0.30)',
                    color: T.emerald,
                  }}>
                    <Calendar size={14} strokeWidth={1.75} />
                  </span>
                  {group.label}
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {group.items.map(milestone => {
                    const rgb = AREA_DOT_RGB[normalizeArea(milestone.area)] || '255,255,255';
                    return (
                      <div
                        key={milestone.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          padding: 12,
                          borderRadius: 14,
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.08)',
                        }}
                      >
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: T.amberStrong,
                          border: `1px solid ${T.amberBorder}`,
                          color: T.amber,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}>
                          <Star size={16} strokeWidth={1.75} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{
                            margin: 0,
                            fontFamily: T.sans,
                            fontSize: 14,
                            fontWeight: 500,
                            color: T.textPrimary,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}>
                            {milestone.title}
                          </p>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            marginTop: 4,
                          }}>
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 5,
                              padding: '2px 9px',
                              borderRadius: 999,
                              background: `rgba(${rgb}, 0.15)`,
                              border: `1px solid rgba(${rgb}, 0.35)`,
                              color: `rgb(${rgb})`,
                              fontFamily: T.sans,
                              fontSize: 11,
                              fontWeight: 600,
                              letterSpacing: 0.2,
                            }}>
                              <AreaBadge area={milestone.area} size="xs" />
                              {milestone.area_label}
                            </span>
                            <span style={{
                              fontFamily: T.sans,
                              fontSize: 11,
                              color: T.textMuted,
                            }}>
                              {formatDate(milestone.date)}
                            </span>
                          </div>
                        </div>

                        <Check size={16} strokeWidth={2.5} color={T.emerald} style={{ flexShrink: 0 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function MilestonesLoadingFallback() {
  const { t } = useI18n();
  return (
    <div style={{
      minHeight: '100vh',
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
          background: T.amberStrong,
          border: `1px solid ${T.amberBorder}`,
          color: T.amber,
          marginBottom: 12,
          animation: 'pm-pulse 1.6s ease-in-out infinite',
        }}>
          <Star size={24} strokeWidth={1.75} />
        </div>
        <p style={{ margin: 0, color: T.textMuted, fontSize: 13 }}>
          {t('parentMilestones.loading')}
        </p>
        <style>{`@keyframes pm-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.55; } }`}</style>
      </div>
    </div>
  );
}

export default function ParentMilestonesPage() {
  return (
    <Suspense fallback={<MilestonesLoadingFallback />}>
      <ParentMilestonesContent />
    </Suspense>
  );
}
