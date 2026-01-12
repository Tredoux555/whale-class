'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

interface Child {
  id: string;
  name: string;
  avatar_emoji?: string;
}

interface DailyReport {
  id?: string;
  child_id: string;
  mood: string;
  activities_done: string[];
  activities_notes: string;
  meals_eaten: string;
  nap_duration: number;
  highlights: string;
  notes: string;
  photo_url: string;
}

const MOODS = [
  { value: 'happy', emoji: '😊', label: 'Happy' },
  { value: 'calm', emoji: '😌', label: 'Calm' },
  { value: 'tired', emoji: '😴', label: 'Tired' },
  { value: 'fussy', emoji: '😢', label: 'Fussy' },
  { value: 'sick', emoji: '🤒', label: 'Unwell' },
];

const MEALS = [
  { value: 'all', label: 'Ate everything' },
  { value: 'most', label: 'Ate most' },
  { value: 'some', label: 'Ate some' },
  { value: 'little', label: 'Ate little' },
];

const COMMON_ACTIVITIES = [
  'Practical Life', 'Sensorial', 'Math', 'Language', 'Art',
  'Outdoor Play', 'Music', 'Story Time', 'Circle Time', 'Snack Time'
];

export default function TeacherDailyReportsPage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState<string>('');
  const [children, setChildren] = useState<Child[]>([]);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [existingReports, setExistingReports] = useState<Record<string, boolean>>({});
  
  const [report, setReport] = useState<DailyReport>({
    child_id: '',
    mood: '',
    activities_done: [],
    activities_notes: '',
    meals_eaten: '',
    nap_duration: 0,
    highlights: '',
    notes: '',
    photo_url: ''
  });

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) {
      router.push('/teacher');
      return;
    }
    setTeacherName(name);
    fetchChildren();
  }, [router]);

  const fetchChildren = async () => {
    try {
      // Fetch children assigned to this teacher
      const res = await fetch('/api/children');
      const data = await res.json();
      if (data.children) {
        setChildren(data.children);
        // Check which children already have reports today
        await checkExistingReports(data.children);
      }
    } catch (e) {
      console.error('Failed to fetch children:', e);
    } finally {
      setLoading(false);
    }
  };

  const checkExistingReports = async (childList: Child[]) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await fetch(`/api/daily-reports?date=${today}`);
    const data = await res.json();
    if (data.reports) {
      const reported: Record<string, boolean> = {};
      data.reports.forEach((r: any) => { reported[r.child_id] = true; });
      setExistingReports(reported);
    }
  };

  const selectChild = (child: Child) => {
    setSelectedChild(child);
    setReport({ ...report, child_id: child.id });
  };

  const toggleActivity = (activity: string) => {
    setReport(prev => ({
      ...prev,
      activities_done: prev.activities_done.includes(activity)
        ? prev.activities_done.filter(a => a !== activity)
        : [...prev.activities_done, activity]
    }));
  };

  const handleSubmit = async () => {
    if (!selectedChild || !report.mood) {
      toast.error('Please select a child and mood');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/daily-reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...report,
          teacher_name: teacherName,
          report_date: new Date().toISOString().split('T')[0]
        })
      });
      
      const data = await res.json();
      if (data.success) {
        toast.success(`Report saved for ${selectedChild.name}!`);
        setExistingReports(prev => ({ ...prev, [selectedChild.id]: true }));
        setSelectedChild(null);
        setReport({
          child_id: '',
          mood: '',
          activities_done: [],
          activities_notes: '',
          meals_eaten: '',
          nap_duration: 0,
          highlights: '',
          notes: '',
          photo_url: ''
        });
      } else {
        toast.error('Failed to save report');
      }
    } catch (e) {
      toast.error('Error saving report');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50 flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl animate-bounce inline-block">📝</span>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/teacher/dashboard" className="text-gray-500 hover:text-gray-700">
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-gray-800">📝 Daily Reports</h1>
          <div className="w-12"></div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Date Header */}
        <div className="text-center mb-6">
          <p className="text-gray-500 text-sm">Today</p>
          <p className="text-xl font-bold text-gray-800">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>

        {!selectedChild ? (
          /* Child Selection Grid */
          <div>
            <h2 className="text-lg font-semibold mb-4">Select a child</h2>
            <div className="grid grid-cols-3 gap-3">
              {children.map(child => (
                <button
                  key={child.id}
                  onClick={() => selectChild(child)}
                  className={`p-4 rounded-xl text-center transition-all ${
                    existingReports[child.id]
                      ? 'bg-green-100 border-2 border-green-300'
                      : 'bg-white border-2 border-gray-200 hover:border-amber-400'
                  }`}
                >
                  <span className="text-3xl block mb-1">{child.avatar_emoji || '👶'}</span>
                  <span className="text-sm font-medium">{child.name}</span>
                  {existingReports[child.id] && (
                    <span className="text-xs text-green-600 block">✓ Done</span>
                  )}
                </button>
              ))}
            </div>
            
            {/* Progress */}
            <div className="mt-6 bg-white rounded-xl p-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium">
                  {Object.keys(existingReports).length} / {children.length} complete
                </span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(Object.keys(existingReports).length / children.length) * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (

          /* Report Form */
          <div className="space-y-6">
            {/* Child Header */}
            <div className="bg-white rounded-xl p-4 flex items-center gap-4">
              <span className="text-4xl">{selectedChild.avatar_emoji || '👶'}</span>
              <div>
                <h2 className="text-lg font-bold">{selectedChild.name}</h2>
                <button onClick={() => setSelectedChild(null)} className="text-sm text-amber-600">
                  Change child
                </button>
              </div>
            </div>

            {/* Mood Selection */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold mb-3">How was {selectedChild.name} today?</h3>
              <div className="flex gap-2 flex-wrap">
                {MOODS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setReport(prev => ({ ...prev, mood: m.value }))}
                    className={`px-4 py-2 rounded-full flex items-center gap-2 transition-all ${
                      report.mood === m.value
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    <span className="text-xl">{m.emoji}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Activities */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold mb-3">Activities today</h3>
              <div className="flex gap-2 flex-wrap">
                {COMMON_ACTIVITIES.map(act => (
                  <button
                    key={act}
                    onClick={() => toggleActivity(act)}
                    className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                      report.activities_done.includes(act)
                        ? 'bg-amber-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {act}
                  </button>
                ))}
              </div>
              <textarea
                placeholder="Additional notes about activities..."
                value={report.activities_notes}
                onChange={e => setReport(prev => ({ ...prev, activities_notes: e.target.value }))}
                className="w-full mt-3 p-3 border rounded-lg text-sm"
                rows={2}
              />
            </div>

            {/* Meals */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold mb-3">🍽️ Meals</h3>
              <div className="flex gap-2 flex-wrap">
                {MEALS.map(m => (
                  <button
                    key={m.value}
                    onClick={() => setReport(prev => ({ ...prev, meals_eaten: m.value }))}
                    className={`px-4 py-2 rounded-full text-sm transition-all ${
                      report.meals_eaten === m.value
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Nap */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold mb-3">😴 Nap Time</h3>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="15"
                  value={report.nap_duration}
                  onChange={e => setReport(prev => ({ ...prev, nap_duration: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <span className="font-medium w-24 text-right">
                  {report.nap_duration === 0 ? 'No nap' : `${report.nap_duration} min`}
                </span>
              </div>
            </div>

            {/* Highlights */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold mb-3">⭐ Highlights</h3>
              <textarea
                placeholder="What went well today? Any special moments?"
                value={report.highlights}
                onChange={e => setReport(prev => ({ ...prev, highlights: e.target.value }))}
                className="w-full p-3 border rounded-lg text-sm"
                rows={2}
              />
            </div>

            {/* Notes for Parent */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold mb-3">📝 Note for Parents</h3>
              <textarea
                placeholder="Anything parents should know?"
                value={report.notes}
                onChange={e => setReport(prev => ({ ...prev, notes: e.target.value }))}
                className="w-full p-3 border rounded-lg text-sm"
                rows={2}
              />
            </div>

            {/* Photo Upload */}
            <div className="bg-white rounded-xl p-4">
              <h3 className="font-semibold mb-3">📸 Photo of the Day</h3>
              {report.photo_url ? (
                <div className="relative">
                  <img 
                    src={report.photo_url} 
                    alt="Daily photo" 
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => setReport(prev => ({ ...prev, photo_url: '' }))}
                    className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      
                      // Show loading state
                      const loadingToast = toast.loading('Uploading photo...');
                      
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('folder', 'daily-reports');
                        
                        const res = await fetch('/api/upload', {
                          method: 'POST',
                          body: formData
                        });
                        
                        const data = await res.json();
                        if (data.url) {
                          setReport(prev => ({ ...prev, photo_url: data.url }));
                          toast.success('Photo uploaded!', { id: loadingToast });
                        } else {
                          throw new Error('Upload failed');
                        }
                      } catch (err) {
                        toast.error('Failed to upload photo', { id: loadingToast });
                        console.error(err);
                      }
                    }}
                    className="hidden"
                    id="photo-upload"
                  />
                  <label
                    htmlFor="photo-upload"
                    className="flex items-center justify-center gap-2 w-full py-4 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors"
                  >
                    <span className="text-2xl">📷</span>
                    <span className="text-gray-600">Take or choose photo</span>
                  </label>
                  <p className="text-xs text-gray-500 text-center">
                    Optional: Share a moment from today with parents
                  </p>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={saving || !report.mood}
              className="w-full py-4 bg-amber-500 text-white rounded-xl font-bold text-lg hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Saving...
                </>
              ) : (
                <>
                  <span>✅</span>
                  Save Report
                </>
              )}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
