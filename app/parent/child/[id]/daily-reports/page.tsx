'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface DailyReport {
  id: string;
  child_id: string;
  teacher_name: string;
  report_date: string;
  mood: string;
  activities_done: string[];
  activities_notes: string;
  meals_eaten: string;
  nap_duration: number;
  highlights: string;
  notes: string;
  photo_url: string;
  created_at: string;
}

const MOOD_EMOJIS: Record<string, string> = {
  happy: '😊',
  calm: '😌',
  tired: '😴',
  fussy: '😢',
  sick: '🤒',
};

const MEAL_LABELS: Record<string, string> = {
  all: 'Ate everything',
  most: 'Ate most',
  some: 'Ate some',
  little: 'Ate little',
  none: 'Didn\'t eat',
};

export default function ParentDailyReportsPage() {
  const params = useParams();
  const childId = params.id as string;
  
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [childName, setChildName] = useState('');

  useEffect(() => {
    fetchReports();
    fetchChild();
  }, [childId]);

  const fetchChild = async () => {
    try {
      const res = await fetch(`/api/children/${childId}`);
      const data = await res.json();
      if (data.child) setChildName(data.child.name);
    } catch (e) { console.error(e); }
  };

  const fetchReports = async () => {
    try {
      const res = await fetch(`/api/daily-reports?child_id=${childId}`);
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-purple-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-bounce inline-block">📝</span>
          <p className="mt-2 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      <header className="bg-purple-600 text-white px-4 py-6">
        <div className="max-w-2xl mx-auto">
          <Link href={`/parent/child/${childId}`} className="text-purple-200 text-sm hover:text-white">
            ← Back to {childName}
          </Link>
          <h1 className="text-2xl font-bold mt-2">📝 Daily Reports</h1>
          <p className="text-purple-200">Updates from {childName}&apos;s teachers</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {reports.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl">
            <span className="text-5xl">📭</span>
            <p className="mt-4 text-gray-500">No reports yet</p>
            <p className="text-sm text-gray-400">Check back later for updates from your child&apos;s teacher</p>
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map(report => (
              <div key={report.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                <div className="bg-purple-100 px-4 py-3 flex justify-between items-center">
                  <span className="font-semibold text-purple-800">{formatDate(report.report_date)}</span>
                  <span className="text-sm text-purple-600">by {report.teacher_name}</span>
                </div>

                <div className="p-4 space-y-4">
                  {/* Photo of the day - show first if exists */}
                  {report.photo_url && (
                    <div className="relative -mx-4 -mt-4 mb-4">
                      <img 
                        src={report.photo_url} 
                        alt="Photo from school" 
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <span className="text-4xl">{MOOD_EMOJIS[report.mood] || '😊'}</span>
                    <div>
                      <p className="font-medium capitalize">{report.mood}</p>
                      <p className="text-sm text-gray-500">Overall mood</p>
                    </div>
                  </div>

                  {report.activities_done && report.activities_done.length > 0 && (
                    <div>
                      <p className="text-sm text-gray-500 mb-2">🎨 Activities</p>
                      <div className="flex flex-wrap gap-2">
                        {report.activities_done.map((act, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">{act}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {report.meals_eaten && (
                    <div className="flex items-center gap-2">
                      <span>🍽️</span>
                      <span className="text-sm">{MEAL_LABELS[report.meals_eaten] || report.meals_eaten}</span>
                    </div>
                  )}

                  {report.nap_duration > 0 && (
                    <div className="flex items-center gap-2">
                      <span>😴</span>
                      <span className="text-sm">Napped for {report.nap_duration} minutes</span>
                    </div>
                  )}

                  {report.highlights && (
                    <div className="bg-yellow-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">⭐ Highlights</p>
                      <p className="text-sm">{report.highlights}</p>
                    </div>
                  )}

                  {report.notes && (
                    <div className="bg-gray-50 p-3 rounded-lg">
                      <p className="text-sm text-gray-500 mb-1">📝 Notes</p>
                      <p className="text-sm">{report.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
