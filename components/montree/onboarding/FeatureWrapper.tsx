'use client';

import { useEffect, useState, useRef } from 'react';
import { useOnboarding } from '@/hooks/useOnboarding';
import OnboardingOverlay from './OnboardingOverlay';

interface FeatureWrapperProps {
  featureModule: string; // 'student_management', 'week_view', etc.
  children: React.ReactNode;
  autoStart?: boolean; // Start tour immediately on mount
}

export default function FeatureWrapper({
  featureModule,
  children,
  autoStart = false,
}: FeatureWrapperProps) {
  const {
    isOnboardingEnabled,
    userRole,
    getModuleProgress,
    startModule,
    currentModule,
    currentStep,
    advanceStep,
    skipTour,
    dismissTour,
  } = useOnboarding();

  // Prevent re-triggering after dismiss in same session
  const dismissedRef = useRef(false);

  useEffect(() => {
    // Wait for store to be initialized with a role (async layout fetch)
    if (!userRole || !isOnboardingEnabled || !autoStart || dismissedRef.current) return;

    const progress = getModuleProgress(featureModule);

    // Start tour if module not completed/skipped
    if (!progress.completed && !progress.skipped) {
      startModule(featureModule);
    }
  }, [featureModule, userRole, isOnboardingEnabled, autoStart, getModuleProgress, startModule]);

  const isActive = currentModule === featureModule && currentStep !== null;

  const handleDismiss = () => {
    dismissedRef.current = true;
    dismissTour();
  };

  const handleSkip = async () => {
    dismissedRef.current = true;
    await skipTour();
  };

  if (!isActive || !currentStep) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <OnboardingOverlay
        step={currentStep.step}
        currentStepNumber={currentStep.index + 1}
        totalSteps={currentStep.totalSteps}
        onNext={advanceStep}
        onSkip={handleSkip}
        onDismiss={handleDismiss}
        isActive={isActive}
      />
    </>
  );
}
