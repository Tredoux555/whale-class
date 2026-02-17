'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getOnboardingConfig, OnboardingStep, FeatureModule } from '@/lib/montree/onboarding/configs';

interface OnboardingState {
  isOnboardingEnabled: boolean;
  userRole: string | null;
  currentModule: string | null;
  currentStepIndex: number;
  completedSteps: Set<string>; // Set of 'module:step_key'

  // Actions
  initialize: (role: string, enabled: boolean) => void;
  loadProgressFromDB: (progress: Array<{ feature_module: string; step_key: string; skipped: boolean }>) => void;
  startModule: (moduleId: string) => void;
  advanceStep: () => Promise<void>;
  skipTour: () => Promise<void>;
  dismissTour: () => void;
  getModuleProgress: (moduleId: string) => { completed: boolean; skipped: boolean; stepsCompleted: number; totalSteps: number };
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      isOnboardingEnabled: true,
      userRole: null,
      currentModule: null,
      currentStepIndex: 0,
      completedSteps: new Set(),

      initialize: (role, enabled) => {
        set({ userRole: role, isOnboardingEnabled: enabled });
      },

      loadProgressFromDB: (progress) => {
        const steps = new Set<string>();
        for (const p of progress) {
          steps.add(`${p.feature_module}:${p.step_key}`);
        }
        set({ completedSteps: steps });
      },

      startModule: (moduleId) => {
        const { completedSteps, userRole } = get();
        if (!userRole) return;

        // Don't start if already completed or skipped
        if (completedSteps.has(`${moduleId}:__module_skipped__`)) return;

        const config = getOnboardingConfig(userRole);
        const mod = config.modules.find(m => m.id === moduleId);
        if (!mod) return;

        // Find first incomplete step
        const firstIncomplete = mod.steps.findIndex(
          s => !completedSteps.has(`${moduleId}:${s.key}`)
        );

        if (firstIncomplete === -1) return; // All steps already done

        set({ currentModule: moduleId, currentStepIndex: firstIncomplete });
      },

      advanceStep: async () => {
        const { currentModule, currentStepIndex, userRole, completedSteps } = get();
        if (!currentModule || !userRole) return;

        const config = getOnboardingConfig(userRole);
        const mod = config.modules.find(m => m.id === currentModule);
        if (!mod) return;

        const currentStep = mod.steps[currentStepIndex];
        if (!currentStep) return;

        // Mark step complete in DB (cookie auto-sent by browser)
        try {
          await fetch('/api/montree/onboarding/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              feature_module: currentModule,
              step_key: currentStep.key,
            }),
          });
        } catch {
          // Non-blocking — local state still updates
        }

        // Update local state
        const newCompleted = new Set(completedSteps);
        newCompleted.add(`${currentModule}:${currentStep.key}`);

        if (currentStepIndex + 1 >= mod.steps.length) {
          // Module complete
          set({ currentModule: null, currentStepIndex: 0, completedSteps: newCompleted });
        } else {
          set({ currentStepIndex: currentStepIndex + 1, completedSteps: newCompleted });
        }
      },

      skipTour: async () => {
        const { currentModule } = get();
        if (!currentModule) return;

        try {
          await fetch('/api/montree/onboarding/skip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ feature_module: currentModule }),
          });
        } catch {
          // Non-blocking
        }

        // Mark as skipped locally
        const newCompleted = new Set(get().completedSteps);
        newCompleted.add(`${currentModule}:__module_skipped__`);

        set({ currentModule: null, currentStepIndex: 0, completedSteps: newCompleted });
      },

      dismissTour: () => {
        // Dismiss without marking skipped — tour will reappear on next visit
        set({ currentModule: null, currentStepIndex: 0 });
      },

      getModuleProgress: (moduleId) => {
        const { completedSteps, userRole } = get();
        if (!userRole) return { completed: false, skipped: false, stepsCompleted: 0, totalSteps: 0 };

        // Check if explicitly skipped
        const skipped = completedSteps.has(`${moduleId}:__module_skipped__`);
        if (skipped) return { completed: true, skipped: true, stepsCompleted: 0, totalSteps: 0 };

        const config = getOnboardingConfig(userRole);
        const mod = config.modules.find(m => m.id === moduleId);
        if (!mod) return { completed: false, skipped: false, stepsCompleted: 0, totalSteps: 0 };

        const stepsCompleted = mod.steps.filter(s =>
          completedSteps.has(`${moduleId}:${s.key}`)
        ).length;

        return {
          completed: stepsCompleted === mod.steps.length,
          skipped: false,
          stepsCompleted,
          totalSteps: mod.steps.length,
        };
      },
    }),
    {
      name: 'montree-onboarding',
      partialize: (state) => ({
        completedSteps: Array.from(state.completedSteps),
        userRole: state.userRole,
        isOnboardingEnabled: state.isOnboardingEnabled,
      }),
      merge: (persistedState: unknown, currentState) => {
        const persisted = persistedState as { completedSteps?: string[]; userRole?: string; isOnboardingEnabled?: boolean } | null;
        return {
          ...currentState,
          completedSteps: new Set(persisted?.completedSteps || []),
          userRole: persisted?.userRole || null,
          isOnboardingEnabled: persisted?.isOnboardingEnabled ?? true,
        };
      },
    }
  )
);

// Convenience hook with computed currentStep
export function useOnboarding() {
  const store = useOnboardingStore();

  const currentStep: {
    step: OnboardingStep;
    index: number;
    totalSteps: number;
    module: FeatureModule;
  } | null = (() => {
    if (!store.currentModule || !store.userRole) return null;

    const config = getOnboardingConfig(store.userRole);
    const mod = config.modules.find(m => m.id === store.currentModule);
    if (!mod) return null;

    const step = mod.steps[store.currentStepIndex];
    if (!step) return null;

    return {
      step,
      index: store.currentStepIndex,
      totalSteps: mod.steps.length,
      module: mod,
    };
  })();

  return {
    ...store,
    currentStep,
  };
}
