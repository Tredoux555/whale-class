'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Plus, Trash2, Settings,
  Edit2, Save, X, ChevronRight, ChevronDown, RefreshCw, Check,
  Eye, Mail, Calendar, TreeDeciduous
} from 'lucide-react';
import type { Family, HomeChild, HomeCurriculumWork, ChildProgress, TodayActivity, ProgressSummary } from './types';
import { AREA_CONFIG, STATUS_CONFIG, TABS, formatDate, calculateAge } from './constants';

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function MontreeHomePage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Data state
  const [families, setFamilies] = useState<Family[]>([]);
  const [children, setChildren] = useState<HomeChild[]>([]);
  const [curriculum, setCurriculum] = useState<HomeCurriculumWork[]>([]);
  const [stats, setStats] = useState({
    totalFamilies: 0,
    totalChildren: 0,
    totalActivities: 0,
    activeThisWeek: 0,
  });
  
  // Selection state
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [selectedChild, setSelectedChild] = useState<HomeChild | null>(null);
  
  // Demo mode state
  const [demoActivities, setDemoActivities] = useState<TodayActivity[]>([]);
  const [demoProgress, setDemoProgress] = useState<ProgressSummary | null>(null);
  
  // Modal state
  const [showAddFamily, setShowAddFamily] = useState(false);
  const [showAddChild, setShowAddChild] = useState(false);
  const [newFamilyData, setNewFamilyData] = useState({ email: '', name: '' });
  const [newChildData, setNewChildData] = useState({ name: '', birth_date: '', color: '#4F46E5' });

  // ============================================================
  // DATA FETCHING
  // ============================================================

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch families
      const familiesRes = await fetch('/api/montree-home/families');
      if (!familiesRes.ok) throw new Error('Failed to fetch families');
      const familiesData = await familiesRes.json();
      setFamilies(familiesData.families || []);
      
      // Fetch all children
      const childrenRes = await fetch('/api/montree-home/children');
      if (!childrenRes.ok) throw new Error('Failed to fetch children');
      const childrenData = await childrenRes.json();
      setChildren(childrenData.children || []);
      
      // Fetch curriculum (master template)
      const curriculumRes = await fetch('/api/montree-home/curriculum');
      if (!curriculumRes.ok) throw new Error('Failed to fetch curriculum');
      const curriculumData = await curriculumRes.json();
      setCurriculum(curriculumData.curriculum || []);
      
      // Calculate stats
      setStats({
        totalFamilies: familiesData.families?.length || 0,
        totalChildren: childrenData.children?.length || 0,
        totalActivities: curriculumData.curriculum?.length || 0,
        activeThisWeek: familiesData.activeThisWeek || 0,
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ============================================================
  // DEMO MODE FUNCTIONS
  // ============================================================

  const loadDemoForChild = async (child: HomeChild) => {
    setSelectedChild(child);
    
    try {
      // Fetch today's activities
      const activitiesRes = await fetch(`/api/montree-home/activities?childId=${child.id}&count=3`);
      const activitiesData = await activitiesRes.json();
      setDemoActivities(activitiesData.activities || []);
      
      // Fetch progress summary
      const progressRes = await fetch(`/api/montree-home/children?childId=${child.id}&progress=true`);
      const progressData = await progressRes.json();
      setDemoProgress(progressData.progress || null);
      
    } catch (err) {
      console.error('Failed to load demo:', err);
    }
  };

  const markActivityDone = async (activityId: string) => {
    if (!selectedChild) return;
    
    try {
      await fetch('/api/montree-home/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChild.id,
          activityId,
          action: 'mark_done',
        }),
      });
      
      // Refresh demo
      loadDemoForChild(selectedChild);
    } catch (err) {
      console.error('Failed to mark done:', err);
    }
  };

  // ============================================================
  // CRUD FUNCTIONS
  // ============================================================

  const createFamily = async () => {
    if (!newFamilyData.email || !newFamilyData.name) return;
    
    try {
      const res = await fetch('/api/montree-home/families', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFamilyData),
      });
      
      if (!res.ok) throw new Error('Failed to create family');
      
      setShowAddFamily(false);
      setNewFamilyData({ email: '', name: '' });
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create family');
    }
  };

  const createChild = async () => {
    if (!selectedFamily || !newChildData.name || !newChildData.birth_date) return;
    
    try {
      const res = await fetch('/api/montree-home/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newChildData,
          family_id: selectedFamily.id,
        }),
      });
      
      if (!res.ok) throw new Error('Failed to create child');
      
      setShowAddChild(false);
      setNewChildData({ name: '', birth_date: '', color: '#4F46E5' });
      fetchData();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create child');
    }
  };

  const deleteFamily = async (id: string) => {
    if (!confirm('Delete this family and all their data?')) return;
    
    try {
      await fetch(`/api/montree-home/families?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed to delete family');
    }
  };

  const deleteChild = async (id: string) => {
    if (!confirm('Delete this child?')) return;
    
    try {
      await fetch(`/api/montree-home/children?id=${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      alert('Failed to delete child');
    }
  };

  // ============================================================
  // RENDER: LOADING & ERROR
  // ============================================================

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Loading Montree Home...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // RENDER: MAIN
  // ============================================================

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
              <TreeDeciduous className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Montree Home</h1>
              <p className="text-sm text-slate-400">Homeschool Platform Management</p>
            </div>
          </div>
          <button
            onClick={fetchData}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-800 border-r border-slate-700 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-1">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
                  activeTab === tab.id
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
          
          {/* Quick Stats in Sidebar */}
          <div className="p-4 border-t border-slate-700">
            <h3 className="text-xs font-semibold text-slate-500 uppercase mb-3">Quick Stats</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-400">
                <span>Families</span>
                <span className="text-emerald-400 font-semibold">{stats.totalFamilies}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Children</span>
                <span className="text-blue-400 font-semibold">{stats.totalChildren}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Activities</span>
                <span className="text-purple-400 font-semibold">{stats.totalActivities}</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-lg text-red-300">
              {error}
            </div>
          )}

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-bold text-white">Overview</h2>
              
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-600/20 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.totalFamilies}</p>
                      <p className="text-sm text-slate-400">Total Families</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center">
                      <Baby className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.totalChildren}</p>
                      <p className="text-sm text-slate-400">Total Children</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-purple-600/20 rounded-lg flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.totalActivities}</p>
                      <p className="text-sm text-slate-400">Curriculum Works</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-yellow-600/20 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-white">{stats.activeThisWeek}</p>
                      <p className="text-sm text-slate-400">Active This Week</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Recent Families */}
              <div className="bg-slate-800 rounded-xl border border-slate-700">
                <div className="px-6 py-4 border-b border-slate-700 flex items-center justify-between">
                  <h3 className="font-semibold text-white">Recent Families</h3>
                  <button
                    onClick={() => setActiveTab('families')}
                    className="text-sm text-emerald-400 hover:text-emerald-300"
                  >
                    View All →
                  </button>
                </div>
                <div className="divide-y divide-slate-700">
                  {families.slice(0, 5).map((family) => (
                    <div key={family.id} className="px-6 py-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-white">{family.name}</p>
                        <p className="text-sm text-slate-400">{family.email}</p>
                      </div>
                      <div className="text-sm text-slate-500">
                        {formatDate(family.created_at)}
                      </div>
                    </div>
                  ))}
                  {families.length === 0 && (
                    <div className="px-6 py-8 text-center text-slate-500">
                      No families yet. Create one to get started.
                    </div>
                  )}
                </div>
              </div>
              
              {/* Curriculum by Area */}
              <div className="bg-slate-800 rounded-xl border border-slate-700">
                <div className="px-6 py-4 border-b border-slate-700">
                  <h3 className="font-semibold text-white">Curriculum by Area</h3>
                </div>
                <div className="p-6 grid grid-cols-5 gap-4">
                  {Object.entries(AREA_CONFIG).map(([area, config]) => {
                    const count = curriculum.filter(c => c.area === area).length;
                    return (
                      <div key={area} className="text-center">
                        <div 
                          className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-2 text-2xl"
                          style={{ backgroundColor: config.bgColor }}
                        >
                          {config.emoji}
                        </div>
                        <p className="font-semibold text-white">{count}</p>
                        <p className="text-xs text-slate-400">{config.label}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Families Tab */}
          {activeTab === 'families' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Families</h2>
                <button
                  onClick={() => setShowAddFamily(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Family
                </button>
              </div>
              
              <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-700/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Family</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Email</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Children</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Created</th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase">Status</th>
                      <th className="px-6 py-3 text-right text-xs font-semibold text-slate-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {families.map((family) => {
                      const familyChildren = children.filter(c => c.family_id === family.id);
                      return (
                        <tr key={family.id} className="hover:bg-slate-700/30">
                          <td className="px-6 py-4">
                            <p className="font-medium text-white">{family.name}</p>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{family.email}</td>
                          <td className="px-6 py-4">
                            <span className="px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm">
                              {familyChildren.length} children
                            </span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{formatDate(family.created_at)}</td>
                          <td className="px-6 py-4">
                            <span className={`px-2 py-1 rounded text-sm ${
                              family.onboarding_completed 
                                ? 'bg-emerald-600/20 text-emerald-400' 
                                : 'bg-yellow-600/20 text-yellow-400'
                            }`}>
                              {family.onboarding_completed ? 'Active' : 'Onboarding'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => { setSelectedFamily(family); setActiveTab('children'); }}
                                className="p-2 text-slate-400 hover:text-white hover:bg-slate-600 rounded"
                                title="View Children"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => deleteFamily(family.id)}
                                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-600 rounded"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {families.length === 0 && (
                  <div className="px-6 py-12 text-center text-slate-500">
                    No families yet. Click "Add Family" to create one.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Children Tab */}
          {activeTab === 'children' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">Children</h2>
                  {selectedFamily && (
                    <p className="text-slate-400">
                      Showing children for: <span className="text-emerald-400">{selectedFamily.name}</span>
                      <button 
                        onClick={() => setSelectedFamily(null)}
                        className="ml-2 text-slate-500 hover:text-white"
                      >
                        (show all)
                      </button>
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setShowAddChild(true)}
                  disabled={!selectedFamily}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  Add Child
                </button>
              </div>
              
              {!selectedFamily && (
                <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-4 text-yellow-300 text-sm">
                  💡 Select a family from the Families tab to add children, or view all children below.
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-4">
                {(selectedFamily 
                  ? children.filter(c => c.family_id === selectedFamily.id)
                  : children
                ).map((child) => {
                  const family = families.find(f => f.id === child.family_id);
                  return (
                    <div 
                      key={child.id}
                      className="bg-slate-800 rounded-xl border border-slate-700 p-6"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div 
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white text-xl font-bold"
                          style={{ backgroundColor: child.color }}
                        >
                          {child.name.charAt(0)}
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setSelectedChild(child); setActiveTab('demo'); loadDemoForChild(child); }}
                            className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-slate-700 rounded"
                            title="Demo Mode"
                          >
                            <Play className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteChild(child.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-white mb-1">{child.name}</h3>
                      <p className="text-sm text-slate-400 mb-2">Age: {calculateAge(child.birth_date)}</p>
                      {!selectedFamily && family && (
                        <p className="text-xs text-slate-500">Family: {family.name}</p>
                      )}
                      <p className="text-xs text-slate-500">Started: {formatDate(child.start_date)}</p>
                    </div>
                  );
                })}
              </div>
              
              {children.length === 0 && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center text-slate-500">
                  No children yet. Select a family and click "Add Child" to create one.
                </div>
              )}
            </div>
          )}

          {/* Curriculum Tab */}
          {activeTab === 'curriculum' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Master Curriculum</h2>
                <p className="text-slate-400">{curriculum.length} activities</p>
              </div>
              
              {Object.entries(AREA_CONFIG).map(([area, config]) => {
                const areaWorks = curriculum.filter(c => c.area === area);
                const categories = [...new Set(areaWorks.map(w => w.category))];
                
                return (
                  <div key={area} className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
                    <div 
                      className="px-6 py-4 border-b border-slate-700 flex items-center gap-3"
                      style={{ backgroundColor: `${config.color}15` }}
                    >
                      <span className="text-2xl">{config.emoji}</span>
                      <div>
                        <h3 className="font-semibold text-white">{config.label}</h3>
                        <p className="text-sm text-slate-400">{areaWorks.length} activities</p>
                      </div>
                    </div>
                    <div className="divide-y divide-slate-700">
                      {categories.map((category) => {
                        const categoryWorks = areaWorks.filter(w => w.category === category);
                        return (
                          <div key={category} className="px-6 py-4">
                            <h4 className="font-medium text-slate-300 mb-2">{category}</h4>
                            <div className="flex flex-wrap gap-2">
                              {categoryWorks.map((work) => (
                                <span 
                                  key={work.id}
                                  className="px-3 py-1 bg-slate-700 text-slate-300 rounded-full text-sm hover:bg-slate-600 cursor-pointer"
                                  title={work.description || work.name}
                                >
                                  {work.name}
                                  {work.video_url && <Play className="inline w-3 h-3 ml-1 text-emerald-400" />}
                                </span>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Demo Mode Tab */}
          {activeTab === 'demo' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white">Demo Mode</h2>
                <p className="text-slate-400">Preview the parent experience</p>
              </div>
              
              {/* Child Selector */}
              <div className="bg-slate-800 rounded-xl border border-slate-700 p-4">
                <h3 className="font-semibold text-white mb-3">Select a Child</h3>
                <div className="flex flex-wrap gap-3">
                  {children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => loadDemoForChild(child)}
                      className={`px-4 py-3 rounded-lg border-2 transition-colors ${
                        selectedChild?.id === child.id
                          ? 'border-emerald-500 bg-emerald-600/20'
                          : 'border-slate-600 hover:border-slate-500'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: child.color }}
                        >
                          {child.name.charAt(0)}
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-white">{child.name}</p>
                          <p className="text-xs text-slate-400">{calculateAge(child.birth_date)}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
              
              {selectedChild && (
                <>
                  {/* Progress Summary */}
                  {demoProgress && (
                    <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                      <h3 className="font-semibold text-white mb-4">Progress Summary</h3>
                      <div className="grid grid-cols-5 gap-4 mb-6">
                        {Object.entries(AREA_CONFIG).map(([area, config]) => {
                          const areaData = demoProgress.by_area?.[area];
                          const percent = areaData?.percent || 0;
                          return (
                            <div key={area} className="text-center">
                              <div className="relative w-16 h-16 mx-auto mb-2">
                                <svg className="w-16 h-16 transform -rotate-90">
                                  <circle
                                    cx="32" cy="32" r="28"
                                    fill="none"
                                    stroke="#374151"
                                    strokeWidth="6"
                                  />
                                  <circle
                                    cx="32" cy="32" r="28"
                                    fill="none"
                                    stroke={config.color}
                                    strokeWidth="6"
                                    strokeDasharray={`${percent * 1.76} 176`}
                                    strokeLinecap="round"
                                  />
                                </svg>
                                <span className="absolute inset-0 flex items-center justify-center text-white text-sm font-bold">
                                  {percent}%
                                </span>
                              </div>
                              <p className="text-xs text-slate-400">{config.label}</p>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex justify-center gap-8 text-sm">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-emerald-400">{demoProgress.mastered}</p>
                          <p className="text-slate-400">Mastered</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-blue-400">{demoProgress.practicing}</p>
                          <p className="text-slate-400">Practicing</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-yellow-400">{demoProgress.presented}</p>
                          <p className="text-slate-400">Presented</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Today's Activities */}
                  <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
                    <h3 className="font-semibold text-white mb-4">Today's Recommended Activities</h3>
                    <div className="space-y-4">
                      {demoActivities.map((activity) => {
                        const areaConfig = AREA_CONFIG[activity.area] || AREA_CONFIG.practical_life;
                        const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG[0];
                        
                        return (
                          <div 
                            key={activity.id}
                            className="bg-slate-700/50 rounded-lg p-4 border border-slate-600"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{areaConfig.emoji}</span>
                                <div>
                                  <h4 className="font-semibold text-white">{activity.name}</h4>
                                  <p className="text-sm text-slate-400">{activity.category}</p>
                                  {activity.description && (
                                    <p className="text-sm text-slate-500 mt-1">{activity.description}</p>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span 
                                  className="px-2 py-1 rounded text-xs font-medium"
                                  style={{ backgroundColor: statusConfig.bgColor, color: statusConfig.color }}
                                >
                                  {statusConfig.label}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                              {activity.video_url && (
                                <a
                                  href={activity.video_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                >
                                  <Play className="w-4 h-4" />
                                  Watch Demo
                                </a>
                              )}
                              <button
                                onClick={() => markActivityDone(activity.id)}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 text-white rounded text-sm hover:bg-emerald-700"
                              >
                                <Check className="w-4 h-4" />
                                Mark Done
                              </button>
                            </div>
                          </div>
                        );
                      })}
                      
                      {demoActivities.length === 0 && (
                        <div className="text-center py-8 text-slate-500">
                          No activities recommended. The child may have completed all available work!
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
              
              {!selectedChild && (
                <div className="bg-slate-800 rounded-xl border border-slate-700 p-12 text-center text-slate-500">
                  Select a child above to preview their parent dashboard experience.
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Family Modal */}
      {showAddFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Add New Family</h3>
              <button onClick={() => setShowAddFamily(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Family Name</label>
                <input
                  type="text"
                  value={newFamilyData.name}
                  onChange={(e) => setNewFamilyData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="The Smith Family"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                <input
                  type="email"
                  value={newFamilyData.email}
                  onChange={(e) => setNewFamilyData(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="family@example.com"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddFamily(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={createFamily}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Create Family
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Child Modal */}
      {showAddChild && selectedFamily && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl border border-slate-700 p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Add Child</h3>
                <p className="text-sm text-slate-400">to {selectedFamily.name}</p>
              </div>
              <button onClick={() => setShowAddChild(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Child's Name</label>
                <input
                  type="text"
                  value={newChildData.name}
                  onChange={(e) => setNewChildData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Emma"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Birth Date</label>
                <input
                  type="date"
                  value={newChildData.birth_date}
                  onChange={(e) => setNewChildData(prev => ({ ...prev, birth_date: e.target.value }))}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Color</label>
                <input
                  type="color"
                  value={newChildData.color}
                  onChange={(e) => setNewChildData(prev => ({ ...prev, color: e.target.value }))}
                  className="w-full h-10 bg-slate-700 border border-slate-600 rounded-lg cursor-pointer"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddChild(false)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={createChild}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
              >
                Add Child
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
