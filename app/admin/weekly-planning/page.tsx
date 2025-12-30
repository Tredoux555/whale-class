'use client';

import { useState, useEffect } from 'react';

interface Child {
  id: string;
  name: string;
  avatar_emoji?: string;
}

interface Work {
  id: string;
  work_name: string;
  area: string;
}

interface Assignment {
  id: string;
  child_id: string;
  child_name: string;
  work_id: string;
  work_name: string;
  area: string;
  status: 'not_started' | 'in_progress' | 'completed';
  notes?: string;
}

const AREA_COLORS: Record<string, string> = {
  practical_life: 'bg-amber-100 text-amber-800 border-amber-300',
  sensorial: 'bg-pink-100 text-pink-800 border-pink-300',
  mathematics: 'bg-blue-100 text-blue-800 border-blue-300',
  language: 'bg-green-100 text-green-800 border-green-300',
  culture: 'bg-purple-100 text-purple-800 border-purple-300',
  english: 'bg-teal-100 text-teal-800 border-teal-300',
};

const AREA_LABELS: Record<string, string> = {
  practical_life: 'Practical Life',
  sensorial: 'Sensorial',
  mathematics: 'Math',
  language: 'Language',
  culture: 'Culture',
  english: 'English',
};

function getCurrentWeek(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const diff = now.getTime() - start.getTime();
  const oneWeek = 604800000;
  return Math.ceil(diff / oneWeek);
}

function getWeekDates(week: number, year: number): { start: string; end: string } {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dayOfWeek = simple.getDay();
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return {
    start: monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    end: sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  };
}

