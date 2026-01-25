'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

// SECURITY: Only Tredoux can access this page
function useAuthCheck() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  
  useEffect(() => {
    const teacher = localStorage.getItem('teacherName');
    if (teacher !== 'Tredoux') {
      router.push('/teacher/dashboard');
    } else {
      setAuthorized(true);
    }
  }, [router]);
  
  return authorized;
}

interface ChildMedia {
  id: string;
  child_id: string;
  child_name?: string;
  work_name: string;
  media_type: 'photo' | 'video';
  media_url: string;
  notes?: string;
  week_number?: number;
  year?: number;
  taken_at: string;
}

interface Work {
  id: string;
  name: string;
  chinese_name?: string;
  area_id: string;
  sequence: number;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: 'from-pink-500 to-rose-500', bg: 'bg-pink-500', bgLight: 'bg-pink-50' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: 'from-purple-500 to-violet-500', bg: 'bg-purple-500', bgLight: 'bg-purple-50' },
  { id: 'mathematics', name: 'Math', icon: '🔢', color: 'from-blue-500 to-indigo-500', bg: 'bg-blue-500', bgLight: 'bg-blue-50' },
  { id: 'language', name: 'Language', icon: '📖', color: 'from-green-500 to-emerald-500', bg: 'bg-green-500', bgLight: 'bg-green-50' },
  { id: 'culture', name: 'Cultural', icon: '🌍', color: 'from-orange-500 to-amber-500', bg: 'bg-orange-500', bgLight: 'bg-orange-50' },
];

