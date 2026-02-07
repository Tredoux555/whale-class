// Types and constants for the onboarding flow

export type Work = {
  id: string;
  name: string;
  sequence: number;
  isCustom?: boolean;
};

export type Student = {
  id: string;
  name: string;
  age: number;
  progress: { [areaId: string]: { workId: string | null; workName?: string } };
};

// Curriculum areas (standard Montessori - Language includes English/Phonics)
export const CURRICULUM_AREAS = [
  { id: 'practical_life', name: 'Practical Life', icon: '🧹', color: '#22c55e' },
  { id: 'sensorial', name: 'Sensorial', icon: '👁️', color: '#f97316' },
  { id: 'mathematics', name: 'Math', icon: '🔢', color: '#3b82f6' },
  { id: 'language', name: 'Language', icon: '📚', color: '#ec4899' },
  { id: 'cultural', name: 'Cultural', icon: '🌍', color: '#8b5cf6' },
];

// Age options
export const AGE_OPTIONS = [
  { value: 2.5, label: '2½' },
  { value: 3, label: '3' },
  { value: 3.5, label: '3½' },
  { value: 4, label: '4' },
  { value: 4.5, label: '4½' },
  { value: 5, label: '5' },
  { value: 5.5, label: '5½' },
  { value: 6, label: '6' },
];
