'use client';

// /home/dashboard/page.tsx
// Children grid for Montree Home families - shows all children with quick stats

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getHomeSession, type HomeSession } from '@/lib/home/auth';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  age: number;
  photo_url?: string;
}

interface ChildWithStats extends Child {
  stats?: {
    total_works: number;
    mastered_count: number;
    practicing_count: number;
  };
}

export default function HomeDashboardPage() {
  const router = useRouter();
  const [session, setSession] = useState<HomeSession | null>(null);
  const [children, setChildren] = useState<ChildWithStats[]>([]);
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
        const childrenList = data.children || [];
        setChildren(childrenList);
        setLoading(false);

        // Auto-redirect if only 1 child
        if (childrenList.length === 1) {
          setTimeout(() => {
            router.push(`/home/dashboard/${childrenList[0].id}`);
          }, 500);
        }
      })
      .catch(() => {
        toast.error('Failed to load children');
        setLoading(false);
      });
  }, [session?.family?.id, router]);

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
        const debugMsg = data.debug?.message ? `: ${data.debug.message}` : '';
        toast.error(`${data.error || 'Failed to add child'}${debugMsg}`);
        console.error('Add child error:', data);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error('Connection error');
      }
    } finally {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Your Children</h1>
          <p className="text-gray-500 mt-1">
            {children.length} {children.length === 1 ? 'child' : 'children'} in {session?.family?.name}
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center gap-2"
        >
          <span>+</span>
          <span>Add Child</span>
        </button>
      </div>

      {/* Add Child Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-md p-6 border border-emerald-100">
          <form onSubmit={handleAddChild} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Child's Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 transition-colors"
                  placeholder="e.g., Emma"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Age</label>
                <select
                  value={newAge}
                  onChange={(e) => setNewAge(Number(e.target.value))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-emerald-400 transition-colors"
                >
                  {[2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8].map((a) => (
                    <option key={a} value={a}>{a}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={adding || !newName.trim()}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {adding ? 'Adding...' : 'Add Child'}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 bg-gray-100 text-gray-600 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Children Grid */}
      {children.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center border border-gray-100">
          <div className="text-6xl mb-4">👶</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">No children yet</h2>
          <p className="text-gray-500 mb-8">Add your first child to start tracking their Montessori learning journey.</p>
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold rounded-2xl shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-[1.02] transition-all"
          >
            <span>+</span>
            <span>Add Your First Child</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {children.map((child, i) => (
            <button
              key={child.id}
              onClick={() => router.push(`/home/dashboard/${child.id}`)}
              className="bg-white rounded-2xl shadow-md hover:shadow-xl active:scale-95 transition-all p-6 text-left group overflow-hidden relative"
            >
              {/* Background accent */}
              <div className={`absolute -top-8 -right-8 w-32 h-32 bg-gradient-to-br ${colors[i % colors.length]} opacity-10 rounded-full`} />

              {/* Content */}
              <div className="relative z-10">
                {/* Avatar */}
                <div className={`w-20 h-20 mb-4 bg-gradient-to-br ${colors[i % colors.length]} rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg`}>
                  {child.photo_url ? (
                    <img src={child.photo_url} className="w-full h-full object-cover rounded-2xl" alt="" />
                  ) : (
                    child.name.charAt(0).toUpperCase()
                  )}
                </div>

                {/* Name & Age */}
                <h3 className="font-bold text-lg text-gray-800 group-hover:text-emerald-600 transition-colors mb-1">
                  {child.name}
                </h3>
                <p className="text-sm text-gray-500 mb-4">Age {child.age}</p>

                {/* Stats */}
                {child.stats && (
                  <div className="grid grid-cols-2 gap-2 pt-4 border-t border-gray-100">
                    <div className="text-center">
                      <div className="text-lg font-bold text-emerald-600">{child.stats.mastered_count}</div>
                      <div className="text-xs text-gray-500">Mastered</div>
                    </div>
                    <div className="text-center">
                      <div className="text-lg font-bold text-amber-600">{child.stats.practicing_count}</div>
                      <div className="text-xs text-gray-500">Practicing</div>
                    </div>
                  </div>
                )}

                {/* CTA */}
                <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                  <span className="text-xs font-semibold text-emerald-600">View Dashboard →</span>
                </div>
              </div>
            </button>
          ))}

          {/* Add Child Card */}
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-white/50 border-2 border-dashed border-gray-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all p-6 flex flex-col items-center justify-center min-h-[300px]"
          >
            <div className="text-4xl mb-2">+</div>
            <span className="text-sm font-semibold text-gray-500">Add Another Child</span>
          </button>
        </div>
      )}
    </div>
  );
}
