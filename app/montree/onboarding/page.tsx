// /montree/onboarding/page.tsx
// Teacher first-login onboarding flow
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const ONBOARDING_STEPS = [
  {
    icon: '👋',
    title: 'Welcome to Montree!',
    description: 'Your Montessori classroom companion. Let\'s take a quick tour.',
  },
  {
    icon: '👶',
    title: 'Track Student Progress',
    description: 'Tap works to cycle through: Presented → Practicing → Mastered. Notes are saved automatically.',
  },
  {
    icon: '📊',
    title: 'Weekly Reports',
    description: 'Generate beautiful parent reports with one tap. Parents can view progress on their phones.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Invite Parents',
    description: 'Give parents a code to connect. They\'ll see their child\'s progress in real-time.',
  },
  {
    icon: '🎉',
    title: 'You\'re Ready!',
    description: 'Start by selecting a student and adding their first work. Happy teaching!',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [session, setSession] = useState<any>(null);


  useEffect(() => {
    const stored = localStorage.getItem('montree_session');
    if (!stored) {
      router.push('/montree/login');
      return;
    }
    try {
      const parsed = JSON.parse(stored);
      setSession(parsed);
    } catch {
      router.push('/montree/login');
    }
  }, [router]);

  const handleNext = () => {
    if (step < ONBOARDING_STEPS.length - 1) {
      setStep(step + 1);
    } else {
      // Mark onboarding complete
      const sessionData = localStorage.getItem('montree_session');
      if (sessionData) {
        const parsed = JSON.parse(sessionData);
        parsed.onboarded = true;
        localStorage.setItem('montree_session', JSON.stringify(parsed));
      }
      router.push('/montree/dashboard');
    }
  };

  const handleSkip = () => {
    const sessionData = localStorage.getItem('montree_session');
    if (sessionData) {
      const parsed = JSON.parse(sessionData);
      parsed.onboarded = true;
      localStorage.setItem('montree_session', JSON.stringify(parsed));
    }
    router.push('/montree/dashboard');
  };

  const currentStep = ONBOARDING_STEPS[step];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md text-center">
        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {ONBOARDING_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === step ? 'w-6 bg-emerald-500' : i < step ? 'bg-emerald-300' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="mb-8">
          <div className="text-6xl mb-6 animate-bounce">{currentStep.icon}</div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">{currentStep.title}</h1>
          <p className="text-gray-600 leading-relaxed">{currentStep.description}</p>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={handleNext}
            className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
          >
            {step === ONBOARDING_STEPS.length - 1 ? 'Get Started →' : 'Next →'}
          </button>
          
          {step < ONBOARDING_STEPS.length - 1 && (
            <button
              onClick={handleSkip}
              className="w-full py-2 text-gray-500 hover:text-gray-700"
            >
              Skip tour
            </button>
          )}
        </div>

        {/* Teacher name */}
        {session?.teacher?.name && (
          <p className="text-sm text-gray-400 mt-6">
            Logged in as {session.teacher.name}
          </p>
        )}
      </div>
    </div>
  );
}
