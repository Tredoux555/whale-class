'use client';

// /home/settings/page.tsx — Session 155
// Family settings page

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession, clearHomeSession, type HomeSession } from '@/lib/home/auth';

export default function HomeSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<HomeSession | null>(null);

  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) {
      router.push('/home/login');
      return;
    }
    setSession(sess);
  }, [router]);

  const handleLogout = () => {
    clearHomeSession();
    router.push('/home');
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-4xl">🏠</div>
      </div>
    );
  }

  const planBadge: Record<string, string> = {
    free: '🆓 Free',
    starter: '⭐ Starter',
    premium: '👑 Premium',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <div className="max-w-lg mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Family Settings</h1>

        {/* Family Info Card */}
        <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4 mb-6">
          <div>
            <label className="text-sm text-gray-500">Name</label>
            <p className="text-lg font-medium text-gray-800">{session.family.name}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Email</label>
            <p className="text-lg font-medium text-gray-800">{session.family.email}</p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Plan</label>
            <p className="text-lg font-medium text-gray-800">
              {planBadge[session.family.plan] || session.family.plan}
            </p>
          </div>
          <div>
            <label className="text-sm text-gray-500">Member since</label>
            <p className="text-lg font-medium text-gray-800">
              {new Date(session.loginAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
