import { useState, useCallback } from 'react';
import { SystemStats } from '../types';

export const useSystemControls = (getSession: () => string | null) => {
  const [systemStats, setSystemStats] = useState<SystemStats>({
    messages: 0,
    users: 0,
    loginLogs: 0,
    vaultFiles: 0
  });
  const [controlsLoading, setControlsLoading] = useState(false);
  const [controlsMessage, setControlsMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [nukeCode, setNukeCode] = useState('');
  const [scorchAdmins, setScorchAdmins] = useState(false);

  const loadSystemStats = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/system-controls', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSystemStats(data.stats);
      }
    } catch {
      console.error('Failed to load system stats');
    }
  }, [getSession]);

  const executeSystemAction = useCallback(
    async (action: string, confirmMessage: string, onSuccess?: () => Promise<void>) => {
      if (!confirm(`${confirmMessage}\n\nThis action cannot be undone. Type CONFIRM to proceed.`)) return;

      setControlsLoading(true);
      setControlsMessage(null);

      try {
        const session = getSession();
        const res = await fetch('/api/story/admin/system-controls', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session}`
          },
          body: JSON.stringify({ action, confirmCode: 'CONFIRM' })
        });

        const data = await res.json();

        if (res.ok && data.success) {
          setControlsMessage({ type: 'success', text: data.message });
          await loadSystemStats();
          if (onSuccess) {
            await onSuccess();
          }
        } else {
          setControlsMessage({ type: 'error', text: data.error || 'Action failed' });
        }
      } catch {
        setControlsMessage({ type: 'error', text: 'Connection error' });
      } finally {
        setControlsLoading(false);
      }
    },
    [getSession, loadSystemStats]
  );

  // ☢️ Total nuke — destroys ALL Story data + storage. Gated by the secret
  // STORY_NUKE_CODE (entered here), not the admin session alone, so it works
  // even if locked out. confirmPhrase is fixed server-side.
  const executeNuke = useCallback(
    async (onSuccess?: () => Promise<void>) => {
      if (!nukeCode.trim()) {
        setControlsMessage({ type: 'error', text: 'Enter the nuke code first.' });
        return;
      }
      if (
        !confirm(
          '☢️ NUKE EVERYTHING?\n\nThis permanently destroys ALL Story data — every message, photo, video, vault file, user account, and log — and empties all storage buckets.' +
            (scorchAdmins ? '\n\nAdmin logins WILL ALSO be deleted — you will be locked out.' : '') +
            '\n\nThis CANNOT be undone. Proceed?'
        )
      )
        return;

      setControlsLoading(true);
      setControlsMessage(null);
      try {
        const session = getSession();
        const res = await fetch('/api/story/admin/system-controls/nuke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session}`,
          },
          body: JSON.stringify({
            nukeCode: nukeCode.trim(),
            confirmPhrase: 'NUKE EVERYTHING',
            scorchAdmins,
          }),
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setControlsMessage({ type: 'success', text: data.message || 'Nuked.' });
          setNukeCode('');
          await loadSystemStats();
          if (onSuccess) await onSuccess();
        } else {
          setControlsMessage({ type: 'error', text: data.error || data.message || 'Nuke failed' });
        }
      } catch {
        setControlsMessage({ type: 'error', text: 'Connection error' });
      } finally {
        setControlsLoading(false);
      }
    },
    [nukeCode, scorchAdmins, getSession, loadSystemStats]
  );

  return {
    systemStats,
    controlsLoading,
    controlsMessage,
    loadSystemStats,
    executeSystemAction,
    nukeCode,
    setNukeCode,
    scorchAdmins,
    setScorchAdmins,
    executeNuke,
  };
};
