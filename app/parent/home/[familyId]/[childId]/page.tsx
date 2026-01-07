'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  TreePine, 
  ArrowLeft, 
  Loader2,
  CheckCircle2,
  Circle,
  Play,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  BarChart3,
  RefreshCw,
  Info,
  Camera,
  FileText
} from 'lucide-react';

interface Activity {
  id: string;
  curriculum_work_id: string;
  name: string;
  description: string;
  area: string;
  category: string;
  age_range: string;
  materials: { name: string; price: number; essential: boolean }[];
  direct_aim: string;
  presentation_steps: { step: number; text: string }[];
  status: number;
  times_practiced: number;
  last_practiced: string | null;
}

interface ProgressSummary {
  total_works: number;
  mastered: number;
  practicing: number;
  presented: number;
  overall_percent: number;
  by_area: {
    [key: string]: {
      total: number;
      mastered: number;
      practicing: number;
      presented: number;
    };
  };
}

interface Child {
  id: string;
  name: string;
  birth_date: string;
  color: string;
}

export default function ChildActivities({ 
  params 
}: { 
  params: Promise<{ familyId: string; childId: string }> 
}) {
  const { familyId, childId } = use(params);
  const router = useRouter();
  const [child, setChild] = useState<Child | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [progress, setProgress] = useState<ProgressSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'today' | 'progress' | 'curriculum'>('today');
  const [expandedActivity, setExpandedActivity] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, [childId]);

  const loadData = async () => {
    try {
      const childRes = await fetch(`/api/montree-home/children?family_id=${familyId}&include_progress=true`);
      const childData = await childRes.json();
      const thisChild = childData.children?.find((c: Child) => c.id === childId);
      if (thisChild) {
        setChild(thisChild);
        setProgress(thisChild.progress_summary);
      }
      await loadActivities();
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      const actRes = await fetch(`/api/montree-home/activities?child_id=${childId}&count=5`);
      const actData = await actRes.json();
      setActivities(actData.activities || []);
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  const refreshActivities = async () => {
    setRefreshing(true);
    await loadActivities();
    setRefreshing(false);
  };

  const markActivity = async (curriculumWorkId: string, action: 'mark_done' | 'status', status?: number) => {
    try {
      const body: Record<string, unknown> = {
        child_id: childId,
        curriculum_work_id: curriculumWorkId
      };
      if (action === 'mark_done') {
        body.action = 'mark_done';
      } else {
        body.status = status;
      }
      await fetch('/api/montree-home/activities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      loadData();
    } catch (err) {
      console.error('Error updating activity:', err);
    }
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

  const getAreaColor = (area: string) => {
    const colors: Record<string, string> = {
      practical_life: 'bg-amber-100 text-amber-800 border-amber-200',
      sensorial: 'bg-pink-100 text-pink-800 border-pink-200',
      mathematics: 'bg-blue-100 text-blue-800 border-blue-200',
      language: 'bg-green-100 text-green-800 border-green-200',
      cultural: 'bg-purple-100 text-purple-800 border-purple-200'
    };
    return colors[area] || 'bg-gray-100 text-gray-800';
  };

  const formatAreaName = (area: string) => {
    return area.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Child not found</p>
          <button onClick={() => router.push(`/parent/home/${familyId}`)} className="text-green-600 hover:underline">
            Return to family
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 pb-20">
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button onClick={() => router.push(`/parent/home/${familyId}`)} className="p-2 -ml-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold" style={{ backgroundColor: child.color }}>
            {child.name.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">{child.name}</h1>
            <p className="text-sm text-gray-500">Daily Activities</p>
          </div>
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <TreePine className="w-6 h-6 text-white" />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="max-w-4xl mx-auto px-4 pb-2 flex gap-2">
          <button
            onClick={() => router.push(`/parent/home/${familyId}/${childId}/journal`)}
            className="flex items-center gap-2 px-3 py-1.5 bg-pink-100 text-pink-700 rounded-lg text-xs font-medium hover:bg-pink-200"
          >
            <Camera className="w-3.5 h-3.5" />
            Journal
          </button>
          <button
            onClick={() => router.push(`/parent/home/${familyId}/${childId}/report`)}
            className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium hover:bg-purple-200"
          >
            <FileText className="w-3.5 h-3.5" />
            Report
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-2 border-t pt-2">
          <TabButton active={activeTab === 'today'} onClick={() => setActiveTab('today')} icon={<Sparkles className="w-4 h-4" />} label="Today" />
          <TabButton active={activeTab === 'progress'} onClick={() => setActiveTab('progress')} icon={<BarChart3 className="w-4 h-4" />} label="Progress" />
          <TabButton active={activeTab === 'curriculum'} onClick={() => setActiveTab('curriculum')} icon={<BookOpen className="w-4 h-4" />} label="Curriculum" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'today' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Today&apos;s Activities</h2>
                <p className="text-gray-600 text-sm">Recommended based on {child.name}&apos;s progress</p>
              </div>
              <button onClick={refreshActivities} disabled={refreshing} className="p-2 hover:bg-white rounded-lg disabled:opacity-50">
                <RefreshCw className={`w-5 h-5 text-gray-500 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {activities.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <h4 className="font-medium text-gray-900 mb-2">Great work!</h4>
                <p className="text-gray-600 text-sm">All activities completed. Check back tomorrow for new recommendations!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    expanded={expandedActivity === activity.id}
                    onToggle={() => setExpandedActivity(expandedActivity === activity.id ? null : activity.id)}
                    onMark={(status) => markActivity(activity.curriculum_work_id, 'status', status)}
                    onComplete={() => markActivity(activity.curriculum_work_id, 'mark_done')}
                    getAreaEmoji={getAreaEmoji}
                    getAreaColor={getAreaColor}
                    formatAreaName={formatAreaName}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'progress' && progress && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4">Progress Overview</h2>
            <div className="bg-white rounded-2xl p-6 shadow-sm mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900">Overall Progress</h3>
                <span className="text-2xl font-bold text-green-600">{progress.overall_percent}%</span>
              </div>
              <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" style={{ width: `${progress.overall_percent}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div><div className="text-2xl font-bold text-green-600">{progress.mastered}</div><div className="text-xs text-gray-500">Mastered</div></div>
                <div><div className="text-2xl font-bold text-yellow-600">{progress.practicing}</div><div className="text-xs text-gray-500">Practicing</div></div>
                <div><div className="text-2xl font-bold text-blue-600">{progress.presented}</div><div className="text-xs text-gray-500">Presented</div></div>
              </div>
            </div>
            <h3 className="font-semibold text-gray-900 mb-3">By Area</h3>
            <div className="space-y-3">
              {Object.entries(progress.by_area || {}).map(([area, data]) => (
                <div key={area} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xl">{getAreaEmoji(area)}</span>
                    <span className="font-medium text-gray-900">{formatAreaName(area)}</span>
                    <span className="ml-auto text-sm text-gray-500">{data.mastered}/{data.total}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${data.total > 0 ? (data.mastered / data.total) * 100 : 0}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'curriculum' && (
          <CurriculumBrowser familyId={familyId} childId={childId} getAreaEmoji={getAreaEmoji} getAreaColor={getAreaColor} formatAreaName={formatAreaName} />
        )}
      </main>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${active ? 'bg-green-100 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`}>
      {icon}{label}
    </button>
  );
}

function ActivityCard({ activity, expanded, onToggle, onMark, onComplete, getAreaEmoji, getAreaColor, formatAreaName }: { activity: Activity; expanded: boolean; onToggle: () => void; onMark: (status: number) => void; onComplete: () => void; getAreaEmoji: (area: string) => string; getAreaColor: (area: string) => string; formatAreaName: (area: string) => string }) {
  const statusLabels = ['Not Started', 'Presented', 'Practicing', 'Mastered'];
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start gap-3">
          <div className="text-2xl mt-1">{getAreaEmoji(activity.area)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full border ${getAreaColor(activity.area)}`}>{formatAreaName(activity.area)}</span>
              {activity.status > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{statusLabels[activity.status]}</span>}
            </div>
            <h4 className="font-semibold text-gray-900">{activity.name}</h4>
            <p className="text-sm text-gray-600 line-clamp-2">{activity.description}</p>
          </div>
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t bg-gray-50">
          {activity.materials && activity.materials.length > 0 && (
            <div className="pt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Materials Needed</h5>
              <div className="flex flex-wrap gap-2">
                {activity.materials.map((m, i) => <span key={i} className={`text-xs px-2 py-1 rounded-full ${m.essential ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{m.name}</span>)}
              </div>
            </div>
          )}
          <div className="pt-4">
            <h5 className="text-sm font-medium text-gray-700 mb-1">Purpose</h5>
            <p className="text-sm text-gray-600">{activity.direct_aim}</p>
          </div>
          {activity.presentation_steps && activity.presentation_steps.length > 0 && (
            <div className="pt-4">
              <h5 className="text-sm font-medium text-gray-700 mb-2">How to Present</h5>
              <ol className="space-y-2">
                {activity.presentation_steps.map((step) => (
                  <li key={step.step} className="flex gap-2 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-xs font-medium">{step.step}</span>
                    <span className="text-gray-600">{step.text}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          <div className="pt-4 mt-4 border-t flex gap-2">
            {activity.status < 3 && (
              <>
                {activity.status === 0 && <button onClick={() => onMark(1)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-medium hover:bg-blue-200"><Play className="w-4 h-4" />Start / Present</button>}
                {activity.status === 1 && <button onClick={() => onMark(2)} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-xl text-sm font-medium hover:bg-yellow-200"><Circle className="w-4 h-4" />Practicing</button>}
                <button onClick={onComplete} className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"><CheckCircle2 className="w-4 h-4" />Mastered!</button>
              </>
            )}
            {activity.status === 3 && <div className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-xl text-sm font-medium"><CheckCircle2 className="w-4 h-4" />Mastered</div>}
          </div>
        </div>
      )}
    </div>
  );
}

function CurriculumBrowser({ familyId, childId, getAreaEmoji, getAreaColor, formatAreaName }: { familyId: string; childId: string; getAreaEmoji: (area: string) => string; getAreaColor: (area: string) => string; formatAreaName: (area: string) => string }) {
  const [curriculum, setCurriculum] = useState<Record<string, Record<string, unknown[]>>>({});
  const [loading, setLoading] = useState(true);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);

  useEffect(() => { loadCurriculum(); }, [familyId]);

  const loadCurriculum = async () => {
    try {
      const res = await fetch(`/api/montree-home/curriculum?master=true`);
      const data = await res.json();
      const grouped: Record<string, Record<string, unknown[]>> = {};
      (data.curriculum || []).forEach((item: { area: string; category: string }) => {
        if (!grouped[item.area]) grouped[item.area] = {};
        if (!grouped[item.area][item.category]) grouped[item.area][item.category] = [];
        grouped[item.area][item.category].push(item);
      });
      setCurriculum(grouped);
    } catch (err) { console.error('Error loading curriculum:', err); } 
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-12"><Loader2 className="w-8 h-8 text-green-600 animate-spin" /></div>;

  const areas = Object.keys(curriculum);

  return (
    <div>
      <h2 className="text-xl font-bold text-gray-900 mb-4">Full Curriculum</h2>
      <p className="text-gray-600 text-sm mb-6">Browse all 250 activities across 5 areas</p>
      <div className="flex flex-wrap gap-2 mb-6">
        {areas.map((area) => (
          <button key={area} onClick={() => setSelectedArea(selectedArea === area ? null : area)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${selectedArea === area ? 'bg-green-600 text-white shadow-md' : 'bg-white text-gray-700 hover:bg-gray-50 shadow-sm'}`}>
            <span>{getAreaEmoji(area)}</span><span>{formatAreaName(area)}</span><span className="text-xs opacity-75">({Object.values(curriculum[area]).flat().length})</span>
          </button>
        ))}
      </div>
      {selectedArea && (
        <div className="space-y-4">
          {Object.entries(curriculum[selectedArea]).map(([category, items]) => (
            <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="p-4 border-b bg-gray-50"><h4 className="font-semibold text-gray-900">{category}</h4><p className="text-sm text-gray-500">{items.length} activities</p></div>
              <div className="divide-y">
                {items.map((item: any) => (
                  <div key={item.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <div className="flex-1"><h5 className="font-medium text-gray-900">{item.name}</h5><p className="text-sm text-gray-600 mt-1">{item.description}</p><div className="flex items-center gap-4 mt-2 text-xs text-gray-500"><span>Ages {item.age_range}</span></div></div>
                      <Info className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {!selectedArea && <div className="bg-white rounded-2xl p-8 text-center shadow-sm"><div className="text-4xl mb-4">👆</div><p className="text-gray-600">Select an area above to browse activities</p></div>}
    </div>
  );
}
