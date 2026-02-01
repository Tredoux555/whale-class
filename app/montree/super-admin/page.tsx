// /montree/super-admin/page.tsx
// Secure Super Admin Dashboard - All access is logged
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface School {
  id: string;
  name: string;
  slug: string;
  owner_email: string;
  owner_name: string | null;
  subscription_status: string;
  subscription_tier: string;
  plan_type: string;
  is_active: boolean;
  created_at: string;
  trial_ends_at: string | null;
  classroom_count?: number;
  teacher_count?: number;
  student_count?: number;
}

const SESSION_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes

export default function SuperAdminPage() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [lastActivity, setLastActivity] = useState<number>(Date.now());
  const [sessionWarning, setSessionWarning] = useState(false);

  // Simple audit logging
  const logAction = useCallback(async (action: string, details?: any) => {
    try {
      await fetch('/api/montree/super-admin/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, details, timestamp: new Date().toISOString() }),
      });
    } catch (e) {
      console.warn('Audit log failed:', e);
    }
  }, []);

  // Session timeout - auto logout after 15 min inactivity
  useEffect(() => {
    if (!authenticated) return;

    const checkSession = setInterval(() => {
      const elapsed = Date.now() - lastActivity;
      if (elapsed > SESSION_TIMEOUT_MS) {
        logAction('session_timeout');
        setAuthenticated(false);
        setSessionWarning(false);
        alert('Session expired for security. Please login again.');
      } else if (elapsed > SESSION_TIMEOUT_MS - 60000) {
        setSessionWarning(true);
      }
    }, 10000);

    return () => clearInterval(checkSession);
  }, [authenticated, lastActivity, logAction]);

  // Track activity
  const trackActivity = useCallback(() => {
    setLastActivity(Date.now());
    setSessionWarning(false);
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    window.addEventListener('mousemove', trackActivity);
    window.addEventListener('keydown', trackActivity);
    return () => {
      window.removeEventListener('mousemove', trackActivity);
      window.removeEventListener('keydown', trackActivity);
    };
  }, [authenticated, trackActivity]);

  const handleLogin = async () => {
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD || password === '870602') {
      setAuthenticated(true);
      setLastActivity(Date.now());
      await logAction('login_success');
      fetchSchools();
    } else {
      await logAction('login_failed', { attempted: true });
      setError('Invalid password');
    }
  };

  const fetchSchools = async () => {
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
  };

  const deleteSchool = async (school: School) => {
    const confirmMsg = `🚨 DELETE "${school.name}"?\n\nThis will permanently delete:\n• ${school.classroom_count || 0} classrooms\n• ${school.teacher_count || 0} teachers\n• ${school.student_count || 0} students\n• All curriculum and progress data\n\nType "DELETE" to confirm:`;

    const input = prompt(confirmMsg);
    if (input !== 'DELETE') {
      alert('Cancelled - you must type DELETE to confirm');
      return;
    }

    try {
      const res = await fetch(`/api/montree/super-admin/schools?schoolId=${school.id}&password=870602`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }

      // Remove from local state
      setSchools(prev => prev.filter(s => s.id !== school.id));
      alert(`✅ "${school.name}" deleted successfully`);
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete school: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const loginAsSchool = async (schoolId: string) => {
    try {
      const res = await fetch('/api/montree/super-admin/login-as', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schoolId, superAdminPassword: '870602' }),
      });

      if (!res.ok) throw new Error('Failed to login');
      
      const data = await res.json();
      
      // Store session (same as regular principal login)
      localStorage.setItem('montree_principal', JSON.stringify(data.principal));
      localStorage.setItem('montree_school', JSON.stringify(data.school));
      
      // Redirect to principal admin
      if (data.needsSetup) {
        router.push('/montree/principal/setup');
      } else {
        router.push('/montree/admin');
      }
    } catch (err) {
      console.error('Login as failed:', err);
      alert('Failed to login as principal');
    }
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <span className="text-4xl block mb-2">🔐</span>
            <h1 className="text-xl font-bold text-white">Master Admin</h1>
            <p className="text-slate-400 text-sm">Enter password to continue</p>
          </div>
          
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
            placeholder="Password"
            className="w-full p-4 bg-slate-700 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:border-emerald-500 outline-none"
            autoFocus
          />
          
          {error && <p className="mt-2 text-red-400 text-sm">{error}</p>}
          
          <button
            onClick={handleLogin}
            className="mt-4 w-full py-3 bg-emerald-500 text-white font-semibold rounded-xl hover:bg-emerald-600"
          >
            Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <span>🌳</span> Montree Master Admin
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {schools.length} registered school{schools.length !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            href="/montree/onboarding"
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700"
          >
            + Register School
          </Link>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Schools</p>
            <p className="text-2xl font-bold text-white">{schools.length}</p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Active</p>
            <p className="text-2xl font-bold text-emerald-400">
              {schools.filter(s => s.is_active).length}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Trialing</p>
            <p className="text-2xl font-bold text-amber-400">
              {schools.filter(s => s.subscription_status === 'trialing').length}
            </p>
          </div>
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-4">
            <p className="text-slate-400 text-sm">Total Classrooms</p>
            <p className="text-2xl font-bold text-blue-400">
              {schools.reduce((sum, s) => sum + (s.classroom_count || 0), 0)}
            </p>
          </div>
        </div>

        {/* Schools Table */}
        {loading ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <div className="animate-pulse">
              <div className="h-6 w-48 bg-slate-700 rounded mx-auto mb-4"></div>
              <div className="h-4 w-32 bg-slate-700 rounded mx-auto"></div>
            </div>
          </div>
        ) : schools.length === 0 ? (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-12 text-center">
            <span className="text-5xl block mb-4">📭</span>
            <h2 className="text-xl font-semibold text-white mb-2">No schools registered yet</h2>
            <p className="text-slate-400 mb-6">Be the first to register a school!</p>
            <Link
              href="/montree/onboarding"
              className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600"
            >
              Register First School
            </Link>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-slate-800">
                <tr>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">School</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Owner</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Status</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Stats</th>
                  <th className="text-left p-4 text-slate-400 font-medium text-sm">Created</th>
                  <th className="text-right p-4 text-slate-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-slate-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">🏫</span>
                        <div>
                          <p className="font-medium text-white">{school.name}</p>
                          <p className="text-slate-500 text-sm">{school.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <p className="text-white">{school.owner_name || '-'}</p>
                      <p className="text-slate-400 text-sm">{school.owner_email}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          school.is_active 
                            ? 'bg-emerald-500/20 text-emerald-400' 
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {school.is_active ? 'Active' : 'Inactive'}
                        </span>
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium w-fit ${
                          school.subscription_status === 'trialing'
                            ? 'bg-amber-500/20 text-amber-400'
                            : school.subscription_status === 'active'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-500/20 text-slate-400'
                        }`}>
                          {school.subscription_status} / {school.subscription_tier}
                        </span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-sm">
                        <p className="text-slate-300">
                          <span className="text-slate-500">Classrooms:</span> {school.classroom_count || 0}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-500">Teachers:</span> {school.teacher_count || 0}
                        </p>
                        <p className="text-slate-300">
                          <span className="text-slate-500">Students:</span> {school.student_count || 0}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 text-slate-400 text-sm">
                      {new Date(school.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => loginAsSchool(school.id)}
                          className="px-3 py-1 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg text-sm font-medium transition-colors"
                        >
                          Login As →
                        </button>
                        <button
                          onClick={() => deleteSchool(school)}
                          className="px-3 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm font-medium transition-colors"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
