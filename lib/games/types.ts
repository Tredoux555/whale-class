// lib/games/types.ts
// Type definitions for the English learning games

export type GamePhase = 
  | 'letters'
  | 'pink-series'
  | 'blue-series'
  | 'green-series'
  | 'sight-words'
  | 'sentences';

/**
 * A game's id. These are the SHIPPED route slugs under app/games/ — the same
 * strings GAMES in lib/games/game-config.ts uses and the same ones
 * /api/montree/parent/dashboard builds its game_url from.
 *
 * The first, third, fourth and eighth entries used to read 'letter-sound',
 * 'word-building', 'letter-trace' and 'sentence-build' — singular forms that
 * match no route and no config entry, so four of the eight GAMES rows failed to
 * type-check against their own id field. Corrected to what actually ships.
 */
export type GameType =
  | 'letter-sounds'
  | 'letter-tracer'
  | 'word-builder'
  | 'picture-match'
  | 'missing-letter'
  | 'phonics-blend'
  | 'sight-flash'
  | 'sentence-builder';

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


