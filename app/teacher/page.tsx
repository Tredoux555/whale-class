import { getUserSession } from '@/lib/auth-multi';
import Link from 'next/link';

export default async function TeacherDashboard() {
  const session = await getUserSession();

  const quickActions = [
    {
      title: 'My Classroom',
      description: 'View and manage your students',
      icon: '👥',
      href: '/teacher/classroom',
      color: 'bg-blue-500',
    },
    {
      title: 'Track Progress',
      description: 'Update student progress',
      icon: '📊',
      href: '/teacher/progress',
      color: 'bg-emerald-500',
    },
    {
      title: 'View Curriculum',
      description: 'Browse Montessori works',
      icon: '📚',
      href: '/teacher/curriculum',
      color: 'bg-purple-500',
    },
    {
      title: 'Parent Reports',
      description: 'Generate progress reports',
      icon: '📄',
      href: '/teacher/daily-summary',
      color: 'bg-orange-500',
    },
  ];

  const tools = [
    { name: 'Label Maker', icon: '🏷️', href: '/admin/label-maker', description: '3-part card labels' },
    { name: 'Flashcard Maker', icon: '🎴', href: '/admin/flashcard-maker', description: 'Video flashcards' },
    { name: 'AI Planner', icon: '🤖', href: '/admin/ai-planner', description: 'AI lesson planning' },
    { name: 'Weekly Planning', icon: '📅', href: '/admin/weekly-planning', description: 'Class schedules' },
    { name: '3-Part Cards', icon: '🃏', href: '/admin/card-generator', description: 'Card generator' },
    { name: 'Materials', icon: '📦', href: '/admin/material-generator', description: 'Material lists' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session?.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-gray-600 mt-1">
          Here&apos;s your teaching dashboard for today.
        </p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickActions.map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group"
          >
            <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center text-2xl mb-4 group-hover:scale-110 transition-transform`}>
              {action.icon}
            </div>
            <h3 className="font-semibold text-gray-900">{action.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{action.description}</p>
          </Link>
        ))}
      </div>

      {/* Tools Section */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          🛠️ Teacher Tools
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {tools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="flex flex-col items-center p-4 rounded-xl bg-gray-50 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition-all text-center group"
            >
              <span className="text-3xl mb-2 group-hover:scale-110 transition-transform">
                {tool.icon}
              </span>
              <span className="font-medium text-sm text-gray-700">{tool.name}</span>
              <span className="text-xs text-gray-500 mt-0.5">{tool.description}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            📈 Recent Progress Updates
          </h2>
          <div className="text-center py-8 text-gray-500">
            <p>Progress updates will appear here</p>
            <Link 
              href="/teacher/progress" 
              className="text-emerald-600 hover:text-emerald-700 text-sm mt-2 inline-block"
            >
              Track progress →
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            👶 My Students
          </h2>
          <div className="text-center py-8 text-gray-500">
            <p>Your classroom students will appear here</p>
            <Link 
              href="/teacher/classroom" 
              className="text-emerald-600 hover:text-emerald-700 text-sm mt-2 inline-block"
            >
              View classroom →
            </Link>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
        <div className="flex items-start gap-4">
          <span className="text-4xl">💡</span>
          <div>
            <h3 className="font-semibold text-lg">Teacher Tip</h3>
            <p className="text-emerald-100 mt-1">
              Use the Curriculum view to see all Montessori works organized by area. 
              Click on any work to see detailed instructions and materials needed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
