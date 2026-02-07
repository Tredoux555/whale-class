import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export const useAuthSession = () => {
  const router = useRouter();

  const getSession = useCallback(() => {
    return sessionStorage.getItem('story_admin_session');
  }, []);

  const verifySession = useCallback(async () => {
    const session = getSession();
    if (!session) {
      router.push('/story/admin');
      return false;
    }
    try {
      const res = await fetch('/api/story/admin/auth', {
        headers: { 'Authorization': `Bearer ${session}` }
      });
      if (!res.ok) {
        sessionStorage.removeItem('story_admin_session');
        router.push('/story/admin');
        return false;
      }
      return true;
    } catch {
      router.push('/story/admin');
      return false;
    }
  }, [router, getSession]);

  const handleLogout = useCallback(() => {
    sessionStorage.removeItem('story_admin_session');
    router.push('/story/admin');
  }, [router]);

  return {
    getSession,
    verifySession,
    handleLogout
  };
};
