'use client';

import { useState, useEffect } from 'react';

interface Invite {
  id: string;
  invite_code: string;
  parent_email: string | null;
  status: 'active' | 'used' | 'expired' | 'revoked';
  expires_at: string;
  created_at: string;
}

interface InviteParentModalProps {
  childId: string;
  childName: string;
  teacherId?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function InviteParentModal({
  childId,
  childName,
  teacherId,
  isOpen,
  onClose
}: InviteParentModalProps) {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadInvites();
    }
  }, [isOpen, childId]);

  const loadInvites = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/invites?childId=${childId}`);
      const data = await res.json();
      setInvites(data.invites || []);
    } catch (err) {
      console.error('Failed to load invites:', err);
    }
    setLoading(false);
  };

  const createInvite = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/montree/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, teacherId })
      });
      const data = await res.json();
      if (data.invite) {
        setInvites(prev => [{ ...data.invite, status: 'active' }, ...prev]);
      }
    } catch (err) {
      console.error('Failed to create invite:', err);
    }
    setCreating(false);
  };

  const resetCode = async () => {
    setResetting(true);
    try {
      const res = await fetch('/api/montree/invites', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId, teacherId })
      });
      const data = await res.json();
      if (data.invite) {
        // Mark old invites as revoked and add new one
        setInvites(prev => [
          { ...data.invite, status: 'active' },
          ...prev.map(inv => ({ ...inv, status: 'revoked' as const }))
        ]);
      }
    } catch (err) {
      console.error('Failed to reset code:', err);
    }
    setResetting(false);
  };

  const copyToClipboard = (code: string) => {
    const url = `${window.location.origin}/montree/parent?code=${code}`;
    navigator.clipboard.writeText(url);
    setCopied(code);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeInvites = invites.filter(inv => inv.status === 'active');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800">Parent Access Code</h2>
            <p className="text-sm text-gray-500">For {childName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 140px)' }}>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-pulse text-2xl mb-2">📨</div>
              <p className="text-gray-500">Loading codes...</p>
            </div>
          ) : (
            <>
              {/* Active Code Display */}
              {activeInvites.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800">
                    Parents enter this code at <span className="font-mono font-semibold">/montree/parent</span> to view {childName}'s progress.
                  </div>

                  {activeInvites.map(invite => (
                    <div key={invite.id} className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-emerald-600 font-semibold">ACTIVE CODE</span>
                        <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-1 rounded-full">
                          Reusable
                        </span>
                      </div>

                      <div className="bg-white border-2 border-emerald-200 rounded-lg p-3 mb-3 text-center">
                        <p className="font-mono text-3xl font-bold text-emerald-700 tracking-widest">
                          {invite.invite_code}
                        </p>
                      </div>

                      <div className="flex gap-2 mb-3">
                        <button
                          onClick={() => copyToClipboard(invite.invite_code)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition"
                        >
                          {copied === invite.invite_code ? '✓ Copied!' : '📋 Copy Code'}
                        </button>
                      </div>

                      <div className="border-t border-emerald-200 pt-3">
                        <button
                          onClick={resetCode}
                          disabled={resetting}
                          className="w-full text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                        >
                          {resetting ? 'Resetting...' : '🔄 Reset Code (Forgot Password)'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-4xl mb-3">🔑</div>
                  <p className="text-gray-600 mb-4">
                    Generate an access code for parents to view {childName}'s progress.
                  </p>
                  <button
                    onClick={createInvite}
                    disabled={creating}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-medium transition disabled:opacity-50"
                  >
                    {creating ? 'Generating...' : '✉️ Generate Access Code'}
                  </button>
                </div>
              )}

              {/* Previous Codes (Optional) */}
              {invites.filter(inv => inv.status !== 'active').length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-medium text-gray-500 mb-2">Previous Codes</h3>
                  <div className="space-y-2">
                    {invites.filter(inv => inv.status !== 'active').map(invite => (
                      <div
                        key={invite.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="font-mono text-sm text-gray-500">{invite.invite_code}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          invite.status === 'expired' ? 'bg-gray-200 text-gray-500' :
                          'bg-red-100 text-red-600'
                        }`}>
                          {invite.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
