import { useState, useCallback } from 'react';
import { Message, Statistics } from '../types';

export const useMessages = (getSession: () => string | null) => {
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
      const res = await fetch('/api/story/admin/vault/save-from-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session}`
        },
        body: JSON.stringify({ messageId, mediaUrl, filename })
      });
      if (res.ok) {
        setSavedToVault(prev => new Set(prev).add(messageId));
      } else {
        const data = await res.json();
        alert('Save failed: ' + (data.error || 'Unknown error'));
      }
    } catch {
      alert('Save to vault failed');
    } finally {
      setSavingToVault(null);
    }
  }, [getSession]);

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
