'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// SECURITY: Only Tredoux can access classroom data
function useAuthCheck() {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);
  
  useEffect(() => {
    const teacher = localStorage.getItem('teacherName');
    if (teacher !== 'Tredoux') {
      router.push('/teacher/dashboard');
    } else {
      setAuthorized(true);
    }
  }, [router]);
  
  return authorized;
}

interface Child {
  id: string;
  name: string;
  display_order: number;
  date_of_birth?: string;
}

interface School {
  id: string;
  name: string;
  slug: string;
}

// Get current ISO week number
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export default function ClassroomPage() {
  const authorized = useAuthCheck();
  const [activeTab, setActiveTab] = useState<'classroom' | 'tools'>('classroom');
  const [children, setChildren] = useState<Child[]>([]);
  const [school, setSchool] = useState<School | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Current week/year for print
  const now = new Date();
  const currentWeek = getWeekNumber(now);
  const currentYear = now.getFullYear();

  useEffect(() => {
    fetchChildren();
  }, []);

  async function fetchChildren() {
    try {
      const res = await fetch('/api/classroom/children?school=beijing-international');
      const data = await res.json();
      setSchool(data.school);
      setChildren(data.children || []);
    } catch (err) {
      console.error('Failed to fetch children:', err);
    } finally {
      setLoading(false);
    }
  }

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(search.toLowerCase())
  );

  // SECURITY: Block unauthorized access
  if (!authorized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-white border-t-transparent" />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🐋</span>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Whale Class</h1>
                <p className="text-sm text-gray-500">{children.length} students</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href={`/admin/classroom/print?week=${currentWeek}&year=${currentYear}`}
                target="_blank"
                className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center justify-center transition-colors"
                title="Print Weekly Plan"
              >
                🖨️
              </Link>
              <Link 
                href="/admin" 
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ← Admin
              </Link>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('classroom')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'classroom'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Classroom
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'tools'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Tools
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'classroom' ? (
          <ClassroomTab 
            children={filteredChildren} 
            search={search} 
            setSearch={setSearch}
            school={school}
          />
        ) : (
          <ToolsTab school={school} />
        )}
      </main>
    </div>
  );
}

// CLASSROOM TAB - Student list
function ClassroomTab({ 
  children, 
  search, 
  setSearch,
  school 
}: { 
  children: Child[]; 
  search: string; 
  setSearch: (s: string) => void;
  school: School | null;
}) {
  return (
    <div>
      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search students..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
        />
      </div>

      {/* Student Grid */}
      {children.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {children.map((child) => (
            <StudentCard key={child.id} child={child} schoolSlug={school?.slug} />
          ))}
        </div>
      )}
    </div>
  );
}

// Student Card Component
function StudentCard({ child, schoolSlug }: { child: Child; schoolSlug?: string }) {
  const initials = child.name.charAt(0).toUpperCase();
  
  // Color based on first letter
  const colors: Record<string, string> = {
    R: 'bg-rose-100 text-rose-600',
    Y: 'bg-yellow-100 text-yellow-600',
    L: 'bg-lime-100 text-lime-600',
    A: 'bg-amber-100 text-amber-600',
    M: 'bg-fuchsia-100 text-fuchsia-600',
    J: 'bg-indigo-100 text-indigo-600',
    E: 'bg-emerald-100 text-emerald-600',
    K: 'bg-sky-100 text-sky-600',
    N: 'bg-orange-100 text-orange-600',
    H: 'bg-teal-100 text-teal-600',
    S: 'bg-purple-100 text-purple-600',
  };
  
  const colorClass = colors[initials] || 'bg-gray-100 text-gray-600';

  return (
    <Link
      href={`/admin/classroom/student/${child.id}`}
      className="bg-white rounded-xl p-4 border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all group"
    >
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${colorClass}`}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 truncate group-hover:text-teal-600 transition-colors">
            {child.name}
          </p>
          <p className="text-xs text-gray-400">#{child.display_order}</p>
        </div>
      </div>
      
      {/* Progress bar placeholder */}
      <div className="mt-3 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-teal-500 rounded-full" style={{ width: '0%' }} />
      </div>
      <p className="text-xs text-gray-400 mt-1">0% progress</p>
    </Link>
  );
}

// TOOLS TAB - All other features
function ToolsTab({ school }: { school: School | null }) {
  const tools = [
    {
      name: 'Weekly Reports',
      icon: '📝',
      description: 'Generate English progress reports',
      href: `/admin/schools/${school?.slug || 'beijing-international'}/english-reports`,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      name: 'English Progression',
      icon: '📊',
      description: 'View reading sequence & levels',
      href: `/admin/schools/${school?.slug || 'beijing-international'}/english`,
      color: 'bg-green-50 text-green-600',
    },
    {
      name: 'Curriculum',
      icon: '📚',
      description: 'Montessori works library',
      href: `/admin/schools/${school?.slug || 'beijing-international'}/curriculum`,
      color: 'bg-purple-50 text-purple-600',
    },
    {
      name: 'Learning Games',
      icon: '🎮',
      description: 'Number & letter tracing',
      href: '/games',
      color: 'bg-orange-50 text-orange-600',
    },
    {
      name: 'Newsletter',
      icon: '📰',
      description: 'Weekly parent updates',
      href: `/admin/schools/${school?.slug || 'beijing-international'}/newsletter`,
      color: 'bg-pink-50 text-pink-600',
    },
    {
      name: 'Settings',
      icon: '⚙️',
      description: 'School & account settings',
      href: '/admin/settings',
      color: 'bg-gray-50 text-gray-600',
    },
  ];

  return (
    <div className="grid gap-3">
      {tools.map((tool) => (
        <Link
          key={tool.name}
          href={tool.href}
          className="flex items-center gap-4 bg-white rounded-xl p-4 border border-gray-100 hover:border-teal-300 hover:shadow-md transition-all"
        >
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${tool.color}`}>
            {tool.icon}
          </div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">{tool.name}</p>
            <p className="text-sm text-gray-500">{tool.description}</p>
          </div>
          <span className="text-gray-300">→</span>
        </Link>
      ))}
    </div>
  );
}
