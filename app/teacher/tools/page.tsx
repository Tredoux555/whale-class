'use client';

import Link from 'next/link';
import { useState } from 'react';

const TOOLS = [
  {
    name: 'Label Maker',
    description: 'Create 3-part card labels for Montessori materials',
    icon: '🏷️',
    href: '/admin/label-maker',
    gradient: 'from-pink-500 to-rose-500',
    bgGradient: 'from-pink-50 to-rose-50',
  },
  {
    name: 'Flashcard Maker',
    description: 'Generate flashcards from YouTube videos',
    icon: '🎴',
    href: '/admin/flashcard-maker',
    gradient: 'from-purple-500 to-violet-500',
    bgGradient: 'from-purple-50 to-violet-50',
  },
  {
    name: '3-Part Card Generator',
    description: 'Create nomenclature cards for any topic',
    icon: '🃏',
    href: '/admin/card-generator',
    gradient: 'from-blue-500 to-indigo-500',
    bgGradient: 'from-blue-50 to-indigo-50',
  },
  {
    name: 'AI Lesson Planner',
    description: 'Get AI-powered lesson suggestions',
    icon: '🤖',
    href: '/admin/ai-planner',
    gradient: 'from-emerald-500 to-teal-500',
    bgGradient: 'from-emerald-50 to-teal-50',
  },
  {
    name: 'Weekly Planning',
    description: 'Plan and organize weekly lessons',
    icon: '📅',
    href: '/admin/weekly-planning',
    gradient: 'from-orange-500 to-amber-500',
    bgGradient: 'from-orange-50 to-amber-50',
  },
  {
    name: 'Circle Time Planner',
    description: 'Plan engaging circle time activities',
    icon: '⭕',
    href: '/admin/circle-planner',
    gradient: 'from-yellow-500 to-orange-500',
    bgGradient: 'from-yellow-50 to-orange-50',
  },
  {
    name: 'Material Generator',
    description: 'Generate material lists and prep guides',
    icon: '📦',
    href: '/admin/material-generator',
    gradient: 'from-indigo-500 to-purple-500',
    bgGradient: 'from-indigo-50 to-purple-50',
  },
  {
    name: 'Vocabulary Flashcards',
    description: 'Create vocabulary cards for language learning',
    icon: '📝',
    href: '/admin/vocabulary-flashcards',
    gradient: 'from-teal-500 to-cyan-500',
    bgGradient: 'from-teal-50 to-cyan-50',
  },
  {
    name: 'English Guide',
    description: 'Sound objects and phonics materials',
    icon: '🔤',
    href: '/admin/english-guide',
    gradient: 'from-red-500 to-pink-500',
    bgGradient: 'from-red-50 to-pink-50',
  },
  {
    name: 'Phonics Planner',
    description: 'Plan phonics lessons and progression',
    icon: '🗣️',
    href: '/admin/phonics-planner',
    gradient: 'from-cyan-500 to-blue-500',
    bgGradient: 'from-cyan-50 to-blue-50',
  },
];

export default function TeacherToolsPage() {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-cyan-50">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
                <span className="text-4xl">🛠️</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold">Teacher Tools</h1>
                <p className="text-blue-100 mt-1">
                  Resources to help you prepare materials and plan lessons
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold">10</div>
                <div className="text-xs text-blue-100">Tools</div>
              </div>
              <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
                <div className="text-2xl font-bold">🎯</div>
                <div className="text-xs text-blue-100">Free</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Tools Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {TOOLS.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group block"
              onMouseEnter={() => setHoveredTool(tool.name)}
              onMouseLeave={() => setHoveredTool(null)}
            >
              <div className={`bg-gradient-to-br ${tool.bgGradient} rounded-2xl p-5 shadow-sm hover:shadow-xl transition-all duration-300 border border-white/50 hover:-translate-y-1 h-full`}>
                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${tool.gradient} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 group-hover:rotate-3 transition-transform mb-4`}>
                  <span className="text-3xl">{tool.icon}</span>
                </div>

                {/* Content */}
                <h3 className="font-bold text-gray-800 mb-1 group-hover:text-gray-900">
                  {tool.name}
                </h3>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {tool.description}
                </p>

                {/* Arrow indicator */}
                <div className={`mt-4 flex items-center gap-2 text-sm font-medium transition-all ${
                  hoveredTool === tool.name 
                    ? 'text-blue-600 translate-x-1' 
                    : 'text-gray-400'
                }`}>
                  <span>Open tool</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-10 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl shadow-emerald-200/30">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-2xl">💡</span>
            </div>
            <div>
              <h2 className="font-bold text-lg mb-3">Quick Tips</h2>
              <div className="grid sm:grid-cols-2 gap-3 text-emerald-50 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-white">•</span>
                  <span><strong className="text-white">Label Maker</strong> - Perfect for 3-part card labels that match control cards</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white">•</span>
                  <span><strong className="text-white">AI Planner</strong> - Get personalized lesson suggestions based on student progress</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white">•</span>
                  <span><strong className="text-white">Flashcard Maker</strong> - Extract frames from YouTube videos for custom flashcards</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-white">•</span>
                  <span><strong className="text-white">Weekly Planning</strong> - Upload your planning document for class-wide view</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Back Link */}
        <div className="mt-8 text-center">
          <Link
            href="/teacher/dashboard"
            className="inline-flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
