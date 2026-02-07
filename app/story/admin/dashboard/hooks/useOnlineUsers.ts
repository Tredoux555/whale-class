import { useState, useCallback } from 'react';
import { OnlineUser } from '../types';

export const useOnlineUsers = (getSession: () => string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const loadOnlineUsers = useCallback(async () => {
    const session = getSession();
    try {
      const res = await fetch('/api/story/admin/online-users', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOnlineUsers(data.onlineUsers || []);
        setOnlineCount(data.onlineCount || 0);
        setTotalUsers(data.totalUsers || 0);
      }
    } catch {
      // Handle silently
    }
  }, [getSession]);

  return {
    onlineUsers,
    onlineCount,
    totalUsers,
    loadOnlineUsers
  };
};
