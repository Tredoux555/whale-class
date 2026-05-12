// components/montree/onboarding/OnboardingPathChoice.tsx
//
// Two-path onboarding choice surfaced when a teacher first lands on the
// dashboard with un-onboarded children. Replaces the previous forced
// auto-redirect to voice onboarding.
//
// Path A — "Tell me about my class": routes into the voice-onboarding flow.
//   90 seconds per child. Builds mental profiles and seeds focus shelves.
//   First parent reports will read like the teacher wrote them.
//
// Path B — "Just start with photos": dismisses this choice, sets a per-
//   classroom localStorage flag so the choice doesn't reappear, and lets
//   the teacher onboard children organically through the photo-capture
//   pipeline. First parent reports focus on what was observed that week.
//
// Architectural note: the voice onboarding orchestrator and shelf editor
// stay exactly as built — nothing is torn out. This component is purely
// the entry-point gate.

'use client';

import { useRouter } from 'next/navigation';
import { useI18n } from '@/lib/montree/i18n';

interface Props {
  classroomId: string | undefined;
  onSkipPhoto: () => void;
}

export default function OnboardingPathChoice({ classroomId, onSkipPhoto }: Props) {
  const router = useRouter();
  const { t } = useI18n();

  const handleVoice = () => {
    router.push('/montree/dashboard/voice-onboarding');
  };

  const handlePhoto = () => {
    // Persist skip choice per-classroom so it doesn't nag on refresh.
    // Teachers can still hit /voice-onboarding manually later, and the
    // per-child TellGuruCard surfaces on each child page so they can
    // voice-profile individuals on their own schedule.
    if (classroomId && typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(`montree.onboardingChoice.${classroomId}`, 'photo');
      } catch {
        // localStorage can throw in private browsing — non-fatal.
      }
    }
    onSkipPhoto();
  };

  return (
    <div style={pageStyle}>
      {/* Off-centre radial glow — matches dashboard aesthetic */}
      <div aria-hidden="true" style={{
        position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 1100px 900px at 88% 8%, rgba(39,129,90,0.48), rgba(39,129,90,0.18) 30%, transparent 60%)',
      }} />

      <div style={{
        position: 'relative',
        zIndex: 1,
        maxWidth: 720,
        width: '100%',
        padding: '0 28px',
        textAlign: 'center',
      }}>
        <h1 style={titleStyle}>{t('dashboard.onboardingChoice.title')}</h1>
        <p style={subtitleStyle}>{t('dashboard.onboardingChoice.subtitle')}</p>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          marginTop: 36,
          textAlign: 'left',
        }}>
          {/* Path A — Tell me about my class (voice) */}
          <button onClick={handleVoice} style={cardStyle('emerald')} aria-label={t('dashboard.onboardingChoice.voiceTitle')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={iconCircleStyle('rgba(52,211,153,0.18)', 'rgba(52,211,153,0.40)')}>
                <MicIcon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={cardTitleStyle}>{t('dashboard.onboardingChoice.voiceTitle')}</h2>
                <p style={cardBodyStyle}>{t('dashboard.onboardingChoice.voiceBody')}</p>
              </div>
              <span style={chevronStyle}>→</span>
            </div>
          </button>

          {/* Path B — Just start with photos */}
          <button onClick={handlePhoto} style={cardStyle('gold')} aria-label={t('dashboard.onboardingChoice.photoTitle')}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
              <div style={iconCircleStyle('rgba(232,201,106,0.18)', 'rgba(232,201,106,0.40)')}>
                <CameraIcon />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={cardTitleStyle}>{t('dashboard.onboardingChoice.photoTitle')}</h2>
                <p style={cardBodyStyle}>{t('dashboard.onboardingChoice.photoBody')}</p>
              </div>
              <span style={chevronStyle}>→</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Icons ───
function MicIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="rgba(52,211,153,0.95)" stroke="none" aria-hidden="true">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="rgba(52,211,153,0.95)" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="19" x2="12" y2="23" stroke="rgba(52,211,153,0.95)" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="23" x2="16" y2="23" stroke="rgba(52,211,153,0.95)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(232,201,106,0.95)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

// ─── Inline styles ───
const pageStyle: React.CSSProperties = {
  minHeight: '100dvh',
  background: '#0a1a0f',
  color: '#fff',
  position: 'relative',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
};

const titleStyle: React.CSSProperties = {
  fontFamily: "var(--font-lora), Georgia, serif",
  fontSize: 36,
  fontWeight: 500,
  lineHeight: 1.2,
  margin: 0,
  color: '#fff',
};

const subtitleStyle: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontSize: 16,
  marginTop: 14,
  color: 'rgba(255,255,255,0.55)',
  fontWeight: 400,
};

function cardStyle(accent: 'emerald' | 'gold'): React.CSSProperties {
  const tint = accent === 'emerald' ? 'rgba(52,211,153,0.06)' : 'rgba(232,201,106,0.05)';
  const border = accent === 'emerald' ? 'rgba(52,211,153,0.30)' : 'rgba(232,201,106,0.28)';
  return {
    width: '100%',
    padding: '22px 24px',
    borderRadius: 18,
    background: tint,
    border: `1px solid ${border}`,
    cursor: 'pointer',
    textAlign: 'left',
    fontFamily: "'Inter', -apple-system, sans-serif",
    transition: 'transform 0.15s ease, background 0.15s ease, border-color 0.15s ease',
    color: 'inherit',
  };
}

function iconCircleStyle(bg: string, border: string): React.CSSProperties {
  return {
    width: 44,
    height: 44,
    borderRadius: '50%',
    flexShrink: 0,
    background: bg,
    border: `1px solid ${border}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
}

const cardTitleStyle: React.CSSProperties = {
  fontFamily: "var(--font-lora), Georgia, serif",
  fontSize: 20,
  fontWeight: 500,
  margin: 0,
  color: '#fff',
  lineHeight: 1.3,
};

const cardBodyStyle: React.CSSProperties = {
  fontFamily: "'Inter', -apple-system, sans-serif",
  fontSize: 14,
  lineHeight: 1.55,
  color: 'rgba(255,255,255,0.72)',
  margin: '6px 0 0 0',
  fontWeight: 400,
};

const chevronStyle: React.CSSProperties = {
  fontSize: 22,
  color: 'rgba(255,255,255,0.35)',
  flexShrink: 0,
  alignSelf: 'center',
  fontFamily: "'Inter', -apple-system, sans-serif",
  paddingLeft: 8,
};
