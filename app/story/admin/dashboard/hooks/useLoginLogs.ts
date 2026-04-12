import { useState, useCallback } from 'react';
import { LoginLog } from '../types';

export const useLoginLogs = (getSession: () => string | null) => {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [loginLogsError, setLoginLogsError] = useState<string | null>(null);

  const loadLoginLogs = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setLoginLogsError('No admin session');
      return;
    }
    try {
      setLoginLogsError(null);
      const res = await fetch('/api/story/admin/login-logs?limit=100', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.logs || []);
      } else {
        const errData = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
        console.error('[useLoginLogs] Fetch failed:', res.status, errData);
        setLoginLogsError(errData.error || `Failed (${res.status})`);
      }
    } catch (e) {
      console.error('[useLoginLogs] Exception:', e);
      setLoginLogsError(e instanceof Error ? e.message : 'Network error');
    }
  }, [getSession]);

  return {
    loginLogs,
    loginLogsError,
    loadLoginLogs
  };
};
