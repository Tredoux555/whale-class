'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2,
  Printer,
  Download,
  TreePine
} from 'lucide-react';

interface ProgressData {
  total_works: number;
  mastered: number;
  practicing: number;
  presented: number;
  overall_percent: number;
  by_area: Record<string, {
    total: number;
    mastered: number;
    practicing: number;
    presented: number;
  }>;
}

interface Child {
  id: string;
  name: string;
  birth_date: string;
}

interface Activity {
  name: string;
  category: string;
  area: string;
  status: number;
  mastered_date?: string;
}

export default function ProgressReport({ 
  params 
}: { 
  params: Promise<{ familyId: string; childId: string }> 
}) {
  const { familyId, childId } = use(params);
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [masteredActivities, setMasteredActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    try {
      // Load child with progress
      const childRes = await fetch(`/api/montree-home/children?family_id=${familyId}&include_progress=true`);
      const childData = await childRes.json();
      const thisChild = childData.children?.find((c: Child) => c.id === childId);
      
      if (thisChild) {
        setChild(thisChild);
        setProgress(thisChild.progress_summary);
      }

      // Load mastered activities
      const reportRes = await fetch(`/api/montree-home/report?child_id=${childId}`);
      const reportData = await reportRes.json();
      setMasteredActivities(reportData.mastered || []);
    } catch (err) {
      console.error('Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const now = new Date();
    const years = now.getFullYear() - birth.getFullYear();
    const months = now.getMonth() - birth.getMonth();
    
    if (years === 0) {
      return `${months} months`;
    }
    return `${years} years, ${months >= 0 ? months : 12 + months} months`;
  };

  const formatAreaName = (area: string) => {
    return area.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const getAreaEmoji = (area: string) => {
    const emojis: Record<string, string> = {
      practical_life: '🧹',
      sensorial: '👁️',
      mathematics: '🔢',
      language: '📚',
      cultural: '🌍'
    };
    return emojis[area] || '📖';
  };

  const printReport = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!child || !progress) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-gray-500">Unable to load report</p>
      </div>
    );
  }

  const areas = ['practical_life', 'sensorial', 'mathematics', 'language', 'cultural'];

  return (
    <div className="min-h-screen bg-gray-100 print:bg-white">
      {/* Controls - hidden in print */}
      <div className="bg-white shadow-sm print:hidden">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/parent/home/${familyId}/${childId}`)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Progress Report</h1>
            <p className="text-sm text-gray-500">Print or save as PDF</p>
          </div>
          <button
            onClick={printReport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-0">
        <div className="bg-white rounded-xl shadow-lg print:shadow-none print:rounded-none p-8">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-6 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <TreePine className="w-8 h-8 text-green-600" />
                <h1 className="text-2xl font-bold text-gray-900">Montree Home</h1>
              </div>
              <h2 className="text-xl text-gray-700">Progress Report</h2>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Generated</p>
              <p className="font-medium text-gray-900">
                {new Date().toLocaleDateString('en-US', { 
                  month: 'long', 
                  day: 'numeric', 
                  year: 'numeric' 
                })}
              </p>
            </div>
          </div>

          {/* Student Info */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Student Name</p>
                <p className="font-semibold text-gray-900">{child.name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-semibold text-gray-900">
                  {new Date(child.birth_date).toLocaleDateString('en-US', { 
                    month: 'long', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Age</p>
                <p className="font-semibold text-gray-900">{getAge(child.birth_date)}</p>
              </div>
            </div>
          </div>

          {/* Overall Progress */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Overall Progress</h3>
            <div className="flex items-center gap-8">
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full"
                    style={{ width: `${progress.overall_percent}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {progress.mastered} of {progress.total_works} activities mastered
                </p>
              </div>
              <div className="text-3xl font-bold text-green-600">
                {progress.overall_percent}%
              </div>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <p className="text-2xl font-bold text-gray-900">{progress.total_works}</p>
              <p className="text-sm text-gray-500">Total Works</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{progress.mastered}</p>
              <p className="text-sm text-gray-500">Mastered</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{progress.practicing}</p>
              <p className="text-sm text-gray-500">Practicing</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{progress.presented}</p>
              <p className="text-sm text-gray-500">Presented</p>
            </div>
          </div>

          {/* Progress by Area */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Progress by Area</h3>
            <div className="space-y-4">
              {areas.map(area => {
                const data = progress.by_area[area] || { total: 0, mastered: 0, practicing: 0, presented: 0 };
                const percent = data.total > 0 ? Math.round((data.mastered / data.total) * 100) : 0;
                
                return (
                  <div key={area} className="flex items-center gap-4">
                    <div className="w-40 flex items-center gap-2">
                      <span>{getAreaEmoji(area)}</span>
                      <span className="font-medium text-gray-700">{formatAreaName(area)}</span>
                    </div>
                    <div className="flex-1">
                      <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-green-500 rounded-full"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm">
                      <span className="font-medium">{data.mastered}</span>
                      <span className="text-gray-400">/{data.total}</span>
                    </div>
                    <div className="w-12 text-right font-medium text-gray-900">
                      {percent}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Mastered Activities List */}
          {masteredActivities.length > 0 && (
            <div className="print:break-before-page">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Mastered Activities</h3>
              {areas.map(area => {
                const areaActivities = masteredActivities.filter(a => a.area === area);
                if (areaActivities.length === 0) return null;

                return (
                  <div key={area} className="mb-6">
                    <h4 className="font-medium text-gray-700 mb-2 flex items-center gap-2">
                      {getAreaEmoji(area)} {formatAreaName(area)}
                    </h4>
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm">
                      {areaActivities.map((activity, i) => (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <span className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                          <span className="text-gray-700">{activity.name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer */}
          <div className="mt-8 pt-6 border-t text-center text-sm text-gray-500">
            <p>Generated by Montree Home - Montessori Homeschool Curriculum Tracker</p>
            <p>teacherpotato.xyz/parent/home</p>
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:break-before-page { break-before: page; }
        }
      `}</style>
    </div>
  );
}
