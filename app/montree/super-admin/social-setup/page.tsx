// /montree/super-admin/social-setup/page.tsx
//
// "I'll come back to it later" parking lot for the Meta Developer App
// setup guide (Phase 1 Step 1 of the social analytics dashboard).
//
// Renders the step-by-step guide with per-step checkboxes that persist in
// localStorage, so Tredoux can stop in the middle, walk away, and resume
// without losing his place. When all of Step 1 is checked, the page reveals
// a "Ready for Step 2" panel with what to do next.
//
// No tokens are stored in this page. The "what you should now have written
// down" section is for the user's own private note — when we wire up Phase
// 2 we'll have him paste them into Railway env vars (server-side only).
'use client';

import { useEffect, useState, useCallback } from 'react';

const C = {
  bg: '#0a1a0f',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.80)',
  border: '1px solid rgba(52,211,153,0.18)',
  emerald: '#34d399',
  emeraldDim: 'rgba(52,211,153,0.65)',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  goldSoft: 'rgba(232,201,106,0.10)',
  goldBorder: '1px solid rgba(232,201,106,0.22)',
  red: '#f87171',
  redSoft: 'rgba(239,68,68,0.10)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSecondary: 'rgba(255,255,255,0.62)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: 'var(--font-lora), Georgia, serif',
  sans: '"Inter", -apple-system, BlinkMacSystemFont, sans-serif',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  codeBg: 'rgba(0,0,0,0.40)',
};

const PROGRESS_KEY = 'montree.superadmin.socialSetup.progress';

interface Step {
  id: string;
  title: string;
  body: React.ReactNode;
}

