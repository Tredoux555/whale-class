// components/home/index.ts
// Export all Home components for easy importing

// Focus Mode & Work Details
export { default as HomeFocusModeCard } from './HomeFocusModeCard';
export type { HomeFocusWork } from './HomeFocusModeCard';

export { default as HomeWorkDetailModal } from './HomeWorkDetailModal';

// Guides
export { default as HomeQuickGuide } from './HomeQuickGuide';
export type { QuickGuideData } from './HomeQuickGuide';

export { default as HomeFullDetails } from './HomeFullDetails';
export type { PresentationStep, FullGuideData } from './HomeFullDetails';

// Feedback & UX
export { default as HomeFeedbackButton } from './HomeFeedbackButton';
export { default as HomeInstallBanner } from './HomeInstallBanner';
export { default as HomeTutorial } from './HomeTutorial';

// Media
export { default as HomeCameraCapture } from './HomeCameraCapture';
export type {
  CapturedPhoto,
  CapturedVideo,
  CapturedMedia,
} from './HomeCameraCapture';

export { default as HomeMediaGallery } from './HomeMediaGallery';
export type { HomeMediaItem } from './HomeMediaGallery';

export { default as HomeMediaCard } from './HomeMediaCard';

// Child Management
export { default as HomeChildCard } from './HomeChildCard';
export type { ChildStats, HomeChild } from './HomeChildCard';

// Navigation
export { default as HomeNav } from './HomeNav';
