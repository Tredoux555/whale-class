'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url?: string;
  completed_count?: number;
  in_progress_count?: number;
}

export default function ChildrenPage() {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newChild, setNewChild] = useState({ name: '', date_of_birth: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchChildren();
  }, []);

  const fetchChildren = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/whale/children');
      
      if (!res.ok) {
        throw new Error('Failed to fetch children');
      }
      
      const data = await res.json();
      setChildren(data.children || data.data || []);
    } catch (err) {
      console.error('Error:', err);
      setError('Failed to load children. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChild.name.trim()) {
      alert('Please enter a name');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/whale/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChild),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to add child');
      }

      setShowAddModal(false);
      setNewChild({ name: '', date_of_birth: '' });
      await fetchChildren();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to add child');
    } finally {
      setSaving(false);
    }
  };

  const calculateAge = (dob: string): string => {
    if (!dob) return '';
    const birth = new Date(dob);
    const now = new Date();
    
    let years = now.getFullYear() - birth.getFullYear();
    let months = now.getMonth() - birth.getMonth();
    
    if (months < 0) {
      years--;
      months += 12;
    }
    
    if (years < 1) {
      return `${months} months`;
    } else if (years < 2) {
      return `${years} year ${months} months`;
    }
    return `${years} years`;
  };

  return (
    <div 
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
    >
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <h1 className="text-2xl font-bold text-gray-900">👶 Children</h1>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
            >
              + Add Child
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-lg flex items-center justify-between">
            <span>{error}</span>
            <button onClick={fetchChildren} className="text-red-700 underline">
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500" />
          </div>
        ) : children.length === 0 ? (
          /* Empty State */
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👶</div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">No Children Yet</h2>
            <p className="text-gray-500 mb-4">Add your first child to start tracking progress</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600"
            >
              + Add First Child
            </button>
          </div>
        ) : (
          /* Children Grid */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {children.map((child) => (
              <Link
                key={child.id}
                href={`/admin/child-progress/${child.id}`}
                className="bg-white rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-cyan-500 flex items-center justify-center text-white text-2xl font-bold">
                    {child.photo_url ? (
                      <img 
                        src={child.photo_url} 
                        alt={child.name}
                        className="w-16 h-16 rounded-full object-cover"
                      />
                    ) : (
                      child.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{child.name}</h3>
                    {child.date_of_birth && (
                      <p className="text-sm text-gray-500">
                        Age: {calculateAge(child.date_of_birth)}
                      </p>
                    )}
                  </div>
                </div>
                {(child.completed_count !== undefined || child.in_progress_count !== undefined) && (
                  <div className="mt-4 flex gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {child.completed_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">Completed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {child.in_progress_count || 0}
                      </div>
                      <div className="text-xs text-gray-500">In Progress</div>
                    </div>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Add Child Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">Add New Child</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={newChild.name}
                  onChange={(e) => setNewChild({ ...newChild, name: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                  placeholder="Child's name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={newChild.date_of_birth}
                  onChange={(e) => setNewChild({ ...newChild, date_of_birth: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setNewChild({ name: '', date_of_birth: '' });
                }}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleAddChild}
                disabled={saving || !newChild.name.trim()}
                className="flex-1 px-4 py-2 bg-cyan-500 text-white rounded-lg hover:bg-cyan-600 disabled:bg-gray-400"
              >
                {saving ? 'Adding...' : 'Add Child'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
