// app/assessment/[sessionId]/page.tsx
// Assessment test runner - orchestrates the 7 skill tests
// Child-friendly UI with progress dots

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ASSESSMENT_SKILLS, getSkillByOrder, isAssessmentComplete } from '@/lib/assessment/skills';

// Import all test games
import LetterMatchTestGame from '@/components/assessment/LetterMatchTestGame';
import LetterSoundsTestGame from '@/components/assessment/LetterSoundsTestGame';
import BeginningTestGame from '@/components/assessment/BeginningTestGame';
import EndingTestGame from '@/components/assessment/EndingTestGame';
import MiddleTestGame from '@/components/assessment/MiddleTestGame';
import BlendingTestGame from '@/components/assessment/BlendingTestGame';
import ReadingWordsTestGame from '@/components/assessment/ReadingWordsTestGame';
import ReadingSentencesTestGame from '@/components/assessment/ReadingSentencesTestGame';

interface TestResult {
  skillCode: string;
  skillName: string;
  correctCount: number;
  totalCount: number;
  itemsData: any[];
  durationSeconds: number;
}

interface Session {
  id: string;
  child_name: string;
  status: string;
}

export default function AssessmentRunnerPage() {
  const router = useRouter();
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [session, setSession] = useState<Session | null>(null);
  const [currentSkillOrder, setCurrentSkillOrder] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showTransition, setShowTransition] = useState(false);
  const [skillStartTime, setSkillStartTime] = useState<number>(Date.now());

  // Load session on mount
  useEffect(() => {
    loadSession();
  }, [sessionId]);

  const loadSession = async () => {
    try {
      const res = await fetch(`/api/assessment/sessions/${sessionId}`);
      const data = await res.json();
      
      if (data.success && data.session) {
        setSession(data.session);
        
        // If session already has results, resume from where left off
        if (data.session.assessment_results?.length > 0) {
          const lastOrder = Math.max(
            ...data.session.assessment_results.map((r: any) => r.skill_order || 0)
          );
          setCurrentSkillOrder(lastOrder + 1);
        }
      } else {
        setError('Test not found');
      }
    } catch (err) {
      console.error('Error loading session:', err);
      setError('Could not load test');
    } finally {
      setLoading(false);
    }
  };

  // Save skill result and move to next
  const handleSkillComplete = useCallback(async (result: TestResult) => {
    try {
      // Save result to database
      await fetch('/api/assessment/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          skill_code: result.skillCode,
          skill_name: result.skillName,
          skill_order: currentSkillOrder,
          correct_count: result.correctCount,
          total_count: result.totalCount,
          items_data: result.itemsData,
          started_at: new Date(skillStartTime).toISOString(),
          completed_at: new Date().toISOString(),
          duration_seconds: result.durationSeconds
        })
      });

      // Check if all skills complete
      if (isAssessmentComplete(currentSkillOrder)) {
        // Mark session complete
        await fetch(`/api/assessment/sessions/${sessionId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' })
        });
        
        // Go to celebration
        router.push(`/assessment/${sessionId}/complete`);
      } else {
        // Show transition, then next skill
        setShowTransition(true);
        setTimeout(() => {
          setShowTransition(false);
          setCurrentSkillOrder(prev => prev + 1);
          setSkillStartTime(Date.now());
        }, 2000);
      }
    } catch (err) {
      console.error('Error saving result:', err);
      // Continue anyway - don't block the child
      if (isAssessmentComplete(currentSkillOrder)) {
        router.push(`/assessment/${sessionId}/complete`);
      } else {
        setCurrentSkillOrder(prev => prev + 1);
        setSkillStartTime(Date.now());
      }
    }
  }, [sessionId, currentSkillOrder, skillStartTime, router]);

  // Render the current skill's test component
  const renderCurrentTest = () => {
    const skill = getSkillByOrder(currentSkillOrder);
    if (!skill) return null;

    // Map skill codes to components
    switch (skill.code) {
      case 'letter_recognition':
        return (
          <LetterMatchTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      case 'letter_sounds':
        return (
          <LetterSoundsTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      case 'beginning_sounds':
        return (
          <BeginningTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      case 'ending_sounds':
        return (
          <EndingTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      case 'middle_sounds':
        return (
          <MiddleTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      case 'blending':
        return (
          <BlendingTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      case 'reading_words':
        return (
          <ReadingWordsTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      case 'reading_sentences':
        return (
          <ReadingSentencesTestGame
            itemCount={skill.itemCount}
            onComplete={handleSkillComplete}
          />
        );
      
      default:
        return (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-6xl animate-bounce mb-4">🐋</div>
              <p className="text-white text-xl">{skill.name}</p>
            </div>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl animate-bounce">🐋</div>
          <p className="text-white text-xl mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">😕</div>
          <p className="text-white text-xl">{error || 'Something went wrong'}</p>
          <button 
            onClick={() => router.push('/assessment')}
            className="mt-4 px-6 py-3 bg-white text-red-600 rounded-xl font-bold"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // Transition screen between skills
  if (showTransition) {
    const nextSkill = getSkillByOrder(currentSkillOrder + 1);
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-400 to-blue-500 flex items-center justify-center">
        <div className="text-center">
          <div className="text-8xl animate-bounce mb-4">⭐</div>
          <h1 className="text-4xl font-bold text-white mb-2">Great job!</h1>
          {nextSkill && (
            <p className="text-xl text-white/90">
              Next up: {nextSkill.description}
            </p>
          )}
        </div>
      </div>
    );
  }

  const currentSkill = getSkillByOrder(currentSkillOrder);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress header */}
      <header className="bg-white/20 backdrop-blur-sm p-4">
        <div className="max-w-2xl mx-auto">
          {/* Child name */}
          <div className="text-center text-white font-bold mb-3">
            {session.child_name} 🐋
          </div>
          
          {/* Progress dots */}
          <div className="flex justify-center gap-2">
            {ASSESSMENT_SKILLS.map((skill, index) => (
              <div
                key={skill.code}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${
                  index + 1 < currentSkillOrder
                    ? 'bg-green-400 text-white'
                    : index + 1 === currentSkillOrder
                    ? 'bg-yellow-400 text-yellow-900 scale-110'
                    : 'bg-white/40 text-white/60'
                }`}
              >
                {index + 1 < currentSkillOrder ? '✓' : index + 1}
              </div>
            ))}
          </div>

          {/* Current skill name */}
          {currentSkill && (
            <p className="text-center text-white/80 mt-2 text-sm">
              {currentSkill.description}
            </p>
          )}
        </div>
      </header>

      {/* Game area */}
      <main className="flex-1 relative">
        {renderCurrentTest()}
      </main>
    </div>
  );
}
