// lib/games/game-config.ts
// Configuration for all game types

import { GameConfig, GamePhase } from './types';

export const GAMES: GameConfig[] = [
  {
    id: 'letter-sound',
    name: 'Letter Sounds',
    description: 'Hear a sound, find the letter!',
    icon: '🔊',
    phases: ['letters'],
    minAge: 2,
    color: '#ef4444', // red
  },
  {
    id: 'letter-trace',
    name: 'Letter Tracing',
    description: 'Trace letters with your finger!',
    icon: '✏️',
    phases: ['letters'],
    minAge: 2,
    color: '#f97316', // orange
  },
  {
    id: 'word-building',
    name: 'Word Builder',
    description: 'Drag letters to build words!',
    icon: '🔤',
    phases: ['pink-series', 'blue-series', 'green-series'],
    minAge: 3,
    color: '#ec4899', // pink
  },
  {
    id: 'picture-match',
    name: 'Picture Match',
    description: 'Match pictures to words!',
    icon: '🖼️',
    phases: ['pink-series', 'blue-series', 'green-series'],
    minAge: 3,
    color: '#8b5cf6', // purple
  },
  {
    id: 'missing-letter',
    name: 'Missing Letter',
    description: 'Find the missing letter!',
    icon: '❓',
    phases: ['pink-series', 'blue-series'],
    minAge: 4,
    color: '#3b82f6', // blue
  },
  {
    id: 'phonics-blend',
    name: 'Sound Blending',
    description: 'Blend sounds together!',
    icon: '🎵',
    phases: ['pink-series', 'blue-series', 'green-series'],
    minAge: 4,
    color: '#22c55e', // green
  },
  {
    id: 'sight-flash',
    name: 'Sight Words',
    description: 'Learn sight words fast!',
    icon: '⚡',
    phases: ['sight-words'],
    minAge: 4,
    color: '#eab308', // yellow
  },
  {
    id: 'sentence-build',
    name: 'Sentence Builder',
    description: 'Build sentences with words!',
    icon: '📝',
    phases: ['sentences'],
    minAge: 5,
    color: '#14b8a6', // teal
  },
];

export const PHASE_INFO: Record<GamePhase, { name: string; icon: string; color: string; order: number }> = {
  'letters': { name: 'Letters', icon: '🔤', color: '#ef4444', order: 1 },
  'pink-series': { name: 'Pink Series', icon: '🩷', color: '#ec4899', order: 2 },
  'blue-series': { name: 'Blue Series', icon: '💙', color: '#3b82f6', order: 3 },
  'green-series': { name: 'Green Series', icon: '💚', color: '#22c55e', order: 4 },
  'sight-words': { name: 'Sight Words', icon: '👁️', color: '#8b5cf6', order: 5 },
  'sentences': { name: 'Sentences', icon: '📖', color: '#f97316', order: 6 },
};

export function getGamesForPhase(phase: GamePhase): GameConfig[] {
  return GAMES.filter(game => game.phases.includes(phase));
}

export function getGameById(id: string): GameConfig | undefined {
  return GAMES.find(game => game.id === id);
}


