// lib/games/types.ts
// Type definitions for the English learning games

export type GamePhase = 
  | 'letters'
  | 'pink-series'
  | 'blue-series'
  | 'green-series'
  | 'sight-words'
  | 'sentences';

export type GameType =
  | 'letter-sound'
  | 'letter-trace'
  | 'word-building'
  | 'picture-match'
  | 'missing-letter'
  | 'phonics-blend'
  | 'sight-flash'
  | 'sentence-build';

export interface GameConfig {
  id: GameType;
  name: string;
  description: string;
  icon: string;
  phases: GamePhase[];
  minAge: number;
  color: string;
}

export interface GameQuestion {
  id: string;
  type: GameType;
  prompt: string;
  answer: string;
  options?: string[];
  imageUrl?: string;
  audioUrl?: string;
  hint?: string;
}

export interface GameProgress {
  odId: string;
  lessonId: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent: number;
  completedAt: string;
}

export interface GameSession {
  gameType: GameType;
  phase: GamePhase;
  level: string;
  questions: GameQuestion[];
  currentIndex: number;
  score: number;
  streak: number;
  startedAt: Date;
}

// Animations
export type CelebrationAnimation = 'stars' | 'confetti' | 'bounce' | 'sparkle';

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
  difficulty: 'easy' | 'medium' | 'hard';
  showHints: boolean;
}

