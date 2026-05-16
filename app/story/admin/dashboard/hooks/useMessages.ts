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

  const loadMessages = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch(`/api/story/admin/message-history?limit=50&showExpired=${showExpired}`, {
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
    try {
      const session = getSession();
      // 🚨 Session 113 V2 Story audit F-2.1 — vault token is mandatory on
      // the server route. Without it, the call 401s with vault_locked=true.
      const vaultToken = getVaultToken ? getVaultToken() : null;
      if (!vaultToken) {
        alert('Vault locked — please unlock the vault first');
        setSavingToVault(null);
        return;
      }
      const res = await fetch('/api/story/admin/vault/save-from-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`,
          'x-vault-token': vaultToken,
        },
        body: JSON.stringify({ messageId, mediaUrl, filename })
      });
      if (res.ok) {
        setSavedToVault(prev => new Set(prev).add(messageId));
      } else {
        const data = await res.json();
        alert(data.error || 'Save failed');
      }
    } catch {
      alert('Save to vault failed');
    } finally {
      setSavingToVault(null);
    }
  }, [getSession, getVaultToken]);

  return {
    messages,
    statistics,
    showExpired,
    setShowExpired,
    savedToVault,
    savingToVault,
    loadMessages,
    saveMessageToVault
  };
};
