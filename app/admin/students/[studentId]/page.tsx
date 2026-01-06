'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Student {
  id: string;
  name: string;
  date_of_birth: string;
  age: number;
  photo_url: string | null;
  classroom_id: string;
  classroom_name: string;
  school_id: string;
  school_name: string;
}

interface ProgressSummary {
  area: string;
  presented: number;
  practicing: number;
  mastered: number;
  total: number;
}

interface RecentWork {
  id: string;
  work_name: string;
  area: string;
  status: number;
  status_name: string;
  updated_at: string;
}

interface Photo {
  id: string;
  photo_url: string;
  caption: string | null;
  work_name: string | null;
  taken_at: string;
}

export default function StudentDetailPage() {
  const params = useParams();
  const studentId = params.studentId as string;
  
  const [student, setStudent] = useState<Student | null>(null);
  const [progress, setProgress] = useState<ProgressSummary[]>([]);
  const [recentWorks, setRecentWorks] = useState<RecentWork[]>([]);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    fetchStudentData();
  }, [studentId]);

  const fetchStudentData = async () => {
    try {
      const res = await fetch(`/api/admin/students/${studentId}`);
      const data = await res.json();
      setStudent(data.student);
      setProgress(data.progress || []);
      setRecentWorks(data.recentWorks || []);
      setPhotos(data.photos || []);
    } catch (error) {
      console.error('Failed to fetch student:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    setGeneratingReport(true);
    try {
      const res = await fetch(`/api/admin/students/${studentId}/report`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.report) {
        // Open report in new tab or modal
        window.open(`/admin/reports/${data.report.id}`, '_blank');
      }
    } catch (error) {
      console.error('Failed to generate report:', error);
    } finally {
      setGeneratingReport(false);
    }
  };

  const STATUS_LABELS = ['Not Started', 'Presented', 'Practicing', 'Mastered'];
  const STATUS_COLORS = ['bg-gray-100', 'bg-yellow-100', 'bg-blue-100', 'bg-green-100'];
  const AREA_ICONS: Record<string, string> = {
    practical_life: '🧹',
    sensorial: '👁️',
    math: '🔢',
    language: '📖',
    cultural: '🌍',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center">
        <p className="text-gray-500">Student not found</p>
        <Link href="/admin/schools" className="text-emerald-600 hover:text-emerald-700 mt-4 inline-block">
          ← Back to schools
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Breadcrumb */}
      <div className="mb-4 text-sm">
        <Link href="/admin/schools" className="text-gray-500 hover:text-gray-700">Schools</Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/admin/schools/${student.school_id}`} className="text-gray-500 hover:text-gray-700">
          {student.school_name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <Link href={`/admin/classrooms/${student.classroom_id}`} className="text-gray-500 hover:text-gray-700">
          {student.classroom_name}
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-700">{student.name}</span>
      </div>

      {/* Student Header */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center text-4xl overflow-hidden">
              {student.photo_url ? (
                <img src={student.photo_url} alt={student.name} className="w-full h-full object-cover" />
              ) : (
                student.name.charAt(0)
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-gray-500">Age {student.age.toFixed(1)} years</p>
              <p className="text-sm text-gray-400">{student.classroom_name}</p>
            </div>
          </div>
          <button
            onClick={generateReport}
            disabled={generatingReport}
            className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {generatingReport ? 'Generating...' : '📄 Generate Report'}
          </button>
        </div>
      </div>

      {/* Progress by Area */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Progress by Area</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {progress.map((area) => (
            <div key={area.area} className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">{AREA_ICONS[area.area] || '📋'}</span>
                <span className="font-medium text-gray-900 capitalize">{area.area.replace('_', ' ')}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-yellow-600">Presented</span>
                  <span className="font-medium">{area.presented}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-blue-600">Practicing</span>
                  <span className="font-medium">{area.practicing}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-green-600">Mastered</span>
                  <span className="font-medium">{area.mastered}</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden flex">
                <div className="bg-yellow-400" style={{ width: `${(area.presented / area.total) * 100}%` }} />
                <div className="bg-blue-400" style={{ width: `${(area.practicing / area.total) * 100}%` }} />
                <div className="bg-green-500" style={{ width: `${(area.mastered / area.total) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Works */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Recent Activity</h2>
          {recentWorks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No activity yet</p>
          ) : (
            <div className="space-y-3">
              {recentWorks.slice(0, 10).map((work) => (
                <div key={work.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50">
                  <span className="text-lg">{AREA_ICONS[work.area] || '📋'}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 text-sm">{work.work_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(work.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[work.status]} ${
                    work.status === 3 ? 'text-green-700' : 
                    work.status === 2 ? 'text-blue-700' : 
                    work.status === 1 ? 'text-yellow-700' : 'text-gray-600'
                  }`}>
                    {STATUS_LABELS[work.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Photos */}
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">Photos</h2>
            <Link
              href={`/admin/students/${studentId}/photos`}
              className="text-sm text-emerald-600 hover:text-emerald-700"
            >
              + Add Photo
            </Link>
          </div>
          {photos.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No photos yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {photos.slice(0, 6).map((photo) => (
                <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={photo.photo_url}
                    alt={photo.caption || ''}
                    className="w-full h-full object-cover hover:scale-105 transition-transform cursor-pointer"
                  />
                </div>
              ))}
            </div>
          )}
          {photos.length > 6 && (
            <Link
              href={`/admin/students/${studentId}/photos`}
              className="block text-center text-sm text-gray-500 hover:text-gray-700 mt-3"
            >
              View all {photos.length} photos →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
