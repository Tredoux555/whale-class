'use client';

// /home/dashboard/page.tsx — Session 155
// Children grid for Montree Home families

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession, type HomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  age: number;
}

export default function HomeDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<HomeSession | null>(null);
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newAge, setNewAge] = useState(3);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const sess = getHomeSession();
    if (!sess) {
      router.push('/home/login');
      return;
    }
    setSession(sess);
  }, [router]);

  useEffect(() => {
    if (!session?.family?.id) {
      setLoading(false);
      return;
    }

    fetch(`/api/home/children?family_id=${session.family.id}`)
      .then((r) => r.json())
      .then((data) => {
        setChildren(data.children || []);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load children');
        setLoading(false);
      });
  }, [session?.family?.id]);

  const handleAddChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !session?.family?.id) return;

    setAdding(true);
    try {
      const res = await fetch('/api/home/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          family_id: session.family.id,
          name: newName.trim(),
          age: newAge,
        }),
      });
      const data = await res.json();
      if (data.child) {
        setChildren((prev) => [...prev, data.child]);
        setNewName('');
        setNewAge(3);
        setShowAddForm(false);
        toast.success(`${data.child.name} added!`);
      } else {
        toast.error(data.error || 'Failed to add child');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Connection error');
      }
    } finally {
      setAdding(false);
    }
  };

  if (!session || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">🏠</div>
      </div>
    );
  }

  // Color palette for child cards
  const colors = [
    'from-emerald-400 to-teal-500',
    'from-blue-400 to-indigo-500',
    'from-purple-400 to-pink-500',
    'from-orange-400 to-red-500',
    'from-cyan-400 to-blue-500',
    'from-rose-400 to-pink-500',
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              {session.family.name}&apos;s Family
            </h1>
            <p className="text-gray-500">
              {children.length} {children.length === 1 ? 'child' : 'children'}
            </p>
          </div>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl shadow-lg shadow-emerald-500/20 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            + Add Child
          </button>
        </div>

        {/* Add Child Form */}
        {showAddForm && (
          <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
            <form onSubmit={handleAddChild} className="flex flex-wrap gap-3 items-end">
              <div className="flex-1 min-w-[150px]">
                <label className="block text-sm font-medium text-gray-600 mb-1">Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                  placeholder="Child's name"
                  autoFocus
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-600 mb-1">Age</label>
                <select
                  value={newAge}
                  onChange={(e) => setNewAge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="px-6 py-2 bg-emerald-500 text-white font-medium rounded-xl hover:bg-emerald-600 transition-colors disabled:opacity-50"
              >
                {adding ? 'Adding...' : 'Add'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}

        {/* Children Grid */}
        {children.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <div className="text-5xl mb-4">👶</div>
            <h2 className="text-xl font-bold text-gray-700 mb-2">No children yet</h2>
            <p className="text-gray-500 mb-6">Add your first child to start tracking their Montessori journey.</p>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl shadow-lg"
            >
              + Add Your First Child
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {children.map((child, i) => (
              <button
                key={child.id}
                onClick={() => router.push(`/home/dashboard/${child.id}`)}
                className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all hover:scale-[1.02] p-6 text-center group"
              >
                <div className={`w-16 h-16 mx-auto mb-3 bg-gradient-to-br ${colors[i % colors.length]} rounded-full flex items-center justify-center text-2xl font-bold text-white shadow-lg`}>
                  {child.name.charAt(0).toUpperCase()}
                </div>
                <h3 className="font-bold text-gray-800 group-hover:text-emerald-600 transition-colors">
                  {child.name}
                </h3>
                <p className="text-sm text-gray-400">Age {child.age}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
