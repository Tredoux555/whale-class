'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface DailySummary {
  date: string;
  stats: {
    totalAssignments: number;
    totalPhotos: number;
    totalCompletions: number;
    childrenActive: number;
  };
  assignments: any[];
  photos: any[];
  completions: any[];
}

export default function DailySummaryPage() {
  const [data, setData] = useState<DailySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );

  useEffect(() => {
    fetchSummary();
  }, [selectedDate]);

  const fetchSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/whale/daily-summary?date=${selectedDate}`);
      const json = await res.json();
      if (json.success) {
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
    setLoading(false);
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/teacher/dashboard" className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center hover:bg-gray-200 transition-colors">
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                  <span className="text-2xl">📊</span>
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Daily Summary</h1>
                  <p className="text-sm text-gray-500">Activity overview</p>
                </div>
              </div>
            </div>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="border-2 border-gray-200 rounded-xl px-4 py-2 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all"
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">⏳</div>
            <p>Loading...</p>
          </div>
        ) : data ? (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">👶</div>
                <div className="text-2xl font-bold text-blue-600">{data.stats.childrenActive}</div>
                <div className="text-gray-500 text-sm">Children Active</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-2xl font-bold text-green-600">{data.stats.totalCompletions}</div>
                <div className="text-gray-500 text-sm">Works Completed</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">📸</div>
                <div className="text-2xl font-bold text-purple-600">{data.stats.totalPhotos}</div>
                <div className="text-gray-500 text-sm">Photos Taken</div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm border">
                <div className="text-3xl mb-2">📋</div>
                <div className="text-2xl font-bold text-orange-600">{data.stats.totalAssignments}</div>
                <div className="text-gray-500 text-sm">Assignments</div>
              </div>
            </div>

            {/* Photos Section */}
            {data.photos.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">📸 Photos ({data.photos.length})</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {data.photos.map((photo: any) => (
                    <div key={photo.id} className="bg-white rounded-xl overflow-hidden shadow-sm border">
                      <img
                        src={photo.photo_url}
                        alt={photo.activity?.name || 'Activity'}
                        className="w-full h-40 object-cover"
                      />
                      <div className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span>{photo.child?.avatar_emoji || '👶'}</span>
                          <span className="font-medium">{photo.child?.name}</span>
                        </div>
                        <p className="text-sm text-gray-600">{photo.activity?.name}</p>
                        <p className="text-xs text-gray-400">{formatTime(photo.created_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Completions Section */}
            {data.completions.length > 0 && (
              <section className="mb-8">
                <h2 className="text-xl font-bold text-gray-800 mb-4">✅ Work Completed ({data.completions.length})</h2>
                <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Child</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Activity</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Area</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {data.completions.map((comp: any) => (
                        <tr key={comp.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <span className="mr-2">{comp.child?.avatar_emoji || '👶'}</span>
                            {comp.child?.name}
                          </td>
                          <td className="px-4 py-3">{comp.activity?.name}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{comp.activity?.area}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              comp.status === 'mastered' ? 'bg-green-100 text-green-700' :
                              comp.status === 'practicing' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {comp.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {formatTime(comp.last_presented)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {/* Empty State */}
            {data.stats.childrenActive === 0 && (
              <div className="text-center py-12 bg-white rounded-xl border">
                <div className="text-6xl mb-4">📭</div>
                <h3 className="text-xl font-medium text-gray-600 mb-2">No activity recorded</h3>
                <p className="text-gray-400">No work was recorded for {selectedDate}</p>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-4xl mb-4">❌</div>
            <p>Failed to load data</p>
          </div>
        )}
      </main>
    </div>
  );
}
