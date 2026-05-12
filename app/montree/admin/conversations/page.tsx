// app/montree/admin/conversations/page.tsx
//
// Principal Vault — encrypted parent-meeting recordings.
//
// PROTOTYPE: gated server-side to Tredoux's principal_id. The sidebar item
// is rendered only for that user (see app/montree/admin/page.tsx).
//
// The vault is end-to-end encrypted: the principal's password derives the
// AES-GCM key locally, the server only stores ciphertext + per-record salt
// and IV. If the principal forgets her password, the data is unrecoverable
// — we make this explicit at every write.

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Mic,
  MicOff,
  Lock,
  LockKeyhole,
  Trash2,
  ArrowLeft,
  Loader2,
  KeyRound,
} from 'lucide-react';
import {
  encryptRecord,
  decryptRecord,
  verifyPasswordAgainstRecord,
  type EncryptedRecord,
  type PlaintextRecord,
} from '@/lib/montree/vault-crypto';
import UpgradeCard, { extractUpgradeFromResponse } from '@/components/montree/UpgradeCard';

const T = {
  emerald: '#34d399',
  emeraldSoft: 'rgba(52,211,153,0.10)',
  gold: '#E8C96A',
  goldDim: 'rgba(232,201,106,0.55)',
  cardBg: 'rgba(8,20,12,0.55)',
  cardBgStrong: 'rgba(8,20,12,0.80)',
  cardBorder: '1px solid rgba(52,211,153,0.18)',
  inputBg: 'rgba(0,0,0,0.30)',
  inputBorder: '1px solid rgba(52,211,153,0.25)',
  textPrimary: 'rgba(255,255,255,0.92)',
  textSoft: '#eaf1e6',
  textSecondary: 'rgba(234,241,230,0.55)',
  textMuted: 'rgba(255,255,255,0.40)',
  serif: '"Lora", Georgia, serif',
  sans:
    '-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif',
  bgGradient:
    'radial-gradient(ellipse at top, rgba(52,211,153,0.15), transparent 50%), linear-gradient(180deg, #0a1a0f 0%, #0f1f15 100%)',
};

interface ConvRow extends EncryptedRecord {
  id: string;
  recorded_at: string;
  duration_seconds: number | null;
  created_at: string;
}

type View =
  | { kind: 'list' }
  | { kind: 'new' }
  | { kind: 'detail'; conv: ConvRow; plain: PlaintextRecord };

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return d;
  }
}

