// @ts-nocheck
'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';

const AREA_CONFIG = {
  practical_life: { name: 'Practical Life', color: '#ec4899' },
  sensorial: { name: 'Sensorial', color: '#8b5cf6' },
  mathematics: { name: 'Math', color: '#3b82f6' },
  language: { name: 'Language', color: '#22c55e' },
  cultural: { name: 'Cultural', color: '#f97316' },
};

function getPhotoUrl(photo: any) {
  if (!photo?.storage_path) return null;
  return `${SUPABASE_URL}/storage/v1/object/public/montree-media/${photo.storage_path}`;
}

export default function CommunityAdminPage() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [selectedWork, setSelectedWork] = useState(null);
  const [generatingGuide, setGeneratingGuide] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [message, setMessage] = useState('');

  const fetchWorks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/montree/community/works?status=${statusFilter}&limit=50`, {
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      setWorks(data.works || []);
    } catch (err) {
      console.error('Failed to fetch:', err);
    }
    setLoading(false);
  }, [statusFilter, password]);

  useEffect(() => {
    if (authenticated) fetchWorks();
  }, [authenticated, fetchWorks]);

  const handleAction = async (workId: string, action: string) => {
    try {
      const res = await fetch(`/api/montree/community/works/${workId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
        body: JSON.stringify({ status: action }),
      });
      if (res.ok) {
        setMessage(`Work ${action}!`);
        fetchWorks();
        if (selectedWork?.id === workId) {
          const data = await res.json();
          setSelectedWork(data.work);
        }
      }
    } catch { setMessage('Action failed'); }
    setTimeout(() => setMessage(''), 3000);
  };

  const handleGenerateGuide = async (workId: string) => {
    setGeneratingGuide(true);
    setMessage('');
    try {
      const res = await fetch(`/api/montree/community/works/${workId}/guide`, {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('AI guide generated!');
        setSelectedWork(data.work);
        fetchWorks();
      } else {
        setMessage(data.error || 'Guide generation failed');
      }
    } catch { setMessage('Guide generation failed'); }
    setGeneratingGuide(false);
  };

  const handleBackup = async () => {
    setBackingUp(true);
    try {
      const res = await fetch('/api/montree/community/backup', {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      setMessage(data.success ? `Backup created: ${data.work_count} works` : data.message || 'Backup failed');
    } catch { setMessage('Backup failed'); }
    setBackingUp(false);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleSeed = async () => {
    if (!confirm('Seed the library with 329 standard Montessori works? This skips any already-seeded works.')) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/montree/community/seed', {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Seeded ${data.inserted} works (${data.skipped} already existed)`);
        fetchWorks();
      } else {
        const detail = data.detail ? ` — ${data.detail}` : '';
        const stack = data.stack ? `\n${data.stack.join('\n')}` : '';
        setMessage(`${data.error || 'Seed failed'}${detail}${stack}`);
      }
    } catch (e: any) { setMessage(`Seed failed: ${e?.message || e}`); }
    setSeeding(false);
    setTimeout(() => setMessage(''), 15000);
  };

  const handleMigrateSequence = async () => {
    if (!confirm('Add curriculum_sequence column and populate sequence numbers for all seeded works?')) return;
    setSeeding(true);
    try {
      const res = await fetch('/api/montree/community/migrate-sequence', {
        method: 'POST',
        headers: { 'x-admin-password': password },
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`Sequence migration done! ${data.sequences_updated} works updated.`);
      } else {
        const detail = data.detail ? ` — ${data.detail}` : '';
        setMessage(`${data.error || 'Migration failed'}${detail}`);
      }
    } catch (e: any) { setMessage(`Migration failed: ${e?.message || e}`); }
    setSeeding(false);
    setTimeout(() => setMessage(''), 15000);
  };

  const handleDelete = async (workId: string) => {
    if (!confirm('Delete this work permanently? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/montree/community/works/${workId}`, {
        method: 'DELETE',
        headers: { 'x-admin-password': password },
      });
      if (res.ok) {
        setMessage('Work deleted');
        setSelectedWork(null);
        fetchWorks();
      }
    } catch { setMessage('Delete failed'); }
    setTimeout(() => setMessage(''), 3000);
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-sm">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Community Library Admin</h2>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Super admin password"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-3"
            onKeyDown={e => e.key === 'Enter' && setAuthenticated(true)}
          />
          <button onClick={() => setAuthenticated(true)} className="w-full py-2 bg-[#0D3330] text-white rounded-lg font-medium">
            Enter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#0D3330] text-white px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/montree/super-admin" className="text-emerald-300 text-sm hover:underline">← Super Admin</Link>
            <h1 className="text-xl font-bold mt-1">Community Works Moderation</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSeed} disabled={seeding} className="px-3 py-1.5 bg-amber-600 rounded-lg text-sm hover:bg-amber-700 disabled:opacity-50">
              {seeding ? 'Seeding...' : 'Seed 329 Works'}
            </button>
            <button onClick={handleMigrateSequence} disabled={seeding} className="px-3 py-1.5 bg-blue-600 rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              Fix Sequence
            </button>
            <button onClick={handleBackup} disabled={backingUp} className="px-3 py-1.5 bg-emerald-600 rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50">
              {backingUp ? 'Backing up...' : 'Create Backup'}
            </button>
            <Link href="/montree/library" className="px-3 py-1.5 bg-white/10 rounded-lg text-sm hover:bg-white/20">
              View Library
            </Link>
          </div>
        </div>
      </header>

      {message && (
        <div className="max-w-6xl mx-auto px-4 mt-4">
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-2 rounded-lg text-sm">{message}</div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Status tabs */}
        <div className="flex gap-2 mb-4">
          {['pending', 'approved', 'rejected', 'flagged'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${
                statusFilter === status ? 'bg-[#0D3330] text-white' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Works list */}
          <div className="space-y-2">
            {loading ? (
              <div className="text-center py-10 text-gray-400">Loading...</div>
            ) : works.length === 0 ? (
              <div className="text-center py-10 text-gray-400">No {statusFilter} works</div>
            ) : (
              works.map(work => {
                const cfg = AREA_CONFIG[work.area] || AREA_CONFIG.practical_life;
                const photo = getPhotoUrl(work.photos?.[0]);

                return (
                  <div
                    key={work.id}
                    onClick={() => setSelectedWork(work)}
                    className={`bg-white rounded-lg p-3 border cursor-pointer hover:shadow-sm transition-shadow ${
                      selectedWork?.id === work.id ? 'border-emerald-500 shadow-sm' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex gap-3">
                      {photo ? (
                        <img src={photo} alt="" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: cfg.color + '20' }}>
                          <span className="text-2xl font-bold" style={{ color: cfg.color }}>{cfg.name[0]}</span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-gray-900 text-sm truncate">{work.title}</h3>
                        <p className="text-xs text-gray-500 truncate">{work.description}</p>
                        <div className="flex gap-2 mt-1">
                          <span className="px-2 py-0.5 rounded text-xs text-white" style={{ backgroundColor: cfg.color }}>{cfg.name}</span>
                          <span className="text-xs text-gray-400">by {work.contributor_name}</span>
                          {work.photos?.length > 0 && <span className="text-xs text-gray-400">{work.photos.length} photos</span>}
                          {work.ai_guide && <span className="text-xs text-emerald-500">🧠 Guide</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Detail panel */}
          {selectedWork && (
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 sticky top-4 max-h-[85vh] overflow-y-auto">
              <h2 className="text-lg font-bold text-gray-900">{selectedWork.title}</h2>
              <p className="text-sm text-gray-500 mt-1">by {selectedWork.contributor_name} {selectedWork.contributor_country && `· ${selectedWork.contributor_country}`}</p>

              {/* Photos */}
              {selectedWork.photos?.length > 0 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {selectedWork.photos.map((p, i) => (
                    <img key={i} src={getPhotoUrl(p)} alt="" className="w-24 h-24 rounded-lg object-cover flex-shrink-0" />
                  ))}
                </div>
              )}

              <p className="text-gray-700 text-sm mt-3 whitespace-pre-wrap">{selectedWork.description}</p>

              {selectedWork.detailed_description && (
                <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-800 mb-1">Detailed Guide</h4>
                  <p className="text-gray-700 text-sm whitespace-pre-wrap">{selectedWork.detailed_description}</p>
                </div>
              )}

              {selectedWork.materials?.length > 0 && (
                <div className="mt-3">
                  <h4 className="text-sm font-medium text-gray-800 mb-1">Materials</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedWork.materials.map((m, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs text-gray-600">{m}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Guide status */}
              <div className="mt-4 p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-800">
                    {selectedWork.ai_guide ? '🧠 AI Guide Available' : '🧠 No AI Guide Yet'}
                  </span>
                  <button
                    onClick={() => handleGenerateGuide(selectedWork.id)}
                    disabled={generatingGuide}
                    className="px-3 py-1 bg-emerald-500 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                  >
                    {generatingGuide ? 'Generating...' : selectedWork.ai_guide ? 'Regenerate' : 'Generate Guide'}
                  </button>
                </div>
                {selectedWork.ai_guide && (
                  <p className="text-xs text-gray-500 mt-1">
                    Generated {new Date(selectedWork.ai_guide_generated_at).toLocaleDateString()}
                    {' · '}{selectedWork.ai_guide.presentation_steps?.length || 0} steps
                  </p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 mt-4">
                {selectedWork.status !== 'approved' && (
                  <button onClick={() => handleAction(selectedWork.id, 'approved')} className="flex-1 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium">
                    Approve
                  </button>
                )}
                {selectedWork.status !== 'rejected' && (
                  <button onClick={() => handleAction(selectedWork.id, 'rejected')} className="flex-1 py-2 bg-red-500 text-white rounded-lg text-sm font-medium">
                    Reject
                  </button>
                )}
                {selectedWork.status !== 'flagged' && (
                  <button onClick={() => handleAction(selectedWork.id, 'flagged')} className="flex-1 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium">
                    Flag
                  </button>
                )}
              </div>

              <button onClick={() => handleDelete(selectedWork.id)} className="w-full mt-2 py-2 text-red-500 text-sm hover:text-red-700">
                Delete Permanently
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
