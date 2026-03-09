// /app/montree/admin/reports/page.tsx
// School-wide reports and analytics
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast, Toaster } from 'sonner';
import { useI18n } from '@/lib/montree/i18n';

interface ClassroomStats {
  id: string;
  name: string;
  icon: string;
  student_count: number;
  avg_progress: number;
  works_completed_this_week: number;
}

interface SchoolStats {
  total_students: number;
  total_teachers: number;
  total_classrooms: number;
  total_works_completed: number;
  avg_progress: number;
  active_this_week: number;
}

export default function ReportsPage() {
  const router = useRouter();
  const { t } = useI18n();
  const [schoolStats, setSchoolStats] = useState<SchoolStats | null>(null);
  const [classroomStats, setClassroomStats] = useState<ClassroomStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'all'>('week');

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (!loading) fetchData();
  }, [timeRange]);

  const checkAuth = () => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) {
      router.push('/montree/principal/login');
      return;
    }
    fetchData();
  };

  const getSchoolId = () => {
    const schoolData = localStorage.getItem('montree_school');
    if (!schoolData) return null;
    return JSON.parse(schoolData).id;
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const schoolId = getSchoolId();
      const res = await fetch(`/api/montree/admin/reports?school_id=${schoolId}&range=${timeRange}`);
      const data = await res.json();
      
      if (data.success) {
        setSchoolStats(data.school_stats);
        setClassroomStats(data.classroom_stats || []);
      }
    } catch (error) {
      console.error('Failed to fetch reports:', error);
      toast.error(t('admin.error.loadDashboard'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-4xl animate-bounce">📊</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 p-6">
      <Toaster position="top-center" />
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <Link href="/montree/admin" className="text-emerald-400 hover:text-emerald-300 text-sm mb-4 inline-block">
          {t('admin.reports.backToAdmin')}
        </Link>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-light text-white">
            📊 <span className="font-semibold">{t('admin.reports.title')}</span>
          </h1>
          <div className="flex gap-2">
            {(['week', 'month', 'all'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  timeRange === range
                    ? 'bg-emerald-500 text-white'
                    : 'bg-white/10 text-white/70 hover:bg-white/20'
                }`}
              >
                {range === 'week' ? t('admin.reports.thisWeek') : range === 'month' ? t('admin.reports.thisMonth') : t('admin.reports.allTime')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* School Overview Cards */}
      {schoolStats && (
        <div className="max-w-6xl mx-auto mb-8 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon="👨‍🎓" label={t('admin.reports.students')} value={schoolStats.total_students} />
          <StatCard icon="👩‍🏫" label={t('admin.reports.teachers')} value={schoolStats.total_teachers} />
          <StatCard icon="🏫" label={t('admin.reports.classrooms')} value={schoolStats.total_classrooms} />
          <StatCard icon="✅" label={t('admin.reports.worksDone')} value={schoolStats.total_works_completed} />
          <StatCard icon="📈" label={t('admin.reports.avgProgress')} value={`${schoolStats.avg_progress}%`} />
          <StatCard icon="🔥" label={t('admin.reports.active')} value={schoolStats.active_this_week} />
        </div>
      )}

      {/* Classroom Breakdown */}
      <div className="max-w-6xl mx-auto">
        <h2 className="text-xl font-semibold text-white mb-4">{t('admin.reports.classroomBreakdown')}</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classroomStats.map(classroom => (
            <div key={classroom.id} className="bg-white/10 backdrop-blur rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center text-2xl">
                  {classroom.icon}
                </div>
                <div>
                  <h3 className="text-white font-medium">{classroom.name}</h3>
                  <p className="text-white/50 text-sm">{t('admin.reports.studentsCount').replace('{count}', String(classroom.student_count))}</p>
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/70">{t('admin.reports.averageProgress')}</span>
                  <span className="text-emerald-400 font-medium">{classroom.avg_progress}%</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all"
                    style={{ width: `${classroom.avg_progress}%` }}
                  />
                </div>
              </div>
              
              <div className="flex justify-between text-sm">
                <span className="text-white/50">{t('admin.reports.worksThisPeriod').replace('{period}', timeRange)}</span>
                <span className="text-white font-medium">{classroom.works_completed_this_week}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string | number }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-2xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-white/50 text-sm">{label}</div>
    </div>
  );
}
