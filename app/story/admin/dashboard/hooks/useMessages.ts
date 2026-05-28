import { useState, useCallback } from 'react';
import { Message, Statistics } from '../types';

export const useMessages = (
  getSession: () => string | null,
  // 🚨 Session 113 V2 Story audit F-2.1 — vault token getter is optional
  // (some pages use useMessages without saveMessageToVault). When provided,
  // saveMessageToVault sends it as x-vault-token; without it, the call is
  // gated by the parent UI (which only renders 'Save to vault' once the
  // operator has unlocked the vault).
  getVaultToken?: () => string | null
) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [statistics, setStatistics] = useState<Statistics[]>([]);
  const [showExpired, setShowExpired] = useState(false);
  const [savedToVault, setSavedToVault] = useState<Set<number>>(new Set());
  const [savingToVault, setSavingToVault] = useState<number | null>(null);
  // Inline error state keyed by message id. Previous version used
  // window.alert() which iOS Home-Screen PWAs silently suppress —
  // the user saw the save button toggle on/off with no feedback.
  // Now the error renders inline next to the failing message.
  const [vaultSaveError, setVaultSaveError] = useState<{
    messageId: number;
    message: string;
  } | null>(null);

  const loadMessages = useCallback(async () => {
    const session = getSession();
    try {
      // Per user request: only the latest message — not a history. The admin
      // surface stays focused on what's CURRENTLY out there for the user.
      const res = await fetch(`/api/story/admin/message-history?limit=1&showExpired=${showExpired}`, {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data.messages || []);
        setStatistics(data.statistics || []);
      }
    } catch {
      // Handle silently
    }
  }, [getSession, showExpired]);

  const saveMessageToVault = useCallback(async (messageId: number, mediaUrl: string, filename: string | null) => {
    setSavingToVault(messageId);
    // Clear any prior error on this message — a retry should reset the
    // displayed error before showing the spinner.
    setVaultSaveError((prev) =>
      prev && prev.messageId === messageId ? null : prev
    );

    const setError = (message: string, logCtx?: unknown) => {
      // Console log so devs can diagnose on iOS Safari remote-inspect
      // (alerts are suppressed in PWA mode, so this is the only visible
      // signal in the inspector).
      console.error('[vault save]', message, logCtx ?? '');
      setVaultSaveError({ messageId, message });
    };

    try {
      const session = getSession();
      if (!session) {
        setError('Not signed in. Refresh the page and sign in again.');
        return;
      }
      // 🚨 Session 113 V2 Story audit F-2.1 — vault token is mandatory on
      // the server route. Without it, the call 401s with vault_locked=true.
      const vaultToken = getVaultToken ? getVaultToken() : null;
      if (!vaultToken) {
        setError('Vault is locked. Open the Vault tab and re-enter the password.');
        return;
      }
      let res: Response;
      try {
        res = await fetch('/api/story/admin/vault/save-from-message', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session}`,
            'x-vault-token': vaultToken,
          },
          body: JSON.stringify({ messageId, mediaUrl, filename })
        });
      } catch (err) {
        setError('Network error — check your connection and try again.', err);
        return;
      }
      if (res.ok) {
        setSavedToVault(prev => new Set(prev).add(messageId));
        // Clear any stale error display on this message.
        setVaultSaveError((prev) =>
          prev && prev.messageId === messageId ? null : prev
        );
        return;
      }
      // Non-OK — extract the server's error message if it's JSON, fall
      // back to a status hint otherwise. iOS Safari sometimes serves a
      // 0-status (opaque) response on background-suspended PWAs; surface
      // that distinctly so the user knows to re-open the app.
      let serverError = `Save failed (HTTP ${res.status})`;
      try {
        const data = await res.json();
        if (data && typeof data.error === 'string') serverError = data.error;
        if (res.status === 401) serverError = 'Vault session expired. Re-enter the vault password.';
      } catch {
        /* keep the status fallback */
      }
      setError(serverError, { status: res.status });
    } finally {
      setSavingToVault(null);
    }
  }, [getSession, getVaultToken]);

  // Clear the inline error explicitly (e.g. user dismisses the toast or
  // navigates away from the failing message).
  const clearVaultSaveError = useCallback(() => setVaultSaveError(null), []);

  return {
    messages,
    statistics,
    showExpired,
    setShowExpired,
    savedToVault,
    savingToVault,
    vaultSaveError,
    clearVaultSaveError,
    loadMessages,
    saveMessageToVault
  };
};
