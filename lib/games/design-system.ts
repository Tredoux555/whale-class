// lib/games/design-system.ts
// Shared design tokens and utilities for all games

export const GAME_COLORS = {
  // Primary game colors
  primary: '#6366f1',      // Indigo
  secondary: '#8b5cf6',    // Purple
  accent: '#f59e0b',       // Amber
  
  // Feedback colors
  correct: '#22c55e',      // Green
  wrong: '#ef4444',        // Red
  hint: '#f97316',         // Orange
  
  // Backgrounds
  bgGradient1: '#818cf8',  // Light indigo
  bgGradient2: '#c084fc',  // Light purple
  bgGradient3: '#f472b6',  // Light pink
  
  // Difficulty levels
  easy: '#22c55e',
  medium: '#3b82f6',
  hard: '#8b5cf6',
  expert: '#ec4899',
};

export const GAME_FONTS = {
  display: "'Comic Sans MS', 'Comic Sans', cursive",
  body: "system-ui, -apple-system, sans-serif",
};

// Touch-friendly sizing (minimum 44px for touch targets)
export const TOUCH_TARGETS = {
  small: 'min-h-[44px] min-w-[44px]',
  medium: 'min-h-[56px] min-w-[56px]',
  large: 'min-h-[72px] min-w-[72px]',
};

// Standard game card styles
export const CARD_STYLES = {
  option: `
    p-4 rounded-2xl font-bold text-xl
    transition-all duration-200
    active:scale-95 hover:scale-105
    shadow-lg hover:shadow-xl
    ${TOUCH_TARGETS.medium}
  `,
  selected: 'ring-4 ring-yellow-400 ring-offset-2',
  correct: 'bg-green-500 text-white animate-pulse',
  wrong: 'bg-red-500 text-white animate-shake',
  disabled: 'opacity-50 pointer-events-none',
};

// Celebration phrases for variety
export const CELEBRATIONS = {
  correct: [
    'Great job! 🎉',
    'Awesome! ⭐',
    'Perfect! 🌟',
    'You got it! 👏',
    'Well done! 🏆',
    'Fantastic! 💪',
    'Super! 🚀',
    'Amazing! ✨',
  ],
  levelComplete: [
    'Level Complete! 🎊',
    'Moving on! 🚀',
    'You did it! 🏆',
  ],
  allComplete: [
    'Champion! 👑',
    'Superstar! 🌟',
    'Reading Master! 📚',
  ],
};

// Get random celebration phrase
export function getRandomCelebration(type: keyof typeof CELEBRATIONS): string {
  const phrases = CELEBRATIONS[type];
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// CSS for shake animation (add to global styles or inject)
export const SHAKE_KEYFRAMES = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
  20%, 40%, 60%, 80% { transform: translateX(5px); }
}
.animate-shake {
  animation: shake 0.5s ease-in-out;
}
`;

// CSS for pop animation
export const POP_KEYFRAMES = `
@keyframes pop {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}
.animate-pop {
  animation: pop 0.3s ease-out;
}
`;

// CSS for float animation (for hints)
export const FLOAT_KEYFRAMES = `
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-float {
  animation: float 2s ease-in-out infinite;
}
`;

// All game animations combined
export const GAME_ANIMATIONS = `
${SHAKE_KEYFRAMES}
${POP_KEYFRAMES}
${FLOAT_KEYFRAMES}
`;

// Difficulty badge component props
export function getDifficultyBadge(level: 'easy' | 'medium' | 'hard' | 'expert') {
  const config = {
    easy: { emoji: '🟢', text: 'Easy', color: GAME_COLORS.easy },
    medium: { emoji: '🔵', text: 'Medium', color: GAME_COLORS.medium },
    hard: { emoji: '🟣', text: 'Hard', color: GAME_COLORS.hard },
    expert: { emoji: '🔴', text: 'Expert', color: GAME_COLORS.expert },
  };
  return config[level];
}

// Progress calculation
export function calculateStars(score: number, total: number): number {
  const percentage = (score / total) * 100;
  if (percentage >= 90) return 3;
  if (percentage >= 70) return 2;
  if (percentage >= 50) return 1;
  return 0;
}
