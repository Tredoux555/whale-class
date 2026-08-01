// components/montree/satpin/TeachersRoom.tsx
// The Teachers' Room — a public discussion board + shared-materials drop box,
// mounted at the foot of /montree/library/satpin.
//
// READING is anonymous: anyone who lands on the library page sees the messages
// and can download what other teachers have shared. WRITING needs an account
// with a confirmed email — that gate is the whole spam story, alongside the
// per-IP rate limits on every route.
//
// Hardcoded English, like the rest of this page — the SATPIN surface
// deliberately bypasses i18n, so nothing here adds translation keys.
//
// 🚨 No <style jsx> anywhere in this file (Turbopack rejects nested styled-jsx
// and every block here would be nested). Tailwind classes + inline styles only,
// matching the page's dark-forest register:
//   surface  rgba(255,255,255,0.03)      hairline rgba(255,255,255,0.06–0.08)
//   accent   52,211,153 (emerald)        labels   10px uppercase tracking-wider
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

const API = '/api/montree/community';

const ACCENT = '52,211,153';
const POSTS_PAGE = 20;
const MATERIALS_PAGE = 12;
const MAX_BODY = 2000;
const MAX_UPLOAD_MB = 25;

// ============================================
// TYPES
// ============================================

interface Me {
  displayName: string;
  email: string;
  confirmed: boolean;
}

interface Post {
  id: string;
  body: string;
  displayName: string;
  createdAt: string;
  mine: boolean;
}

interface Material {
  id: string;
  title: string;
  description: string | null;
  filename: string;
  fileSize: number | null;
  mimeType: string | null;
  downloadCount: number;
  displayName: string;
  createdAt: string;
  mine: boolean;
}

type AuthView = 'signIn' | 'join' | 'joined' | 'forgot' | 'forgotSent' | 'reset';

/**
 * Whether the sign-in view offers self-serve password reset. Off while the
 * app has no verified outbound email sender (Tredoux's 2026-08-01 ruling:
 * open signup, no Resend) — a reset link that never arrives is worse than no
 * link. Flip to true together with COMMUNITY_REQUIRE_EMAIL_CONFIRMATION=1.
 */
const SHOW_FORGOT_PASSWORD = false;

// ============================================
// FETCH
// ============================================

/** Carries the server's `code` so callers can branch without string-matching. */
class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

/**
 * 🚨 House rule: check res.ok BEFORE res.json() — a server that returns an
 * HTML error page would otherwise throw an opaque parse error and lose the
 * real status. Everything non-ok becomes an ApiError with a usable code.
 */
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}${path}`, { credentials: 'same-origin', ...init });
  } catch {
    throw new ApiError('Network problem — please try again.', 'network');
  }

  // Parse once, tolerantly: a 204 or an empty body is a legitimate success.
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const body = data as { error?: string; code?: string };
    throw new ApiError(
      body.error || 'Something went wrong. Please try again.',
      body.code || `http_${res.status}`
    );
  }
  return data as T;
}

// ============================================
// SMALL HELPERS
// ============================================

function relTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const seconds = Math.max(0, Math.floor((Date.now() - then) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function fmtSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Four-letter glyph off the extension — no icon set, no extra weight. */
function fileKind(filename: string): { label: string; tint: string } {
  const ext = (filename.match(/\.([a-z0-9]+)$/i)?.[1] || '').toLowerCase();
  if (ext === 'pdf') return { label: 'PDF', tint: '248,113,113' };
  if (ext === 'zip') return { label: 'ZIP', tint: '251,191,36' };
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) {
    return { label: 'IMG', tint: '125,211,252' };
  }
  if (['docx', 'doc', 'pptx', 'ppt'].includes(ext)) return { label: 'DOC', tint: '167,139,250' };
  return { label: 'FILE', tint: '255,255,255' };
}

// ============================================
// SHARED PRESENTATION BITS
// ============================================
// Defined at module level, NOT inside TeachersRoom: a component declared
// inside a render is a new type on every render, so React unmounts and
// remounts it — which would blow away focus in the modal's text inputs on
// every keystroke.

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-white/25 text-[10px] tracking-wider uppercase mb-2 text-left">
      {children}
    </div>
  );
}

function InlineError({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <div className="text-red-300/70 text-[11px] mt-2 text-left">{children}</div>;
}

function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  autoFocus,
  disabled,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
}) {
  return (
    <label className="block text-left mb-3">
      <span className="text-white/30 text-[10px] tracking-wider uppercase">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        className="mt-1.5 w-full px-3 py-2.5 rounded-lg border text-sm text-white/85 outline-none transition-colors focus:border-emerald-400/40 disabled:opacity-40"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.08)',
        }}
      />
    </label>
  );
}

function PrimaryButton({
  children,
  onClick,
  disabled,
  type = 'button',
  full,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit';
  full?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${full ? 'w-full ' : ''}px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:bg-white/[0.06] disabled:opacity-30 disabled:cursor-not-allowed`}
      style={{
        borderColor: `rgba(${ACCENT},0.35)`,
        background: `rgba(${ACCENT},0.10)`,
        color: `rgb(110,231,183)`,
      }}
    >
      {children}
    </button>
  );
}

