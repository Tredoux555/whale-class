'use client';

import React from 'react';
import Link from 'next/link';

export default function IndependentMontreePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-cyan-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/admin" className="text-gray-500 hover:text-gray-700">
            ← Back to Admin
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            🌳 Independent Montree
          </h1>
          <div className="text-sm text-gray-500">
            Master Plan v1.0
          </div>
        </div>

        {/* Mission Statement */}
        <div className="bg-gradient-to-r from-emerald-600 to-cyan-600 rounded-2xl p-8 text-white mb-8 shadow-xl">
          <h2 className="text-2xl font-bold mb-4">🎯 The Mission</h2>
          <p className="text-lg opacity-95 mb-4">
            Build a standalone multi-tenant Montessori progress tracking platform that can be 
            packaged as an app and licensed to schools worldwide. This is the path to financial freedom.
          </p>
          <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">👨‍💼</div>
              <div className="font-bold">Principal</div>
              <div className="text-sm opacity-80">Sees all teachers &amp; data</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">👩‍🏫</div>
              <div className="font-bold">Teachers</div>
              <div className="text-sm opacity-80">Own students &amp; progress</div>
            </div>
            <div className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-3xl mb-2">👨‍👩‍👧</div>
              <div className="font-bold">Parents</div>
              <div className="text-sm opacity-80">See their children only</div>
            </div>
          </div>
        </div>

        {/* Current Issues */}
        <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-6 mb-8">
          <h2 className="text-xl font-bold text-red-800 mb-4">🚨 Current Issues to Fix</h2>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="text-red-500 font-bold">1.</span>
              <div>
                <span className="font-bold">DATA LEAKAGE:</span> Teacher John sees ALL students (Tredoux&apos;s students), 
                not his own. The API has no teacher filtering.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-500 font-bold">2.</span>
              <div>
                <span className="font-bold">VIDEO URLS:</span> Direct YouTube links disappear. 
                Need search terms instead that generate fresh searches.
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-red-500 font-bold">3.</span>
              <div>
                <span className="font-bold">CIRCLE PLANNER:</span> Admin version has features 
                (Flashcards button) that teacher version is missing.
              </div>
            </div>
          </div>
        </div>

        {/* Implementation Phases */}
        <div className="space-y-6">
          {/* Phase 1 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-blue-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔧</span>
              <h3 className="text-xl font-bold">Phase 1: Database Schema</h3>
              <span className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full">Week 1</span>
            </div>
            <div className="space-y-2 ml-12">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Create <code className="bg-gray-100 px-1 rounded">teacher_children</code> junction table</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Add <code className="bg-gray-100 px-1 rounded">video_search_term</code> to curriculum_roadmap</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Migrate existing children to Tredoux (admin) ownership</span>
              </div>
            </div>
            <div className="mt-4 ml-12 p-3 bg-gray-50 rounded-lg font-mono text-xs">
              <div className="text-gray-500 mb-1">-- SQL Migration</div>
              <div>CREATE TABLE teacher_children (</div>
              <div className="ml-4">teacher_id UUID REFERENCES simple_teachers(id),</div>
              <div className="ml-4">child_id UUID REFERENCES children(id),</div>
              <div className="ml-4">UNIQUE(teacher_id, child_id)</div>
              <div>);</div>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-green-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🔐</span>
              <h3 className="text-xl font-bold">Phase 2: Teacher Data Isolation</h3>
              <span className="px-3 py-1 bg-green-100 text-green-700 text-sm rounded-full">Week 1-2</span>
            </div>
            <div className="space-y-2 ml-12">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Update <code className="bg-gray-100 px-1 rounded">/api/teacher/classroom</code> to filter by teacher</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Create teacher-specific &quot;Add Student&quot; functionality</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Update progress tracking APIs to scope by teacher</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Test: John only sees John&apos;s students</span>
              </div>
            </div>
          </div>

          {/* Phase 3 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-purple-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📺</span>
              <h3 className="text-xl font-bold">Phase 3: Video Search Terms</h3>
              <span className="px-3 py-1 bg-purple-100 text-purple-700 text-sm rounded-full">Week 2</span>
            </div>
            <div className="space-y-2 ml-12">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Populate video_search_term for all 342 curriculum works</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Update curriculum detail modal to use search term → YouTube search</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Remove direct video_url dependency</span>
              </div>
            </div>
            <div className="mt-4 ml-12 p-3 bg-purple-50 rounded-lg text-sm">
              <div className="font-bold text-purple-700 mb-1">Example:</div>
              <div className="text-gray-600">
                Instead of: <code className="bg-white px-1 rounded">youtube.com/watch?v=XYZ123</code> (breaks)
              </div>
              <div className="text-gray-600">
                Use: <code className="bg-white px-1 rounded">Montessori Pink Tower presentation</code> → generates fresh search
              </div>
            </div>
          </div>

          {/* Phase 4 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-orange-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">⚖️</span>
              <h3 className="text-xl font-bold">Phase 4: Feature Parity</h3>
              <span className="px-3 py-1 bg-orange-100 text-orange-700 text-sm rounded-full">Week 2</span>
            </div>
            <div className="space-y-2 ml-12">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Circle Planner: Match admin buttons in teacher version</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Classroom View: Give teachers same view as admin (their data only)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Progress tracking: Full feature parity with admin tools</span>
              </div>
            </div>
          </div>

          {/* Phase 5 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-cyan-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">👨‍👩‍👧</span>
              <h3 className="text-xl font-bold">Phase 5: Parent Portal Integration</h3>
              <span className="px-3 py-1 bg-cyan-100 text-cyan-700 text-sm rounded-full">Week 3</span>
            </div>
            <div className="space-y-2 ml-12">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Link parents to specific children via teacher assignment</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Parent dashboard shows only their children&apos;s progress</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Weekly progress reports to parents</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Teacher generates parent invite codes</span>
              </div>
            </div>
          </div>

          {/* Phase 6 */}
          <div className="bg-white rounded-2xl p-6 shadow-lg border-l-4 border-pink-500">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">📱</span>
              <h3 className="text-xl font-bold">Phase 6: App Packaging</h3>
              <span className="px-3 py-1 bg-pink-100 text-pink-700 text-sm rounded-full">Week 4+</span>
            </div>
            <div className="space-y-2 ml-12">
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>PWA manifest and service worker for offline</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Mobile-optimized tablet views</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Multi-school tenant architecture</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>Stripe integration for school licensing</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-gray-300 rounded"></span>
                <span>White-label branding per school</span>
              </div>
            </div>
          </div>
        </div>

        {/* Data Flow Diagram */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-xl font-bold mb-4">📊 Data Flow Architecture</h2>
          <div className="bg-gray-900 text-gray-100 rounded-xl p-6 font-mono text-sm overflow-x-auto">
            <pre>{`
┌─────────────────────────────────────────────────────────────────┐
│                        WHALE PLATFORM                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────┐                                               │
│   │  PRINCIPAL  │  (Super Admin - Tredoux)                      │
│   │  /admin/*   │  • Sees ALL teachers, ALL students            │
│   └──────┬──────┘  • Manages curriculum, schools                │
│          │                                                       │
│          │ creates/manages                                       │
│          ▼                                                       │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │  TEACHER 1  │     │  TEACHER 2  │     │  TEACHER N  │      │
│   │  (John)     │     │  (Jasmine)  │     │  (...)      │      │
│   │  /teacher/* │     │  /teacher/* │     │  /teacher/* │      │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘      │
│          │                   │                   │               │
│          │ owns (via teacher_children)          │               │
│          ▼                   ▼                   ▼               │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐      │
│   │ John's Kids │     │Jasmine Kids │     │  N's Kids   │      │
│   │ • Mia       │     │ • Amy       │     │  • ...      │      │
│   │ • Leo       │     │ • Eric      │     │             │      │
│   └──────┬──────┘     └─────────────┘     └─────────────┘      │
│          │                                                       │
│          │ linked to                                            │
│          ▼                                                       │
│   ┌─────────────┐                                               │
│   │  PARENTS    │  • See ONLY their children                    │
│   │  /parent/*  │  • Weekly progress reports                    │
│   └─────────────┘  • Activities & recommendations               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘

DATABASE TABLES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
simple_teachers (id, name, password)
         │
         │ 1:many
         ▼
teacher_children (teacher_id, child_id)  ← NEW TABLE
         │
         │ many:1
         ▼
children (id, name, date_of_birth, ...)
         │
         │ 1:many
         ▼
child_work_progress (child_id, work_id, status, ...)
            `}</pre>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-8 bg-emerald-100 border-2 border-emerald-400 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-emerald-800 mb-4">🚀 Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link 
              href="/admin/classroom"
              className="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">👀</div>
              <div className="font-bold text-sm">View Classroom</div>
              <div className="text-xs text-gray-500">Current admin view</div>
            </Link>
            <Link 
              href="/teacher"
              className="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">👩‍🏫</div>
              <div className="font-bold text-sm">Teacher Portal</div>
              <div className="text-xs text-gray-500">Test as John</div>
            </Link>
            <Link 
              href="/admin/curriculum-progress"
              className="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">📚</div>
              <div className="font-bold text-sm">Curriculum</div>
              <div className="text-xs text-gray-500">342 works</div>
            </Link>
            <Link 
              href="/parent/home"
              className="bg-white rounded-xl p-4 text-center hover:shadow-lg transition-shadow"
            >
              <div className="text-2xl mb-2">👨‍👩‍👧</div>
              <div className="font-bold text-sm">Parent Portal</div>
              <div className="text-xs text-gray-500">demo@test.com</div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>Independent Montree - Building the future of Montessori education</p>
          <p className="mt-1">🌳 Financial freedom through educational excellence</p>
        </div>
      </div>
    </div>
  );
}
