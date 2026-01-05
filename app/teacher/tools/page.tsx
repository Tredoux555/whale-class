import Link from 'next/link';

export default function TeacherToolsPage() {
  const tools = [
    {
      name: 'Label Maker',
      description: 'Create 3-part card labels for Montessori materials',
      icon: '🏷️',
      href: '/admin/label-maker',
      color: 'bg-pink-500',
    },
    {
      name: 'Flashcard Maker',
      description: 'Generate flashcards from YouTube videos',
      icon: '🎴',
      href: '/admin/flashcard-maker',
      color: 'bg-purple-500',
    },
    {
      name: '3-Part Card Generator',
      description: 'Create nomenclature cards for any topic',
      icon: '🃏',
      href: '/admin/card-generator',
      color: 'bg-blue-500',
    },
    {
      name: 'AI Lesson Planner',
      description: 'Get AI-powered lesson suggestions',
      icon: '🤖',
      href: '/admin/ai-planner',
      color: 'bg-emerald-500',
    },
    {
      name: 'Weekly Planning',
      description: 'Plan and organize weekly lessons',
      icon: '📅',
      href: '/admin/weekly-planning',
      color: 'bg-orange-500',
    },
    {
      name: 'Circle Time Planner',
      description: 'Plan engaging circle time activities',
      icon: '⭕',
      href: '/admin/circle-planner',
      color: 'bg-yellow-500',
    },
    {
      name: 'Material Generator',
      description: 'Generate material lists and prep guides',
      icon: '📦',
      href: '/admin/material-generator',
      color: 'bg-indigo-500',
    },
    {
      name: 'Vocabulary Flashcards',
      description: 'Create vocabulary cards for language learning',
      icon: '📝',
      href: '/admin/vocabulary-flashcards',
      color: 'bg-teal-500',
    },
    {
      name: 'English Guide',
      description: 'Sound objects and phonics materials',
      icon: '🔤',
      href: '/admin/english-guide',
      color: 'bg-red-500',
    },
    {
      name: 'Phonics Planner',
      description: 'Plan phonics lessons and progression',
      icon: '🗣️',
      href: '/admin/phonics-planner',
      color: 'bg-cyan-500',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">🛠️ Teacher Tools</h1>
        <p className="text-gray-600 mt-1">
          Resources to help you prepare materials and plan lessons
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.href}
            href={tool.href}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200 transition-all group"
          >
            <div className={`w-14 h-14 ${tool.color} rounded-xl flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
              {tool.icon}
            </div>
            <h3 className="font-semibold text-gray-900">{tool.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{tool.description}</p>
          </Link>
        ))}
      </div>

      {/* Quick Tips */}
      <div className="mt-8 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl p-6 text-white">
        <h2 className="font-semibold text-lg mb-3">💡 Quick Tips</h2>
        <ul className="space-y-2 text-emerald-100">
          <li>• <strong>Label Maker</strong> - Perfect for 3-part card labels that match control cards</li>
          <li>• <strong>AI Planner</strong> - Get personalized lesson suggestions based on student progress</li>
          <li>• <strong>Flashcard Maker</strong> - Extract frames from YouTube videos for custom flashcards</li>
          <li>• <strong>Weekly Planning</strong> - Upload your planning document for class-wide view</li>
        </ul>
      </div>
    </div>
  );
}
