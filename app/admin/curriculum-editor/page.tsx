'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

interface CurriculumWork {
  id: string;
  name: string;
  area: string;
  area_id?: string;
  work_key?: string;
  sequence: number;
}

interface OrphanedWork {
  id: string;
  work_name: string;
  area: string;
  assignmentCount: number;
  childCount: number;
}

interface Area {
  id: string;
  area_key: string;
  name: string;
  icon?: string;
  color?: string;
}

const AREA_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  practical_life: { icon: '🧹', color: 'bg-pink-500', bgColor: 'bg-pink-50' },
  sensorial: { icon: '👁️', color: 'bg-purple-500', bgColor: 'bg-purple-50' },
  mathematics: { icon: '🔢', color: 'bg-blue-500', bgColor: 'bg-blue-50' },
  language: { icon: '📖', color: 'bg-green-500', bgColor: 'bg-green-50' },
  cultural: { icon: '🌍', color: 'bg-orange-500', bgColor: 'bg-orange-50' },
};

export default function CurriculumEditorPage() {
  const [works, setWorks] = useState<CurriculumWork[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [orphanedWorks, setOrphanedWorks] = useState<OrphanedWork[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string>('practical_life');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingWork, setEditingWork] = useState<CurriculumWork | null>(null);
  const [newWork, setNewWork] = useState({ name: '', area: 'practical_life' });
  const [saving, setSaving] = useState(false);

  // Close modals on escape key
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddModal(false);
        setEditingWork(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [currRes, orphanRes] = await Promise.all([
        fetch('/api/admin/curriculum'),
        fetch('/api/admin/curriculum/orphaned')
      ]);
      
      const currData = await currRes.json();
      const orphanData = await orphanRes.json();
      
      setWorks(currData.works || []);
      setAreas(currData.areas || []);
      setOrphanedWorks(orphanData.orphaned || []);
    } catch (error) {
      console.error('Failed to fetch:', error);
      toast.error('Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWork = async () => {
    if (!newWork.name.trim()) {
      toast.error('Work name is required');
      return;
    }
    
    setSaving(true);
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWork)
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Work added!');
        setShowAddModal(false);
        setNewWork({ name: '', area: selectedArea });
        fetchData();
      } else {
        toast.error(data.error || 'Failed to add');
      }
    } catch (error) {
      toast.error('Failed to add work');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateWork = async () => {
    if (!editingWork) return;
    
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curriculum/${editingWork.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingWork.name, area: editingWork.area })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Work updated!');
        setEditingWork(null);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to update');
      }
    } catch (error) {
      toast.error('Failed to update work');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteWork = async (work: CurriculumWork) => {
    if (!confirm(`Delete "${work.name}"?\n\nThis will also remove any progress data for this work.`)) return;
    
    try {
      const res = await fetch(`/api/admin/curriculum/${work.id}`, {
        method: 'DELETE'
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success('Work deleted');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete work');
    }
  };

  const handleAddOrphanToCurriculum = async (orphan: OrphanedWork) => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: orphan.work_name, 
          area: orphan.area,
          linkOrphans: true
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Added "${orphan.work_name}" to curriculum!`);
        fetchData();
      } else {
        toast.error(data.error || 'Failed to add');
      }
    } catch (error) {
      toast.error('Failed to add work');
    } finally {
      setSaving(false);
    }
  };

  const handleSyncAll = async () => {
    setSaving(true);
    toast.info('🔄 Syncing all children...');
    try {
      const res = await fetch('/api/admin/curriculum/sync-all', {
        method: 'POST'
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        fetchData();
      } else {
        toast.error(data.error || 'Sync failed');
      }
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSaving(false);
    }
  };

  const filteredWorks = works
    .filter(w => w.area === selectedArea)
    .filter(w => w.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => a.sequence - b.sequence);

  const areaStats = Object.entries(AREA_CONFIG).map(([key, config]) => ({
    key,
    ...config,
    name: key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
    count: works.filter(w => w.area === key).length
  }));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl animate-pulse">📚</span>
          </div>
          <p className="text-gray-600">Loading curriculum...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/montree/dashboard" className="text-gray-500 hover:text-gray-700">
                ← Back
              </Link>
              <div>
                <h1 className="text-xl font-bold text-gray-900">📚 Curriculum Editor</h1>
                <p className="text-sm text-gray-500">{works.length} works • Whale Class</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={handleSyncAll}
                disabled={saving}
                className="btn btn-primary btn-md"
              >
                {saving ? '⏳' : '🔄'} Sync All Children
              </button>
              <button
                onClick={() => { setNewWork({ name: '', area: selectedArea }); setShowAddModal(true); }}
                className="btn btn-primary btn-md"
              >
                + Add Work
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Orphaned Works Alert */}
        {orphanedWorks.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <h3 className="font-bold text-amber-800">
                  {orphanedWorks.length} Unlinked Works Found
                </h3>
                <p className="text-sm text-amber-700 mb-3">
                  These works from weekly plans aren't in your curriculum. Add them to track progress.
                </p>
                <div className="flex flex-wrap gap-2">
                  {orphanedWorks.slice(0, 8).map(orphan => (
                    <button
                      key={orphan.id}
                      onClick={() => handleAddOrphanToCurriculum(orphan)}
                      disabled={saving}
                      className="btn btn-secondary btn-sm on-light"
                    >
                      <span className="font-medium truncate max-w-[150px]">{orphan.work_name}</span>
                      <span className="text-amber-600 whitespace-nowrap">+ Add</span>
                    </button>
                  ))}
                  {orphanedWorks.length > 8 && (
                    <span className="px-3 py-1.5 text-sm text-amber-600">
                      +{orphanedWorks.length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Area Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {areaStats.map(area => (
            <button
              key={area.key}
              onClick={() => setSelectedArea(area.key)}
              className={`btn btn-md ${
                selectedArea === area.key
                  ? 'btn-primary'
                  : 'btn-secondary on-light'
              }`}
            >
              <span>{area.icon}</span>
              <span>{area.name}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                selectedArea === area.key ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {area.count}
              </span>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search works..."
            className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Works Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredWorks.map((work, index) => (
            <div
              key={work.id}
              className="bg-white rounded-xl p-4 border hover:shadow-md transition-shadow group"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{work.name}</p>
                  <p className="text-xs text-gray-500 mt-1">#{index + 1} in sequence</p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => setEditingWork(work)}
                    className="btn btn-ghost btn-icon btn-sm on-light"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteWork(work)}
                    className="btn btn-danger btn-soft btn-icon btn-sm"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredWorks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">{AREA_CONFIG[selectedArea]?.icon || '📚'}</p>
            <p>No works found {searchQuery ? `matching "${searchQuery}"` : 'in this area'}</p>
            <button
              onClick={() => { setNewWork({ name: '', area: selectedArea }); setShowAddModal(true); }}
              className="btn btn-primary btn-md mt-4"
            >
              + Add First Work
            </button>
          </div>
        )}
      </main>

      {/* Add Modal */}
      {showAddModal && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Add New Work</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Name</label>
                <input
                  type="text"
                  value={newWork.name}
                  onChange={(e) => setNewWork({ ...newWork, name: e.target.value })}
                  placeholder="e.g., Water Pouring"
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select
                  value={newWork.area}
                  onChange={(e) => setNewWork({ ...newWork, area: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(AREA_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="btn btn-secondary btn-md flex-1 on-light"
              >
                Cancel
              </button>
              <button
                onClick={handleAddWork}
                disabled={saving || !newWork.name.trim()}
                className="btn btn-primary btn-md flex-1"
              >
                {saving ? 'Adding...' : 'Add Work'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingWork && (
        <div 
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setEditingWork(null)}
        >
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">Edit Work</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Name</label>
                <input
                  type="text"
                  value={editingWork.name}
                  onChange={(e) => setEditingWork({ ...editingWork, name: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select
                  value={editingWork.area}
                  onChange={(e) => setEditingWork({ ...editingWork, area: e.target.value })}
                  className="w-full px-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.entries(AREA_CONFIG).map(([key, config]) => (
                    <option key={key} value={key}>
                      {config.icon} {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setEditingWork(null)}
                className="btn btn-secondary btn-md flex-1 on-light"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateWork}
                disabled={saving || !editingWork.name.trim()}
                className="btn btn-primary btn-md flex-1"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