const PARTS: { partId: string; title: string; subtitle: string; steps: Step[] }[] =
  [
    {
      partId: 'A',
      title: 'Part A — Create the Meta Developer App',
      subtitle: '~5 minutes',
      steps: [
        {
          id: 'A1',
          title: 'Open Meta Developer apps page',
          body: (
            <p>
              Go to{' '}
              <ExtLink href="https://developers.facebook.com/apps">
                developers.facebook.com/apps
              </ExtLink>
              . Log in with the Facebook account that admins your Montree Page.
            </p>
          ),
        },
        {
          id: 'A2',
          title: 'Click the green "Create app" button (top right)',
          body: null,
        },
        {
          id: 'A3',
          title: 'Choose "Other" → Next',
          body: <p>The "Other" option is at the bottom of the list.</p>,
        },
        {
          id: 'A4',
          title: 'Choose "Business" → Next',
          body: null,
        },
        {
          id: 'A5',
          title: 'Fill in the app name + your contact email',
          body: (
            <ul style={listStyle()}>
              <li>
                <strong>App name:</strong> <Code>Montree Insights</Code>{' '}
                (cosmetic, can rename later)
              </li>
              <li>
                <strong>App contact email:</strong> your Gmail
              </li>
              <li>
                <strong>Business portfolio:</strong> leave on "I don't want to
                connect a business portfolio"
              </li>
            </ul>
          ),
        },
        {
          id: 'A6',
          title: 'Click "Create app". Re-enter password if asked.',
          body: (
            <p>
              You'll land on the App Dashboard. Look at the top of the page next
              to your app name —{' '}
              <strong style={{ color: C.gold }}>
                write down the App ID number
              </strong>
              . You'll need it later.
            </p>
          ),
        },
      ],
    },
    {
      partId: 'B',
      title: 'Part B — Add the Instagram + Facebook permissions',
      subtitle: '~3 minutes',
      steps: [
        {
          id: 'B1',
          title: 'In the App Dashboard left sidebar, click "Add product"',
          body: <p>Or scroll down to the "Add a product" grid.</p>,
        },
        {
          id: 'B2',
          title: 'Find "Instagram" → click "Set up"',
          body: (
            <p>
              You'll see two sub-options. Click <strong>Set up</strong> on the{' '}
              <strong>second one</strong>: "Instagram API with Facebook Login
              for Business". This is the one we need because @montreexyz is
              connected to your Montree Facebook Page.
            </p>
          ),
        },
        {
          id: 'B3',
          title: 'Go back to the dashboard, find "Facebook Login for Business" → "Set up"',
          body: (
            <p>
              You don't need to configure either of these yet — just adding
              them is enough.
            </p>
          ),
        },
      ],
    },
    {
      partId: 'C',
      title: 'Part C — Generate a short-lived access token',
      subtitle: '~5 minutes',
      steps: [
        {
          id: 'C1',
          title: 'Open the Graph API Explorer',
          body: (
            <p>
              In the App Dashboard left sidebar, find <strong>Tools</strong> at
              the top, then click{' '}
              <ExtLink href="https://developers.facebook.com/tools/explorer/">
                Graph API Explorer
              </ExtLink>{' '}
              (opens in a new tab).
            </p>
          ),
        },
        {
          id: 'C2',
          title: 'Confirm your Montree Insights app is selected',
          body: (
            <p>
              Top right corner — <strong>Meta App</strong> dropdown. Should say
              "Montree Insights".
            </p>
          ),
        },
        {
          id: 'C3',
          title: 'Click User or Page → "Get User Access Token"',
          body: <p>The dropdown is just below the Meta App dropdown.</p>,
        },
        {
          id: 'C4',
          title: 'Tick these 7 permissions, then click "Generate Access Token"',
          body: (
            <ul style={listStyle()}>
              <li><Code>pages_show_list</Code></li>
              <li><Code>pages_read_engagement</Code></li>
              <li><Code>pages_read_user_content</Code></li>
              <li><Code>read_insights</Code></li>
              <li><Code>instagram_basic</Code></li>
              <li><Code>instagram_manage_insights</Code></li>
              <li><Code>business_management</Code></li>
            </ul>
          ),
        },
        {
          id: 'C5',
          title: 'In the Facebook popup, tick your Montree Page → Continue → Continue → Done',
          body: null,
        },
        {
          id: 'C6',
          title: 'Copy the long token (starts with EAA…) from the top text box',
          body: (
            <p style={{ color: C.textMuted, fontSize: 13 }}>
              This is the <em>short-lived user token</em>. Only valid for ~1
              hour — we'll convert it next.
            </p>
          ),
        },
      ],
    },
    {
      partId: 'D',
      title: 'Part D — Convert it to a long-lived token (60 days)',
      subtitle: '~2 minutes',
      steps: [
        {
          id: 'D1',
          title: 'Open the Access Token Debugger',
          body: (
            <p>
              <ExtLink href="https://developers.facebook.com/tools/debug/accesstoken/">
                developers.facebook.com/tools/debug/accesstoken/
              </ExtLink>
            </p>
          ),
        },
        {
          id: 'D2',
          title: 'Paste your EAA… token, click "Debug"',
          body: null,
        },
        {
          id: 'D3',
          title: 'Click "Extend Access Token" at the bottom',
          body: <p>Re-enter your Facebook password if asked.</p>,
        },
        {
          id: 'D4',
          title: 'Copy the new (longer) token that appears',
          body: (
            <p style={{ color: C.textMuted, fontSize: 13 }}>
              This is the <em>long-lived user token</em> — 60-day expiry.
            </p>
          ),
        },
      ],
    },
    {
      partId: 'E',
      title: 'Part E — Get the Page Access Token (this one never expires)',
      subtitle: '~3 minutes',
      steps: [
        {
          id: 'E1',
          title: 'Go back to the Graph API Explorer',
          body: (
            <p>
              <ExtLink href="https://developers.facebook.com/tools/explorer/">
                developers.facebook.com/tools/explorer/
              </ExtLink>
            </p>
          ),
        },
        {
          id: 'E2',
          title: 'In the User or Page dropdown, select your Montree Page',
          body: (
            <p>
              The token in the box will switch from a User token to a Page
              token.
            </p>
          ),
        },
        {
          id: 'E3',
          title: 'Click the "i" info icon next to the token → "Open in Access Token Tool"',
          body: null,
        },
        {
          id: 'E4',
          title: 'Click "Extend Access Token" at the bottom',
          body: <p>Password if asked.</p>,
        },
        {
          id: 'E5',
          title: 'Copy this token — it should say "Expires: Never"',
          body: (
            <p
              style={{
                color: C.gold,
                fontSize: 13,
                fontWeight: 500,
              }}
            >
              This is the long-lived Page Access Token. This is the one our
              code will actually use.
            </p>
          ),
        },
      ],
    },
    {
      partId: 'F',
      title: 'Part F — Find your Page ID and Instagram Business Account ID',
      subtitle: '~2 minutes',
      steps: [
        {
          id: 'F1',
          title: 'Back in Graph API Explorer, make sure the Page token is selected',
          body: <p>From Part E. The "User or Page" dropdown should still show your Montree Page.</p>,
        },
        {
          id: 'F2',
          title: 'In the request bar (next to GET / POST / DELETE) type this exactly',
          body: (
            <Pre>{`me?fields=id,name,instagram_business_account`}</Pre>
          ),
        },
        {
          id: 'F3',
          title: 'Click Submit',
          body: (
            <>
              <p>The response will look like:</p>
              <Pre>{`{
  "id": "123456789012345",
  "name": "Montree",
  "instagram_business_account": {
    "id": "987654321098765"
  }
}`}</Pre>
            </>
          ),
        },
        {
          id: 'F4',
          title: 'Write down both IDs',
          body: (
            <ul style={listStyle()}>
              <li>
                The top-level <Code>id</Code> → your{' '}
                <strong>Facebook Page ID</strong>
              </li>
              <li>
                <Code>instagram_business_account.id</Code> → your{' '}
                <strong>Instagram Business Account ID</strong>
              </li>
            </ul>
          ),
        },
      ],
    },
  ];

