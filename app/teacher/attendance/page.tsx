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

interface AttendanceRecord {
  child_id: string;
  status: 'present' | 'absent' | 'sick' | 'late';
}

const STATUSES = [
  { value: 'present', label: 'Present', emoji: '✅', color: 'bg-green-500' },
  { value: 'absent', label: 'Absent', emoji: '❌', color: 'bg-red-500' },
  { value: 'sick', label: 'Sick', emoji: '🤒', color: 'bg-orange-500' },
  { value: 'late', label: 'Late', emoji: '⏰', color: 'bg-yellow-500' },
];

export default function TeacherAttendancePage() {
  const router = useRouter();
  const [teacherName, setTeacherName] = useState('');
  const [children, setChildren] = useState<Child[]>([]);
  const [attendance, setAttendance] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const name = localStorage.getItem('teacherName');
    if (!name) { router.push('/teacher'); return; }
    setTeacherName(name);
    fetchData();
  }, [router]);

  const fetchData = async () => {
    try {
      // Fetch children
      const childRes = await fetch('/api/children');
      const childData = await childRes.json();
      setChildren(childData.children || []);

      // Fetch today's attendance
      const attRes = await fetch(`/api/attendance?date=${today}`);
      const attData = await attRes.json();
      const attMap: Record<string, string> = {};
      (attData.attendance || []).forEach((a: AttendanceRecord) => {
        attMap[a.child_id] = a.status;
      });
      setAttendance(attMap);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const markAttendance = async (childId: string, status: string) => {
    setSaving(childId);
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          status,
          marked_by: teacherName,
          check_in_time: status === 'present' || status === 'late' 
            ? new Date().toTimeString().slice(0, 5) : null
        })
      });
      setAttendance(prev => ({ ...prev, [childId]: status }));
      toast.success('Saved');
    } catch (e) { 
      toast.error('Failed to save');
    }
    finally { setSaving(null); }
  };

  const stats = {
    present: Object.values(attendance).filter(s => s === 'present').length,
    absent: Object.values(attendance).filter(s => s === 'absent').length,
    sick: Object.values(attendance).filter(s => s === 'sick').length,
    late: Object.values(attendance).filter(s => s === 'late').length,
    unmarked: children.length - Object.keys(attendance).length
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-emerald-50 flex items-center justify-center">
        <span className="text-4xl animate-bounce">📋</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 to-white">
      <header className="bg-emerald-600 text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <Link href="/teacher/dashboard" className="text-emerald-200 hover:text-white">←</Link>
          <div className="text-center">
            <h1 className="font-bold">📋 Attendance</h1>
            <p className="text-emerald-200 text-sm">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="w-6"></div>
        </div>
      </header>

      {/* Stats Bar */}
      <div className="bg-white px-4 py-3 border-b flex justify-around text-center">
        <div><span className="text-green-600 font-bold text-lg">{stats.present}</span><p className="text-xs text-gray-500">Present</p></div>
        <div><span className="text-red-600 font-bold text-lg">{stats.absent}</span><p className="text-xs text-gray-500">Absent</p></div>
        <div><span className="text-orange-600 font-bold text-lg">{stats.sick}</span><p className="text-xs text-gray-500">Sick</p></div>
        <div><span className="text-yellow-600 font-bold text-lg">{stats.late}</span><p className="text-xs text-gray-500">Late</p></div>
        <div><span className="text-gray-400 font-bold text-lg">{stats.unmarked}</span><p className="text-xs text-gray-500">Unmarked</p></div>
      </div>

      <main className="max-w-2xl mx-auto px-4 py-4">
        <div className="space-y-2">
          {children.map(child => (
            <div key={child.id} className="bg-white rounded-xl p-4 flex items-center gap-4 shadow-sm">
              <span className="text-3xl">{child.avatar_emoji || '👶'}</span>
              <div className="flex-1">
                <p className="font-semibold">{child.name}</p>
                {attendance[child.id] && (
                  <p className="text-xs text-gray-500">
                    {STATUSES.find(s => s.value === attendance[child.id])?.label}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {STATUSES.map(s => (
                  <button
                    key={s.value}
                    onClick={() => markAttendance(child.id, s.value)}
                    disabled={saving === child.id}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                      attendance[child.id] === s.value
                        ? `${s.color} text-white scale-110`
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title={s.label}
                  >
                    {s.emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
