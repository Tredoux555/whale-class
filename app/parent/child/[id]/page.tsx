'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url: string | null;
  age_group: string;
  avatar_emoji: string;
  school_id: string;
}

export default function ParentChildPage() {
  const params = useParams();
  const childId = params.id as string;
  
  const [child, setChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchChild = async () => {
      try {
        const res = await fetch(`/api/children/${childId}`);
        const data = await res.json();
        setChild(data.child);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchChild();
  }, [childId]);

  const calcAge = (dob: string) => {
    const d = new Date(dob);
    const years = (Date.now() - d.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const y = Math.floor(years);
    const m = Math.floor((years - y) * 12);
    return `${y} years ${m} months`;
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-purple-50"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div></div>;
  if (!child) return <div className="min-h-screen flex items-center justify-center bg-purple-50">Child not found</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <header className="bg-purple-600 text-white px-6 py-6">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-purple-200 text-sm mb-2">👨‍👩‍👧 Parent Portal</p>
          <div className="w-24 h-24 mx-auto mb-3 rounded-full bg-white flex items-center justify-center text-5xl overflow-hidden">
            {child.photo_url ? (
              <img src={child.photo_url} className="w-full h-full object-cover" alt={child.name} />
            ) : (
              child.avatar_emoji || child.name.charAt(0)
            )}
          </div>
          <h1 className="text-2xl font-bold">{child.name}</h1>
          <p className="text-purple-200">{calcAge(child.date_of_birth)}</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Link href={`/parent/child/${childId}/daily-reports`} className="bg-white rounded-xl p-6 border text-center hover:shadow-md hover:border-green-300 relative">
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">New</div>
            <div className="text-4xl mb-2">📝</div>
            <p className="font-semibold">Daily Reports</p>
            <p className="text-sm text-gray-500">Teacher updates</p>
          </Link>
          <Link href={`/parent/child/${childId}/messages`} className="bg-white rounded-xl p-6 border text-center hover:shadow-md hover:border-blue-300 relative">
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-blue-500 text-white text-xs rounded-full">New</div>
            <div className="text-4xl mb-2">💬</div>
            <p className="font-semibold">Messages</p>
            <p className="text-sm text-gray-500">Chat with teacher</p>
          </Link>
          <Link href={`/parent/child/${childId}/photos`} className="bg-white rounded-xl p-6 border text-center hover:shadow-md hover:border-pink-300 relative">
            <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-pink-500 text-white text-xs rounded-full">New</div>
            <div className="text-4xl mb-2">📸</div>
            <p className="font-semibold">Photos</p>
            <p className="text-sm text-gray-500">Gallery from school</p>
          </Link>
          <Link href={`/parent/child/${childId}/progress`} className="bg-white rounded-xl p-6 border text-center hover:shadow-md hover:border-purple-300">
            <div className="text-4xl mb-2">📊</div>
            <p className="font-semibold">Progress</p>
            <p className="text-sm text-gray-500">View learning</p>
          </Link>
        </div>

        {/* Child Info Card */}
        <div className="bg-white rounded-xl p-6 border mb-6">
          <h2 className="font-semibold mb-4">👶 About {child.name}</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-500">Age Group</span>
              <span className="font-medium">{child.age_group} years</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Birthday</span>
              <span className="font-medium">{new Date(child.date_of_birth).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Daily Updates */}
        <div className="bg-green-50 rounded-xl p-6 border border-green-200 mb-6">
          <h2 className="font-semibold mb-2">📝 Daily Updates</h2>
          <p className="text-sm text-gray-600 mb-4">See what {child.name} did at school today - activities, meals, mood, and teacher notes</p>
          <Link href={`/parent/child/${childId}/daily-reports`} className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            View Daily Reports →
          </Link>
        </div>

        {/* Activities */}
        <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
          <h2 className="font-semibold mb-2">🎨 Try at Home</h2>
          <p className="text-sm text-gray-600 mb-4">Explore 250 Montessori-inspired activities you can do together</p>
          <Link href="/montree-home" className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
            Open Montree Home →
          </Link>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link href="/principal" className="text-purple-600 text-sm hover:underline">
            ← Back to testing
          </Link>
        </div>
      </main>
    </div>
  );
}
