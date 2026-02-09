'use client';

// /home/dashboard/page.tsx
// Compact child picker — CLONED from montree/dashboard/page.tsx
// Same grid (3→6 cols), circular avatars, tight spacing

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getHomeSession, type HomeSession } from '@/lib/home/auth';
import { toast, Toaster } from 'sonner';

interface Child {
  id: string;
  name: string;
  age: number;
  photo_url?: string;
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
        const list = data.children || [];
        setChildren(list);
        setLoading(false);

        // Auto-redirect if only 1 child
        if (list.length === 1) {
          setTimeout(() => router.push(`/home/dashboard/${list[0].id}`), 500);
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
        toast.error(data.error || 'Failed to add child');
      }
    } catch {
      toast.error('Connection error');
    } finally {
      setAdding(false);
    }
  };

  if (!session || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-50 flex items-center justify-center">
        <div className="animate-bounce text-5xl">🏠</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-50">
      <Toaster position="top-center" richColors />

      {/* Child count subtitle */}
      <div className="bg-emerald-50 border-b border-emerald-100 px-4 py-2 text-center text-sm text-emerald-700 font-medium">
        {children.length} {children.length === 1 ? 'child' : 'children'}
      </div>

      {/* Child Grid */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {children.length === 0 ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="block w-full bg-white rounded-2xl shadow-md p-12 text-center hover:shadow-lg transition-shadow"
          >
            <span className="text-6xl mb-4 block">👶</span>
            <p className="text-gray-600 font-medium text-lg">Tap to add your first child</p>
          </button>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/home/dashboard/${child.id}`}
                className="bg-white rounded-2xl shadow-md hover:shadow-xl active:scale-95 transition-all p-4 flex flex-col items-center"
              >
                {/* Avatar */}
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-2xl sm:text-3xl overflow-hidden mb-3 shadow-md">
                  {child.photo_url ? (
                    <img src={child.photo_url} className="w-full h-full object-cover" alt="" />
                  ) : (
                    child.name.charAt(0).toUpperCase()
                  )}
                </div>
                {/* Name */}
                <p className="text-sm font-semibold text-gray-700 truncate w-full text-center">
                  {child.name.split(' ')[0]}
                </p>
                <p className="text-xs text-gray-400">Age {child.age}</p>
              </Link>
            ))}

            {/* Add Child Card */}
            <button
              onClick={() => setShowAddForm(true)}
              className="bg-white/60 border-2 border-dashed border-gray-300 rounded-2xl hover:border-emerald-400 hover:bg-emerald-50 transition-all p-4 flex flex-col items-center justify-center min-h-[120px]"
            >
              <span className="text-3xl text-gray-400 mb-1">+</span>
              <span className="text-xs text-gray-400">Add</span>
            </button>
          </div>
        )}

        {/* Add Child Modal */}
        {showAddForm && (
          <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddForm(false)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <h2 className="text-lg font-bold text-gray-800 mb-4">Add Child</h2>
              <form onSubmit={handleAddChild} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g., Emma"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <select
                    value={newAge}
                    onChange={(e) => setNewAge(Number(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8].map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={adding || !newName.trim()}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50"
                  >
                    {adding ? 'Adding...' : 'Add Child'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
