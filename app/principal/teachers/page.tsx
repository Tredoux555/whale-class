'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function PrincipalTeachersPage() {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');

  // Placeholder - in future this will come from database
  const teachers = [
    { id: '1', name: 'Tredoux', email: 'tredoux@school.com', classroom: '🐋 Whale', status: 'active' },
  ];

  const pendingInvites: any[] = [];

  const handleInvite = async () => {
    if (!email || !name) return;
    alert(`Invite sent to ${email}! (Feature coming soon)`);
    setShowInviteModal(false);
    setEmail('');
    setName('');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <Link href="/principal" className="text-indigo-200 text-sm hover:text-white">← Back to Dashboard</Link>
          <h1 className="text-2xl font-bold mt-1">👩‍🏫 Teachers</h1>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 border text-center">
            <div className="text-3xl font-bold text-indigo-600">{teachers.length}</div>
            <div className="text-gray-500 text-sm">Active Teachers</div>
          </div>
          <div className="bg-white rounded-xl p-6 border text-center">
            <div className="text-3xl font-bold text-orange-500">{pendingInvites.length}</div>
            <div className="text-gray-500 text-sm">Pending Invites</div>
          </div>
          <div className="bg-white rounded-xl p-6 border text-center">
            <button onClick={() => setShowInviteModal(true)} className="text-3xl">➕</button>
            <div className="text-gray-500 text-sm">Invite Teacher</div>
          </div>
        </div>

        {/* Active Teachers */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Active Teachers</h2>
          <button onClick={() => setShowInviteModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm">+ Invite Teacher</button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden mb-8">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Email</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Classroom</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id} className="border-b last:border-0">
                  <td className="px-6 py-4 font-medium">{t.name}</td>
                  <td className="px-6 py-4 text-gray-600">{t.email}</td>
                  <td className="px-6 py-4">{t.classroom}</td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pending Invites */}
        {pendingInvites.length > 0 && (
          <>
            <h2 className="font-semibold mb-4">Pending Invites</h2>
            <div className="bg-white rounded-xl border p-4">
              {pendingInvites.map((inv, i) => (
                <div key={i} className="flex items-center justify-between py-2">
                  <span>{inv.email}</span>
                  <span className="text-orange-500 text-sm">Pending</span>
                </div>
              ))}
            </div>
          </>
        )}
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h2 className="text-xl font-bold mb-4">Invite Teacher</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="Teacher Name" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2 border rounded-lg" placeholder="teacher@school.com" />
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-4">An invite email will be sent with login instructions.</p>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowInviteModal(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button onClick={handleInvite} disabled={!email || !name} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg disabled:opacity-50">Send Invite</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
