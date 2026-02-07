import { useState, useCallback } from 'react';
import { LoginLog } from '../types';

export const useLoginLogs = (getSession: () => string | null) => {
  const [loginLogs, setLoginLogs] = useState<LoginLog[]>([]);

  const loadLoginLogs = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/login-logs?limit=50', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogs(data.logs || []);
      }
    } catch {
      // Handle silently
    }
  }, [getSession]);

  return {
    loginLogs,
    loadLoginLogs
  };
};
