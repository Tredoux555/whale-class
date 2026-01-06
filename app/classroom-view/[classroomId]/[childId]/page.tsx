'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Child {
  id: string;
  name: string;
  date_of_birth: string;
  photo_url: string | null;
  age: number;
}

interface WorkProgress {
  id: string;
  work_name: string;
  area: string;
  status: number;
  mastered_date: string | null;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  work_name: string | null;
  taken_at: string;
}

interface Report {
  id: string;
  title: string;
  content: string;
  period_start: string;
  period_end: string;
  status: string;
  created_at: string;
}

export default function ChildDetailPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;
  const childId = params.childId as string;

  const [child, setChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<WorkProgress[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedReport, setGeneratedReport] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'progress' | 'photos' | 'reports'>('progress');

  useEffect(() => {
    fetchData();
  }, [childId]);

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/classroom-view/${classroomId}/${childId}`);
      const data = await res.json();
      setChild(data.child || null);
      setProgress(data.progress || []);
      setPhotos(data.photos || []);
      setReports(data.reports || []);
    } catch (error) {
      console.error('Failed to fetch child data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGenerating(true);
    setGeneratedReport(null);
    try {
      const res = await fetch('/api/classroom-view/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ childId }),
      });
      const data = await res.json();
      if (data.report) {
        setGeneratedReport(data.report);
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGenerating(false);
    }
  };

  const masteredWorks = progress.filter((p) => p.status === 3);
  const practicingWorks = progress.filter((p) => p.status === 2);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-red-500">Child not found</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <Link
        href={`/classroom-view/${classroomId}`}
        className="inline-flex items-center text-gray-500 hover:text-gray-700 mb-6"
      >
        ← Back to classroom
      </Link>

      {/* Child Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-emerald-100 rounded-full flex items-center justify-center text-4xl overflow-hidden">
            {child.photo_url ? (
              <img src={child.photo_url} alt={child.name} className="w-full h-full object-cover" />
            ) : (
              child.name.charAt(0)
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{child.name}</h1>
            <p className="text-gray-500">Age {child.age.toFixed(1)}</p>
            <div className="flex gap-3 mt-3">
              <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-medium">
                ✓ {masteredWorks.length} mastered
              </span>
              <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium">
                📖 {practicingWorks.length} practicing
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Generate Report Button */}
      <div className="mb-6">
        <button
          onClick={generateReport}
          disabled={generating}
          className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 transition-colors"
        >
          {generating ? '✨ Generating Report...' : '📝 Generate Parent Report'}
        </button>
      </div>

      {/* Generated Report Preview */}
      {generatedReport && (
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-6 border-2 border-emerald-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-semibold text-gray-900">Generated Report Preview</h3>
            <button
              onClick={() => setGeneratedReport(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {generatedReport}
          </div>
          <div className="flex gap-3 mt-6">
            <button className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium">
              ✓ Save Report
            </button>
            <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium">
              ✏️ Edit
            </button>
            <button
              onClick={generateReport}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium"
            >
              🔄 Regenerate
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('progress')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'progress'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          📊 Progress
        </button>
        <button
          onClick={() => setActiveTab('photos')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'photos'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          📷 Photos ({photos.length})
        </button>
        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'reports'
              ? 'bg-emerald-500 text-white'
              : 'bg-white text-gray-600 hover:bg-gray-50'
          }`}
        >
          📄 Reports ({reports.length})
        </button>
      </div>

      {/* Progress Tab */}
      {activeTab === 'progress' && (
        <div className="space-y-4">
          {masteredWorks.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-green-700 mb-3">✓ Mastered ({masteredWorks.length})</h3>
              <div className="flex flex-wrap gap-2">
                {masteredWorks.map((w) => (
                  <span key={w.id} className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm">
                    {w.work_name}
                  </span>
                ))}
              </div>
            </div>
          )}
          {practicingWorks.length > 0 && (
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-blue-700 mb-3">📖 Practicing ({practicingWorks.length})</h3>
              <div className="flex flex-wrap gap-2">
                {practicingWorks.map((w) => (
                  <span key={w.id} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                    {w.work_name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Photos Tab */}
      {activeTab === 'photos' && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {photos.length === 0 ? (
            <p className="col-span-full text-center text-gray-500 py-8">No photos yet.</p>
          ) : (
            photos.map((photo) => (
              <div key={photo.id} className="bg-white rounded-xl overflow-hidden shadow-sm">
                <img src={photo.photo_url} alt={photo.caption || ''} className="w-full h-40 object-cover" />
                <div className="p-3">
                  {photo.caption && <p className="text-sm text-gray-700">{photo.caption}</p>}
                  {photo.work_name && (
                    <p className="text-xs text-emerald-600 mt-1">{photo.work_name}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(photo.taken_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No reports yet. Generate one above!</p>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="bg-white rounded-xl p-5 shadow-sm">
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-gray-900">{report.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded ${
                    report.status === 'shared' ? 'bg-green-100 text-green-700' :
                    report.status === 'approved' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {report.status}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {new Date(report.period_start).toLocaleDateString()} - {new Date(report.period_end).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-700 line-clamp-3">{report.content}</p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
