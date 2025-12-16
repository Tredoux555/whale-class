'use client';

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Video, 
  TrendingUp,
  Users,
  Monitor,
  Smartphone,
  Tablet,
  Clock,
  Copy,
  Check,
  Trash2
} from 'lucide-react';

// ============================================================================
// SCHEMA VERIFICATION COMPONENT
// ============================================================================

interface SchemaCheckResult {
  tableExists: boolean;
  columns: Array<{ name: string; type: string; exists: boolean }>;
  indexes: Array<{ name: string; exists: boolean }>;
  allGood: boolean;
}

export function SchemaVerification() {
  const [schemaCheck, setSchemaCheck] = useState<SchemaCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function checkSchema() {
      try {
        const response = await fetch('/api/admin/testing/schema-check');
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || data.details || `API error: ${response.status}`);
        }
        if (data.error) {
          throw new Error(data.error);
        }
        setSchemaCheck(data);
        setError(null);
      } catch (err: any) {
        console.error('Error checking schema:', err);
        setError(err.message || 'Failed to load schema verification');
        setSchemaCheck(null);
      } finally {
        setLoading(false);
      }
    }
    checkSchema();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <p className="text-red-800 font-semibold mb-2">Error loading schema verification</p>
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (!schemaCheck) {
    return (
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <p className="text-red-800">Failed to load schema verification</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Overall Status */}
      <div className={`p-6 ${schemaCheck.allGood ? 'bg-green-50' : 'bg-red-50'}`}>
        <div className="flex items-center gap-3">
          {schemaCheck.allGood ? (
            <CheckCircle2 className="w-8 h-8 text-green-600" />
          ) : (
            <XCircle className="w-8 h-8 text-red-600" />
          )}
          <div>
            <h3 className={`text-lg font-semibold ${schemaCheck.allGood ? 'text-green-900' : 'text-red-900'}`}>
              {schemaCheck.allGood ? 'All checks passed!' : 'Issues detected'}
            </h3>
            <p className={`text-sm ${schemaCheck.allGood ? 'text-green-700' : 'text-red-700'}`}>
              {schemaCheck.allGood 
                ? 'Database schema is correctly configured' 
                : 'Some database elements are missing or misconfigured'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Table Check */}
      <div className="p-6 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Table: child_video_watches</h4>
        <div className="flex items-center gap-2">
          {schemaCheck.tableExists ? (
            <>
              <CheckCircle2 className="w-5 h-5 text-green-600" />
              <span className="text-green-700">Table exists</span>
            </>
          ) : (
            <>
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-700">Table missing</span>
            </>
          )}
        </div>
      </div>

      {/* Columns Check */}
      <div className="p-6 border-b border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-3">Columns</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {schemaCheck.columns.map((col) => (
                <tr key={col.name}>
                  <td className="px-3 py-2 text-sm font-mono text-gray-900">{col.name}</td>
                  <td className="px-3 py-2 text-sm text-gray-600">{col.type}</td>
                  <td className="px-3 py-2">
                    {col.exists ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-700">
                        <CheckCircle2 className="w-4 h-4" />
                        Present
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-sm text-red-700">
                        <XCircle className="w-4 h-4" />
                        Missing
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Indexes Check */}
      <div className="p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Indexes</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {schemaCheck.indexes.map((idx) => (
            <div key={idx.name} className="flex items-center gap-2 text-sm">
              {idx.exists ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                  <span className="text-gray-700 font-mono text-xs">{idx.name}</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  <span className="text-gray-700 font-mono text-xs">{idx.name}</span>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SYNC ISSUES COMPONENT
// ============================================================================

interface SyncIssues {
  videosWithoutWork: number;
  childrenWithNoWatches: number;
  watchesWithoutCompletion: number;
  orphanedWatches: number;
}

export function SyncIssuesCheck() {
  const [issues, setIssues] = useState<SyncIssues | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function checkIssues() {
      try {
        const response = await fetch('/api/admin/testing/sync-issues');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setIssues(data);
      } catch (error) {
        console.error('Error checking sync issues:', error);
        setIssues(null);
      } finally {
        setLoading(false);
      }
    }
    checkIssues();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!issues) {
    return (
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <p className="text-red-800">Failed to load sync issues</p>
      </div>
    );
  }

  const getColorClass = (count: number) => {
    if (count === 0) return 'bg-green-50 border-green-200 text-green-900';
    if (count <= 5) return 'bg-yellow-50 border-yellow-200 text-yellow-900';
    return 'bg-red-50 border-red-200 text-red-900';
  };

  const getIconColor = (count: number) => {
    if (count === 0) return 'text-green-600';
    if (count <= 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Videos without work */}
      <div className={`rounded-lg p-6 border ${getColorClass(issues.videosWithoutWork)}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">Videos Without Curriculum Work</p>
            <p className="text-3xl font-bold mt-2">{issues.videosWithoutWork}</p>
          </div>
          <AlertCircle className={`w-8 h-8 ${getIconColor(issues.videosWithoutWork)}`} />
        </div>
      </div>

      {/* Children with no watches */}
      <div className={`rounded-lg p-6 border ${getColorClass(issues.childrenWithNoWatches)}`}>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium opacity-75">Children With No Watches</p>
            <p className="text-3xl font-bold mt-2">{issues.childrenWithNoWatches}</p>
          </div>
          <Users className={`w-8 h-8 ${getIconColor(issues.childrenWithNoWatches)}`} />
        </div>
      </div>

      {/* Watches without completion */}
      <div className={`rounded-lg p-6 border ${getColorClass(issues.watchesWithoutCompletion)}`}>
        <div>
          <p className="text-sm font-medium opacity-75">Complete Watches Not Synced</p>
          <p className="text-3xl font-bold mt-2">{issues.watchesWithoutCompletion}</p>
          <p className="text-xs mt-2 opacity-75">Videos marked complete but work not completed</p>
        </div>
      </div>

      {/* Orphaned watches */}
      <div className={`rounded-lg p-6 border ${getColorClass(issues.orphanedWatches)}`}>
        <div>
          <p className="text-sm font-medium opacity-75">Orphaned Watch Records</p>
          <p className="text-3xl font-bold mt-2">{issues.orphanedWatches}</p>
          <p className="text-xs mt-2 opacity-75">Watches referencing deleted videos</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// STATISTICS DISPLAY COMPONENT
// ============================================================================

interface WatchStats {
  totalWatches: number;
  completionRate: number;
  averageWatchPercentage: number;
  watchesByDevice: {
    desktop: number;
    mobile: number;
    tablet: number;
    unknown: number;
  };
  mostWatchedVideos: Array<{
    video_title: string;
    watch_count: number;
  }>;
  childrenWithMostWatches: Array<{
    child_name: string;
    watch_count: number;
  }>;
  recentWatches: Array<{
    child_name: string;
    work_name: string;
    watch_percentage: number;
    watch_started_at: string;
  }>;
}

export function StatisticsDisplay() {
  const [stats, setStats] = useState<WatchStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/admin/testing/statistics');
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        const data = await response.json();
        if (data.error) {
          throw new Error(data.error);
        }
        setStats(data);
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setStats(null);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <p className="text-red-800">Failed to load statistics</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Video Watches</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalWatches}</p>
            </div>
            <Video className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Completion Rate</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.completionRate.toFixed(1)}%</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Watch %</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.averageWatchPercentage.toFixed(1)}%</p>
            </div>
            <Clock className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Device Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Watches by Device</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Monitor className="w-8 h-8 mx-auto text-gray-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.watchesByDevice.desktop}</p>
            <p className="text-sm text-gray-600">Desktop</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Smartphone className="w-8 h-8 mx-auto text-gray-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.watchesByDevice.mobile}</p>
            <p className="text-sm text-gray-600">Mobile</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <Tablet className="w-8 h-8 mx-auto text-gray-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.watchesByDevice.tablet}</p>
            <p className="text-sm text-gray-600">Tablet</p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <AlertCircle className="w-8 h-8 mx-auto text-gray-600 mb-2" />
            <p className="text-2xl font-bold text-gray-900">{stats.watchesByDevice.unknown}</p>
            <p className="text-sm text-gray-600">Unknown</p>
          </div>
        </div>
      </div>

      {/* Top Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Most watched videos */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Most Watched Videos</h4>
          <div className="space-y-3">
            {stats.mostWatchedVideos.length > 0 ? (
              stats.mostWatchedVideos.map((video, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <p className="text-sm text-gray-700 flex-1 truncate mr-2">{video.video_title}</p>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
                    {video.watch_count}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No video watches yet</p>
            )}
          </div>
        </div>

        {/* Children with most watches */}
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="font-semibold text-gray-900 mb-4">Most Active Children</h4>
          <div className="space-y-3">
            {stats.childrenWithMostWatches.length > 0 ? (
              stats.childrenWithMostWatches.map((child, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <p className="text-sm text-gray-700">{child.child_name}</p>
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-semibold">
                    {child.watch_count} watches
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 italic">No video watches yet</p>
            )}
          </div>
        </div>
      </div>

      {/* Recent Watches */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Recent Watches</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Watch %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.recentWatches.length > 0 ? (
                stats.recentWatches.map((watch, idx) => (
                  <tr key={idx}>
                    <td className="px-6 py-4 text-sm text-gray-900">{watch.child_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{watch.work_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        watch.watch_percentage >= 80 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {watch.watch_percentage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(watch.watch_started_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-4 text-sm text-gray-500 text-center italic">
                    No recent watches
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TEST VIDEO WATCH FORM
// ============================================================================

interface Child {
  id: string;
  name: string;
}

interface Work {
  id: string;
  work_name: string;
}

interface Video {
  id: string;
  title: string;
}

interface WatchRecord {
  id: string;
  child_name: string;
  work_name: string;
  watch_percentage: number;
  is_complete: boolean;
  created_at: string;
}

export function TestVideoWatchForm() {
  const [children, setChildren] = useState<Child[]>([]);
  const [works, setWorks] = useState<Work[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [recentWatches, setRecentWatches] = useState<WatchRecord[]>([]);
  
  const [selectedChild, setSelectedChild] = useState('');
  const [selectedWork, setSelectedWork] = useState('');
  const [selectedVideo, setSelectedVideo] = useState('');
  const [watchDuration, setWatchDuration] = useState('300');
  const [videoDuration, setVideoDuration] = useState('600');
  const [deviceType, setDeviceType] = useState<'desktop' | 'mobile' | 'tablet'>('desktop');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [childrenRes, worksRes, watchesRes] = await Promise.all([
          fetch('/api/admin/testing/children'),
          fetch('/api/admin/testing/works'),
          fetch('/api/admin/testing/recent-watches'),
        ]);
        
        const childrenData = await childrenRes.json();
        const worksData = await worksRes.json();
        const watchesData = await watchesRes.json();
        
        if (childrenRes.ok && childrenData.children) {
          setChildren(childrenData.children || []);
        }
        if (worksRes.ok && worksData.works) {
          setWorks(worksData.works || []);
        }
        if (watchesRes.ok && watchesData.watches) {
          setRecentWatches(watchesData.watches || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
    loadData();
  }, []);

  // Load videos when work is selected
  useEffect(() => {
    async function loadVideos() {
      if (!selectedWork) {
        setVideos([]);
        return;
      }
      
      try {
        const response = await fetch(`/api/admin/testing/videos?workId=${selectedWork}`);
        const data = await response.json();
        setVideos(data.videos || []);
        if (data.videos && data.videos.length > 0) {
          setSelectedVideo(data.videos[0].id);
        }
      } catch (error) {
        console.error('Error loading videos:', error);
      }
    }
    loadVideos();
  }, [selectedWork]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedChild || !selectedWork || !selectedVideo) {
      alert('Please fill in all required fields');
      return;
    }
    
    setLoading(true);
    setResult(null);
    
    try {
      const response = await fetch('/api/whale/video-watches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          childId: selectedChild,
          curriculumWorkId: selectedWork,
          curriculumVideoId: selectedVideo,
          watchDurationSeconds: parseInt(watchDuration),
          videoDurationSeconds: parseInt(videoDuration),
          deviceType,
        }),
      });
      
      const data = await response.json();
      setResult(data);
      
      // Refresh recent watches
      const watchesRes = await fetch('/api/admin/testing/recent-watches');
      const watchesData = await watchesRes.json();
      setRecentWatches(watchesData.watches || []);
      
      // Clear form on success
      if (data.success) {
        setWatchDuration('300');
        setVideoDuration('600');
      }
    } catch (error) {
      console.error('Error creating watch:', error);
      setResult({ success: false, error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (watchId: string) => {
    if (!confirm('Delete this watch record?')) return;
    
    try {
      await fetch(`/api/whale/video-watches?watchId=${watchId}`, {
        method: 'DELETE',
      });
      
      // Refresh recent watches
      const watchesRes = await fetch('/api/admin/testing/recent-watches');
      const watchesData = await watchesRes.json();
      setRecentWatches(watchesData.watches || []);
    } catch (error) {
      console.error('Error deleting watch:', error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-4">Create Test Watch Record</h4>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Child Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Child *
              </label>
              <select
                value={selectedChild}
                onChange={(e) => setSelectedChild(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a child...</option>
                {children.map((child) => (
                  <option key={child.id} value={child.id}>
                    {child.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Work Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Curriculum Work *
              </label>
              <select
                value={selectedWork}
                onChange={(e) => setSelectedWork(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                <option value="">Select a work...</option>
                {works.map((work) => (
                  <option key={work.id} value={work.id}>
                    {work.work_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Video Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video *
              </label>
              <select
                value={selectedVideo}
                onChange={(e) => setSelectedVideo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
                disabled={!selectedWork}
              >
                <option value="">
                  {selectedWork ? 'Select a video...' : 'Select work first'}
                </option>
                {videos.map((video) => (
                  <option key={video.id} value={video.id}>
                    {video.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Device Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Device Type
              </label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="desktop">Desktop</option>
                <option value="mobile">Mobile</option>
                <option value="tablet">Tablet</option>
              </select>
            </div>

            {/* Watch Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Watch Duration (seconds)
              </label>
              <input
                type="number"
                value={watchDuration}
                onChange={(e) => setWatchDuration(e.target.value)}
                min="0"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            {/* Video Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video Duration (seconds)
              </label>
              <input
                type="number"
                value={videoDuration}
                onChange={(e) => setVideoDuration(e.target.value)}
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>
          </div>

          {/* Watch Percentage Preview */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Preview:</strong> Watch percentage will be{' '}
              {((parseInt(watchDuration) / parseInt(videoDuration)) * 100).toFixed(1)}%
              {((parseInt(watchDuration) / parseInt(videoDuration)) * 100) >= 80 && (
                <span className="ml-2 text-green-700 font-semibold">
                  → Will mark work as complete! ✓
                </span>
              )}
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            {loading ? 'Creating...' : 'Create Test Watch'}
          </button>
        </form>

        {/* Result Display */}
        {result && (
          <div className={`mt-4 p-4 rounded-lg border ${
            result.success 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            {result.success ? (
              <div>
                <p className="font-semibold text-green-900 mb-2">✅ {result.message}</p>
                {result.workCompleted && (
                  <p className="text-sm text-green-700">
                    🎉 Curriculum work marked as complete!
                  </p>
                )}
                <pre className="mt-2 text-xs bg-white p-2 rounded overflow-x-auto">
                  {JSON.stringify(result.watchRecord, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <p className="font-semibold text-red-900">❌ Error: {result.error}</p>
                {result.details && (
                  <p className="text-sm text-red-700 mt-1">{result.details}</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Recent Watches Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h4 className="font-semibold text-gray-900">Recent Test Watches (Last 20)</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Child</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Work</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Watch %</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Complete</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentWatches.length > 0 ? (
                recentWatches.map((watch) => (
                  <tr key={watch.id}>
                    <td className="px-6 py-4 text-sm text-gray-900">{watch.child_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-700">{watch.work_name}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-semibold ${
                        watch.watch_percentage >= 80 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {watch.watch_percentage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {watch.is_complete ? (
                        <Check className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-gray-400" />
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(watch.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDelete(watch.id)}
                        className="text-red-600 hover:text-red-800"
                        title="Delete record"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-6 py-4 text-sm text-gray-500 text-center italic">
                    No test watches yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// GENERATED PROMPTS COMPONENT
// ============================================================================

export function GeneratedPrompts() {
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);

  const copyToClipboard = (text: string, promptName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(promptName);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const migrationPrompt = `-- Migration: Video Watch Tracking System
Run this SQL in your Supabase SQL Editor to create the video watch tracking tables:

(See migrations/005_video_watch_tracking.sql for full SQL)`;

  const implementationPrompt = `# Video Watch Tracking Implementation Guide

## Files Created:
1. migrations/005_video_watch_tracking.sql
2. app/api/whale/video-watches/route.ts
3. components/VideoPlayer.tsx (updated)
4. components/WorkVideoDisplay.tsx (updated)
5. types/database.ts (add types)

## Usage Example:
\`\`\`tsx
<VideoPlayer
  videoId="abc123"
  childId={child.id}
  curriculumVideoId={video.id}
  curriculumWorkId={work.id}
  onWatchComplete={(workId) => {
    console.log('Work completed!', workId);
  }}
/>
\`\`\`

## Auto-completion:
- Watches >= 80% automatically mark curriculum work as complete
- Uses existing markWorkComplete() function
- Idempotent and error-resilient`;

  const dashboardPrompt = `# Admin Testing Dashboard

Located at: /admin/testing-dashboard

Features:
1. Schema verification
2. Sync issue detection
3. Watch statistics
4. Test watch creation form
5. Recent watches table

Requires admin authentication via getAdminSession().`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {/* Migration Prompt */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Database Migration</h4>
        <p className="text-sm text-gray-600 mb-4">
          SQL script to create video watch tracking table
        </p>
        <button
          onClick={() => copyToClipboard(migrationPrompt, 'migration')}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {copiedPrompt === 'migration' ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Migration
            </>
          )}
        </button>
      </div>

      {/* Implementation Prompt */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Implementation Guide</h4>
        <p className="text-sm text-gray-600 mb-4">
          Overview of files and usage patterns
        </p>
        <button
          onClick={() => copyToClipboard(implementationPrompt, 'implementation')}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {copiedPrompt === 'implementation' ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Guide
            </>
          )}
        </button>
      </div>

      {/* Dashboard Prompt */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="font-semibold text-gray-900 mb-3">Dashboard Info</h4>
        <p className="text-sm text-gray-600 mb-4">
          Testing dashboard features and location
        </p>
        <button
          onClick={() => copyToClipboard(dashboardPrompt, 'dashboard')}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
        >
          {copiedPrompt === 'dashboard' ? (
            <>
              <Check className="w-4 h-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Info
            </>
          )}
        </button>
      </div>
    </div>
  );
}

