import { useState, useEffect, useCallback, useRef } from 'react';
import { School, Feedback, Lead } from '@/components/montree/super-admin/types';

interface UseAdminDataProps {
  password: string;
  logAction: (action: string, details?: any) => Promise<void>;
  authenticated: boolean;
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
      const res = await fetch('/api/montree/super-admin/schools');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setSchools(data.schools || []);
      await logAction('view_schools', { count: data.schools?.length || 0 });
    } catch (err) {
      console.error('Failed to fetch schools:', err);
    } finally {
      setLoading(false);
    }
  }, [logAction]);

  const fetchFeedback = useCallback(async () => {
    setLoadingFeedback(true);
    try {
      const res = await fetch('/api/montree/feedback', {
        headers: { 'x-super-admin-password': password }
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
        headers: { 'x-super-admin-password': password }
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('Failed to fetch leads:', {
          status: res.status,
          statusText: res.statusText,
          error: errorData,
          passwordSent: password ? `${password.substring(0, 2)}***` : 'none'
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

  const fetchDmUnread = useCallback(async () => {
    if (!password || dmFetchingRef.current) return;
    dmFetchingRef.current = true;
    try {
      const res = await fetch('/api/montree/dm?reader_type=admin', {
        headers: { 'x-super-admin-password': password }
      });
      if (!res.ok) return;
      const contentType = res.headers.get('content-type');
      if (!contentType?.includes('application/json')) return;
      const data = await res.json();
      setDmUnreadTotal(data.total_unread || 0);
      setDmUnreadPerConvo(data.per_conversation || {});
    } catch (err) {
      // Silently handle polling errors
    } finally {
      dmFetchingRef.current = false;
    }
  }, [password]);

  // Poll for unread DMs every 30s when authenticated
  useEffect(() => {
    if (!authenticated) return;
    fetchDmUnread();
    const interval = setInterval(fetchDmUnread, 30000);
    return () => clearInterval(interval);
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
