// app/assessment/page.tsx
// Child name selection for assessment
// Simple tap-to-start interface for Pre-K/K children

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  classroom_id?: string;
}

export default function AssessmentStartPage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load children on mount
  useEffect(() => {
    loadChildren();
  }, []);

  const loadChildren = async () => {
    try {
      // Get children from whale children table
      const res = await fetch('/api/whale/children');
      const data = await res.json();
      
      if (data.data && Array.isArray(data.data)) {
        // Map to our expected format
        const mapped = data.data.map((c: any) => ({
          id: c.id,
          name: c.name,
          classroom_id: c.classroom_id
        }));
        setChildren(mapped);
      } else {
        setError('Could not load children');
      }
    } catch (err) {
      console.error('Error loading children:', err);
      setError('Could not load children');
    } finally {
      setLoading(false);
    }
  };

  const handleChildSelect = async (child: Child) => {
    if (creating) return;
    setCreating(child.id);

    try {
      // Create assessment session
      const res = await fetch('/api/assessment/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: child.id,
          child_name: child.name,
          classroom_id: child.classroom_id
        })
      });

      const data = await res.json();
      
      if (data.success && data.session) {
        // Navigate to the test
        router.push(`/assessment/${data.session.id}`);
      } else {
        setError('Could not start test');
        setCreating(null);
      }
    } catch (err) {
      console.error('Error creating session:', err);
      setError('Could not start test');
      setCreating(null);
    }
  };

  // Get emoji based on first letter
  const getChildEmoji = (name: string) => {
    const emojis = ['🧒', '👦', '👧', '🧒🏻', '👦🏻', '👧🏻', '🧒🏽', '👦🏽', '👧🏽'];
    const index = name.charCodeAt(0) % emojis.length;
    return emojis[index];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl animate-bounce mb-4">🐋</div>
          <p className="text-white text-2xl">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-400 via-purple-400 to-pink-400">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link href="/" className="text-white/80 hover:text-white text-3xl">
          ←
        </Link>
        <div className="text-6xl">🐋</div>
        <div className="w-10" /> {/* Spacer */}
      </header>

      {/* Main content */}
      <main className="max-w-4xl mx-auto px-4 pb-8">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            Who are you?
          </h1>
          <p className="text-white/90 text-xl">
            Tap your name to start! 👆
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-100 text-red-700 p-4 rounded-xl mb-6 text-center">
            {error}
          </div>
        )}

        {/* Children grid */}
        {children.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {children.map((child) => (
              <button
                key={child.id}
                onClick={() => handleChildSelect(child)}
                disabled={creating !== null}
                className={`
                  p-6 rounded-2xl border-4 transition-all transform
                  ${creating === child.id 
                    ? 'bg-yellow-300 border-yellow-400 scale-95' 
                    : 'bg-white/90 border-white hover:scale-105 hover:shadow-xl'
                  }
                  ${creating && creating !== child.id ? 'opacity-50' : ''}
                `}
              >
                <div className="text-5xl mb-2">
                  {getChildEmoji(child.name)}
                </div>
                <div className="text-xl font-bold text-gray-800 truncate">
                  {child.name}
                </div>
                {creating === child.id && (
                  <div className="text-sm text-gray-600 mt-1">
                    Starting...
                  </div>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🤔</div>
            <p className="text-white text-xl">
              No children found. Please add children first.
            </p>
            <Link 
              href="/admin" 
              className="inline-block mt-4 px-6 py-3 bg-white text-purple-600 rounded-xl font-bold"
            >
              Go to Admin
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
