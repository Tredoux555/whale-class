'use client';

import React, { useState, useEffect } from 'react';
import { useParentChildren } from '@/lib/hooks/useParentChildren';

interface Activity {
  work_id: string;
  work_name: string;
  status: string;
  progress: string | null;
  area_name: string;
  area_color: string;
  area_icon: string;
  parent_description: string | null;
  why_it_matters: string | null;
  home_connection: string | null;
}

interface ChildData {
  id: string;
  name: string;
}

export default function HomeActivitiesPage() {
  const { children, loading: childrenLoading } = useParentChildren();
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [child, setChild] = useState<ChildData | null>(null);
  const [stats, setStats] = useState<{ total: number; byArea: Record<string, number> }>({ total: 0, byArea: {} });
  const [loading, setLoading] = useState(false);
  const [filterArea, setFilterArea] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Auto-select first child
  useEffect(() => {
    if (children.length > 0 && !selectedChildId) {
      setSelectedChildId(children[0].id);
    }
  }, [children, selectedChildId]);

  // Fetch activities when child changes
  useEffect(() => {
    if (!selectedChildId) return;

    const fetchActivities = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/whale/parent/home-activities/${selectedChildId}`);
        const data = await res.json();
        if (res.ok) {
          setActivities(data.activities || []);
          setChild(data.child);
          setStats(data.stats || { total: 0, byArea: {} });
        }
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      }
      setLoading(false);
    };

    fetchActivities();
  }, [selectedChildId]);

  // Filter activities
  const filteredActivities = activities.filter(a => {
    if (filterArea && a.area_name !== filterArea) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  // Group by area
  const groupedByArea = filteredActivities.reduce((acc, activity) => {
    if (!acc[activity.area_name]) {
      acc[activity.area_name] = {
        name: activity.area_name,
        color: activity.area_color,
        icon: activity.area_icon,
        activities: [],
      };
    }
    acc[activity.area_name].activities.push(activity);
    return acc;
  }, {} as Record<string, { name: string; color: string; icon: string; activities: Activity[] }>);

  const handlePrint = () => {
    window.print();
  };

  if (childrenLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 print:bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10 print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">🏠 Home Activities</h1>
              <p className="text-sm text-slate-500">
                Activities to reinforce {child?.name || 'your child'}'s learning at home
              </p>
            </div>
            <div className="flex items-center gap-3">
              {children.length > 1 && (
                <select
                  value={selectedChildId || ''}
                  onChange={(e) => setSelectedChildId(e.target.value)}
                  className="px-3 py-2 border rounded-lg text-sm"
                >
                  {children.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              )}
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Print Header */}
      <div className="hidden print:block text-center py-6 border-b">
        <h1 className="text-2xl font-bold">🏠 Home Activities for {child?.name}</h1>
        <p className="text-gray-500">Printed {new Date().toLocaleDateString()}</p>
      </div>

      {/* Filters */}
      <div className="bg-white border-b print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilterArea(null)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                !filterArea ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              All Areas ({stats.total})
            </button>
            {Object.entries(stats.byArea).map(([area, count]) => (
              <button
                key={area}
                onClick={() => setFilterArea(filterArea === area ? null : area)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterArea === area ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {area} ({count})
              </button>
            ))}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => setFilterStatus(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                !filterStatus ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === 'in_progress' ? null : 'in_progress')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === 'in_progress' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              🔄 In Progress
            </button>
            <button
              onClick={() => setFilterStatus(filterStatus === 'completed' ? null : 'completed')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                filterStatus === 'completed' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
              }`}
            >
              ✅ Completed
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500" />
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm">
            <div className="text-5xl mb-4">🌱</div>
            <p className="text-gray-600">No home activities yet!</p>
            <p className="text-sm text-gray-400 mt-1">
              Activities will appear here as {child?.name} progresses through works.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(groupedByArea).map(group => (
              <div key={group.name} className="bg-white rounded-xl shadow-sm overflow-hidden print:shadow-none print:border">
                {/* Area Header */}
                <div 
                  className="px-4 py-3 border-b flex items-center gap-3"
                  style={{ backgroundColor: `${group.color}10` }}
                >
                  <span className="text-2xl">{group.icon}</span>
                  <div>
                    <h2 className="font-bold text-gray-800">{group.name}</h2>
                    <p className="text-xs text-gray-500">{group.activities.length} activities</p>
                  </div>
                </div>

                {/* Activities List */}
                <div className="divide-y">
                  {group.activities.map(activity => (
                    <div key={activity.work_id} className="p-4 print:break-inside-avoid">
                      <div className="flex items-start gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold text-gray-800">{activity.work_name}</h3>
                            {activity.status === 'in_progress' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                                In Progress
                              </span>
                            )}
                            {activity.status === 'completed' && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                ✓ Mastered
                              </span>
                            )}
                          </div>
                          
                          {/* Parent Description */}
                          {activity.parent_description && (
                            <p className="text-sm text-gray-600 mb-2">
                              {activity.parent_description}
                            </p>
                          )}

                          {/* Home Connection - The main focus */}
                          {activity.home_connection && (
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
                              <div className="flex items-start gap-2">
                                <span className="text-lg">🏠</span>
                                <div>
                                  <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide mb-1">
                                    Try This at Home
                                  </p>
                                  <p className="text-sm text-amber-900">
                                    {activity.home_connection}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Print Footer */}
      <div className="hidden print:block text-center py-4 border-t mt-8 text-sm text-gray-500">
        <p>🐋 Generated by Whale Montessori • {new Date().toLocaleDateString()}</p>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { 
            print-color-adjust: exact; 
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:shadow-none { box-shadow: none !important; }
          .print\\:border { border: 1px solid #e5e7eb !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .print\\:bg-white { background: white !important; }
        }
      `}</style>
    </div>
  );
}
