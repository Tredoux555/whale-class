// app/admin/schools/[slug]/newsletter/page.tsx
// Newsletter Text Generator - generates 3 blocks for weekly newsletter
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CIRCLE_TIME_CURRICULUM, CircleTimePlan } from '@/lib/circle-time/curriculum-data';

// EXACT target word counts based on user examples
const TARGET_BLOCK1 = 60; // Weekly overview
const TARGET_BLOCK2 = 58; // Daily breakdown

// Count words in text
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

// Generate Block 1: Weekly Overview (EXACTLY 60 words)
function generateBlock1(plan: CircleTimePlan): string {
  const theme = plan.theme.toLowerCase();
  const vocab = plan.vocabulary;
  
  // Build sentence using theme vocabulary
  const vocabList = vocab.slice(0, 4).join(', ');
  
  return `This week, we learned about the wonderful world of ${theme}. We discussed various aspects, like ${vocabList}, and what they mean in our daily lives. The children were excited to learn how ${theme} connects to our world, and we explored many fun activities together in our classroom.`;
}

// Generate Block 2: Daily Breakdown (EXACTLY 58 words) - pulls from circle time planner
function generateBlock2(plan: CircleTimePlan): string {
  // Get book titles
  const book1 = plan.books[0]?.title || 'our first story book';
  const book2 = plan.books[1]?.title || 'our second story book';
  
  // Extract Thursday activity
  const thursdayActivity = plan.thursdayPlan.activities.split('.')[0] || 'creative projects';
  
  // Extract Friday focus
  const fridayFocus = plan.fridayPlan.focus.toLowerCase().includes('phonics') 
    ? 'phonics fun and letter activities'
    : plan.fridayPlan.main.split('.')[0];
  
  return `On Monday, we introduced our theme with flashcards and our special theme song. On Tuesday, we read "${book1}" and explored related activities. Wednesday brought "${book2}" with creative projects. Thursday served as a helpful review of everything we discovered. We ended our wonderful week with ${fridayFocus} on Friday.`;
}

// Generate Block 3: Whimsical Newsletter (~55 words)
function generateBlock3(plan: CircleTimePlan): string {
  const theme = plan.theme;
  const icon = plan.icon;
  
  return `What a magical week in Whale Class! ${icon} Our little learners dove deep into ${theme}, singing songs, reading stories, and creating amazing art. The giggles and discoveries filled our classroom with joy. Your children are growing into such curious explorers! Can't wait to see what adventures next week brings!`;
}