export default function ClassroomHubPage() {
  const authorized = useAuthCheck();
  const [activeTab, setActiveTab] = useState<'today' | 'shelves' | 'media'>('today');
  const [todayMedia, setTodayMedia] = useState<ChildMedia[]>([]);
  const [allMedia, setAllMedia] = useState<ChildMedia[]>([]);
  const [curriculum, setCurriculum] = useState<Work[]>([]);
  const [selectedArea, setSelectedArea] = useState('language');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingWork, setEditingWork] = useState<Work | null>(null);
  const [newWorkName, setNewWorkName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [lightbox, setLightbox] = useState<ChildMedia | null>(null);

  useEffect(() => {
    fetchTodayMedia();
    fetchCurriculum();
  }, []);

  useEffect(() => {
    fetchCurriculum();
  }, [selectedArea]);

  async function fetchTodayMedia() {
    try {
      const res = await fetch('/api/media?today=true');
      const data = await res.json();
      setTodayMedia(data.media || []);
    } catch (err) {
      console.error('Failed to fetch today media:', err);
    }
  }

  async function fetchAllMedia() {
    try {
      const res = await fetch('/api/media');
      const data = await res.json();
      setAllMedia(data.media || []);
    } catch (err) {
      console.error('Failed to fetch all media:', err);
    }
  }

  async function fetchCurriculum() {
    setLoading(true);
    try {
      const res = await fetch(`/api/school/00000000-0000-0000-0000-000000000001/curriculum?area=${selectedArea}`);
      const data = await res.json();
      setCurriculum(data.curriculum || []);
    } catch (err) {
      console.error('Failed to fetch curriculum:', err);
    } finally {
      setLoading(false);
    }
  }

  async function updateWork(workId: string, newName: string) {
    try {
      const res = await fetch(`/api/school/00000000-0000-0000-0000-000000000001/curriculum`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workId, name: newName })
      });
      if (res.ok) {
        setCurriculum(prev => prev.map(w => w.id === workId ? { ...w, name: newName } : w));
        setEditingWork(null);
      }
    } catch (err) {
      console.error('Failed to update work:', err);
    }
  }

  async function addWork() {
    if (!newWorkName.trim()) return;
    try {
      const res = await fetch(`/api/school/00000000-0000-0000-0000-000000000001/curriculum`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newWorkName,
          area_id: selectedArea,
          sequence: curriculum.length + 1
        })
      });
      if (res.ok) {
        const data = await res.json();
        setCurriculum(prev => [...prev, data.work]);
        setNewWorkName('');
        setShowAddForm(false);
        fetchCurriculum(); // Refresh to get proper data
      }
    } catch (err) {
      console.error('Failed to add work:', err);
    }
  }

  async function deleteWork(workId: string) {
    if (!confirm('Delete this work? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/school/00000000-0000-0000-0000-000000000001/curriculum?workId=${workId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setCurriculum(prev => prev.filter(w => w.id !== workId));
      }
    } catch (err) {
      console.error('Failed to delete work:', err);
    }
  }

  const filteredCurriculum = curriculum.filter(w =>
    w.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const currentArea = AREAS.find(a => a.id === selectedArea);

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // SECURITY: Block unauthorized access
  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/teacher/dashboard" className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center hover:bg-white/30">
                ←
              </Link>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2">
                  <span>🐋</span> Classroom Hub
                </h1>
                <p className="text-blue-100 text-sm">Everything in one place</p>
              </div>
            </div>
            <Link 
              href="/admin/classroom"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl font-medium transition-all flex items-center gap-2"
            >
              <span>📋</span>
              <span>Weekly View</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="bg-white border-b shadow-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex gap-1 py-2">
            <button
              onClick={() => setActiveTab('today')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'today' 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>📸</span>
              <span>Today</span>
              {todayMedia.length > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'today' ? 'bg-white/20' : 'bg-blue-100 text-blue-600'}`}>
                  {todayMedia.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('shelves')}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'shelves' 
                  ? 'bg-green-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>📚</span>
              <span>Shelves</span>
            </button>
            <button
              onClick={() => { setActiveTab('media'); fetchAllMedia(); }}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                activeTab === 'media' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <span>🖼️</span>
              <span>Media</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        
        {/* TODAY'S ACTIVITY TAB */}
        {activeTab === 'today' && (
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-4">
              <Link
                href="/admin/classroom"
                className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl p-6 hover:shadow-xl transition-all"
              >
                <div className="text-4xl mb-3">📋</div>
                <h3 className="font-bold text-lg">Track Progress</h3>
                <p className="text-blue-100 text-sm mt-1">Update works & capture photos</p>
              </Link>
              <Link
                href="/admin/child-media"
                className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 hover:shadow-xl transition-all"
              >
                <div className="text-4xl mb-3">📷</div>
                <h3 className="font-bold text-lg">Media Gallery</h3>
                <p className="text-purple-100 text-sm mt-1">View all photos & videos</p>
              </Link>
            </div>

            {/* Today's Captures */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gradient-to-r from-amber-50 to-orange-50">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <span>📸</span> Today&apos;s Captures
                </h2>
                <p className="text-gray-500 text-sm">Photos and videos from today</p>
              </div>
              
              {todayMedia.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">📷</div>
                  <p className="text-gray-500">No captures today yet</p>
                  <Link 
                    href="/admin/classroom"
                    className="inline-block mt-4 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700"
                  >
                    Go to Classroom
                  </Link>
                </div>
              ) : (
                <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {todayMedia.map(media => (
                    <button
                      key={media.id}
                      onClick={() => setLightbox(media)}
                      className="relative aspect-square rounded-xl overflow-hidden group"
                    >
                      {media.media_type === 'photo' ? (
                        <Image
                          src={media.media_url}
                          alt={media.work_name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                          <span className="text-4xl">🎬</span>
                        </div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                        <p className="text-white text-xs font-medium truncate">{media.child_name}</p>
                        <p className="text-white/70 text-xs truncate">{media.work_name}</p>
                      </div>
                      <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                        {formatTime(media.taken_at)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* SHELF MANAGER TAB */}
        {activeTab === 'shelves' && (
          <div className="space-y-4">
            {/* Area Selector */}
            <div className="bg-white rounded-2xl p-4 shadow-sm">
              <h2 className="font-bold text-gray-700 mb-3">Select Curriculum Area</h2>
              <div className="flex gap-2 flex-wrap">
                {AREAS.map(area => (
                  <button
                    key={area.id}
                    onClick={() => setSelectedArea(area.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all ${
                      selectedArea === area.id
                        ? `bg-gradient-to-r ${area.color} text-white shadow-lg`
                        : `${area.bgLight} text-gray-700 hover:shadow-md`
                    }`}
                  >
                    <span className="text-lg">{area.icon}</span>
                    <span>{area.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Search + Add */}
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder="🔍 Search works..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none"
                />
              </div>
              <button
                onClick={() => setShowAddForm(true)}
                className={`px-6 py-3 bg-gradient-to-r ${currentArea?.color} text-white rounded-xl font-bold hover:shadow-lg transition-all flex items-center gap-2`}
              >
                <span>+</span>
                <span>Add Work</span>
              </button>
            </div>

            {/* Add Work Form */}
            {showAddForm && (
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h3 className="font-bold text-green-800 mb-3">Add New Work to {currentArea?.name}</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Work name..."
                    value={newWorkName}
                    onChange={(e) => setNewWorkName(e.target.value)}
                    className="flex-1 px-4 py-2 border-2 border-green-300 rounded-lg focus:border-green-500 focus:outline-none"
                    autoFocus
                  />
                  <button
                    onClick={addWork}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700"
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddForm(false); setNewWorkName(''); }}
                    className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Works List */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className={`p-4 border-b bg-gradient-to-r ${currentArea?.color}`}>
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-lg text-white flex items-center gap-2">
                    <span>{currentArea?.icon}</span> {currentArea?.name} Works
                  </h2>
                  <span className="bg-white/20 text-white px-3 py-1 rounded-full text-sm font-bold">
                    {filteredCurriculum.length} works
                  </span>
                </div>
              </div>

              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
                  <p className="text-gray-500">Loading works...</p>
                </div>
              ) : filteredCurriculum.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="text-5xl mb-4">📚</div>
                  <p className="text-gray-500">
                    {searchTerm ? `No works matching "${searchTerm}"` : 'No works in this area'}
                  </p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredCurriculum.map((work, index) => (
                    <div
                      key={work.id}
                      className="p-4 hover:bg-gray-50 transition-colors"
                    >
                      {editingWork?.id === work.id ? (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editingWork.name}
                            onChange={(e) => setEditingWork({ ...editingWork, name: e.target.value })}
                            className="flex-1 px-3 py-2 border-2 border-blue-300 rounded-lg focus:border-blue-500 focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => updateWork(work.id, editingWork.name)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingWork(null)}
                            className="px-4 py-2 bg-gray-200 text-gray-600 rounded-lg font-bold hover:bg-gray-300"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 ${currentArea?.bg} rounded-lg flex items-center justify-center text-white font-bold`}>
                            {index + 1}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-gray-900">{work.name}</h3>
                            {work.chinese_name && (
                              <p className="text-sm text-gray-500">{work.chinese_name}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingWork(work)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => deleteWork(work.id)}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ALL MEDIA TAB */}
        {activeTab === 'media' && (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <span>🖼️</span> All Captured Media
              </h2>
              <p className="text-gray-500 text-sm">{allMedia.length} photos & videos</p>
            </div>
            
            {allMedia.length === 0 ? (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4">📷</div>
                <p className="text-gray-500">No media captured yet</p>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {allMedia.map(media => (
                  <button
                    key={media.id}
                    onClick={() => setLightbox(media)}
                    className="relative aspect-square rounded-xl overflow-hidden group"
                  >
                    {media.media_type === 'photo' ? (
                      <Image
                        src={media.media_url}
                        alt={media.work_name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                        <span className="text-4xl">🎬</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                      <p className="text-white text-xs font-medium truncate">{media.child_name}</p>
                      <p className="text-white/70 text-xs truncate">{media.work_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {lightbox && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button 
            className="absolute top-4 right-4 w-12 h-12 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white text-2xl"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
          <div className="max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            {lightbox.media_type === 'photo' ? (
              <Image
                src={lightbox.media_url}
                alt={lightbox.work_name}
                width={1200}
                height={800}
                className="w-full h-auto rounded-xl"
              />
            ) : (
              <video
                src={lightbox.media_url}
                controls
                autoPlay
                className="w-full rounded-xl"
              />
            )}
            <div className="mt-4 text-white text-center">
              <p className="font-bold text-lg">{lightbox.child_name}</p>
              <p className="text-white/70">{lightbox.work_name}</p>
              <p className="text-white/50 text-sm mt-1">
                {new Date(lightbox.taken_at).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
