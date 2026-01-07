'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Plus,
  X,
  Printer,
  Calendar
} from 'lucide-react';

interface PlannedActivity {
  id: string;
  activity_id: string;
  name: string;
  area: string;
  day: number; // 0-6
}

interface Activity {
  id: string;
  name: string;
  area: string;
  category: string;
}

export default function WeeklyPlanner({ 
  params 
}: { 
  params: Promise<{ familyId: string }> 
}) {
  const { familyId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);
  const [planned, setPlanned] = useState<PlannedActivity[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [showPicker, setShowPicker] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  
  const getWeekDates = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1 + (weekOffset * 7));
    
    return days.map((_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  };

  const weekDates = getWeekDates();
  const weekKey = weekDates[0].toISOString().split('T')[0];

  useEffect(() => {
    loadData();
  }, [familyId, weekKey]);

  const loadData = async () => {
    try {
      // Load curriculum for picker
      const curRes = await fetch('/api/montree-home/curriculum?master=true');
      const curData = await curRes.json();
      setActivities((curData.curriculum || []).map((c: any) => ({
        id: c.id,
        name: c.name,
        area: c.area,
        category: c.category
      })));

      // Load planned activities
      const planRes = await fetch(`/api/montree-home/planner?family_id=${familyId}&week=${weekKey}`);
      const planData = await planRes.json();
      setPlanned(planData.planned || []);
    } catch (err) {
      console.error('Error loading:', err);
    } finally {
      setLoading(false);
    }
  };

  const addActivity = async (dayIndex: number, activity: Activity) => {
    const newPlanned: PlannedActivity = {
      id: `${Date.now()}`,
      activity_id: activity.id,
      name: activity.name,
      area: activity.area,
      day: dayIndex
    };

    const updated = [...planned, newPlanned];
    setPlanned(updated);
    setShowPicker(null);
    setSearchTerm('');

    // Save to server
    await fetch('/api/montree-home/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: familyId,
        week: weekKey,
        planned: updated
      })
    });
  };

  const removeActivity = async (id: string) => {
    const updated = planned.filter(p => p.id !== id);
    setPlanned(updated);

    await fetch('/api/montree-home/planner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        family_id: familyId,
        week: weekKey,
        planned: updated
      })
    });
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
      practical_life: 'bg-amber-100 border-amber-300',
      sensorial: 'bg-pink-100 border-pink-300',
      mathematics: 'bg-blue-100 border-blue-300',
      language: 'bg-green-100 border-green-300',
      cultural: 'bg-purple-100 border-purple-300'
    };
    return colors[area] || 'bg-gray-100 border-gray-300';
  };

  const printPlanner = () => {
    window.print();
  };

  const filteredActivities = activities.filter(a => 
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-amber-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40 print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.push(`/parent/home/${familyId}`)}
            className="p-2 -ml-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="font-bold text-gray-900">Weekly Planner</h1>
            <p className="text-sm text-gray-500">Plan your Montessori week</p>
          </div>
          <button
            onClick={printPlanner}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium"
          >
            <Printer className="w-4 h-4" />
            Print
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6 print:mb-2">
          <button
            onClick={() => setWeekOffset(o => o - 1)}
            className="p-2 hover:bg-white rounded-lg print:hidden"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="text-center">
            <h2 className="text-lg font-semibold text-gray-900">
              {weekDates[0].toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - {weekDates[6].toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
            </h2>
            {weekOffset !== 0 && (
              <button
                onClick={() => setWeekOffset(0)}
                className="text-sm text-green-600 hover:underline print:hidden"
              >
                Go to this week
              </button>
            )}
          </div>
          <button
            onClick={() => setWeekOffset(o => o + 1)}
            className="p-2 hover:bg-white rounded-lg print:hidden"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Week Grid */}
        <div className="grid grid-cols-7 gap-2 print:gap-1">
          {days.map((day, dayIndex) => {
            const dayActivities = planned.filter(p => p.day === dayIndex);
            const date = weekDates[dayIndex];
            const isToday = new Date().toDateString() === date.toDateString();

            return (
              <div
                key={day}
                className={`bg-white rounded-xl shadow-sm overflow-hidden print:rounded-none print:shadow-none print:border ${
                  isToday ? 'ring-2 ring-green-500' : ''
                }`}
              >
                <div className={`px-3 py-2 text-center border-b ${isToday ? 'bg-green-500 text-white' : 'bg-gray-50'}`}>
                  <div className="font-medium text-sm">{day.substring(0, 3)}</div>
                  <div className={`text-xs ${isToday ? 'text-green-100' : 'text-gray-500'}`}>
                    {date.getDate()}
                  </div>
                </div>
                <div className="p-2 min-h-[200px] print:min-h-[150px]">
                  {dayActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className={`mb-2 p-2 rounded-lg border text-xs ${getAreaColor(activity.area)} group relative`}
                    >
                      <span className="mr-1">{getAreaEmoji(activity.area)}</span>
                      <span className="font-medium">{activity.name}</span>
                      <button
                        onClick={() => removeActivity(activity.id)}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity print:hidden flex items-center justify-center"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowPicker(dayIndex)}
                    className="w-full p-2 border-2 border-dashed border-gray-200 rounded-lg text-gray-400 hover:border-green-400 hover:text-green-500 transition-colors print:hidden"
                  >
                    <Plus className="w-4 h-4 mx-auto" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 flex flex-wrap gap-4 justify-center text-sm print:mt-2 print:text-xs">
          <span className="flex items-center gap-1">🧹 Practical Life</span>
          <span className="flex items-center gap-1">👁️ Sensorial</span>
          <span className="flex items-center gap-1">🔢 Mathematics</span>
          <span className="flex items-center gap-1">📚 Language</span>
          <span className="flex items-center gap-1">🌍 Cultural</span>
        </div>
      </main>

      {/* Activity Picker Modal */}
      {showPicker !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="p-4 border-b">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-900">
                  Add Activity - {days[showPicker]}
                </h3>
                <button
                  onClick={() => { setShowPicker(null); setSearchTerm(''); }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Search activities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg"
                autoFocus
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredActivities.slice(0, 50).map((activity) => (
                <button
                  key={activity.id}
                  onClick={() => addActivity(showPicker, activity)}
                  className="w-full p-3 text-left hover:bg-gray-50 rounded-lg flex items-center gap-3"
                >
                  <span className="text-xl">{getAreaEmoji(activity.area)}</span>
                  <div>
                    <div className="font-medium text-gray-900">{activity.name}</div>
                    <div className="text-xs text-gray-500">{activity.category}</div>
                  </div>
                </button>
              ))}
              {filteredActivities.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No activities found
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
        }
      `}</style>
    </div>
  );
}
