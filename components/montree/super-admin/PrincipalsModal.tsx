'use client';

// Super-admin principal management modal.
//
// Opened from SchoolsTab via the 👤 button per row. Shows every principal
// for the school, lets you reset a code, activate/deactivate, delete, or
// add a new principal.
//
// IMPORTANT: 6-char login codes are returned ONCE in the API response after
// a create or reset. They are never retrievable again (only the SHA-256 hash
// lives in the DB). The modal flashes the new code prominently with a Copy
// button — explain to the principal in person, or paste it into a message.

import { useState, useEffect, useCallback } from 'react';

interface Principal {
  id: string;
  school_id: string;
  email: string;
  name: string | null;
  role: string;
  is_active: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

interface PrincipalsModalProps {
  schoolId: string;
  schoolName: string;
  onClose: () => void;
  sessionToken: string;
}

function fmtTimeAgo(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function PrincipalsModal({ schoolId, schoolName, onClose, sessionToken }: PrincipalsModalProps) {
  const [principals, setPrincipals] = useState<Principal[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // After create/reset, the plain code is visible exactly once.
  const [revealedCode, setRevealedCode] = useState<{ id: string; code: string; name: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Add-principal form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [creating, setCreating] = useState(false);

  const headers = useCallback(
    () => ({
      'Content-Type': 'application/json',
      'x-super-admin-token': sessionToken,
    }),
    [sessionToken]
  );

  const loadPrincipals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/principals?school_id=${schoolId}`, {
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setPrincipals(data.principals || []);
    } catch (err) {
      console.error('[PrincipalsModal] load error:', err);
      setError('Could not load principals.');
    } finally {
      setLoading(false);
    }
  }, [schoolId, sessionToken]);

  useEffect(() => {
    loadPrincipals();
  }, [loadPrincipals]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/principals', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({ school_id: schoolId, name: newName.trim(), email: newEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to add principal');
        return;
      }
      setRevealedCode({
        id: data.principal.id,
        code: data.login_code,
        name: data.principal.name || data.principal.email,
      });
      setCopied(false);
      setNewName('');
      setNewEmail('');
      setShowAddForm(false);
      await loadPrincipals();
    } catch (err) {
      console.error('[PrincipalsModal] add error:', err);
      setError('Could not add principal.');
    } finally {
      setCreating(false);
    }
  };

  const handleResetCode = async (p: Principal) => {
    if (!confirm(`Generate a new login code for ${p.name || p.email}? Their current code will stop working.`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/principals', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ principal_id: p.id, action: 'reset_code' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to reset code');
        return;
      }
      setRevealedCode({ id: p.id, code: data.login_code, name: p.name || p.email });
      setCopied(false);
      await loadPrincipals();
    } catch (err) {
      console.error('[PrincipalsModal] reset error:', err);
      setError('Could not reset code.');
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleActive = async (p: Principal) => {
    const action = p.is_active ? 'deactivate' : 'activate';
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch('/api/montree/super-admin/principals', {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ principal_id: p.id, action }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || `Failed to ${action} principal`);
        return;
      }
      await loadPrincipals();
    } catch (err) {
      console.error('[PrincipalsModal] toggle error:', err);
      setError('Could not update principal.');
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (p: Principal) => {
    if (!confirm(`Delete ${p.name || p.email} from ${schoolName}? This cannot be undone.`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/montree/super-admin/principals?id=${p.id}`, {
        method: 'DELETE',
        headers: { 'x-super-admin-token': sessionToken },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Failed to delete principal');
        return;
      }
      await loadPrincipals();
    } catch (err) {
      console.error('[PrincipalsModal] delete error:', err);
      setError('Could not delete principal.');
    } finally {
      setBusyId(null);
    }
  };

  const copyCode = async () => {
    if (!revealedCode) return;
    try {
      await navigator.clipboard.writeText(revealedCode.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Older browsers — user can still select-and-copy from the visible field.
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#1a1f2e] border border-slate-700 rounded-2xl w-full max-w-xl max-h-[85vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Principals · {schoolName}</h2>
            <p className="text-xs text-slate-400">
              {loading ? 'Loading…' : `${principals.length} ${principals.length === 1 ? 'principal' : 'principals'}`}
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl" aria-label="Close">✕</button>
        </div>

        {/* Revealed code banner — only shows once after add/reset */}
        {revealedCode && (
          <div className="mx-6 my-3 p-4 bg-emerald-500/10 border border-emerald-500/40 rounded-lg">
            <p className="text-xs text-emerald-300 font-medium uppercase tracking-wide mb-1">
              New login code for {revealedCode.name}
            </p>
            <p className="text-[10px] text-emerald-200/70 mb-2">
              Save it now — this is the only time it's shown.
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-black/40 border border-emerald-500/30 rounded font-mono text-lg font-bold text-emerald-300 tracking-widest text-center">
                {revealedCode.code}
              </code>
              <button
                onClick={copyCode}
                className="px-3 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded text-xs font-medium"
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
              <button
                onClick={() => setRevealedCode(null)}
                className="px-3 py-2 bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 rounded text-xs font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="mx-6 my-2 px-3 py-2 bg-red-500/10 border border-red-500/40 rounded text-xs text-red-300">
            {error}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {loading && <div className="text-center text-slate-400 py-8">Loading…</div>}

          {!loading && principals.length === 0 && (
            <div className="text-center py-10">
              <p className="text-slate-400 text-sm">No principals yet.</p>
              <p className="text-slate-500 text-xs mt-1">Add the first one below.</p>
            </div>
          )}

          {!loading && principals.length > 0 && (
            <div className="space-y-2">
              {principals.map(p => {
                const busy = busyId === p.id;
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-lg border ${p.is_active ? 'bg-slate-800/40 border-slate-700' : 'bg-slate-800/20 border-slate-700/50 opacity-70'}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-semibold text-white">{p.name || '(no name)'}</span>
                          {!p.is_active && (
                            <span className="px-1.5 py-0.5 bg-slate-700/60 text-slate-400 text-[10px] rounded uppercase tracking-wider">
                              Inactive
                            </span>
                          )}
                          {p.last_login === null && (
                            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 text-[10px] rounded uppercase tracking-wider">
                              Never logged in
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 truncate">{p.email}</p>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Last login: {fmtTimeAgo(p.last_login)} · Added {fmtTimeAgo(p.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
                      <button
                        onClick={() => handleResetCode(p)}
                        disabled={busy}
                        className="px-2.5 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 disabled:opacity-50 text-emerald-300 rounded text-xs font-medium"
                      >
                        🔑 Reset code
                      </button>
                      <button
                        onClick={() => handleToggleActive(p)}
                        disabled={busy}
                        className={`px-2.5 py-1 disabled:opacity-50 rounded text-xs font-medium ${p.is_active ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'}`}
                      >
                        {p.is_active ? '🚫 Deactivate' : '✓ Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={busy}
                        className="px-2.5 py-1 bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 text-red-300 rounded text-xs font-medium ml-auto"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add-principal form */}
          <div className="mt-4 pt-4 border-t border-slate-700/60">
            {!showAddForm ? (
              <button
                onClick={() => setShowAddForm(true)}
                className="w-full px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded text-sm font-medium"
              >
                + Add principal
              </button>
            ) : (
              <form onSubmit={handleAdd} className="space-y-2">
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Principal's name"
                  required
                  minLength={2}
                  disabled={creating}
                  className="w-full px-3 py-2 bg-black/40 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="email"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  placeholder="email@school.com"
                  required
                  disabled={creating}
                  className="w-full px-3 py-2 bg-black/40 border border-slate-600 rounded text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating || !newName.trim() || !newEmail.trim()}
                    className="flex-1 px-3 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:opacity-50 text-blue-300 rounded text-sm font-medium"
                  >
                    {creating ? 'Creating…' : 'Generate code & add'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddForm(false);
                      setNewName('');
                      setNewEmail('');
                    }}
                    disabled={creating}
                    className="px-3 py-2 bg-slate-700/40 hover:bg-slate-700/60 text-slate-300 rounded text-sm font-medium"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-[10px] text-slate-500">
                  Re-using an existing email regenerates the code on the same principal record.
                </p>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