function fmtDuration(seconds: number | null): string {
  if (!seconds || seconds < 1) return '—';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m${s ? ` ${s}s` : ''}`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export default function ConversationsPage() {
  const router = useRouter();

  const [authChecked, setAuthChecked] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ConvRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Vault password lives in memory only. Never localStorage. Cleared on lock,
  // refresh, or page navigation away.
  const [vaultPassword, setVaultPassword] = useState<string | null>(null);
  const [unlockState, setUnlockState] = useState<
    | { kind: 'none' }
    | { kind: 'firstSetup' } // no records yet — pick a new password
    | { kind: 'unlock' } // records exist — type password to unlock
  >({ kind: 'none' });
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  const [view, setView] = useState<View>({ kind: 'list' });

  // ── Auth + initial load ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch('/api/montree/auth/me');
        if (!meRes.ok) {
          router.replace('/montree/login-select');
          return;
        }
        const meData = await meRes.json();
        if (cancelled) return;
        if (meData.role !== 'principal') {
          setAuthError(
            'This area is for principals only. Sign out and log in with your principal code.'
          );
          setAuthChecked(true);
          return;
        }
        setAuthChecked(true);

        // List
        const listRes = await fetch('/api/montree/admin/conversations');
        if (cancelled) return;
        if (listRes.status === 404) {
          // Server gate — this user isn't on the prototype allow-list.
          setAuthError(
            'This feature is in private prototype on Whale Class. Tell Tredoux if you want access.'
          );
          setLoading(false);
          return;
        }
        if (!listRes.ok) {
          setAuthError('Could not load conversations.');
          setLoading(false);
          return;
        }
        const listData = await listRes.json();
        const rows: ConvRow[] = listData.conversations || [];
        setConversations(rows);
        setLoading(false);

        // Decide which unlock flow to present.
        if (rows.length === 0) {
          setUnlockState({ kind: 'firstSetup' });
        } else {
          setUnlockState({ kind: 'unlock' });
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[conversations init] error:', err);
          setAuthError('Something went wrong loading the vault.');
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  const lockVault = useCallback(() => {
    setVaultPassword(null);
    setView({ kind: 'list' });
    if (conversations.length > 0) {
      setUnlockState({ kind: 'unlock' });
    }
  }, [conversations.length]);

  // ── Unlock / first-setup handlers ──────────────────────────────────────
  const handleFirstSetup = useCallback(async (pwd: string, confirm: string) => {
    setUnlockError(null);
    if (pwd.length < 8) {
      setUnlockError('Pick a password at least 8 characters long.');
      return;
    }
    if (pwd !== confirm) {
      setUnlockError("The two passwords don't match.");
      return;
    }
    setVaultPassword(pwd);
    setUnlockState({ kind: 'none' });
  }, []);

  const handleUnlock = useCallback(
    async (pwd: string) => {
      setUnlockError(null);
      setUnlockBusy(true);
      try {
        if (conversations.length === 0) {
          // No records — just trust the password. Shouldn't happen because we
          // route to firstSetup in this case, but defensive.
          setVaultPassword(pwd);
          setUnlockState({ kind: 'none' });
          return;
        }
        const ok = await verifyPasswordAgainstRecord(pwd, conversations[0]);
        if (!ok) {
          setUnlockError('Wrong password — try again.');
          return;
        }
        setVaultPassword(pwd);
        setUnlockState({ kind: 'none' });
      } catch (err) {
        console.error('[vault unlock] error:', err);
        setUnlockError('Could not unlock the vault. Try again.');
      } finally {
        setUnlockBusy(false);
      }
    },
    [conversations]
  );

  // ── Open a conversation (decrypt) ──────────────────────────────────────
  const openConversation = useCallback(
    async (conv: ConvRow) => {
      if (!vaultPassword) return;
      try {
        const plain = await decryptRecord(vaultPassword, conv);
        setView({ kind: 'detail', conv, plain });
      } catch (err) {
        console.error('[vault decrypt one] error:', err);
        if (err instanceof Error && err.message === 'WRONG_PASSWORD') {
          // Password drift — lock and prompt unlock again.
          alert(
            "Couldn't decrypt that conversation with the current password. Re-unlocking the vault."
          );
          lockVault();
        } else {
          alert('Could not open that conversation.');
        }
      }
    },
    [vaultPassword, lockVault]
  );

  // ── Delete ─────────────────────────────────────────────────────────────
  const deleteConversation = useCallback(
    async (id: string) => {
      if (!confirm('Delete this conversation? This cannot be undone.')) return;
      try {
        const res = await fetch(`/api/montree/admin/conversations/${id}`, {
          method: 'DELETE',
        });
        if (!res.ok) {
          alert('Failed to delete.');
          return;
        }
        setConversations((prev) => prev.filter((c) => c.id !== id));
        if (view.kind === 'detail' && view.conv.id === id) {
          setView({ kind: 'list' });
        }
      } catch (err) {
        console.error('[vault delete] error:', err);
        alert('Failed to delete.');
      }
    },
    [view]
  );

  // ── Save a new conversation ────────────────────────────────────────────
  const saveNewConversation = useCallback(
    async (record: PlaintextRecord, durationSeconds: number | null) => {
      if (!vaultPassword) {
        alert('Vault is locked.');
        return null;
      }
      const encrypted = await encryptRecord(vaultPassword, record);
      const res = await fetch('/api/montree/admin/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...encrypted,
          duration_seconds: durationSeconds ?? null,
          recorded_at: record.meeting_date || new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Failed to save.');
        return null;
      }
      const data = await res.json();
      const newRow: ConvRow = {
        id: data.conversation.id,
        recorded_at: data.conversation.recorded_at,
        duration_seconds: data.conversation.duration_seconds,
        created_at: data.conversation.created_at,
        salt_b64: encrypted.salt_b64,
        iv_b64: encrypted.iv_b64,
        ciphertext_b64: encrypted.ciphertext_b64,
        pbkdf2_iterations: encrypted.pbkdf2_iterations,
        cipher_version: encrypted.cipher_version,
      };
      setConversations((prev) => [newRow, ...prev]);
      return newRow;
    },
    [vaultPassword]
  );

  // ── Renders ────────────────────────────────────────────────────────────

  const pageWrap = (children: React.ReactNode) => (
    <div
      style={{
        minHeight: '100vh',
        background: T.bgGradient,
        color: T.textPrimary,
        fontFamily: T.sans,
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '32px 20px 80px' }}>
        {children}
      </div>
    </div>
  );

  if (!authChecked) {
    return pageWrap(
      <div style={{ color: T.textMuted, padding: '48px 0', textAlign: 'center' }}>
        Loading…
      </div>
    );
  }
  if (authError) {
    return pageWrap(
      <div style={{ padding: '48px 0', textAlign: 'center' }}>
        <p style={{ color: T.textSoft, marginBottom: 16 }}>{authError}</p>
        <button
          onClick={() => router.push('/montree/admin')}
          style={{
            padding: '10px 18px',
            background: T.emeraldSoft,
            border: T.cardBorder,
            borderRadius: 8,
            color: T.textSoft,
            cursor: 'pointer',
          }}
        >
          Back to Tracy
        </button>
      </div>
    );
  }

  // Locked state — show unlock or first-setup gate before any vault content.
  if (vaultPassword === null && unlockState.kind !== 'none') {
    return pageWrap(
      <UnlockGate
        state={unlockState}
        busy={unlockBusy}
        error={unlockError}
        onUnlock={handleUnlock}
        onFirstSetup={handleFirstSetup}
        onBack={() => router.push('/montree/admin')}
      />
    );
  }

  // Detail view (a single decrypted conversation)
  if (view.kind === 'detail') {
    return pageWrap(
      <DetailView
        conv={view.conv}
        plain={view.plain}
        onBack={() => setView({ kind: 'list' })}
        onDelete={() => deleteConversation(view.conv.id)}
      />
    );
  }

  // New-conversation flow
  if (view.kind === 'new') {
    return pageWrap(
      <NewConversation
        onCancel={() => setView({ kind: 'list' })}
        onSaved={() => setView({ kind: 'list' })}
        save={saveNewConversation}
      />
    );
  }

  // Default: list view
  return pageWrap(
    <ListView
      conversations={conversations}
      loading={loading}
      onNew={() => setView({ kind: 'new' })}
      onOpen={openConversation}
      onLock={lockVault}
      onBack={() => router.push('/montree/admin')}
    />
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function UnlockGate({
  state,
  busy,
  error,
  onUnlock,
  onFirstSetup,
  onBack,
}: {
  state: { kind: 'firstSetup' } | { kind: 'unlock' };
  busy: boolean;
  error: string | null;
  onUnlock: (pwd: string) => void;
  onFirstSetup: (pwd: string, confirm: string) => void;
  onBack: () => void;
}) {
  const [pwd, setPwd] = useState('');
  const [confirm, setConfirm] = useState('');

  const isFirst = state.kind === 'firstSetup';

  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'transparent',
          border: 'none',
          color: T.textMuted,
          cursor: 'pointer',
          fontSize: 13,
          marginBottom: 24,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>
      <div
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: 16,
          padding: '32px 28px',
          backdropFilter: 'blur(18px)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
          <KeyRound size={28} color={T.gold} strokeWidth={1.75} />
          <h1 style={{ fontFamily: T.serif, fontSize: 26, fontWeight: 500, margin: 0 }}>
            {isFirst ? 'Set your vault password' : 'Unlock your vault'}
          </h1>
        </div>
        <p style={{ color: T.textSoft, fontSize: 14, lineHeight: 1.6, marginBottom: 18 }}>
          {isFirst
            ? "This password encrypts every conversation you save. We never see it. If you lose it, the conversations can't be recovered."
            : 'Enter the password you set for this vault. Wrong password? Try again — there are no lockouts, but every recording you saved is encrypted under whatever password you used at that moment.'}
        </p>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Vault password"
          autoFocus
          disabled={busy}
          style={{
            width: '100%',
            padding: '12px 14px',
            background: T.inputBg,
            border: T.inputBorder,
            borderRadius: 10,
            color: T.textPrimary,
            fontSize: 15,
            marginBottom: 12,
            boxSizing: 'border-box',
          }}
        />
        {isFirst && (
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Type the password again"
            disabled={busy}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: T.inputBg,
              border: T.inputBorder,
              borderRadius: 10,
              color: T.textPrimary,
              fontSize: 15,
              marginBottom: 12,
              boxSizing: 'border-box',
            }}
          />
        )}
        {error && (
          <div style={{ color: '#f87171', fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}
        <button
          onClick={() => (isFirst ? onFirstSetup(pwd, confirm) : onUnlock(pwd))}
          disabled={busy || !pwd || (isFirst && !confirm)}
          style={{
            width: '100%',
            padding: '12px 18px',
            background: T.emerald,
            color: '#062712',
            border: 'none',
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 600,
            cursor: busy ? 'wait' : 'pointer',
            opacity: !pwd || (isFirst && !confirm) ? 0.55 : 1,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          {busy && <Loader2 size={16} className="animate-spin" />}
          {isFirst ? 'Set password' : 'Unlock'}
        </button>
        {isFirst && (
          <p
            style={{
              marginTop: 18,
              padding: '10px 14px',
              background: 'rgba(232,201,106,0.07)',
              border: '1px solid rgba(232,201,106,0.18)',
              borderRadius: 8,
              color: T.gold,
              fontSize: 12.5,
              lineHeight: 1.55,
            }}
          >
            Write this password down somewhere safe. We have no way to reset it
            for you. Losing it means losing every conversation in this vault.
          </p>
        )}
      </div>
    </div>
  );
}

function ListView({
  conversations,
  loading,
  onNew,
  onOpen,
  onLock,
  onBack,
}: {
  conversations: ConvRow[];
  loading: boolean;
  onNew: () => void;
  onOpen: (c: ConvRow) => void;
  onLock: () => void;
  onBack: () => void;
}) {
  return (
    <div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 28,
        }}
      >
        <button
          onClick={onBack}
          style={{
            background: 'transparent',
            border: 'none',
            color: T.textMuted,
            cursor: 'pointer',
            fontSize: 13,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <ArrowLeft size={14} /> Tracy
        </button>
        <button
          onClick={onLock}
          title="Lock vault"
          style={{
            background: 'transparent',
            border: T.cardBorder,
            color: T.textSoft,
            padding: '6px 12px',
            borderRadius: 8,
            cursor: 'pointer',
            fontSize: 12.5,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <Lock size={13} /> Lock
        </button>
      </div>

      <h1
        style={{
          fontFamily: T.serif,
          fontSize: 30,
          fontWeight: 500,
          margin: '0 0 8px',
        }}
      >
        Conversations
      </h1>
      <p style={{ color: T.textSecondary, fontSize: 14, margin: '0 0 24px' }}>
        Encrypted record of your parent meetings. Only you can read these.
      </p>

      <button
        onClick={onNew}
        style={{
          width: '100%',
          padding: '14px 20px',
          background: T.emerald,
          color: '#062712',
          border: 'none',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          marginBottom: 28,
        }}
      >
        <Mic size={18} /> New conversation
      </button>

      {loading && <div style={{ color: T.textMuted, padding: '24px 0' }}>Loading…</div>}

      {!loading && conversations.length === 0 && (
        <div
          style={{
            padding: '36px 24px',
            textAlign: 'center',
            color: T.textMuted,
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          Nothing here yet. Your first encrypted conversation will appear here
          after you record one.
        </div>
      )}

      {!loading && conversations.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {conversations.map((c) => (
            <button
              key={c.id}
              onClick={() => onOpen(c)}
              style={{
                background: T.cardBg,
                border: T.cardBorder,
                borderRadius: 12,
                padding: '14px 16px',
                color: T.textSoft,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                width: '100%',
                textAlign: 'left',
                fontFamily: T.sans,
              }}
            >
              <LockKeyhole size={18} color={T.gold} strokeWidth={1.75} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500 }}>
                  {fmtDate(c.recorded_at)}
                </div>
                <div style={{ fontSize: 12.5, color: T.textMuted, marginTop: 2 }}>
                  {fmtDuration(c.duration_seconds)} · encrypted · tap to open
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailView({
  conv,
  plain,
  onBack,
  onDelete,
}: {
  conv: ConvRow;
  plain: PlaintextRecord;
  onBack: () => void;
  onDelete: () => void;
}) {
  return (
    <div>
      <button
        onClick={onBack}
        style={{
          background: 'transparent',
          border: 'none',
          color: T.textMuted,
          cursor: 'pointer',
          fontSize: 13,
          marginBottom: 20,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <ArrowLeft size={14} /> Back
      </button>

      <div
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: 16,
          padding: '24px 24px 20px',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 13, color: T.textMuted }}>
            {fmtDate(conv.recorded_at)} · {fmtDuration(conv.duration_seconds)}
          </span>
        </div>
        {plain.child_name && (
          <div
            style={{
              display: 'inline-block',
              padding: '3px 10px',
              background: 'rgba(232,201,106,0.10)',
              border: '1px solid rgba(232,201,106,0.28)',
              borderRadius: 999,
              color: T.gold,
              fontSize: 12.5,
              marginBottom: 14,
            }}
          >
            About {plain.child_name}
          </div>
        )}
        <h2
          style={{
            fontFamily: T.serif,
            fontSize: 22,
            fontWeight: 500,
            margin: '4px 0 14px',
          }}
        >
          Summary
        </h2>
        <div
          style={{
            color: T.textSoft,
            fontSize: 14.5,
            lineHeight: 1.75,
            whiteSpace: 'pre-wrap',
          }}
        >
          {plain.summary || '(No summary was generated.)'}
        </div>
      </div>

      {plain.transcript && (
        <details
          style={{
            background: T.cardBg,
            border: T.cardBorder,
            borderRadius: 16,
            padding: '14px 20px',
            marginBottom: 16,
          }}
        >
          <summary
            style={{
              cursor: 'pointer',
              color: T.textSoft,
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Show full transcript
          </summary>
          <div
            style={{
              color: T.textSoft,
              fontSize: 13.5,
              lineHeight: 1.7,
              whiteSpace: 'pre-wrap',
              marginTop: 12,
              fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
            }}
          >
            {plain.transcript}
          </div>
        </details>
      )}

      {plain.notes && (
        <div
          style={{
            background: T.cardBg,
            border: T.cardBorder,
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 16,
          }}
        >
          <h3
            style={{
              fontFamily: T.serif,
              fontSize: 16,
              fontWeight: 500,
              margin: '0 0 8px',
            }}
          >
            Notes
          </h3>
          <div
            style={{
              color: T.textSoft,
              fontSize: 14,
              lineHeight: 1.65,
              whiteSpace: 'pre-wrap',
            }}
          >
            {plain.notes}
          </div>
        </div>
      )}

      <button
        onClick={onDelete}
        style={{
          background: 'transparent',
          border: '1px solid rgba(239,68,68,0.30)',
          color: '#f87171',
          padding: '10px 16px',
          borderRadius: 10,
          cursor: 'pointer',
          fontSize: 13,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Trash2 size={14} /> Delete
      </button>
    </div>
  );
}

function NewConversation({
  onCancel,
  onSaved,
  save,
}: {
  onCancel: () => void;
  onSaved: () => void;
  save: (
    record: PlaintextRecord,
    durationSeconds: number | null
  ) => Promise<unknown>;
}) {
  const [recording, setRecording] = useState(false);
  const [recDuration, setRecDuration] = useState(0); // seconds
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef<number>(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [transcribing, setTranscribing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 402 from the Sonnet summary path → render UpgradeCard instead of red error.
  const [upgrade, setUpgrade] = useState<{ feature: string; upgradeUrl: string } | null>(null);

  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [childName, setChildName] = useState('');
  const [notes, setNotes] = useState('');
  const [meetingDate, setMeetingDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mr.start(1000);
      mediaRecorderRef.current = mr;
      startedAtRef.current = Date.now();
      setRecDuration(0);
      tickRef.current = setInterval(() => {
        setRecDuration(Math.floor((Date.now() - startedAtRef.current) / 1000));
      }, 1000);
      setRecording(true);
    } catch (err) {
      console.error('[recorder] mic error', err);
      setError(
        'Could not access the microphone. Check Chrome permissions for this site.'
      );
    }
  }, []);

  const stopRecording = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== 'inactive') {
      mr.stop();
    }
    if (tickRef.current) {
      clearInterval(tickRef.current);
      tickRef.current = null;
    }
    setRecording(false);
  }, []);

  useEffect(() => {
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== 'inactive') {
        try { mr.stop(); } catch { /* ignore */ }
      }
    };
  }, []);

  const transcribeAudio = useCallback(async () => {
    if (!audioBlob) return;
    setError(null);
    setUpgrade(null);
    setTranscribing(true);
    try {
      const fd = new FormData();
      fd.append('audio', audioBlob, 'recording.webm');
      fd.append('duration_seconds', String(recDuration));
      if (childName.trim()) fd.append('child_name', childName.trim());
      const res = await fetch('/api/montree/admin/conversations/transcribe', {
        method: 'POST',
        body: fd,
      });
      if (res.status === 402) {
        const u = await extractUpgradeFromResponse(res);
        if (u) {
          setUpgrade({ feature: u.feature, upgradeUrl: u.upgradeUrl });
          return;
        }
      }
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Transcription failed.');
        return;
      }
      const data = await res.json();
      setTranscript(data.transcript || '');
      setSummary(data.summary || '');
    } catch (err) {
      console.error('[transcribe] error', err);
      setError('Transcription failed.');
    } finally {
      setTranscribing(false);
    }
  }, [audioBlob, recDuration, childName]);

  const handleSave = useCallback(async () => {
    if (!summary.trim() && !transcript.trim() && !notes.trim()) {
      setError('Nothing to save — add a summary, transcript, or notes first.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const record: PlaintextRecord = {
        summary: summary.trim(),
        transcript: transcript.trim(),
        child_name: childName.trim() || null,
        meeting_date: meetingDate
          ? new Date(meetingDate).toISOString()
          : new Date().toISOString(),
        notes: notes.trim(),
      };
      const ok = await save(record, recDuration > 0 ? recDuration : null);
      if (ok) onSaved();
    } catch (err) {
      console.error('[save] error', err);
      setError('Encrypt + save failed.');
    } finally {
      setSaving(false);
    }
  }, [summary, transcript, childName, notes, meetingDate, recDuration, save, onSaved]);

  return (
    <div>
      <button
        onClick={onCancel}
        style={{
          background: 'transparent',
          border: 'none',
          color: T.textMuted,
          cursor: 'pointer',
          fontSize: 13,
          marginBottom: 18,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <ArrowLeft size={14} /> Cancel
      </button>

      <h1
        style={{
          fontFamily: T.serif,
          fontSize: 28,
          fontWeight: 500,
          margin: '0 0 6px',
        }}
      >
        New conversation
      </h1>

      <div
        style={{
          marginTop: 18,
          marginBottom: 24,
          padding: '14px 16px',
          background: 'rgba(232,201,106,0.07)',
          border: '1px solid rgba(232,201,106,0.22)',
          borderRadius: 10,
          color: T.gold,
          fontSize: 12.5,
          lineHeight: 1.55,
        }}
      >
        <strong style={{ fontWeight: 600 }}>Before you record:</strong> Tell the
        parent. Recording someone without telling them is illegal in many
        places, and even where it&rsquo;s legal it&rsquo;s the wrong way to
        start a relationship. Use this for your own clarity, not as evidence.
        The recording stays encrypted under a password only you know.
      </div>

      {/* Recording panel */}
      <div
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: 16,
          padding: 24,
          marginBottom: 18,
          textAlign: 'center',
        }}
      >
        {!audioBlob && !recording && (
          <button
            onClick={startRecording}
            style={{
              padding: '14px 26px',
              background: T.emerald,
              color: '#062712',
              border: 'none',
              borderRadius: 999,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Mic size={18} /> Start recording
          </button>
        )}
        {recording && (
          <div>
            <div
              style={{
                fontSize: 38,
                fontWeight: 300,
                fontFamily: T.serif,
                color: T.textSoft,
                marginBottom: 14,
              }}
            >
              {fmtDuration(recDuration)}
            </div>
            <button
              onClick={stopRecording}
              style={{
                padding: '12px 24px',
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: 999,
                fontSize: 15,
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 10,
              }}
            >
              <MicOff size={18} /> Stop
            </button>
          </div>
        )}
        {audioBlob && !recording && (
          <div>
            <div style={{ marginBottom: 14, fontSize: 13.5, color: T.textSoft }}>
              Recording captured — {fmtDuration(recDuration)}
            </div>
            <audio
              src={URL.createObjectURL(audioBlob)}
              controls
              style={{ width: '100%', maxWidth: 360, marginBottom: 14 }}
            />
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={transcribeAudio}
                disabled={transcribing}
                style={{
                  padding: '10px 18px',
                  background: T.emerald,
                  color: '#062712',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: transcribing ? 'wait' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                {transcribing && <Loader2 size={14} className="animate-spin" />}
                Transcribe & summarize
              </button>
              <button
                onClick={() => {
                  setAudioBlob(null);
                  setRecDuration(0);
                  setTranscript('');
                  setSummary('');
                }}
                style={{
                  padding: '10px 18px',
                  background: 'transparent',
                  color: T.textSoft,
                  border: T.cardBorder,
                  borderRadius: 8,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >
                Re-record
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Metadata + summary editor */}
      <div
        style={{
          background: T.cardBg,
          border: T.cardBorder,
          borderRadius: 16,
          padding: 22,
          marginBottom: 18,
          display: 'flex',
          flexDirection: 'column',
          gap: 14,
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <label
              style={{
                fontSize: 12,
                color: T.textMuted,
                display: 'block',
                marginBottom: 4,
              }}
            >
              Meeting date
            </label>
            <input
              type="date"
              value={meetingDate}
              onChange={(e) => setMeetingDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                background: T.inputBg,
                border: T.inputBorder,
                borderRadius: 8,
                color: T.textPrimary,
                fontSize: 13.5,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div style={{ flex: 2 }}>
            <label
              style={{
                fontSize: 12,
                color: T.textMuted,
                display: 'block',
                marginBottom: 4,
              }}
            >
              Child (optional)
            </label>
            <input
              type="text"
              value={childName}
              onChange={(e) => setChildName(e.target.value)}
              placeholder="e.g. Austin"
              style={{
                width: '100%',
                padding: '8px 10px',
                background: T.inputBg,
                border: T.inputBorder,
                borderRadius: 8,
                color: T.textPrimary,
                fontSize: 13.5,
                boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
            Summary (auto-filled from transcript; edit anything)
          </label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Three short paragraphs: what was discussed, what was agreed, what to follow up on."
            rows={8}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: T.inputBg,
              border: T.inputBorder,
              borderRadius: 10,
              color: T.textPrimary,
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: T.sans,
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, color: T.textMuted, display: 'block', marginBottom: 4 }}>
            Personal notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reminders only you'll see."
            rows={3}
            style={{
              width: '100%',
              padding: '12px 14px',
              background: T.inputBg,
              border: T.inputBorder,
              borderRadius: 10,
              color: T.textPrimary,
              fontSize: 14,
              lineHeight: 1.6,
              fontFamily: T.sans,
              boxSizing: 'border-box',
              resize: 'vertical',
            }}
          />
        </div>

        {transcript && (
          <details>
            <summary
              style={{
                cursor: 'pointer',
                color: T.textSoft,
                fontSize: 13,
              }}
            >
              Show / edit raw transcript
            </summary>
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              rows={10}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: T.inputBg,
                border: T.inputBorder,
                borderRadius: 10,
                color: T.textPrimary,
                fontSize: 13,
                lineHeight: 1.6,
                fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                boxSizing: 'border-box',
                resize: 'vertical',
                marginTop: 8,
              }}
            />
          </details>
        )}
      </div>

      {upgrade && (
        <div style={{ marginBottom: 14 }}>
          <UpgradeCard feature={upgrade.feature} upgradeUrl={upgrade.upgradeUrl} />
        </div>
      )}

      {error && !upgrade && (
        <div
          style={{
            padding: '10px 14px',
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.22)',
            borderRadius: 10,
            color: '#f87171',
            fontSize: 13.5,
            marginBottom: 14,
          }}
        >
          {error}
        </div>
      )}

      <button
        onClick={handleSave}
        disabled={saving}
        style={{
          width: '100%',
          padding: '14px 18px',
          background: T.emerald,
          color: '#062712',
          border: 'none',
          borderRadius: 12,
          fontSize: 15,
          fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
        }}
      >
        {saving && <Loader2 size={16} className="animate-spin" />}
        <Lock size={16} /> Encrypt &amp; save
      </button>
    </div>
  );
}
