'use client';

/**
 * /montree/parent/recap/[appointmentId] — the post-class card a parent opens
 * (and screenshots into a WeChat family group).
 *
 * ONE fetch: GET /api/montree/appointments/[id]/recap
 *   200 { recap: { appointment_id, lesson_number, words_drilled, stars_earned,
 *                  teacher_note, created_at, lessonTotal } }
 *   404 { error: 'recap_not_ready' }  → gentle "coming soon" state
 *   404 { error: 'not_found' }        → unknown class / feature off
 *
 * The child's name is NOT in the recap payload, so the parent's Online Classes
 * page passes it through as `?child=` when it links here (it already has the
 * name from the classes API). Missing name degrades gracefully.
 *
 * This is the one portal surface that wears the Midnight Studio skin — the card
 * itself is the product artefact, so the tokens file is imported here and used
 * for the card's frame only.
 */

import '@/styles/dark-phonics-live-tokens.css';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

import ParentRecapCard from '@/components/montree/dark-phonics-live/ParentRecapCard';
import {
  PT,
  cardStyle,
  formatClassDate,
  getJson,
  ghostButtonStyle,
  primaryButtonStyle,
  shanghaiCalendarDate,
  type LoadState,
} from '@/components/montree/dark-phonics-live/portal/portal-shared';

/** Verbatim from the Phase 2 contract — snake_case except the camelCase enrichment fields. */
interface RecapPayload {
  appointment_id: string;
  lesson_number: number;
  words_drilled: string[];
  stars_earned: number;
  teacher_note: string;
  created_at: string;
  lessonTotal: number;
  /** Enrichment (FIX 1): derived server-side from lesson_number via RAW. */
  sound?: string;
  /** Enrichment (FIX 1): the appointment's scheduled_start, ISO. */
  scheduledStart?: string | null;
  /** Enrichment (FIX 1): montree_children.name for the appointment's child, when resolvable. */
  childName?: string | null;
}

type RecapState = LoadState | 'notReady';

function RecapView() {
  const params = useParams<{ appointmentId: string }>();
  const search = useSearchParams();
  const appointmentId = typeof params?.appointmentId === 'string' ? params.appointmentId : '';
  const childNameParam = (search?.get('child') || '').trim();

  const [state, setState] = useState<RecapState>('loading');
  const [recap, setRecap] = useState<RecapPayload | null>(null);

  const load = useCallback(async () => {
    if (!appointmentId) {
      setState('error');
      return;
    }
    setState('loading');
    const { status, data } = await getJson<{ recap?: RecapPayload; error?: string }>(
      `/api/montree/appointments/${encodeURIComponent(appointmentId)}/recap`
    );
    if (status === 200 && data?.recap) {
      setRecap(data.recap);
      setState('ready');
      return;
    }
    if (status === 404) {
      setState(data?.error === 'recap_not_ready' ? 'notReady' : 'flagOff');
      return;
    }
    if (status === 401 || status === 403) {
      setState('unauthorized');
      return;
    }
    setState('error');
  }, [appointmentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const shell = (body: React.ReactNode) => (
    <div className="min-h-screen" style={{ background: PT.bg, fontFamily: PT.sans }}>
      <div style={{ background: PT.glow }}>
        <div style={{ maxWidth: 420, margin: '0 auto', padding: '30px 16px 80px' }}>
          <Link
            href="/montree/parent/online-classes"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              color: PT.textFaint,
              fontSize: 13.5,
              textDecoration: 'none',
              marginBottom: 20,
            }}
          >
            ← Online Classes 在线课堂
          </Link>
          {body}
        </div>
      </div>
    </div>
  );

  if (state === 'loading') {
    return shell(
      <div style={{ ...cardStyle, display: 'flex', alignItems: 'center', gap: 10, color: PT.textMuted }}>
        <Loader2 size={16} className="animate-spin" /> Loading the class recap…
      </div>
    );
  }

  if (state === 'notReady') {
    return shell(
      <div style={{ ...cardStyle, textAlign: 'center', padding: '38px 22px' }}>
        <div style={{ fontSize: 30, marginBottom: 12 }}>✨</div>
        <div style={{ fontSize: 16, fontWeight: 600, color: PT.textPrimary, marginBottom: 8 }}>
          The recap is coming soon 报告马上就好
        </div>
        <p style={{ fontSize: 13.5, color: PT.textMuted, lineHeight: 1.65, marginBottom: 20 }}>
          Teacher Tredoux writes the recap right after class. Check back in a few minutes.
        </p>
        <button onClick={() => void load()} style={ghostButtonStyle}>
          Check again
        </button>
      </div>
    );
  }

  if (state === 'unauthorized') {
    return shell(
      <div style={{ ...cardStyle, textAlign: 'center', padding: '36px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: PT.textPrimary, marginBottom: 8 }}>
          Please sign in again 请重新登录
        </div>
        <Link href="/montree/parent" style={{ ...primaryButtonStyle, marginTop: 12 }}>
          Sign in 登录
        </Link>
      </div>
    );
  }

  if (state === 'flagOff' || state === 'error' || !recap) {
    return shell(
      <div style={{ ...cardStyle, textAlign: 'center', padding: '36px 22px' }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: PT.textPrimary, marginBottom: 8 }}>
          We couldn&apos;t open this recap
        </div>
        <p style={{ fontSize: 13.5, color: PT.textMuted, lineHeight: 1.65, marginBottom: 20 }}>
          The class may have been removed, or Online Classes is switched off for your school.
        </p>
        <Link href="/montree/parent/online-classes" style={primaryButtonStyle}>
          Back to Online Classes
        </Link>
      </div>
    );
  }

  /* ------------------------------------------------------------- the card */

  const words = Array.isArray(recap.words_drilled) ? recap.words_drilled.filter(Boolean) : [];
  // FIX 1: prefer the server-enriched fields; keep the original fallbacks
  // (?child= param, created_at) for a recap payload from before the enrichment shipped.
  const displayChildName = (recap.childName || '').trim() || childNameParam || 'Your child';
  const dateSourceIso = recap.scheduledStart || recap.created_at;

  return shell(
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 12, color: PT.textFaint, letterSpacing: '0.04em' }}>
        {formatClassDate(dateSourceIso)} · Beijing time 北京时间
      </div>

      <ParentRecapCard
        childName={displayChildName}
        // The card formats its own date in the RENDER timezone; hand it a Date
        // pinned to the Beijing calendar day so it can't drift.
        date={shanghaiCalendarDate(dateSourceIso)}
        lessonNumber={recap.lesson_number}
        sound={recap.sound || ''}
        // The card lays words out as equal-width chips; 5 is the most that
        // stays legible on a phone.
        wordsRead={words.slice(0, 5)}
        teacherNote={recap.teacher_note || 'A lovely class today.'}
        starsEarned={recap.stars_earned}
        totalLessons={recap.lessonTotal}
      />

      <Link href="/montree/parent/online-classes" style={primaryButtonStyle}>
        Book the next class 预约下一节课
      </Link>
    </div>
  );
}

export default function ParentRecapPage() {
  // useSearchParams() needs a Suspense boundary for Next's prerender pass.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen" style={{ background: PT.bg }} />
      }
    >
      <RecapView />
    </Suspense>
  );
}
