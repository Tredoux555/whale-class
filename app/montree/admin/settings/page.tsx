// /montree/admin/settings/page.tsx
// School Settings - for principals
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast, Toaster } from 'sonner';

interface School {
  id: string;
  name: string;
  slug: string;
  subscription_status: string;
  plan_type: string;
}

interface Principal {
  id: string;
  name: string;
  email: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [school, setSchool] = useState<School | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);

  // Form state
  const [schoolName, setSchoolName] = useState('');
  const [principalName, setPrincipalName] = useState('');
  const [principalEmail, setPrincipalEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');

    if (!schoolData || !principalData) {
      router.push('/montree/principal/login');
      return;
    }

    fetchData();
  };

  const getHeaders = () => {
    const schoolData = localStorage.getItem('montree_school');
    const principalData = localStorage.getItem('montree_principal');
    const school = schoolData ? JSON.parse(schoolData) : null;
    const principal = principalData ? JSON.parse(principalData) : null;

    return {
      'Content-Type': 'application/json',
      'x-school-id': school?.id || '',
      'x-principal-id': principal?.id || '',
    };
  };

  const fetchData = async () => {
    try {
      const res = await fetch('/api/montree/admin/overview', { headers: getHeaders() });

      if (res.status === 401) {
        router.push('/montree/principal/login');
        return;
      }

      const data = await res.json();
      setSchool(data.school);
      setPrincipal(data.principal);

      // Initialize form
      if (data.school) setSchoolName(data.school.name);
      if (data.principal) {
        setPrincipalName(data.principal.name);
        setPrincipalEmail(data.principal.email);
      }
    } catch (err) {
      console.error('Failed to fetch:', err);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (newPassword && newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        school_name: schoolName,
        principal_name: principalName,
        principal_email: principalEmail,
      };

      if (newPassword) {
        payload.new_password = newPassword;
      }

      const res = await fetch('/api/montree/admin/settings', {
        method: 'PATCH',
        headers: getHeaders(),
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        // Update localStorage
        const schoolData = localStorage.getItem('montree_school');
        if (schoolData) {
          const school = JSON.parse(schoolData);
          school.name = schoolName;
          localStorage.setItem('montree_school', JSON.stringify(school));
        }

        const principalData = localStorage.getItem('montree_principal');
        if (principalData) {
          const principal = JSON.parse(principalData);
          principal.name = principalName;
          principal.email = principalEmail;
          localStorage.setItem('montree_principal', JSON.stringify(principal));
        }

        toast.success('Settings saved');
        setNewPassword('');
        setConfirmPassword('');
        fetchData();
      } else {
        toast.error('Failed to save settings');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('montree_school');
    localStorage.removeItem('montree_principal');
    router.push('/montree');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4 animate-bounce">⚙️</div>
          <p className="text-emerald-200">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 p-4 md:p-6">
      <Toaster position="top-center" />
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/montree/admin" className="text-emerald-300 hover:text-white text-2xl">←</Link>
          <div>
            <h1 className="text-2xl font-bold text-white">⚙️ School Settings</h1>
            <p className="text-emerald-300 text-sm">Manage your school profile</p>
          </div>
        </div>

        {/* Settings Form */}
        <div className="bg-white/10 rounded-2xl p-6 border border-emerald-700 space-y-6">
          {/* School Info */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🏫</span> School Information
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300 text-sm mb-1">School Name</label>
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white placeholder-emerald-400/50 focus:border-emerald-400 focus:outline-none"
                  placeholder="e.g., Beijing International School"
                />
              </div>
              {school?.slug && (
                <div className="text-sm text-emerald-400">
                  School URL: montree.app/{school.slug}
                </div>
              )}
            </div>
          </div>

          <hr className="border-emerald-700" />

          {/* Principal Info */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>👤</span> Principal Account
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Name</label>
                <input
                  type="text"
                  value={principalName}
                  onChange={(e) => setPrincipalName(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white placeholder-emerald-400/50 focus:border-emerald-400 focus:outline-none"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Email</label>
                <input
                  type="email"
                  value={principalEmail}
                  onChange={(e) => setPrincipalEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white placeholder-emerald-400/50 focus:border-emerald-400 focus:outline-none"
                  placeholder="principal@school.com"
                />
              </div>
            </div>
          </div>

          <hr className="border-emerald-700" />

          {/* Change Password */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔐</span> Change Password
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-emerald-300 text-sm mb-1">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white placeholder-emerald-400/50 focus:border-emerald-400 focus:outline-none"
                  placeholder="Leave blank to keep current"
                />
              </div>
              <div>
                <label className="block text-emerald-300 text-sm mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 border border-emerald-600 rounded-xl text-white placeholder-emerald-400/50 focus:border-emerald-400 focus:outline-none"
                  placeholder="Confirm password"
                />
              </div>
            </div>
          </div>

          <hr className="border-emerald-700" />

          {/* Subscription Info */}
          {school && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>💳</span> Subscription
              </h2>
              <div className="bg-black/20 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-emerald-300">Status</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    school.subscription_status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : school.subscription_status === 'trial'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-red-500/20 text-red-300'
                  }`}>
                    {school.subscription_status === 'active' ? '✓ Active' :
                     school.subscription_status === 'trial' ? '⏰ Trial' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-emerald-300">Plan</span>
                  <span className="text-white">{school.plan_type || 'Free'}</span>
                </div>
              </div>
              <Link
                href="/montree/admin/billing"
                className="block mt-3 text-center py-2 bg-emerald-500/20 text-emerald-300 rounded-lg hover:bg-emerald-500/30 transition-colors"
              >
                Manage Subscription →
              </Link>
            </div>
          )}

          {/* Save Button */}
          <div className="flex gap-3 pt-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-6 bg-red-500/10 rounded-2xl p-6 border border-red-500/30">
          <h2 className="text-lg font-semibold text-red-300 mb-4 flex items-center gap-2">
            <span>⚠️</span> Danger Zone
          </h2>
          <p className="text-red-200/70 text-sm mb-4">
            Logging out will end your session. You can log back in anytime.
          </p>
          <button
            onClick={handleLogout}
            className="w-full py-3 bg-red-500/20 text-red-300 rounded-xl font-medium hover:bg-red-500/30 transition-colors"
          >
            🚪 Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
