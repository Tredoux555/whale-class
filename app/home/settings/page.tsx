'use client';

// /home/settings/page.tsx
// Family settings - manage family info, children, preferences

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession, clearHomeSession, type HomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  age: number;
}

export default function HomeSettingsPage() {
  const router = useRouter();
  const [session, setSession] = useState<HomeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);

  // Family settings form state
  const [familyName, setFamilyName] = useState('');
  const [familyEmail, setFamilyEmail] = useState('');
  const [reminderTime, setReminderTime] = useState('09:00');
  const [activitiesGoal, setActivitiesGoal] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);

  // Add child form state
  const [showAddChildForm, setShowAddChildForm] = useState(false);
  const [newChildName, setNewChildName] = useState('');
  const [newChildAge, setNewChildAge] = useState(3);
  const [addingChild, setAddingChild] = useState(false);

  // Delete family state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) {
      router.push('/home/login');
      return;
    }
    setSession(sess);
    setFamilyName(sess.family.name);
    setFamilyEmail(sess.family.email);
    setLoading(false);

    // Fetch children
    fetch(`/api/home/children?family_id=${sess.family.id}`)
      .then(r => r.json())
      .then(data => setChildren(data.children || []))
      .catch(() => toast.error('Failed to load children'));
  }, [router]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;

    setSavingSettings(true);
    try {
      const res = await fetch('/api/home/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: session.family.id,
          family_name: familyName.trim(),
          family_email: familyEmail.trim(),
          daily_reminder_time: reminderTime,
          activities_per_day_goal: activitiesGoal,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Settings saved!');
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !newChildName.trim()) return;

    setAddingChild(true);
    try {
      const res = await fetch('/api/home/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: session.family.id,
          name: newChildName.trim(),
          age: newChildAge,
        }),
      });
      const data = await res.json();
      if (data.child) {
        setChildren(prev => [...prev, data.child]);
        setNewChildName('');
        setNewChildAge(3);
        setShowAddChildForm(false);
        toast.success(`${data.child.name} added!`);
      } else {
        toast.error(data.error || 'Failed to add child');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setAddingChild(false);
    }
  };

  const handleDeleteChild = async (childId: string, childName: string) => {
    if (!confirm(`Remove ${childName} from your family? This action cannot be undone.`)) return;
    if (!session) return;

    try {
      const res = await fetch(`/api/home/children/${childId}?family_id=${session.family.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        setChildren(prev => prev.filter(c => c.id !== childId));
        toast.success(`${childName} removed`);
      } else {
        toast.error(data.error || 'Failed to delete child');
      }
    } catch {
      toast.error('Connection error');
    }
  };

  const handleDeleteFamily = async () => {
    if (!session) return;
    if (!confirm('Delete your entire family account? All data will be permanently removed.')) return;

    setDeleting(true);
    try {
      const res = await fetch('/api/home/auth/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ family_id: session.family.id }),
      });
      const data = await res.json();
      if (data.success) {
        clearHomeSession();
        router.push('/home');
      } else {
        toast.error(data.error || 'Failed to delete account');
        setDeleting(false);
      }
    } catch {
      toast.error('Connection error');
      setDeleting(false);
    }
  };

  const handleLogout = () => {
    clearHomeSession();
    router.push('/home');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-bounce text-5xl">⚙️</div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="space-y-8 max-w-2xl">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Settings</h1>
        <p className="text-gray-500">Manage your family account and preferences</p>
      </div>

      {/* Family Settings */}
      <section className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Family Settings</h2>

        <form onSubmit={handleSaveSettings} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Family Name</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 transition-colors"
              placeholder="e.g., Johnson Family"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
            <input
              type="email"
              value={familyEmail}
              onChange={(e) => setFamilyEmail(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 transition-colors"
              placeholder="family@example.com"
            />
            <p className="text-xs text-gray-500 mt-2">Used to recover your access code if needed</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Daily Reminder Time</label>
              <input
                type="time"
                value={reminderTime}
                onChange={(e) => setReminderTime(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Daily Activities Goal</label>
              <select
                value={activitiesGoal}
                onChange={(e) => setActivitiesGoal(Number(e.target.value))}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 transition-colors"
              >
                {[1, 2, 3, 4, 5].map(n => (
                  <option key={n} value={n}>{n} activities</option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            disabled={savingSettings}
            className="w-full px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingSettings ? 'Saving...' : 'Save Settings'}
          </button>
        </form>
      </section>

      {/* Children Management */}
      <section className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800">Children</h2>
          <span className="text-sm text-gray-500">{children.length} children</span>
        </div>

        {/* Children List */}
        <div className="space-y-3 mb-6">
          {children.map(child => (
            <div key={child.id} className="flex items-center justify-between bg-gray-50 rounded-xl p-4">
              <div>
                <h3 className="font-semibold text-gray-800">{child.name}</h3>
                <p className="text-sm text-gray-500">Age {child.age}</p>
              </div>
              <button
                onClick={() => handleDeleteChild(child.id, child.name)}
                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        {/* Add Child Form */}
        {showAddChildForm ? (
          <form onSubmit={handleAddChild} className="space-y-4 bg-emerald-50 rounded-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                <input
                  type="text"
                  value={newChildName}
                  onChange={(e) => setNewChildName(e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
                  placeholder="Child's name"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                <select
                  value={newChildAge}
                  onChange={(e) => setNewChildAge(Number(e.target.value))}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400"
                >
                  {[2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map(a => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={addingChild || !newChildName.trim()}
                className="flex-1 px-6 py-2 bg-emerald-600 text-white font-semibold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {addingChild ? 'Adding...' : 'Add Child'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddChildForm(false)}
                className="flex-1 px-6 py-2 bg-white text-gray-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddChildForm(true)}
            className="w-full px-6 py-3 border-2 border-dashed border-emerald-300 text-emerald-600 font-semibold rounded-xl hover:bg-emerald-50 transition-colors"
          >
            + Add Another Child
          </button>
        )}
      </section>

      {/* Account Section */}
      <section className="bg-white rounded-2xl shadow-md p-8 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-6">Account</h2>

        <div className="space-y-4 mb-6">
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Plan</span>
            <span className="font-semibold text-gray-800 capitalize">{session.family.plan}</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-100">
            <span className="text-gray-600">Family ID</span>
            <span className="font-mono text-sm text-gray-800">{session.family.id.slice(0, 8)}...</span>
          </div>
          <div className="flex justify-between py-3">
            <span className="text-gray-600">Member Since</span>
            <span className="text-gray-800">
              {new Date(session.loginAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full px-6 py-3 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
        >
          Sign Out
        </button>
      </section>

      {/* Danger Zone */}
      <section className="bg-red-50 border-2 border-red-200 rounded-2xl p-8">
        <h2 className="text-xl font-bold text-red-900 mb-4">Danger Zone</h2>

        {showDeleteConfirm ? (
          <div className="space-y-4">
            <p className="text-red-800">
              <span className="font-semibold">Are you sure?</span> This will permanently delete your account and all data. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteFamily}
                disabled={deleting}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Everything'}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-6 py-3 bg-white text-red-600 font-semibold rounded-xl hover:bg-red-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-6 py-3 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
          >
            Delete Family Account
          </button>
        )}
      </section>
    </div>
  );
}