function TextLink({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-white/40 text-xs underline underline-offset-2 transition-colors hover:text-white/70"
    >
      {children}
    </button>
  );
}

// ============================================
// AUTH MODAL
// ============================================

function AuthModal({
  view,
  setView,
  resetToken,
  onClose,
  onSignedIn,
  onMigrationPending,
}: {
  view: AuthView;
  setView: (v: AuthView) => void;
  resetToken: string;
  onClose: () => void;
  onSignedIn: (user: Me) => void;
  onMigrationPending: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [displayName, setDisplayName] = useState('');
  // Honeypot. A person never sees this; a bot fills every field it finds.
  const [website, setWebsite] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const handle = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.code === 'migration_pending') {
        onMigrationPending();
        onClose();
        return;
      }
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    },
    [onClose, onMigrationPending]
  );

  const go = useCallback((next: AuthView) => {
    setError('');
    setNote('');
    setView(next);
  }, [setView]);

  const submitJoin = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      const data = await api<{ user?: Me }>('/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, displayName, website }),
      });
      // Open mode (server default): the account is live and the cookie is
      // already set — straight in, no inbox detour. Strict mode returns no
      // user and we fall through to the check-your-inbox view.
      if (data.user) {
        onSignedIn(data.user);
        return;
      }
      setView('joined');
    } catch (err) {
      // Friendly, not fatal: the address is already registered — put them on
      // the sign-in view with the email kept, one field from done.
      if (err instanceof ApiError && err.code === 'account_exists') {
        setView('signIn');
        setError('');
        setNote('account_exists');
        return;
      }
      handle(err);
    } finally {
      setBusy(false);
    }
  }, [email, password, displayName, website, handle, setView, onSignedIn]);

  const submitSignIn = useCallback(async () => {
    setError('');
    setNote('');
    setBusy(true);
    try {
      const data = await api<{ user: Me }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      onSignedIn(data.user);
    } catch (err) {
      // An unconfirmed account isn't a failure so much as an unfinished
      // signup — offer the resend right where they are.
      if (err instanceof ApiError && err.code === 'unconfirmed') {
        setError(err.message);
        setNote('unconfirmed');
      } else {
        handle(err);
      }
    } finally {
      setBusy(false);
    }
  }, [email, password, onSignedIn, handle]);

  const resend = useCallback(async () => {
    setBusy(true);
    try {
      await api('/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setError('');
      setNote('resent');
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  }, [email, handle]);

  const submitForgot = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      await api('/auth/forgot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setView('forgotSent');
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  }, [email, handle, setView]);

  const submitReset = useCallback(async () => {
    setError('');
    if (password !== password2) {
      setError('Those two passwords don’t match.');
      return;
    }
    setBusy(true);
    try {
      await api('/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password }),
      });
      setPassword('');
      setPassword2('');
      setNote('reset_done');
      setView('signIn');
    } catch (err) {
      handle(err);
    } finally {
      setBusy(false);
    }
  }, [password, password2, resetToken, handle, setView]);

  const title =
    view === 'join' ? 'Join the staff room'
    : view === 'joined' ? 'Check your inbox'
    : view === 'forgot' ? 'Reset your password'
    : view === 'forgotSent' ? 'Check your inbox'
    : view === 'reset' ? 'Choose a new password'
    : 'Sign in';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-5 py-8 overflow-y-auto"
      style={{ background: 'rgba(3,10,7,0.78)', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: '#08190f', borderColor: 'rgba(255,255,255,0.09)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div className="text-left">
            <div className="text-white/25 text-[10px] tracking-wider uppercase mb-1">
              Teachers&rsquo; Room
            </div>
            <h3 className="text-white/90 text-lg font-semibold leading-tight">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-white/30 text-lg leading-none px-2 py-1 transition-colors hover:text-white/70"
          >
            &times;
          </button>
        </div>

        {view === 'signIn' && (
          <form
            onSubmit={(e) => { e.preventDefault(); if (!busy) submitSignIn(); }}
          >
            {note === 'account_exists' && (
              <div className="text-emerald-300/70 text-xs mb-3 text-left">
                That email already has an account &mdash; sign in below.
              </div>
            )}
            {note === 'reset_done' && (
              <div className="text-emerald-300/70 text-xs mb-3 text-left">
                Password changed — sign in with it now.
              </div>
            )}
            {note === 'resent' && (
              <div className="text-emerald-300/70 text-xs mb-3 text-left">
                A new confirmation link is on its way.
              </div>
            )}
            <Field label="Email" type="email" value={email} onChange={setEmail}
              autoComplete="email" autoFocus disabled={busy} />
            <Field label="Password" type="password" value={password} onChange={setPassword}
              autoComplete="current-password" disabled={busy} />
            <InlineError>{error}</InlineError>
            {note === 'unconfirmed' && (
              <div className="mt-2 text-left">
                <TextLink onClick={resend}>Send the confirmation link again</TextLink>
              </div>
            )}
            <div className="mt-4">
              <PrimaryButton type="submit" full disabled={busy}>
                {busy ? 'Signing in…' : 'Sign in'}
              </PrimaryButton>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <TextLink onClick={() => go('join')}>Create an account</TextLink>
              {/* Self-serve reset needs a working outbound email sender; with
                  confirmation mode off (no verified Resend domain yet) the
                  link would dead-end, so it stays hidden. The forgot/reset
                  views and routes are wired and ready — restore this link
                  when COMMUNITY_REQUIRE_EMAIL_CONFIRMATION goes on. */}
              {SHOW_FORGOT_PASSWORD && (
                <TextLink onClick={() => go('forgot')}>Forgot password</TextLink>
              )}
            </div>
          </form>
        )}

        {view === 'join' && (
          <form onSubmit={(e) => { e.preventDefault(); if (!busy) submitJoin(); }}>
            <Field label="Your name" value={displayName} onChange={setDisplayName}
              placeholder="How other teachers will see you" autoComplete="name" autoFocus disabled={busy} />
            <Field label="Email" type="email" value={email} onChange={setEmail}
              autoComplete="email" disabled={busy} />
            <Field label="Password" type="password" value={password} onChange={setPassword}
              placeholder="At least 8 characters" autoComplete="new-password" disabled={busy} />

            {/* Honeypot — off-screen, unreachable by keyboard, ignored by
                screen readers. A filled value is silently discarded server-side. */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px',
                opacity: 0,
              }}
            />

            <InlineError>{error}</InlineError>
            <div className="mt-4">
              <PrimaryButton type="submit" full disabled={busy}>
                {busy ? 'Creating…' : 'Create account'}
              </PrimaryButton>
            </div>
            <p className="text-white/25 text-[11px] mt-3 leading-relaxed text-left">
              Nothing is shared with your school &mdash; this account only signs
              your messages and materials here.
            </p>
            <div className="mt-4">
              <TextLink onClick={() => go('signIn')}>I already have an account</TextLink>
            </div>
          </form>
        )}

        {view === 'joined' && (
          <div className="text-left">
            <p className="text-white/50 text-sm leading-relaxed">
              We&rsquo;ve sent a confirmation link to{' '}
              <span className="text-white/80">{email}</span>. Open it and you can
              post and share straight away.
            </p>
            <InlineError>{error}</InlineError>
            {note === 'resent' && (
              <div className="text-emerald-300/70 text-xs mt-2">Sent again.</div>
            )}
            <div className="mt-5 flex items-center gap-4">
              <PrimaryButton onClick={() => go('signIn')}>Sign in</PrimaryButton>
              <TextLink onClick={resend}>{busy ? 'Sending…' : 'Resend'}</TextLink>
            </div>
          </div>
        )}

        {view === 'forgot' && (
          <form onSubmit={(e) => { e.preventDefault(); if (!busy) submitForgot(); }}>
            <p className="text-white/40 text-sm mb-4 text-left leading-relaxed">
              Enter your address and we&rsquo;ll send a link to set a new password.
            </p>
            <Field label="Email" type="email" value={email} onChange={setEmail}
              autoComplete="email" autoFocus disabled={busy} />
            <InlineError>{error}</InlineError>
            <div className="mt-4">
              <PrimaryButton type="submit" full disabled={busy}>
                {busy ? 'Sending…' : 'Send reset link'}
              </PrimaryButton>
            </div>
            <div className="mt-4">
              <TextLink onClick={() => go('signIn')}>Back to sign in</TextLink>
            </div>
          </form>
        )}

        {view === 'forgotSent' && (
          <div className="text-left">
            <p className="text-white/50 text-sm leading-relaxed">
              If that address has an account, a reset link is on its way. The link
              stays valid for one hour.
            </p>
            <div className="mt-5">
              <PrimaryButton onClick={() => go('signIn')}>Back to sign in</PrimaryButton>
            </div>
          </div>
        )}

        {view === 'reset' && (
          <form onSubmit={(e) => { e.preventDefault(); if (!busy) submitReset(); }}>
            <Field label="New password" type="password" value={password} onChange={setPassword}
              placeholder="At least 8 characters" autoComplete="new-password" autoFocus disabled={busy} />
            <Field label="Repeat it" type="password" value={password2} onChange={setPassword2}
              autoComplete="new-password" disabled={busy} />
            <InlineError>{error}</InlineError>
            <div className="mt-4">
              <PrimaryButton type="submit" full disabled={busy}>
                {busy ? 'Saving…' : 'Save new password'}
              </PrimaryButton>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ============================================
// BOARD + DROP BOX PIECES
// ============================================

function PostCard({
  post,
  onDelete,
  deleting,
}: {
  post: Post;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  return (
    <div
      className="rounded-xl border px-4 py-3 text-left"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-white/70 text-sm font-medium truncate">{post.displayName}</div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-white/20 text-[11px]">{relTime(post.createdAt)}</span>
          {post.mine && (
            <button
              type="button"
              onClick={() => onDelete(post.id)}
              disabled={deleting}
              aria-label="Delete message"
              className="text-white/20 text-sm leading-none transition-colors hover:text-red-300/70 disabled:opacity-30"
            >
              &times;
            </button>
          )}
        </div>
      </div>
      <p className="text-white/55 text-sm mt-1.5 leading-relaxed whitespace-pre-wrap break-words">
        {post.body}
      </p>
    </div>
  );
}

function MaterialCard({
  material,
  onDelete,
  deleting,
}: {
  material: Material;
  onDelete: (id: string) => void;
  deleting: boolean;
}) {
  const kind = fileKind(material.filename);
  const size = fmtSize(material.fileSize);

  return (
    <div
      className="rounded-xl border p-4 text-left flex flex-col"
      style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-bold tracking-wide"
          style={{ background: `rgba(${kind.tint},0.12)`, color: `rgb(${kind.tint})` }}
        >
          {kind.label}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-white/85 text-sm font-medium leading-snug break-words">
            {material.title}
          </div>
          {material.description && (
            <div className="text-white/35 text-xs mt-1 leading-relaxed break-words">
              {material.description}
            </div>
          )}
        </div>
        {material.mine && (
          <button
            type="button"
            onClick={() => onDelete(material.id)}
            disabled={deleting}
            aria-label="Remove file"
            className="text-white/20 text-sm leading-none shrink-0 transition-colors hover:text-red-300/70 disabled:opacity-30"
          >
            &times;
          </button>
        )}
      </div>

      <div className="text-white/20 text-[11px] mt-3">
        {material.displayName} &middot; {relTime(material.createdAt)}
        {size ? ` · ${size}` : ''}
        {material.downloadCount > 0
          ? ` · ${material.downloadCount} download${material.downloadCount === 1 ? '' : 's'}`
          : ''}
      </div>

      <a
        href={`${API}/materials/${material.id}/download`}
        className="mt-3 block px-3 py-2 rounded-lg border text-xs text-center transition-all hover:bg-white/[0.06]"
        style={{
          background: 'rgba(255,255,255,0.03)',
          borderColor: 'rgba(255,255,255,0.07)',
          color: 'rgba(255,255,255,0.6)',
        }}
      >
        Download
      </a>
    </div>
  );
}

// ============================================
// THE SECTION
// ============================================

export default function TeachersRoom() {
  const [me, setMe] = useState<Me | null>(null);
  const [migrationPending, setMigrationPending] = useState(false);
  const [banner, setBanner] = useState<{ tone: 'ok' | 'warn'; text: string } | null>(null);

  const [posts, setPosts] = useState<Post[]>([]);
  const [postsTotal, setPostsTotal] = useState(0);
  const [postsHasMore, setPostsHasMore] = useState(false);
  const [postsBusy, setPostsBusy] = useState(false);
  const [postsError, setPostsError] = useState('');
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);
  const [composeError, setComposeError] = useState('');
  const [deletingPost, setDeletingPost] = useState<string | null>(null);

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialsTotal, setMaterialsTotal] = useState(0);
  const [materialsHasMore, setMaterialsHasMore] = useState(false);
  const [materialsBusy, setMaterialsBusy] = useState(false);
  const [materialsError, setMaterialsError] = useState('');
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [deletingMaterial, setDeletingMaterial] = useState<string | null>(null);

  const [authView, setAuthView] = useState<AuthView | null>(null);
  const [resetToken, setResetToken] = useState('');

  // The confirm/reset links in the emails land back on this page; act on the
  // query param exactly once, whatever React's StrictMode does in dev.
  const urlHandled = useRef(false);

  const canWrite = !!me && me.confirmed;

  /** Route every failure through one place so 503s flip the placeholder. */
  const handleFailure = useCallback(
    (err: unknown, set: (message: string) => void) => {
      if (err instanceof ApiError && err.code === 'migration_pending') {
        setMigrationPending(true);
        return;
      }
      set(err instanceof Error ? err.message : 'Something went wrong.');
    },
    []
  );

  const loadPosts = useCallback(
    async (offset: number) => {
      setPostsBusy(true);
      setPostsError('');
      try {
        const data = await api<{ posts: Post[]; total: number; hasMore: boolean }>(
          `/posts?offset=${offset}&limit=${POSTS_PAGE}`
        );
        setPosts((prev) => (offset === 0 ? data.posts : [...prev, ...data.posts]));
        setPostsTotal(data.total);
        setPostsHasMore(data.hasMore);
      } catch (err) {
        handleFailure(err, setPostsError);
      } finally {
        setPostsBusy(false);
      }
    },
    [handleFailure]
  );

  const loadMaterials = useCallback(
    async (offset: number) => {
      setMaterialsBusy(true);
      setMaterialsError('');
      try {
        const data = await api<{ materials: Material[]; total: number; hasMore: boolean }>(
          `/materials?offset=${offset}&limit=${MATERIALS_PAGE}`
        );
        setMaterials((prev) => (offset === 0 ? data.materials : [...prev, ...data.materials]));
        setMaterialsTotal(data.total);
        setMaterialsHasMore(data.hasMore);
      } catch (err) {
        handleFailure(err, setMaterialsError);
      } finally {
        setMaterialsBusy(false);
      }
    },
    [handleFailure]
  );

  const loadMe = useCallback(async () => {
    try {
      const data = await api<{ user: Me | null }>('/me');
      setMe(data.user);
    } catch (err) {
      // /me never legitimately fails; a 503 here still means "not set up".
      if (err instanceof ApiError && err.code === 'migration_pending') {
        setMigrationPending(true);
      }
      setMe(null);
    }
  }, []);

  // --- mount: read the email-link params, then load everything -------------
  useEffect(() => {
    if (urlHandled.current) return;
    urlHandled.current = true;

    let confirmToken = '';
    try {
      const params = new URLSearchParams(window.location.search);
      confirmToken = params.get('tr_confirm') || '';
      const reset = params.get('tr_reset') || '';
      if (reset) {
        setResetToken(reset);
        setAuthView('reset');
      }
      // Strip both so a refresh (or a shared URL) can't replay the token.
      if (confirmToken || reset) {
        const url = new URL(window.location.href);
        url.searchParams.delete('tr_confirm');
        url.searchParams.delete('tr_reset');
        window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
      }
    } catch (err) {
      console.error('[TeachersRoom] could not read the link parameters:', err);
    }

    if (confirmToken) {
      api('/auth/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: confirmToken }),
      })
        .then(() => {
          setBanner({ tone: 'ok', text: 'Email confirmed — you can sign in now.' });
          setAuthView('signIn');
        })
        .catch((err: unknown) => {
          if (err instanceof ApiError && err.code === 'migration_pending') {
            setMigrationPending(true);
            return;
          }
          setBanner({
            tone: 'warn',
            text:
              err instanceof Error
                ? err.message
                : 'That link has expired — please request a new one.',
          });
        });
    }

    loadMe();
    loadPosts(0);
    loadMaterials(0);
  }, [loadMe, loadPosts, loadMaterials]);

  // --- actions ------------------------------------------------------------

  const onSignedIn = useCallback(
    (user: Me) => {
      setMe(user);
      setAuthView(null);
      setBanner(null);
      // Reload both lists so the viewer's own rows come back flagged `mine`.
      loadPosts(0);
      loadMaterials(0);
    },
    [loadPosts, loadMaterials]
  );

  const signOut = useCallback(async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('[TeachersRoom] sign out failed:', err);
    }
    setMe(null);
    loadPosts(0);
    loadMaterials(0);
  }, [loadPosts, loadMaterials]);

  const submitPost = useCallback(async () => {
    const body = draft.trim();
    if (!body || posting) return;
    setPosting(true);
    setComposeError('');
    try {
      const data = await api<{ post: Post }>('/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body }),
      });
      setPosts((prev) => [data.post, ...prev]);
      setPostsTotal((prev) => prev + 1);
      setDraft('');
    } catch (err) {
      handleFailure(err, setComposeError);
    } finally {
      setPosting(false);
    }
  }, [draft, posting, handleFailure]);

  const deletePost = useCallback(
    async (id: string) => {
      if (!window.confirm('Delete this message?')) return;
      setDeletingPost(id);
      setPostsError('');
      try {
        await api(`/posts/${id}`, { method: 'DELETE' });
        setPosts((prev) => prev.filter((p) => p.id !== id));
        setPostsTotal((prev) => Math.max(0, prev - 1));
      } catch (err) {
        handleFailure(err, setPostsError);
      } finally {
        setDeletingPost(null);
      }
    },
    [handleFailure]
  );

  const submitUpload = useCallback(async () => {
    if (uploading) return;
    if (!uploadFile) {
      setUploadError('Choose a file first.');
      return;
    }
    if (!uploadTitle.trim()) {
      setUploadError('Give it a title so others know what it is.');
      return;
    }
    if (uploadFile.size > MAX_UPLOAD_MB * 1024 * 1024) {
      setUploadError(`That file is too large (max ${MAX_UPLOAD_MB}MB).`);
      return;
    }

    setUploading(true);
    setUploadError('');
    try {
      const form = new FormData();
      form.append('title', uploadTitle.trim());
      form.append('description', uploadDescription.trim());
      form.append('file', uploadFile);
      const data = await api<{ material: Material }>('/materials', {
        method: 'POST',
        body: form,
      });
      setMaterials((prev) => [data.material, ...prev]);
      setMaterialsTotal((prev) => prev + 1);
      setUploadTitle('');
      setUploadDescription('');
      setUploadFile(null);
    } catch (err) {
      handleFailure(err, setUploadError);
    } finally {
      setUploading(false);
    }
  }, [uploading, uploadFile, uploadTitle, uploadDescription, handleFailure]);

  const deleteMaterial = useCallback(
    async (id: string) => {
      if (!window.confirm('Remove this file from the drop box?')) return;
      setDeletingMaterial(id);
      setMaterialsError('');
      try {
        await api(`/materials/${id}`, { method: 'DELETE' });
        setMaterials((prev) => prev.filter((m) => m.id !== id));
        setMaterialsTotal((prev) => Math.max(0, prev - 1));
      } catch (err) {
        handleFailure(err, setMaterialsError);
      } finally {
        setDeletingMaterial(null);
      }
    },
    [handleFailure]
  );

  // --- shell --------------------------------------------------------------

  const header = (
    <>
      <div className="text-white/25 text-[10px] tracking-wider uppercase">Teachers&rsquo; Room</div>
      <h2 className="text-white/90 text-2xl font-semibold mt-2">The staff room</h2>
    </>
  );

  if (migrationPending) {
    return (
      <section className="mt-16 text-center">
        {header}
        <p className="text-white/25 text-sm mt-3">
          The staff room is being set up &mdash; check back soon.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-16 text-left">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {header}
          <p className="text-white/35 text-sm mt-2 leading-relaxed">
            Leave a note for other teachers, and share what you&rsquo;ve made.
          </p>
        </div>

        <div className="pt-1 shrink-0">
          {me ? (
            <div className="text-right">
              <div className="text-white/40 text-xs">
                Signed in as <span className="text-white/70">{me.displayName}</span>
              </div>
              <div className="mt-1">
                <TextLink onClick={signOut}>Sign out</TextLink>
              </div>
            </div>
          ) : (
            <PrimaryButton onClick={() => setAuthView(resetToken ? 'reset' : 'signIn')}>
              Sign in / Join
            </PrimaryButton>
          )}
        </div>
      </div>

      {banner && (
        <div
          className="mt-4 rounded-xl border px-4 py-3 text-sm"
          style={{
            background: banner.tone === 'ok' ? `rgba(${ACCENT},0.08)` : 'rgba(248,113,113,0.07)',
            borderColor:
              banner.tone === 'ok' ? `rgba(${ACCENT},0.22)` : 'rgba(248,113,113,0.22)',
            color: banner.tone === 'ok' ? 'rgb(110,231,183)' : 'rgb(252,165,165)',
          }}
        >
          {banner.text}
        </div>
      )}

      {me && !me.confirmed && (
        <div
          className="mt-4 rounded-xl border px-4 py-3 text-sm"
          style={{ background: 'rgba(251,191,36,0.07)', borderColor: 'rgba(251,191,36,0.2)', color: 'rgb(253,224,151)' }}
        >
          Confirm your email to post and share &mdash; the link is in your inbox.
        </div>
      )}

      {/* ---------------- DISCUSSION ---------------- */}
      <div className="mt-8">
        <SectionLabel>
          Discussion{postsTotal > 0 ? ` · ${postsTotal}` : ''}
        </SectionLabel>

        {canWrite ? (
          <div
            className="rounded-xl border p-4"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, MAX_BODY))}
              rows={3}
              placeholder="Something you noticed this week…"
              disabled={posting}
              className="w-full bg-transparent text-sm text-white/85 outline-none resize-y placeholder:text-white/20 disabled:opacity-40"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-white/20 text-[11px]">
                {draft.length}/{MAX_BODY}
              </span>
              <PrimaryButton onClick={submitPost} disabled={posting || draft.trim().length === 0}>
                {posting ? 'Posting…' : 'Post'}
              </PrimaryButton>
            </div>
            <InlineError>{composeError}</InlineError>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/[0.07] px-4 py-3">
            <span className="text-white/25 text-xs">
              {me ? 'Confirm your email to leave a message.' : 'Sign in to leave a message.'}
            </span>
          </div>
        )}

        <div className="mt-4 space-y-3">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              onDelete={deletePost}
              deleting={deletingPost === post.id}
            />
          ))}
          {posts.length === 0 && !postsBusy && (
            <div className="text-white/20 text-xs py-2">
              No messages yet &mdash; be the first.
            </div>
          )}
        </div>

        <InlineError>{postsError}</InlineError>

        {postsHasMore && (
          <button
            type="button"
            onClick={() => loadPosts(posts.length)}
            disabled={postsBusy}
            className="mt-4 w-full px-4 py-2.5 rounded-xl border text-xs transition-all hover:bg-white/[0.06] disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {postsBusy ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      {/* ---------------- DROP BOX ---------------- */}
      <div className="mt-10">
        <SectionLabel>
          Drop box{materialsTotal > 0 ? ` · ${materialsTotal}` : ''}
        </SectionLabel>

        {canWrite && (
          <div
            className="rounded-xl border p-4 mb-4"
            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.07)' }}
          >
            <Field
              label="Title"
              value={uploadTitle}
              onChange={setUploadTitle}
              placeholder="What is it?"
              disabled={uploading}
            />
            <Field
              label="Description (optional)"
              value={uploadDescription}
              onChange={setUploadDescription}
              placeholder="How you use it"
              disabled={uploading}
            />

            <label
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files?.[0];
                if (file && !uploading) { setUploadFile(file); setUploadError(''); }
              }}
              className="block rounded-xl border border-dashed px-4 py-4 text-center cursor-pointer transition-colors hover:bg-white/[0.03]"
              style={{
                borderColor: dragOver ? `rgba(${ACCENT},0.4)` : 'rgba(255,255,255,0.10)',
                background: dragOver ? `rgba(${ACCENT},0.05)` : 'transparent',
              }}
            >
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.zip,.docx,.pptx"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) { setUploadFile(file); setUploadError(''); }
                  e.currentTarget.value = '';
                }}
              />
              <span className="text-white/30 text-xs">
                {uploadFile
                  ? `${uploadFile.name}${fmtSize(uploadFile.size) ? ` · ${fmtSize(uploadFile.size)}` : ''}`
                  : `Drop a file here, or click to choose · PDF, image, ZIP, Word, PowerPoint · max ${MAX_UPLOAD_MB}MB`}
              </span>
            </label>

            <div className="flex items-center justify-between mt-3">
              {uploadFile ? (
                <TextLink onClick={() => setUploadFile(null)}>Choose a different file</TextLink>
              ) : (
                <span />
              )}
              <PrimaryButton onClick={submitUpload} disabled={uploading || !uploadFile}>
                {uploading ? 'Sharing…' : 'Share it'}
              </PrimaryButton>
            </div>
            <InlineError>{uploadError}</InlineError>
          </div>
        )}

        {!canWrite && (
          <div className="rounded-xl border border-dashed border-white/[0.07] px-4 py-3 mb-4">
            <span className="text-white/25 text-xs">
              {me
                ? 'Confirm your email to share a file.'
                : 'Sign in to share a file. Downloading is open to everyone.'}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {materials.map((material) => (
            <MaterialCard
              key={material.id}
              material={material}
              onDelete={deleteMaterial}
              deleting={deletingMaterial === material.id}
            />
          ))}
        </div>
        {materials.length === 0 && !materialsBusy && (
          <div className="text-white/20 text-xs py-2">
            Nothing shared yet.
          </div>
        )}

        <InlineError>{materialsError}</InlineError>

        {materialsHasMore && (
          <button
            type="button"
            onClick={() => loadMaterials(materials.length)}
            disabled={materialsBusy}
            className="mt-4 w-full px-4 py-2.5 rounded-xl border text-xs transition-all hover:bg-white/[0.06] disabled:opacity-30"
            style={{
              background: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,255,255,0.07)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            {materialsBusy ? 'Loading…' : 'Load more'}
          </button>
        )}
      </div>

      {authView && (
        <AuthModal
          view={authView}
          setView={setAuthView}
          resetToken={resetToken}
          onClose={() => setAuthView(null)}
          onSignedIn={onSignedIn}
          onMigrationPending={() => setMigrationPending(true)}
        />
      )}
    </section>
  );
}