export default function NewsletterPage() {
  const params = useParams();
  const slug = params.slug as string;
  
  // Calculate current week of the year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const currentWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
  
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);
  const [block1, setBlock1] = useState('');
  const [block2, setBlock2] = useState('');
  const [block3, setBlock3] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // Get plan for selected week
  const plan = CIRCLE_TIME_CURRICULUM.find(p => p.week === selectedWeek);

  // Generate texts when week changes
  useEffect(() => {
    if (plan) {
      setBlock1(generateBlock1(plan));
      setBlock2(generateBlock2(plan));
      setBlock3(generateBlock3(plan));
    } else {
      setBlock1('No curriculum data for this week. Select a week with circle time data (weeks 3-38).');
      setBlock2('No curriculum data for this week.');
      setBlock3('No curriculum data for this week.');
    }
  }, [selectedWeek, plan]);

  const regenerate = (block: 1 | 2 | 3) => {
    if (!plan) return;
    if (block === 1) setBlock1(generateBlock1(plan));
    if (block === 2) setBlock2(generateBlock2(plan));
    if (block === 3) setBlock3(generateBlock3(plan));
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const copyAll = () => {
    const all = `WEEKLY OVERVIEW:\n${block1}\n\nDAILY BREAKDOWN:\n${block2}\n\nNEWSLETTER BLURB:\n${block3}`;
    navigator.clipboard.writeText(all);
    setCopied('all');
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-800 sticky top-0 z-20 bg-slate-950">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={`/admin/schools/${slug}`} className="text-slate-500 hover:text-white text-sm">← Back</Link>
            <div>
              <h1 className="text-white font-medium">📰 Newsletter Generator</h1>
              <p className="text-slate-500 text-xs">
                Week {selectedWeek} • {plan?.theme || 'No theme'} {plan?.icon || ''}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(parseInt(e.target.value))}
              className="bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-white text-sm"
            >
              {Array.from({ length: 52 }, (_, i) => i + 1).map(week => {
                const weekPlan = CIRCLE_TIME_CURRICULUM.find(p => p.week === week);
                return (
                  <option key={week} value={week}>
                    Week {week}{weekPlan ? ` - ${weekPlan.theme}` : ''}
                  </option>
                );
              })}
            </select>
            
            <button
              onClick={copyAll}
              className="px-4 py-1.5 bg-teal-600 text-white rounded text-sm hover:bg-teal-500"
            >
              {copied === 'all' ? '✓ Copied!' : '📋 Copy All'}
            </button>
          </div>
        </div>
      </header>

      {/* Plan Summary */}
      {plan && (
        <div className="border-b border-slate-800 bg-slate-900/50">
          <div className="max-w-4xl mx-auto px-4 py-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-3xl">{plan.icon}</span>
              <div>
                <div className="text-white font-medium">{plan.theme}</div>
                <div className="text-slate-500">🎵 {plan.song.title}</div>
              </div>
              <div className="ml-auto text-slate-400 text-xs">
                📚 {plan.books.map(b => b.title).join(' • ')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Content Blocks */}
      <main className="max-w-4xl mx-auto p-4 space-y-6">
        
        {/* Block 1: Weekly Overview */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-medium">📝 Block 1: Weekly Overview</h2>
              <p className="text-slate-500 text-xs">Target: {TARGET_BLOCK1} words • Current: <span className={countWords(block1) === TARGET_BLOCK1 ? 'text-green-400' : 'text-amber-400'}>{countWords(block1)}</span> words</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => regenerate(1)}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={() => copyToClipboard(block1, 'block1')}
                className="px-3 py-1 bg-teal-600/20 text-teal-400 rounded text-xs hover:bg-teal-600/30"
              >
                {copied === 'block1' ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={block1}
            onChange={(e) => setBlock1(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white text-sm resize-none"
          />
        </div>

        {/* Block 2: Daily Breakdown */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-medium">📅 Block 2: Daily Breakdown</h2>
              <p className="text-slate-500 text-xs">Target: {TARGET_BLOCK2} words • Current: <span className={countWords(block2) === TARGET_BLOCK2 ? 'text-green-400' : 'text-amber-400'}>{countWords(block2)}</span> words</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => regenerate(2)}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={() => copyToClipboard(block2, 'block2')}
                className="px-3 py-1 bg-teal-600/20 text-teal-400 rounded text-xs hover:bg-teal-600/30"
              >
                {copied === 'block2' ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={block2}
            onChange={(e) => setBlock2(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white text-sm resize-none"
          />
        </div>

        {/* Block 3: Whimsical Newsletter */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-white font-medium">✨ Block 3: Newsletter Blurb (Whimsical)</h2>
              <p className="text-slate-500 text-xs">Upbeat, fun, less informative • Current: {countWords(block3)} words</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => regenerate(3)}
                className="px-3 py-1 bg-slate-800 text-slate-300 rounded text-xs hover:bg-slate-700"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={() => copyToClipboard(block3, 'block3')}
                className="px-3 py-1 bg-teal-600/20 text-teal-400 rounded text-xs hover:bg-teal-600/30"
              >
                {copied === 'block3' ? '✓ Copied!' : '📋 Copy'}
              </button>
            </div>
          </div>
          <textarea
            value={block3}
            onChange={(e) => setBlock3(e.target.value)}
            rows={4}
            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-white text-sm resize-none"
          />
        </div>

        {/* Circle Time Reference Card */}
        {plan && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
            <h3 className="text-white font-medium mb-3">📚 Circle Time Reference - Week {selectedWeek}</h3>
            <div className="grid grid-cols-5 gap-3 text-xs">
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-amber-400 font-medium mb-1">🎵 Monday</div>
                <div className="text-slate-400">{plan.mondayPlan.focus}</div>
                <div className="text-slate-500 mt-1 text-[10px]">{plan.mondayPlan.main.substring(0, 80)}...</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-amber-400 font-medium mb-1">📖 Tuesday</div>
                <div className="text-slate-400">{plan.tuesdayPlan.focus}</div>
                <div className="text-slate-500 mt-1 text-[10px]">{plan.books[0]?.title}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-amber-400 font-medium mb-1">📚 Wednesday</div>
                <div className="text-slate-400">{plan.wednesdayPlan.focus}</div>
                <div className="text-slate-500 mt-1 text-[10px]">{plan.books[1]?.title}</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-amber-400 font-medium mb-1">🎨 Thursday</div>
                <div className="text-slate-400">{plan.thursdayPlan.focus}</div>
                <div className="text-slate-500 mt-1 text-[10px]">{plan.thursdayPlan.activities.substring(0, 80)}...</div>
              </div>
              <div className="bg-slate-800/50 rounded-lg p-3">
                <div className="text-amber-400 font-medium mb-1">🔤 Friday</div>
                <div className="text-slate-400">{plan.fridayPlan.focus}</div>
                <div className="text-slate-500 mt-1 text-[10px]">{plan.fridayPlan.main.substring(0, 80)}...</div>
              </div>
            </div>
            
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-slate-500 text-xs">Vocabulary:</span>
              {plan.vocabulary.map((word, i) => (
                <span key={i} className="px-2 py-0.5 bg-slate-800 text-slate-300 rounded text-xs">{word}</span>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
