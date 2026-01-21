// app/games/sound-safari/page.tsx
// Sound Safari - Digital I-Spy with Safari Theme
// Phase 2 polished game with progress tracking (no framer-motion dependency)

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  BEGINNING_SOUNDS,
  getSoundsByPhase,
  getDistractorWords,
  type SoundGroup,
  type SoundWord,
} from '@/lib/sound-games/sound-games-data';
import { GameAudio } from '@/lib/games/audio-paths';

type GameMode = 'beginning' | 'ending' | 'middle';
type GamePhase = 1 | 2 | 3 | 'vowel' | 'all';
type GameState = 'menu' | 'mode-select' | 'phase-select' | 'playing' | 'complete';

interface GameRound {
  targetSound: string;
  targetWord: SoundWord;
  options: SoundWord[];
  eslNote?: string;
}

interface GameStats {
  correct: number;
  incorrect: number;
  streak: number;
  bestStreak: number;
  startTime: number;
}

// Safari animal decorations
const SAFARI_ANIMALS = ['🦁', '🦒', '🐘', '🦓', '🦛', '🐆'];

export default function SoundSafariGame() {
  const [gameMode, setGameMode] = useState<GameMode>('beginning');
  const [selectedPhase, setSelectedPhase] = useState<GamePhase | null>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [stats, setStats] = useState<GameStats>({
    correct: 0,
    incorrect: 0,
    streak: 0,
    bestStreak: 0,
    startTime: 0,
  });
  const [roundNumber, setRoundNumber] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; word: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [shakeWrong, setShakeWrong] = useState<string | null>(null);

  // Refs for cleanup
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
      GameAudio.stop();
    };
  }, []);

  // Generate a new round
  const generateRound = useCallback((phase: GamePhase): GameRound => {
    let availableSounds: SoundGroup[];
    if (phase === 'all') {
      availableSounds = BEGINNING_SOUNDS;
    } else {
      availableSounds = getSoundsByPhase(phase);
    }

    const randomSoundGroup = availableSounds[Math.floor(Math.random() * availableSounds.length)];
    const targetWord = randomSoundGroup.words[Math.floor(Math.random() * randomSoundGroup.words.length)];
    const distractors = getDistractorWords(randomSoundGroup.sound, 3);
    const allOptions = [targetWord, ...distractors].sort(() => Math.random() - 0.5);

    return {
      targetSound: randomSoundGroup.sound,
      targetWord,
      options: allOptions,
      eslNote: randomSoundGroup.eslNote,
    };
  }, []);

  // Play the target sound
  const playTargetSound = useCallback(async (sound: string) => {
    GameAudio.stop();
    setIsPlaying(true);
    
    try {
      await GameAudio.play(`/audio-new/letters/${sound}.mp3`);
    } catch (err) {
      console.error('Error playing sound:', err);
    }
    
    setIsPlaying(false);
  }, []);

  // Start the game
  const startGame = async (phase: GamePhase) => {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    GameAudio.stop();

    const firstRound = generateRound(phase);
    
    setSelectedPhase(phase);
    setGameState('playing');
    setRoundNumber(1);
    setStats({
      correct: 0,
      incorrect: 0,
      streak: 0,
      bestStreak: 0,
      startTime: Date.now(),
    });
    setCurrentRound(firstRound);
    setFeedback(null);
    setShowHint(false);
    setShakeWrong(null);

    // Play the sound
    await playTargetSound(firstRound.targetSound);
  };

  // Handle option selection
  const handleOptionSelect = async (selected: SoundWord) => {
    if (gameState !== 'playing' || isPlaying || feedback) return;

    GameAudio.stop();
    const isCorrect = selected.word === currentRound?.targetWord.word;

    if (isCorrect) {
      // Correct answer
      setStats(prev => ({
        ...prev,
        correct: prev.correct + 1,
        streak: prev.streak + 1,
        bestStreak: Math.max(prev.bestStreak, prev.streak + 1),
      }));
      setFeedback({ correct: true, word: selected.word });
      await GameAudio.playCorrect();

      feedbackTimeoutRef.current = setTimeout(() => {
        if (roundNumber >= totalRounds) {
          setGameState('complete');
          saveProgress();
          GameAudio.playCelebration();
        } else {
          setRoundNumber(prev => prev + 1);
          setFeedback(null);
          setShowHint(false);
          const nextRound = generateRound(selectedPhase!);
          setCurrentRound(nextRound);
          playTargetSound(nextRound.targetSound);
        }
      }, 1500);

    } else {
      // Wrong answer
      setStats(prev => ({
        ...prev,
        incorrect: prev.incorrect + 1,
        streak: 0,
      }));
      setFeedback({ correct: false, word: selected.word });
      setShakeWrong(selected.word);
      await GameAudio.playWrong();

      setTimeout(() => setShakeWrong(null), 500);

      feedbackTimeoutRef.current = setTimeout(() => {
        setFeedback(null);
        setShowHint(true);
        playTargetSound(currentRound!.targetSound);
      }, 1200);
    }
  };

  // Save progress to API
  const saveProgress = async () => {
    try {
      const timeSpent = Math.floor((Date.now() - stats.startTime) / 1000);
      const studentId = localStorage.getItem('current_student_id');
      if (!studentId) return;

      await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          student_id: studentId,
          game_id: 'sound-safari',
          time_spent_seconds: timeSpent,
          items_attempted: stats.correct + stats.incorrect,
          items_correct: stats.correct,
          completed: true,
          session_data: {
            mode: gameMode,
            phase: selectedPhase,
            best_streak: stats.bestStreak,
          },
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  };

  // Replay sound
  const handleReplay = async () => {
    if (currentRound && !isPlaying) {
      await playTargetSound(currentRound.targetSound);
    }
  };

  // ============================================
  // RENDER: Main Menu
  // ============================================
  if (gameState === 'menu') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 via-green-500 to-yellow-400 overflow-hidden relative">
        {/* Background animals */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
          {SAFARI_ANIMALS.map((animal, i) => (
            <div
              key={i}
              className="absolute text-6xl animate-float"
              style={{
                left: `${10 + i * 15}%`,
                top: `${20 + (i % 3) * 25}%`,
                animationDelay: `${i * 0.5}s`,
              }}
            >
              {animal}
            </div>
          ))}
        </div>

        <header className="p-4 relative z-10">
          <Link href="/games" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
            <span className="text-2xl">←</span>
            <span className="font-medium">Back to Games</span>
          </Link>
        </header>

        <main className="relative z-10 max-w-lg mx-auto px-4 py-8 text-center">
          <div className="animate-bounce-slow">
            <div className="text-8xl mb-4">🦁</div>
          </div>
          <h1 className="text-5xl font-bold text-white drop-shadow-lg mb-2">
            Sound Safari
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Find the animals by their sounds!
          </p>

          <button
            onClick={() => setGameState('mode-select')}
            className="w-full max-w-xs mx-auto p-6 bg-white rounded-3xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all active:scale-95"
          >
            <span className="text-4xl block mb-2">🎮</span>
            <span className="text-2xl font-bold text-green-700">Start Adventure!</span>
          </button>

          <div className="mt-8 flex justify-center gap-4">
            {['🦒', '🐘', '🦓', '🦛'].map((animal, i) => (
              <span
                key={i}
                className="text-4xl animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              >
                {animal}
              </span>
            ))}
          </div>
        </main>

        <style jsx>{`
          @keyframes float {
            0%, 100% { transform: translateY(0) rotate(0deg); }
            50% { transform: translateY(-20px) rotate(5deg); }
          }
          .animate-float {
            animation: float 4s ease-in-out infinite;
          }
          .animate-bounce-slow {
            animation: bounce 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  // ============================================
  // RENDER: Mode Selection
  // ============================================
  if (gameState === 'mode-select') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 via-green-500 to-yellow-400">
        <header className="p-4">
          <button onClick={() => setGameState('menu')} className="flex items-center gap-2 text-white/80 hover:text-white">
            <span className="text-2xl">←</span>
            <span>Back</span>
          </button>
        </header>

        <main className="max-w-lg mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">👂</div>
            <h1 className="text-3xl font-bold text-white mb-2">Choose Your Hunt</h1>
            <p className="text-white/90">What sounds will you find?</p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => { setGameMode('beginning'); setGameState('phase-select'); }}
              className="w-full p-6 bg-white/95 rounded-2xl shadow-lg text-left hover:translate-x-2 transition-transform active:scale-98"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🔤</span>
                <div>
                  <h2 className="text-xl font-bold text-green-800">Beginning Sounds</h2>
                  <p className="text-green-600">Find words that START with a sound</p>
                </div>
              </div>
            </button>

            <button
              onClick={() => { setGameMode('ending'); setGameState('phase-select'); }}
              className="w-full p-6 bg-white/95 rounded-2xl shadow-lg text-left hover:translate-x-2 transition-transform active:scale-98"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🔚</span>
                <div>
                  <h2 className="text-xl font-bold text-green-800">Ending Sounds</h2>
                  <p className="text-green-600">Find words that END with a sound</p>
                </div>
              </div>
            </button>

            <button
              disabled
              className="w-full p-6 bg-white/60 rounded-2xl shadow-lg text-left opacity-60 cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🎯</span>
                <div>
                  <h2 className="text-xl font-bold text-gray-600">Middle Sounds</h2>
                  <p className="text-gray-500">Coming Soon! 🚧</p>
                </div>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER: Phase Selection
  // ============================================
  if (gameState === 'phase-select') {
    const phases = [
      { id: 1 as const, color: 'bg-emerald-400 border-emerald-300', icon: '🟢', name: 'Easy Safari', sounds: 's, m, f, n, p, t, c, h' },
      { id: 2 as const, color: 'bg-amber-400 border-amber-300', icon: '🟡', name: 'Medium Safari', sounds: 'b, d, g, j, w, y' },
      { id: 3 as const, color: 'bg-red-400 border-red-300', icon: '🔴', name: 'Hard Safari (ESL)', sounds: 'v, th, r, l, z, sh, ch' },
      { id: 'vowel' as const, color: 'bg-blue-400 border-blue-300', icon: '🔵', name: 'Vowel Safari', sounds: 'a, e, i, o, u' },
      { id: 'all' as const, color: 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-300', icon: '🌈', name: 'Ultimate Safari!', sounds: 'All sounds mixed' },
    ];

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 via-green-500 to-yellow-400">
        <header className="p-4">
          <button onClick={() => setGameState('mode-select')} className="flex items-center gap-2 text-white/80 hover:text-white">
            <span className="text-2xl">←</span>
            <span>Back</span>
          </button>
        </header>

        <main className="max-w-lg mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-bold text-white mb-1">Choose Difficulty</h1>
            <p className="text-white/90 text-sm">
              {gameMode === 'beginning' ? 'Beginning' : 'Ending'} Sounds
            </p>
          </div>

          <div className="space-y-3">
            {phases.map((phase) => (
              <button
                key={phase.id}
                onClick={() => startGame(phase.id)}
                className={`w-full p-4 ${phase.color} rounded-2xl shadow-lg text-left border-4 hover:scale-[1.02] active:scale-[0.98] transition-transform`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{phase.icon}</span>
                  <div className="text-white">
                    <h2 className="text-lg font-bold">{phase.name}</h2>
                    <p className="text-white/80 text-sm">{phase.sounds}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </main>
      </div>
    );
  }

  // ============================================
  // RENDER: Game Complete
  // ============================================
  if (gameState === 'complete') {
    const accuracy = stats.correct + stats.incorrect > 0
      ? Math.round((stats.correct / (stats.correct + stats.incorrect)) * 100)
      : 0;
    
    let badge = '🥉';
    let message = 'Good try!';
    if (accuracy >= 90) { badge = '🏆'; message = 'Safari Champion!'; }
    else if (accuracy >= 80) { badge = '🥇'; message = 'Amazing Explorer!'; }
    else if (accuracy >= 70) { badge = '🥈'; message = 'Great Hunter!'; }

    return (
      <div className="min-h-screen bg-gradient-to-b from-green-600 via-green-500 to-yellow-400 flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="text-9xl mb-4 animate-bounce">{badge}</div>
          
          <h1 className="text-4xl font-bold text-white mb-2">{message}</h1>
          
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 mb-6">
            <div className="grid grid-cols-2 gap-4 text-white">
              <div>
                <div className="text-3xl font-bold">{stats.correct}</div>
                <div className="text-sm opacity-80">Correct</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{accuracy}%</div>
                <div className="text-sm opacity-80">Accuracy</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{stats.bestStreak}</div>
                <div className="text-sm opacity-80">Best Streak</div>
              </div>
              <div>
                <div className="text-3xl font-bold">{Math.floor((Date.now() - stats.startTime) / 1000)}s</div>
                <div className="text-sm opacity-80">Time</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(selectedPhase!)}
              className="w-full p-4 bg-white text-green-700 rounded-2xl font-bold text-xl shadow-lg hover:scale-105 active:scale-95 transition-transform"
            >
              Play Again! 🔄
            </button>
            
            <Link 
              href="/games" 
              className="block w-full p-4 bg-white/20 text-white rounded-2xl font-bold text-xl hover:bg-white/30 transition-colors"
            >
              Back to Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Main Game
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-600 via-green-500 to-yellow-400">
      {/* Header */}
      <header className="p-3 flex items-center justify-between">
        <Link href="/games" className="text-white/80 hover:text-white text-2xl">←</Link>
        
        <div className="flex items-center gap-3">
          {/* Streak indicator */}
          {stats.streak >= 3 && (
            <div className="bg-orange-400 text-white px-3 py-1 rounded-full font-bold text-sm animate-pulse">
              🔥 {stats.streak}
            </div>
          )}
          
          {/* Score */}
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">⭐ {stats.correct}/{totalRounds}</span>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-4">
        {/* ESL Tip */}
        {currentRound?.eslNote && (
          <div className="bg-yellow-300 text-yellow-900 rounded-xl p-3 mb-4 text-center text-sm animate-fadeIn">
            💡 <strong>ESL Tip:</strong> {currentRound.eslNote}
          </div>
        )}

        {/* Sound prompt */}
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 mb-6 text-center">
          <p className="text-xl text-white mb-4">
            Find something that {gameMode === 'beginning' ? 'STARTS' : 'ENDS'} with...
          </p>

          <button
            onClick={handleReplay}
            disabled={isPlaying}
            className="relative hover:scale-110 active:scale-95 transition-transform"
          >
            <span className={`text-8xl block ${isPlaying ? 'animate-pulse' : ''}`}>
              {isPlaying ? '🔊' : '👂'}
            </span>
            {showHint && (
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold animate-fadeIn">
                /{currentRound?.targetSound}/
              </span>
            )}
          </button>

          <p className="text-white/60 mt-3 text-sm">
            {isPlaying ? '🔊 Listening...' : 'Tap to hear again'}
          </p>
        </div>

        {/* Options grid */}
        <div className="grid grid-cols-2 gap-3">
          {currentRound?.options.map((option, index) => {
            const isCorrectAnswer = option.word === currentRound.targetWord.word;
            const isSelectedWrong = feedback && !feedback.correct && feedback.word === option.word;
            const isSelectedCorrect = feedback?.correct && isCorrectAnswer;
            const shouldShake = shakeWrong === option.word;

            return (
              <button
                key={`${option.word}-${roundNumber}-${index}`}
                onClick={() => handleOptionSelect(option)}
                disabled={!!feedback || isPlaying}
                className={`
                  aspect-square rounded-2xl border-4 transition-all overflow-hidden
                  flex items-center justify-center text-7xl
                  ${isSelectedCorrect ? 'bg-green-400 border-green-300 ring-4 ring-green-300 scale-105' : ''}
                  ${isSelectedWrong ? 'bg-red-300 border-red-400' : ''}
                  ${!feedback && !isSelectedCorrect && !isSelectedWrong ? 'bg-white border-white hover:border-green-300 hover:shadow-xl hover:scale-105' : 'bg-white border-white'}
                  ${feedback || isPlaying ? 'cursor-not-allowed' : 'cursor-pointer'}
                  ${shouldShake ? 'animate-shake' : ''}
                  active:scale-95
                `}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {option.image}
              </button>
            );
          })}
        </div>

        {/* Feedback toast */}
        {feedback && (
          <div
            className={`mt-6 p-4 rounded-2xl text-center text-xl font-bold animate-fadeIn ${
              feedback.correct 
                ? 'bg-green-400 text-green-900' 
                : 'bg-red-400 text-white'
            }`}
          >
            {feedback.correct ? '🎉 Great job!' : '🤔 Try again!'}
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-6">
          <div className="flex justify-between text-white/70 text-sm mb-2">
            <span>Round {roundNumber} of {totalRounds}</span>
            <span>{Math.round((roundNumber / totalRounds) * 100)}%</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(roundNumber / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </main>

      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
