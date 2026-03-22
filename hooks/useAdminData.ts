import { useState, useEffect, useCallback, useRef } from 'react';
import { School, Feedback, Lead } from '@/components/montree/super-admin/types';

interface UseAdminDataProps {
  password: string;  // JWT session token (legacy name kept for interface compat)
  logAction: (action: string, details?: Record<string, unknown>) => Promise<void>;
  authenticated: boolean;
}

function authHeaders(token: string): Record<string, string> {
  return token ? { 'x-super-admin-token': token } : {};
}

export function useAdminData({ password, logAction, authenticated }: UseAdminDataProps) {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [newLeadCount, setNewLeadCount] = useState(0);
  const [dmUnreadTotal, setDmUnreadTotal] = useState(0);
  const [dmUnreadPerConvo, setDmUnreadPerConvo] = useState<Record<string, { count: number; sender_name: string }>>({});

  const dmFetchingRef = useRef(false);

  const fetchSchools = useCallback(async () => {
    try {
      const res = await fetch('/api/montree/super-admin/schools', {
        headers: authHeaders(password)
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSchools(data.schools || []);
      await logAction('view_schools', { count: data.schools?.length || 0 });
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    } finally {
      setLoading(false);
    }
  }, [logAction, password]);

  const fetchFeedback = useCallback(async () => {
    setLoadingFeedback(true);
    try {
      const res = await fetch('/api/montree/feedback', {
        headers: authHeaders(password)
      });
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setFeedback(data.feedback || []);
      setUnreadCount((data.feedback || []).filter((f: Feedback) => !f.is_read).length);
    } catch (err) {
      console.error('Failed to fetch feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  }, [password]);

  const fetchLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await fetch('/api/montree/leads', {
        headers: authHeaders(password)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to fetch leads:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
          passwordSent: password ? 'provided' : 'none'
        });
        throw new Error(`Failed to fetch leads (${res.status}): ${errorData.error || res.statusText}`);
      }
      const data = await res.json();
      setLeads(data.leads || []);
      setNewLeadCount(data.new_count || 0);
    } catch (err) {
      console.error('Failed to fetch leads:', err);
    } finally {
      setLoadingLeads(false);
    }
  }, [password]);

  const dmPollIntervalRef = useRef(30000);
  const DM_POLL_MIN = 30000;
  const DM_POLL_MAX = 300000; // 5 min max backoff

  const fetchDmUnread = useCallback(async () => {
    if (!password || dmFetchingRef.current) return;
    dmFetchingRef.current = true;
    try {
      const res = await fetch('/api/montree/dm?reader_type=admin', {
        headers: authHeaders(password)
      });
      if (!res.ok) {
        dmPollIntervalRef.current = Math.min(dmPollIntervalRef.current * 2, DM_POLL_MAX);
        return;
      }
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) return;
      const data = await res.json();
      setDmUnreadTotal(data.total_unread || 0);
      setDmUnreadPerConvo(data.per_conversation || {});
      dmPollIntervalRef.current = DM_POLL_MIN; // Reset on success
    } catch (err) {
      dmPollIntervalRef.current = Math.min(dmPollIntervalRef.current * 2, DM_POLL_MAX);
    } finally {
      dmFetchingRef.current = false;
    }
  }, [password]);

  // Poll for unread DMs with exponential backoff on errors
  useEffect(() => {
    if (!authenticated) return;
    fetchDmUnread();
    let timeoutId: ReturnType<typeof setTimeout>;
    const poll = () => {
      timeoutId = setTimeout(async () => {
        await fetchDmUnread();
        poll();
      }, dmPollIntervalRef.current);
    };
    poll();
    return () => clearTimeout(timeoutId);
  }, [authenticated, fetchDmUnread]);

  return {
    schools,
    setSchools,
    loading,
    setLoading,
    feedback,
    setFeedback,
    loadingFeedback,
    unreadCount,
    setUnreadCount,
    leads,
    setLeads,
    loadingLeads,
    newLeadCount,
    setNewLeadCount,
    dmUnreadTotal,
    setDmUnreadTotal,
    dmUnreadPerConvo,
    setDmUnreadPerConvo,
    fetchSchools,
    fetchFeedback,
    fetchLeads,
    fetchDmUnread
  };
}