const ALL_STEP_IDS = PARTS.flatMap((p) => p.steps.map((s) => s.id));

export default function SocialSetupPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const [done, setDone] = useState<Record<string, boolean>>({});

  // Auth bootstrap
  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? sessionStorage.getItem('sa_pwd') : '';
    if (saved) {
      setPassword(saved);
      setAuthenticated(true);
    }
  }, []);

  // Progress bootstrap from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(PROGRESS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          setDone(parsed as Record<string, boolean>);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Persist progress on every change
  const setStepDone = useCallback((stepId: string, value: boolean) => {
    setDone((prev) => {
      const next = { ...prev, [stepId]: value };
      try {
        localStorage.setItem(PROGRESS_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const resetProgress = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!window.confirm('Wipe all checkbox progress and start over?')) return;
    setDone({});
    try {
      localStorage.removeItem(PROGRESS_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleLogin = async () => {
    setLoginError('');
    try {
      const res = await fetch('/api/montree/super-admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem('sa_pwd', password);
        setAuthenticated(true);
      } else {
        setLoginError('Wrong password.');
      }
    } catch {
      setLoginError('Network error.');
    }
  };

  if (!authenticated) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: C.bg,
          color: C.textPrimary,
          fontFamily: C.sans,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <div
          style={{
            background: C.cardBgStrong,
            border: C.border,
            borderRadius: 18,
            padding: 28,
            maxWidth: 420,
            width: '100%',
          }}
        >
          <h1
            style={{
              fontFamily: C.serif,
              fontSize: 22,
              margin: 0,
              marginBottom: 16,
            }}
          >
            Super-admin sign in
          </h1>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Super-admin password"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleLogin();
            }}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: C.inputBg,
              border: C.inputBorder,
              borderRadius: 10,
              color: C.textPrimary,
              fontFamily: C.sans,
              fontSize: 14,
              outline: 'none',
              marginBottom: 12,
            }}
          />
          {loginError && (
            <div
              style={{
                padding: '8px 12px',
                background: C.redSoft,
                border: '1px solid rgba(239,68,68,0.25)',
                borderRadius: 8,
                color: C.red,
                fontSize: 13,
                marginBottom: 12,
              }}
            >
              {loginError}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogin}
            style={{
              width: '100%',
              padding: '11px 22px',
              background: C.emerald,
              color: '#0a1a0f',
              border: 'none',
              borderRadius: 999,
              fontFamily: C.sans,
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Sign in
          </button>
        </div>
      </div>
    );
  }

  const completedCount = ALL_STEP_IDS.filter((id) => done[id]).length;
  const totalSteps = ALL_STEP_IDS.length;
  const allDone = completedCount === totalSteps;

  return (
    <div
      style={{
        minHeight: '100vh',
        background: C.bg,
        color: C.textPrimary,
        fontFamily: C.sans,
        padding: '32px 24px 80px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 22 }}>
          <h1
            style={{
              fontFamily: C.serif,
              fontSize: 'clamp(26px, 3.4vw, 36px)',
              fontWeight: 500,
              letterSpacing: -0.5,
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            Social analytics setup
          </h1>
          <p
            style={{
              color: C.textSecondary,
              fontSize: 14,
              marginTop: 8,
              lineHeight: 1.55,
            }}
          >
            Phase 1 · Step 1 — Meta Developer App and access tokens. About 20
            minutes total. Tick steps as you go — your progress is saved
            locally so you can stop anytime and come back.
          </p>
        </div>

        {/* Progress bar */}
        <div
          style={{
            background: C.cardBg,
            border: C.border,
            borderRadius: 12,
            padding: '12px 16px',
            marginBottom: 18,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <div
            style={{
              flex: 1,
              height: 8,
              background: 'rgba(0,0,0,0.30)',
              borderRadius: 999,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${(completedCount / totalSteps) * 100}%`,
                height: '100%',
                background: C.emerald,
                transition: 'width 200ms ease',
              }}
            />
          </div>
          <div
            style={{
              fontSize: 12,
              color: C.textSecondary,
              whiteSpace: 'nowrap',
            }}
          >
            {completedCount} / {totalSteps} steps
          </div>
          <button
            type="button"
            onClick={resetProgress}
            style={{
              background: 'transparent',
              border: 'none',
              color: C.textMuted,
              fontSize: 11,
              cursor: 'pointer',
              padding: 4,
            }}
          >
            Reset
          </button>
        </div>

        {/* Pre-flight check */}
        <div
          style={{
            background: C.goldSoft,
            border: C.goldBorder,
            borderRadius: 14,
            padding: '14px 16px',
            marginBottom: 22,
            fontSize: 13,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.78)',
          }}
        >
          <strong style={{ color: C.gold }}>Before you start:</strong> Your{' '}
          <strong>@montreexyz Instagram</strong> must be a Business or Creator
          account (not Personal). If it isn't yet, switch it inside the
          Instagram app: Settings → Account → Switch to Professional Account →
          Business → connect to your Montree Facebook Page. Do this first if
          needed — the rest depends on it.
        </div>

        {/* Parts */}
        {PARTS.map((part) => (
          <PartBlock
            key={part.partId}
            part={part}
            done={done}
            onToggle={(id) => setStepDone(id, !done[id])}
          />
        ))}

        {/* Final note + checklist of what to write down */}
        <div
          style={{
            background: C.cardBgStrong,
            border: C.border,
            borderRadius: 14,
            padding: '18px 20px',
            marginTop: 18,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.emeraldDim,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              marginBottom: 10,
            }}
          >
            What you should now have written down
          </div>
          <p
            style={{
              fontSize: 13.5,
              color: C.textSecondary,
              lineHeight: 1.55,
              marginTop: 0,
            }}
          >
            Save these somewhere private (Notes app or a password manager — NOT
            in a shared file or here in your browser):
          </p>
          <Pre>{`META APP ID                : (the number from Part A step 6)
FACEBOOK PAGE ID           : (from Part F)
INSTAGRAM BUSINESS ID      : (from Part F)
LONG-LIVED PAGE TOKEN      : EAA... (Part E — "Expires: Never")`}</Pre>
        </div>

        {/* What's next */}
        <div
          style={{
            background: allDone ? C.emeraldSoft : C.cardBg,
            border: allDone
              ? '1px solid rgba(52,211,153,0.32)'
              : C.border,
            borderRadius: 14,
            padding: '18px 20px',
            marginTop: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: allDone ? C.emerald : C.emeraldDim,
              textTransform: 'uppercase',
              letterSpacing: 1.4,
              marginBottom: 10,
            }}
          >
            {allDone ? 'Ready for Step 2 ✓' : 'When you finish'}
          </div>
          <p
            style={{
              fontSize: 14,
              color: C.textPrimary,
              lineHeight: 1.6,
              margin: 0,
            }}
          >
            {allDone ? (
              <>
                All four credentials in hand? Ping the agent with{' '}
                <strong>"Ready for Step 2 of social setup"</strong> and I'll
                walk you through the Supabase tables (paste-able SQL) and the
                Railway env vars to add. From there it's writing the cron job
                and the dashboard UI.
              </>
            ) : (
              <>
                Once all six parts are checked off and you have the four items
                written down, ping the agent with{' '}
                <strong>"Ready for Step 2 of social setup"</strong> and I'll
                walk you through the Supabase tables and the Railway env vars
                to add. After that we'll build the cron + dashboard.
              </>
            )}
          </p>
        </div>

        {/* Stuck? */}
        <div
          style={{
            marginTop: 22,
            textAlign: 'center',
            color: C.textMuted,
            fontSize: 12,
            lineHeight: 1.55,
          }}
        >
          Stuck on a step? Just ping the agent with{' '}
          <em>"Stuck on Part X step Y, [what you're seeing]"</em> — Meta's UI
          changes constantly so describing what you see is more useful than
          checking screenshots.
        </div>
      </div>
    </div>
  );
}

// ── Subcomponents ────────────────────────────────────────────────────────

function PartBlock({
  part,
  done,
  onToggle,
}: {
  part: { partId: string; title: string; subtitle: string; steps: Step[] };
  done: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const partDone =
    part.steps.length > 0 && part.steps.every((s) => done[s.id]);
  return (
    <div
      style={{
        background: C.cardBg,
        backdropFilter: 'blur(18px)',
        border: partDone
          ? '1px solid rgba(52,211,153,0.32)'
          : C.border,
        borderRadius: 16,
        padding: '18px 20px',
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'space-between',
          marginBottom: 10,
        }}
      >
        <h2
          style={{
            fontFamily: C.serif,
            fontSize: 18,
            margin: 0,
            color: partDone ? C.emerald : C.textPrimary,
          }}
        >
          {part.title}
        </h2>
        <span style={{ fontSize: 11, color: C.textMuted }}>
          {part.subtitle}
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {part.steps.map((step) => (
          <StepRow
            key={step.id}
            step={step}
            done={!!done[step.id]}
            onToggle={() => onToggle(step.id)}
          />
        ))}
      </div>
    </div>
  );
}

function StepRow({
  step,
  done,
  onToggle,
}: {
  step: Step;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 12px',
        background: done ? 'rgba(52,211,153,0.06)' : 'rgba(0,0,0,0.20)',
        border: done
          ? '1px solid rgba(52,211,153,0.24)'
          : '1px solid rgba(255,255,255,0.06)',
        borderRadius: 10,
        transition: 'background 120ms ease, border-color 120ms ease',
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-label={done ? `Uncheck step ${step.id}` : `Mark step ${step.id} done`}
        style={{
          flexShrink: 0,
          width: 22,
          height: 22,
          marginTop: 1,
          borderRadius: 6,
          border: done
            ? `1.5px solid ${C.emerald}`
            : '1.5px solid rgba(255,255,255,0.25)',
          background: done ? C.emerald : 'transparent',
          color: '#0a1a0f',
          fontWeight: 700,
          fontSize: 14,
          cursor: 'pointer',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {done ? '✓' : ''}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: done ? C.textMuted : C.textPrimary,
            textDecoration: done ? 'line-through' : 'none',
            lineHeight: 1.5,
          }}
        >
          <span
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: C.emeraldDim,
              marginRight: 8,
            }}
          >
            {step.id}
          </span>
          {step.title}
        </div>
        {step.body && (
          <div
            style={{
              fontSize: 13.5,
              color: C.textSecondary,
              marginTop: 6,
              lineHeight: 1.6,
            }}
          >
            {step.body}
          </div>
        )}
      </div>
    </div>
  );
}

function ExtLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: C.emerald,
        textDecoration: 'underline',
        textUnderlineOffset: 2,
      }}
    >
      {children}
    </a>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code
      style={{
        fontFamily:
          '"SF Mono", Menlo, Monaco, "Roboto Mono", monospace',
        fontSize: 12.5,
        background: C.codeBg,
        color: C.gold,
        padding: '1px 6px',
        borderRadius: 4,
        border: '1px solid rgba(232,201,106,0.18)',
      }}
    >
      {children}
    </code>
  );
}

function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre
      style={{
        fontFamily:
          '"SF Mono", Menlo, Monaco, "Roboto Mono", monospace',
        fontSize: 12.5,
        background: C.codeBg,
        color: C.textPrimary,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.06)',
        overflowX: 'auto',
        whiteSpace: 'pre',
        marginTop: 8,
        marginBottom: 0,
      }}
    >
      {children}
    </pre>
  );
}

function listStyle(): React.CSSProperties {
  return {
    margin: '8px 0 0 0',
    paddingLeft: 20,
    lineHeight: 1.7,
  };
}
