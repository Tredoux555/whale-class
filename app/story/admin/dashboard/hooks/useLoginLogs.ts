import { useState, useCallback } from 'react';
import { LoginLog, Visit } from '../types';

export const useLoginLogs = (getSession: () => string | null) => {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loginLogsError, setLoginLogsError] = useState<string | null>(null);

  const loadLoginLogs = useCallback(async () => {
    const session = getSession();
    if (!session) {
      setLoginLogsError('No admin session');
      return;
    }
    try {
      setLoginLogsError(null);
      // Fetch both login logs and visits in parallel
      const [logsRes, visitsRes] = await Promise.all([
        fetch('/api/story/admin/login-logs?limit=100', {
          headers: { 'Authorization': `Bearer ${session}` }
        }),
        fetch('/api/story/admin/visits?limit=100', {
          headers: { 'Authorization': `Bearer ${session}` }
        }),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLoginLogs(data.logs || []);
      } else {
        const errData = await logsRes.json().catch(() => ({ error: `HTTP ${logsRes.status}` }));
        console.error('[useLoginLogs] Logs fetch failed:', logsRes.status, errData);
        setLoginLogsError(errData.error || `Failed (${logsRes.status})`);
      }

      if (visitsRes.ok) {
        const data = await visitsRes.json();
        setVisits(data.visits || []);
      }
    } catch (e) {
      console.error('[useLoginLogs] Exception:', e);
      setLoginLogsError(e instanceof Error ? e.message : 'Network error');
    }
  }, [getSession]);

  return {
    loginLogs,
    visits,
    loginLogsError,
    loadLoginLogs
  };
};
