'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useI18n } from '@/lib/montree/i18n';
import LanguageToggle from '@/components/montree/LanguageToggle';
import { FT, FUNNEL_CSS } from '@/components/montree/funnel/funnel-theme';
import GoldenThread from '@/components/montree/funnel/GoldenThread';
import AstraNarrator from '@/components/montree/funnel/AstraNarrator';

interface TrialResponse {
  success: boolean;
  code: string;
  token?: string;
  role: 'teacher' | 'principal';
  error?: string;
  teacher?: {
    id: string;
    name: string;
    email: string | null;
    password_set_at: string | null;
  };
  // The teacher side-door (?role=teacher / ?role=parent) signs up as a STANDARD
  // teacher account — clean school app, no parent-specific handling.
  classroom?: {
    id: string;
    name: string;
    icon: string;
    color: string;
  } | null;
  school?: {
    id: string;
    name: string;
    slug: string;
    subscription_status?: string;
    plan_type?: string;
    trial_ends_at?: string;
  };
  principal?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  onboarded?: boolean;
  userId: string;
}

// Display-only slug preview (mirrors the mock's slugit — never wired to
// anything server-side; the real slug is decided by the API).
function slugify(v: string): string {
  return (
    (v || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-') || 'your-school'
  );
}

// Ceremony lines cycled while the school is being founded.
const CERE_KEYS = ['copilot.funnel.cere.1', 'copilot.funnel.cere.2', 'copilot.funnel.cere.3'] as const;

export default function TryMontreePage() {
  const router = useRouter();
  const { t, locale } = useI18n();
  // /try is single-purpose: founding a school. The flow opens directly on the
  // details form. No role picker.
  const [step, setStep] = useState<'details' | 'creating' | 'code'>('details');
  // Role is 'principal' by default (the founding-school flow). A hidden query
  // side door (?role=teacher, or ?role=parent → teacher behaviour) reuses the
  // SAME form for a standard teacher account. No UI links to the side door.
  const [role, setRole] = useState<'teacher' | 'principal'>('principal');
  const [userName, setUserName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [code, setCode] = useState('');
  const [responseData, setResponseData] = useState<TrialResponse | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [foundingCode, setFoundingCode] = useState<string | null>(null);
  // Honeypot — a hidden field real users never fill. Bots that auto-fill every
  // input trip it; the server fakes success and writes nothing.
  const [website, setWebsite] = useState('');
  // Ceremony line index (display only).
  const [cereIdx, setCereIdx] = useState(0);

  // Read ?ref=CODE, ?founding=CODE and ?role=… from URL on mount. Using
  // window.location keeps us out of Suspense-boundary territory (useSearchParams
  // in Next 13+ requires Suspense).
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      if (ref) {
        const cleaned = ref.trim().toUpperCase();
        if (cleaned.length >= 4 && cleaned.length <= 32) {
          setReferralCode(cleaned);
        }
      }
      const founding = params.get('founding');
      if (founding) {
        const cleaned = founding.trim().toUpperCase();
        if (cleaned.length >= 4 && cleaned.length <= 32) {
          setFoundingCode(cleaned);
        }
      }
      // Hidden side door — teachers/parents normally sign in with a code at
      // /login-select; this reuses the founding form for a standard teacher
      // account. Both ?role=teacher and ?role=parent map to teacher.
      const roleParam = params.get('role');
      if (roleParam === 'teacher' || roleParam === 'parent') {
        setRole('teacher');
      }
    } catch {
      // ignore
    }
  }, []);

  // Rotate the founding-ceremony lines while creating (display only).
  useEffect(() => {
    if (step !== 'creating') {
      setCereIdx(0);
      return;
    }
    const id = window.setInterval(() => {
      setCereIdx((i) => (i + 1) % CERE_KEYS.length);
    }, 1500);
    return () => window.clearInterval(id);
  }, [step]);

  const isPrincipal = role === 'principal';

  const handleDetailsSubmit = async () => {
    if (!userName.trim()) {
      setError(t('signup.pleaseEnterName'));
      return;
    }
    if (!schoolName.trim()) {
      setError(isPrincipal ? t('signup.pleaseEnterSchool') : t('signup.pleaseEnterSchoolClassroom'));
      return;
    }

    setStep('creating');
    setError('');

    try {
      const res = await fetch('/api/montree/try/instant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role,
          name: userName.trim(),
          schoolName: schoolName.trim(),
          email: userEmail.trim(),
          locale, // Capture the user's UI locale → school.primary_locale at signup
          referral_code: referralCode, // Optional — set if user arrived via ?ref=CODE
          founding_code: foundingCode, // Optional — set if user arrived via ?founding=CODE
          website, // Honeypot — empty for real users
        })
      });

      const data: TrialResponse = await res.json();

      if (!res.ok || !data.success) {
        const debugInfo = (data as any).debug;
        const debugStr = debugInfo ? `\n\nDebug: ${JSON.stringify(debugInfo)}` : '';
        const stepsStr = (data as any).steps ? `\nSteps: ${(data as any).steps.join(' → ')}` : '';
        console.error('Trial API error:', JSON.stringify(data, null, 2));
        setError(((data as any).error || 'Something went wrong') + debugStr + stepsStr);
        setStep('details');
        return;
      }

      setCode(data.code);
      setResponseData(data);
      setStep('code');
    } catch (err) {
      setError(t('signup.failed'));
      setStep('details');
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTakeMeIn = () => {
    if (!responseData) return;

    if (responseData.role === 'teacher' && responseData.teacher) {
      localStorage.setItem(
        'montree_session',
        JSON.stringify({
          teacher: {
            id: responseData.teacher.id,
            name: responseData.teacher.name,
            role: 'teacher',
            email: responseData.teacher.email,
            password_set: !!responseData.teacher.password_set_at,
          },
          school: responseData.school,
          classroom: responseData.classroom || null,
          loginAt: new Date().toISOString(),
          onboarded: responseData.onboarded || false,
        })
      );
      router.push('/montree/dashboard');
    } else if (responseData.role === 'principal' && responseData.principal) {
      localStorage.setItem('montree_principal', JSON.stringify(responseData.principal));
      localStorage.setItem('montree_school', JSON.stringify(responseData.school));
      router.push('/montree/principal/setup');
    }
  };

  // ── Narrator / thread derivation (presentational) ──────────────────────────
  // Astra hosts the founding flow (principal); the hidden teacher side door hands
  // narration to Guru.
  const codeRole = responseData?.role ?? role;
  const narratorJourney: 'principal' | 'teacher' =
    step === 'code'
      ? codeRole === 'principal'
        ? 'principal'
        : 'teacher'
      : isPrincipal
        ? 'principal'
        : 'teacher';
  const screenKey = step; // 'details' | 'creating' | 'code'
  // /try thread positions: details=1, creating=1, code=2 (of 5). The teacher
  // side door hides the thread entirely.
  const threadStep = step === 'code' ? 2 : 1;

  return (
    <div className="fn-page">
      <style dangerouslySetInnerHTML={{ __html: FUNNEL_CSS }} />

      {/* Topbar — M artwork + wordmark + EN toggle (preserved) */}
      <div className="fn-topbar">
        <a className="fn-wordmark" href="/montree">
          <picture>
            <source srcSet="/brand/m-mark-transparent.webp" type="image/webp" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/m-mark.png" alt="Montree" width={30} height={25} />
          </picture>
          <span>{t('app.name')}</span>
        </a>
        <LanguageToggle className="bg-white/10 hover:bg-white/20 text-white border border-white/[0.08]" />
      </div>

      {/* Golden thread — hidden entirely on the teacher side door */}
      {isPrincipal && <GoldenThread step={threadStep} />}

      <div className="fn-hall">
        {/* The narrator — top-left, every screen */}
        <AstraNarrator screenKey={screenKey} journey={narratorJourney} authed={false} />

        {/* The stage */}
        <div className="fn-stage-wrap">
          <div className="fn-screen">
            {/* Founding 100 banner — every step except code. Takes precedence
                over the referral banner (amendment A6). */}
            {foundingCode && step !== 'code' && (
              <div
                style={{
                  marginBottom: 22,
                  padding: '13px 16px',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(232,201,106,0.10)',
                  border: '1px solid rgba(232,201,106,0.35)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'rgba(255,250,240,0.92)', fontSize: 14, fontWeight: 500 }}>
                    Founding 100
                  </p>
                  <p style={{ color: 'rgba(255,250,240,0.58)', fontSize: '0.8rem' }}>
                    One month of Premium free, then Premium locked at $3/student for life.
                  </p>
                </div>
              </div>
            )}

            {/* Referral banner — every step except code, and only when no
                founding code is present (founding wins). */}
            {referralCode && !foundingCode && step !== 'code' && (
              <div
                style={{
                  marginBottom: 22,
                  padding: '13px 16px',
                  borderRadius: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'rgba(232,201,106,0.08)',
                  border: '1px solid rgba(232,201,106,0.28)',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ color: 'rgba(255,250,240,0.92)', fontSize: 14 }}>
                    Referral code:{' '}
                    <code className="font-mono" style={{ color: 'rgba(232,201,106,0.95)', fontWeight: 500 }}>
                      {referralCode}
                    </code>
                  </p>
                  <p style={{ color: 'rgba(255,250,240,0.5)', fontSize: '0.78rem' }}>
                    You&apos;ll be linked to your referrer when your school is created.
                  </p>
                </div>
              </div>
            )}

            {/* ── S1 · Details (the school form — the opening screen) ── */}
            {step === 'details' && (
              <div style={{ maxWidth: 560 }}>
                <h1 className="fn-h1" style={{ marginBottom: 32 }}>
                  {isPrincipal
                    ? t('copilot.funnel.foundHeading')
                    : t('copilot.funnel.foundHeadingTeacher')}
                </h1>

                <div className="fn-field">
                  <label>{t('signup.yourName')}</label>
                  <input
                    type="text"
                    className="fn-input"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder={isPrincipal ? t('signup.namePlaceholder.principal') : t('signup.namePlaceholder.teacher')}
                    autoFocus
                  />
                </div>

                <div className="fn-field">
                  <label>{isPrincipal ? t('signup.schoolName') : t('signup.schoolClassroomName')}</label>
                  <input
                    type="text"
                    className="fn-input"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder={isPrincipal ? t('signup.schoolPlaceholder.principal') : t('signup.schoolPlaceholder.teacher')}
                    onKeyDown={(e) => e.key === 'Enter' && handleDetailsSubmit()}
                  />
                  {/* Display-only slug preview (not wired to anything). */}
                  <div className="fn-slug">
                    montree.xyz/<b>{slugify(schoolName)}</b>
                  </div>
                </div>

                <div className="fn-field">
                  <label>
                    {t('copilot.funnel.email')} <i>({t('copilot.funnel.optional')})</i>
                  </label>
                  <input
                    type="email"
                    className="fn-input"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="you@school.org"
                    onKeyDown={(e) => e.key === 'Enter' && handleDetailsSubmit()}
                  />
                </div>

                {/* Honeypot — hidden from real users, a spam trap for bots that
                    auto-fill every field. Kept out of the tab order + hidden from
                    assistive tech. If filled, the server fakes success. */}
                <input
                  type="text"
                  name="website"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }}
                />

                {error && (
                  <div className="fn-error" style={{ marginBottom: 18 }}>
                    <pre>{error}</pre>
                  </div>
                )}

                <button className="fn-pill" onClick={handleDetailsSubmit} style={{ marginTop: 6 }}>
                  {isPrincipal
                    ? t('copilot.funnel.details.cta.principal')
                    : t('copilot.funnel.details.cta.teacher')}{' '}
                  →
                </button>

                {/* Quiet sign-in line for teachers/parents who arrived with a
                    code — text-level, no border, hush colour. */}
                <div style={{ marginTop: 20 }}>
                  <Link
                    href="/montree/login-select"
                    style={{ color: FT.hush, fontSize: '0.8rem', textDecoration: 'none' }}
                  >
                    {t('copilot.funnel.haveCode')}
                  </Link>
                </div>
              </div>
            )}

            {/* ── S2 · Creating (the ceremony) ── */}
            {step === 'creating' && (
              <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div className="fn-cere-line" style={{ marginTop: 120 }}>{t(CERE_KEYS[cereIdx])}</div>

                {error && (
                  <div className="fn-error" style={{ maxWidth: 520 }}>
                    <pre>{error}</pre>
                    <button
                      onClick={() => {
                        setError('');
                        setStep('details');
                      }}
                    >
                      {t('common.tryAgain')}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* ── S3 · Code (the key) ── */}
            {step === 'code' && responseData && (
              <div className="center" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <h1 className="fn-h1">
                  {codeRole === 'principal'
                    ? t('copilot.funnel.code.heading.principal')
                    : t('copilot.funnel.code.heading.teacher')}
                </h1>

                <div className="fn-keyplate">
                  <div className="fn-eyebrow">
                    {codeRole === 'principal'
                      ? t('copilot.funnel.code.eyebrow.principal')
                      : t('copilot.funnel.code.eyebrow.teacher')}
                  </div>
                  <div className="fn-thekey">{code.toUpperCase()}</div>
                  <div className="fn-keybtns">
                    <button className="fn-pill gold" onClick={handleCopyCode}>
                      {copied ? t('signup.copied') : t('signup.copyCode')}
                    </button>
                    <button className="fn-pill" onClick={handleTakeMeIn}>
                      {codeRole === 'principal'
                        ? t('copilot.funnel.code.enter.principal')
                        : t('copilot.funnel.code.enter.teacher')}{' '}
                      →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="fn-foot">Montree · montree.xyz</div>
    </div>
  );
}