export default function WeeklyPlanningPage() {
  const [weekNumber, setWeekNumber] = useState(getCurrentWeek());
  const [year, setYear] = useState(new Date().getFullYear());
  const [children, setChildren] = useState<Child[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form state
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedWork, setSelectedWork] = useState('');
  const [workSearch, setWorkSearch] = useState('');
  const [filterArea, setFilterArea] = useState('all');

  // Load initial data
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [childrenRes, worksRes] = await Promise.all([
          fetch('/api/weekly-planning/children'),
          fetch('/api/weekly-planning/works')
        ]);
        
        if (childrenRes.ok) {
          const data = await childrenRes.json();
          setChildren(data.children || []);
        }
        
        if (worksRes.ok) {
          const data = await worksRes.json();
          setWorks(data.works || []);
        }
      } catch (err) {
        console.error('Failed to load data:', err);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Load assignments when week/year changes
  useEffect(() => {
    async function loadAssignments() {
      try {
        const res = await fetch(`/api/weekly-planning/assignments?week=${weekNumber}&year=${year}`);
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments || []);
        }
      } catch (err) {
        console.error('Failed to load assignments:', err);
      }
    }
    loadAssignments();
  }, [weekNumber, year]);

  // Filter works by search and area
  const filteredWorks = works.filter(w => {
    const matchesSearch = workSearch === '' || 
      w.work_name.toLowerCase().includes(workSearch.toLowerCase());
    const matchesArea = filterArea === 'all' || w.area === filterArea;
    return matchesSearch && matchesArea;
  });

  // Group assignments by child
  const assignmentsByChild = assignments.reduce((acc, a) => {
    if (!acc[a.child_id]) {
      acc[a.child_id] = { name: a.child_name, assignments: [] };
    }
    acc[a.child_id].assignments.push(a);
    return acc;
  }, {} as Record<string, { name: string; assignments: Assignment[] }>);

  // Add assignment
  async function addAssignment() {
    if (!selectedChild || !selectedWork) return;
    
    const work = works.find(w => w.id === selectedWork);
    const child = children.find(c => c.id === selectedChild);
    if (!work || !child) return;

    setSaving(true);
    try {
      const res = await fetch('/api/weekly-planning/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          week: weekNumber,
          year,
          child_id: selectedChild,
          work_id: selectedWork,
          work_name: work.work_name,
          area: work.area
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAssignments(prev => [...prev, {
          ...data.assignment,
          child_name: child.name
        }]);
        setSelectedWork('');
        setWorkSearch('');
      }
    } catch (err) {
      console.error('Failed to add assignment:', err);
    }
    setSaving(false);
  }

  // Toggle status
  async function toggleStatus(assignmentId: string, currentStatus: string) {
    const nextStatus = currentStatus === 'not_started' ? 'in_progress' 
      : currentStatus === 'in_progress' ? 'completed' : 'not_started';
    
    try {
      const res = await fetch(`/api/weekly-planning/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        setAssignments(prev => prev.map(a => 
          a.id === assignmentId ? { ...a, status: nextStatus as Assignment['status'] } : a
        ));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  }

  // Delete assignment
  async function deleteAssignment(assignmentId: string) {
    if (!confirm('Remove this assignment?')) return;
    
    try {
      const res = await fetch(`/api/weekly-planning/assignments/${assignmentId}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      }
    } catch (err) {
      console.error('Failed to delete:', err);
    }
  }

  const weekDates = getWeekDates(weekNumber, year);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📋</div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
            📋 Weekly Planning
          </h1>
          <p className="text-gray-600 mt-1">Assign works to children for the week</p>
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Week</label>
              <input
                type="number"
                value={weekNumber}
                onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                min={1}
                max={53}
                className="w-20 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value) || 2025)}
                className="w-24 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
              <p className="text-lg font-semibold text-blue-600">{weekDates.start} - {weekDates.end}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Summary</label>
              <p className="text-sm text-gray-600">
                {assignments.length} assignments • {Object.keys(assignmentsByChild).length} children
              </p>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Add Assignment Form */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-4 sticky top-6">
              <h2 className="text-lg font-bold text-gray-800 mb-4">➕ Add Assignment</h2>
              
              {/* Child Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Child</label>
                <select
                  value={selectedChild}
                  onChange={(e) => setSelectedChild(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select child...</option>
                  {children.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.avatar_emoji || '👤'} {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Area Filter */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Area</label>
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Areas</option>
                  {Object.entries(AREA_LABELS).map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              {/* Work Search */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search Work ({filteredWorks.length})
                </label>
                <input
                  type="text"
                  value={workSearch}
                  onChange={(e) => setWorkSearch(e.target.value)}
                  placeholder="Type to search..."
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Work Selector */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Work</label>
                <select
                  value={selectedWork}
                  onChange={(e) => setSelectedWork(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  size={8}
                >
                  {filteredWorks.slice(0, 50).map(w => (
                    <option key={w.id} value={w.id}>
                      {w.work_name}
                    </option>
                  ))}
                </select>
                {filteredWorks.length > 50 && (
                  <p className="text-xs text-gray-500 mt-1">Showing first 50. Use search to narrow.</p>
                )}
              </div>

              {/* Add Button */}
              <button
                onClick={addAssignment}
                disabled={!selectedChild || !selectedWork || saving}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {saving ? '⏳ Adding...' : '➕ Add Assignment'}
              </button>
            </div>
          </div>

          {/* Assignments List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <h2 className="text-lg font-bold text-gray-800 mb-4">
                📚 Week {weekNumber} Assignments
              </h2>

              {Object.keys(assignmentsByChild).length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-5xl mb-3">📝</div>
                  <p className="text-lg">No assignments yet</p>
                  <p className="text-sm">Select a child and work to add assignments</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.entries(assignmentsByChild).map(([childId, { name, assignments: childAssignments }]) => (
                    <div key={childId} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <h3 className="font-semibold text-gray-800">
                          {children.find(c => c.id === childId)?.avatar_emoji || '👤'} {name}
                          <span className="ml-2 text-sm font-normal text-gray-500">
                            ({childAssignments.length} works)
                          </span>
                        </h3>
                      </div>
                      <div className="divide-y">
                        {childAssignments.map(assignment => (
                          <div 
                            key={assignment.id} 
                            className="px-4 py-3 flex items-center gap-3 hover:bg-gray-50"
                          >
                            {/* Status Toggle */}
                            <button
                              onClick={() => toggleStatus(assignment.id, assignment.status)}
                              className={`w-8 h-8 rounded-full flex items-center justify-center text-lg transition-colors ${
                                assignment.status === 'completed' ? 'bg-green-100 text-green-600' :
                                assignment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-600' :
                                'bg-gray-100 text-gray-400'
                              }`}
                              title={assignment.status}
                            >
                              {assignment.status === 'completed' ? '✓' :
                               assignment.status === 'in_progress' ? '◐' : '○'}
                            </button>
                            
                            {/* Work Info */}
                            <div className="flex-1">
                              <p className={`font-medium ${assignment.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                {assignment.work_name}
                              </p>
                              <span className={`inline-block text-xs px-2 py-0.5 rounded border ${AREA_COLORS[assignment.area] || 'bg-gray-100'}`}>
                                {AREA_LABELS[assignment.area] || assignment.area}
                              </span>
                            </div>

                            {/* Delete */}
                            <button
                              onClick={() => deleteAssignment(assignment.id)}
                              className="text-red-400 hover:text-red-600 p-1"
                              title="Remove"
                            >
                              🗑
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
