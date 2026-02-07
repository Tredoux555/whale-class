// app/admin/site-tester/page.tsx
'use client';

import React, { useState } from 'react';

interface TestResult {
  id: string;
  name: string;
  category: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'skipped';
  details: string;
  duration?: number;
}

interface TestFunctionResult {
  details: string;
  duration?: number;
}

// ============================================
// TEST DEFINITIONS
// ============================================

const TESTS = [
  // Core
  {
    id: 'home_page',
    name: 'Home Page Loads',
    category: 'Core',
    test: async (baseUrl: string) => {
      const start = Date.now();
      const res = await fetch(baseUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.length < 500) throw new Error('Page content too short');
      return { details: `Loaded (${html.length} bytes)`, duration: Date.now() - start };
    }
  },
  {
    id: 'response_time',
    name: 'Response Time < 3s',
    category: 'Core',
    test: async (baseUrl: string) => {
      const start = Date.now();
      await fetch(baseUrl);
      const duration = Date.now() - start;
      if (duration > 3000) throw new Error(`Too slow: ${duration}ms`);
      return { details: `${duration}ms`, duration };
    }
  },
  
  // Navigation
  {
    id: 'admin_page',
    name: 'Admin Dashboard',
    category: 'Navigation',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/admin`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  {
    id: 'games_page',
    name: 'Games Hub',
    category: 'Navigation',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      if (html.toLowerCase().includes('coming soon')) {
        throw new Error('Still shows "Coming Soon"');
      }
      return { details: 'Games page active' };
    }
  },
  {
    id: 'montree_page',
    name: 'Montree',
    category: 'Navigation',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/admin/montree`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  
  // Cleanup Verification
  {
    id: 'no_student',
    name: 'Student Route Removed',
    category: 'Cleanup',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/student`);
      // Should be 404 or redirect, not 200 with content
      if (res.ok) {
        const html = await res.text();
        if (html.includes('student') && !html.includes('404')) {
          throw new Error('Student route still exists');
        }
      }
      return { details: `Status: ${res.status}` };
    }
  },
  {
    id: 'no_teacher',
    name: 'Teacher Route Removed',
    category: 'Cleanup',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/teacher`);
      if (res.ok) {
        const html = await res.text();
        if (html.includes('teacher') && !html.includes('404')) {
          throw new Error('Teacher route still exists');
        }
      }
      return { details: `Status: ${res.status}` };
    }
  },
  
  // Games
  {
    id: 'game_letter_sounds',
    name: 'Letter Sounds Game',
    category: 'Games',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games/letter-sounds`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  {
    id: 'game_word_building',
    name: 'Word Building Game',
    category: 'Games',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games/word-building`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  {
    id: 'game_letter_trace',
    name: 'Letter Trace Game',
    category: 'Games',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games/letter-trace`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  {
    id: 'game_picture_match',
    name: 'Picture Match Game',
    category: 'Games',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games/picture-match`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  {
    id: 'game_missing_letter',
    name: 'Missing Letter Game',
    category: 'Games',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games/missing-letter`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  {
    id: 'game_sight_flash',
    name: 'Sight Words Game',
    category: 'Games',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games/sight-flash`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  {
    id: 'game_sentence_build',
    name: 'Sentence Build Game',
    category: 'Games',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/games/sentence-build`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Accessible' };
    }
  },
  
  // APIs
  {
    id: 'api_whale_children',
    name: 'Whale Children API',
    category: 'API',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/api/whale/children`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { details: `${Array.isArray(data) ? data.length : 0} children` };
    }
  },
  {
    id: 'api_montree_children',
    name: 'Montree Children API',
    category: 'API',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/api/montree/children`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { details: `${Array.isArray(data) ? data.length : 0} children` };
    }
  },
  {
    id: 'api_videos',
    name: 'Videos API',
    category: 'API',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/api/public/videos`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return { details: `${data.videos ? data.videos.length : 0} videos` };
    }
  },
  
  // Assets
  {
    id: 'audio_letter_a',
    name: 'Audio: Letter A',
    category: 'Assets',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/audio/letters/a.mp3`, { method: 'HEAD' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Exists' };
    }
  },
  {
    id: 'audio_correct',
    name: 'Audio: Correct Sound',
    category: 'Assets',
    test: async (baseUrl: string) => {
      const res = await fetch(`${baseUrl}/audio/ui/correct.mp3`, { method: 'HEAD' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { details: 'Exists' };
    }
  },
];

export default function SiteTesterPage() {
  const [results, setResults] = useState<TestResult[]>(
    TESTS.map(t => ({ id: t.id, name: t.name, category: t.category, status: 'pending', details: 'Waiting...' }))
  );
  const [isRunning, setIsRunning] = useState(false);
  const [report, setReport] = useState<string>('');

  const runTests = async () => {
    setIsRunning(true);
    const baseUrl = window.location.origin;
    const newResults: TestResult[] = [];

    for (let i = 0; i < TESTS.length; i++) {
      const test = TESTS[i];
      
      // Update to running
      setResults(prev => prev.map((r, idx) => 
        idx === i ? { ...r, status: 'running', details: 'Testing...' } : r
      ));

      try {
        const result: TestFunctionResult = await test.test(baseUrl);
        newResults.push({
          id: test.id,
          name: test.name,
          category: test.category,
          status: 'passed',
          details: result.details,
          duration: result.duration || 0,
        });
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        newResults.push({
          id: test.id,
          name: test.name,
          category: test.category,
          status: 'failed',
          details: message,
          duration: 0,
        });
      }

      // Update results
      setResults([...newResults, ...TESTS.slice(i + 1).map(t => ({
        id: t.id,
        name: t.name,
        category: t.category,
        status: 'pending' as const,
        details: 'Waiting...',
      }))]);

      // Small delay between tests
      await new Promise(r => setTimeout(r, 100));
    }

    setIsRunning(false);
    generateReport(newResults, baseUrl);
  };

  const generateReport = (testResults: TestResult[], baseUrl: string) => {
    const passed = testResults.filter(t => t.status === 'passed').length;
    const failed = testResults.filter(t => t.status === 'failed').length;
    const timestamp = new Date().toISOString();

    let reportText = `# SITE TEST REPORT FOR CLAUDE

## Summary
- **URL**: ${baseUrl}
- **Date**: ${timestamp}
- **Passed**: ${passed}/${testResults.length} ✅
- **Failed**: ${failed}/${testResults.length} ❌

---

`;

    // Group by category
    const categories = [...new Set(testResults.map(t => t.category))];
    
    for (const category of categories) {
      const categoryTests = testResults.filter(t => t.category === category);
      const categoryPassed = categoryTests.filter(t => t.status === 'passed').length;
      
      reportText += `## ${category} (${categoryPassed}/${categoryTests.length})\n\n`;
      
      for (const test of categoryTests) {
        const icon = test.status === 'passed' ? '✅' : '❌';
        reportText += `- ${icon} **${test.name}**: ${test.details}\n`;
      }
      reportText += '\n';
    }

    // Failed tests action items
    const failedTests = testResults.filter(t => t.status === 'failed');
    if (failedTests.length > 0) {
      reportText += `---

## ⚠️ FAILED TESTS - Fix These

`;
      for (const test of failedTests) {
        reportText += `### ${test.name}
- **Error**: ${test.details}
- **Test ID**: ${test.id}

`;
      }
    } else {
      reportText += `---

## 🎉 ALL TESTS PASSED!
`;
    }

    reportText += `
---
*Copy this report and paste to Claude for fixes*`;

    setReport(reportText);
  };

  const copyReport = () => {
    navigator.clipboard.writeText(report);
    alert('Report copied to clipboard!');
  };

  const passed = results.filter(r => r.status === 'passed').length;
  const failed = results.filter(r => r.status === 'failed').length;
  const total = results.length;
  const progress = results.filter(r => r.status !== 'pending').length;

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">🔍 Site Tester</h1>
          <p className="text-slate-400">Automated testing with Claude-ready reports</p>
        </div>

        {/* Controls */}
        <div className="bg-slate-800 rounded-xl p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-600 rounded-lg font-bold transition-colors"
            >
              {isRunning ? '⏳ Running...' : '🚀 Run All Tests'}
            </button>
            {report && (
              <button
                onClick={copyReport}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors"
              >
                📋 Copy Report
              </button>
            )}
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-6 text-lg">
            <span className="text-green-400">✅ {passed}</span>
            <span className="text-red-400">❌ {failed}</span>
            <span className="text-slate-400">📊 {progress}/{total}</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 bg-slate-700 rounded-full mb-6 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-green-500 transition-all duration-300"
            style={{ width: `${(progress / total) * 100}%` }}
          />
        </div>

        {/* Test Results Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-8">
          {results.map((result) => (
            <div
              key={result.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                result.status === 'passed' ? 'bg-green-900/30 border-green-600' :
                result.status === 'failed' ? 'bg-red-900/30 border-red-600' :
                result.status === 'running' ? 'bg-amber-900/30 border-amber-500 animate-pulse' :
                'bg-slate-800 border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium">{result.name}</span>
                <span className="text-sm px-2 py-0.5 rounded bg-slate-700">{result.category}</span>
              </div>
              <div className="text-sm text-slate-400 flex items-center gap-2">
                {result.status === 'passed' && <span className="text-green-400">✅</span>}
                {result.status === 'failed' && <span className="text-red-400">❌</span>}
                {result.status === 'running' && <span className="text-amber-400">⏳</span>}
                {result.status === 'pending' && <span className="text-slate-500">⏸️</span>}
                {result.details}
              </div>
            </div>
          ))}
        </div>

        {/* Report Output */}
        {report && (
          <div className="bg-slate-800 rounded-xl p-4">
            <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
              📋 Claude Report
              <button
                onClick={copyReport}
                className="text-sm px-3 py-1 bg-green-600 hover:bg-green-700 rounded-lg font-medium"
              >
                Copy
              </button>
            </h2>
            <pre className="bg-slate-900 p-4 rounded-lg text-sm overflow-auto max-h-96 whitespace-pre-wrap">
              {report}
            </pre>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-slate-500 text-sm">
          <p>Run tests → Copy report → Paste to Claude → Get fixes</p>
        </div>
      </div>
    </div>
  );
}

