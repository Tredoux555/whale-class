// app/games/sound-games/beginning/page.tsx
// I Spy Beginning Sounds Game
// PURELY AUDITORY - NO LETTERS SHOWN
// "I spy something that begins with /m/!"

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  BEGINNING_SOUNDS,
  getSoundsByPhase,
  getDistractorWords,
  PHONEME_AUDIO,
  type SoundGroup,
  type SoundWord,
} from '@/lib/sound-games/sound-games-data';
import {
  soundGameAudio,
  getRandomPhrase,
  CORRECT_PHRASES,
  ENCOURAGEMENT_PHRASES,
} from '@/lib/sound-games/sound-utils';

// Game state types
type GamePhase = 1 | 2 | 3 | 'vowel' | 'all';
type GameState = 'selecting' | 'playing' | 'feedback' | 'complete';

interface GameRound {
  targetSound: string;
  targetWord: SoundWord;
  options: SoundWord[];
  eslNote?: string;
}

export default function ISpyBeginningGame() {
  // Phase selection
  const [selectedPhase, setSelectedPhase] = useState<GamePhase | null>(null);

  // Game state
  const [gameState, setGameState] = useState<GameState>('selecting');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [score, setScore] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Session management (5-minute sessions)
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes in seconds

  // Generate a new round
  const generateRound = useCallback((phase: GamePhase): GameRound => {
    // Get sounds for this phase
    let availableSounds: SoundGroup[];
    if (phase === 'all') {
      availableSounds = BEGINNING_SOUNDS;
    } else {
      availableSounds = getSoundsByPhase(phase);
    }

    // Pick a random sound
    const randomSoundGroup =
      availableSounds[Math.floor(Math.random() * availableSounds.length)];

    // Pick a target word from this sound
    const targetWord =
      randomSoundGroup.words[
        Math.floor(Math.random() * randomSoundGroup.words.length)
      ];

    // Get 3 distractor words (from OTHER sounds)
    const distractors = getDistractorWords(randomSoundGroup.sound, 3);

    // Combine and shuffle
    const allOptions = [targetWord, ...distractors].sort(
      () => Math.random() - 0.5
    );

    return {
      targetSound: randomSoundGroup.sound,
      targetWord,
      options: allOptions,
      eslNote: randomSoundGroup.eslNote,
    };
  }, []);

  // Start a new game
  const startGame = (phase: GamePhase) => {
    setSelectedPhase(phase);
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);
    setTotalRounds(10); // 10 rounds per session
    setSessionStart(Date.now());
    setTimeRemaining(300);

    const firstRound = generateRound(phase);
    setCurrentRound(firstRound);

    // Play the I Spy prompt after a short delay
    setTimeout(() => {
      playISpyPrompt(firstRound.targetSound);
    }, 500);
  };

  // Play the I Spy prompt
  const playISpyPrompt = async (sound: string) => {
    setIsPlaying(true);

    // Try to play recorded phoneme first
    const phonemePath = PHONEME_AUDIO[sound];
    if (phonemePath) {
      // Speak: "I spy something that begins with..."
      await soundGameAudio.speakWord('I spy something that begins with');
      await new Promise((r) => setTimeout(r, 300));
      await soundGameAudio.playPhoneme(phonemePath);
    } else {
      // Fallback to speech synthesis
      await soundGameAudio.speakWord(
        `I spy something that begins with ${sound}`
      );
    }

    setIsPlaying(false);
  };

  // Handle option selection
  const handleOptionSelect = async (selected: SoundWord) => {
    if (gameState !== 'playing' || isPlaying) return;

    const isCorrect = selected.word === currentRound?.targetWord.word;

    if (isCorrect) {
      // Correct answer!
      setScore((prev) => prev + 1);
      setFeedback({
        correct: true,
        message: getRandomPhrase(CORRECT_PHRASES),
      });

      await soundGameAudio.playCorrect();

      // Speak confirmation: "Yes! [word] begins with /sound/!"
      setTimeout(async () => {
        await soundGameAudio.speakWord(
          `Yes! ${selected.word} begins with ${currentRound?.targetSound}`
        );
      }, 500);
    } else {
      // Wrong answer
      setFeedback({
        correct: false,
        message: getRandomPhrase(ENCOURAGEMENT_PHRASES),
      });

      await soundGameAudio.playWrong();

      // Let them try again - don't advance
      setTimeout(() => {
        setFeedback(null);
        playISpyPrompt(currentRound!.targetSound);
      }, 2000);
      return;
    }

    setGameState('feedback');

    // Move to next round after delay
    setTimeout(() => {
      const newRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(newRoundsPlayed);

      if (newRoundsPlayed >= totalRounds) {
        // Game complete!
        setGameState('complete');
        soundGameAudio.playCelebration();
      } else {
        // Next round
        setFeedback(null);
        setGameState('playing');
        const nextRound = generateRound(selectedPhase!);
        setCurrentRound(nextRound);
        setTimeout(() => {
          playISpyPrompt(nextRound.targetSound);
        }, 500);
      }
    }, 2500);
  };

  // Replay the sound
  const handleReplay = () => {
    if (currentRound && !isPlaying) {
      playISpyPrompt(currentRound.targetSound);
    }
  };

  // Timer effect
  useEffect(() => {
    if (gameState !== 'playing' || !sessionStart) return;

    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStart) / 1000);
      const remaining = Math.max(0, 300 - elapsed);
      setTimeRemaining(remaining);

      if (remaining === 0) {
        setGameState('complete');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, sessionStart]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Phase Selection Screen
  if (gameState === 'selecting') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
        <header className="p-4">
          <Link
            href="/games/sound-games"
            className="flex items-center gap-2 text-white/80 hover:text-white"
          >
            <span className="text-2xl">←</span>
            <span>Back to Sound Games</span>
          </Link>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">👂</div>
            <h1
              className="text-4xl font-bold text-white mb-2"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              I Spy Beginning Sounds
            </h1>
            <p className="text-white/90 text-lg">Choose your level:</p>
          </div>

          <div className="space-y-4">
            {/* Phase 1: Easy */}
            <button
              onClick={() => startGame(1)}
              className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🟢</span>
                <div>
                  <h2
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  >
                    Phase 1: Easy Sounds
                  </h2>
                  <p className="text-white/80">
                    s, m, f, n, p, t, c, h - sounds that exist in Mandarin
                  </p>
                </div>
              </div>
            </button>

            {/* Phase 2: Medium */}
            <button
              onClick={() => startGame(2)}
              className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🟡</span>
                <div>
                  <h2
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  >
                    Phase 2: Medium Sounds
                  </h2>
                  <p className="text-white/80">b, d, g, j, w, y</p>
                </div>
              </div>
            </button>

            {/* Phase 3: Hard (ESL) */}
            <button
              onClick={() => startGame(3)}
              className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🔴</span>
                <div>
                  <h2
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  >
                    Phase 3: Hard Sounds (ESL)
                  </h2>
                  <p className="text-white/80">
                    v, th, r, l, z, sh, ch - challenging for Chinese speakers
                  </p>
                </div>
              </div>
            </button>

            {/* Vowels */}
            <button
              onClick={() => startGame('vowel')}
              className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🔵</span>
                <div>
                  <h2
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  >
                    Vowel Sounds
                  </h2>
                  <p className="text-white/80">a, e, i, o, u (short sounds)</p>
                </div>
              </div>
            </button>

            {/* All Sounds */}
            <button
              onClick={() => startGame('all')}
              className="w-full p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl border-4 border-white/40 hover:opacity-90 transition-all text-left"
            >
              <div className="flex items-center gap-4">
                <span className="text-5xl">🌈</span>
                <div>
                  <h2
                    className="text-2xl font-bold text-white"
                    style={{ fontFamily: 'Comic Sans MS, cursive' }}
                  >
                    All Sounds Mixed
                  </h2>
                  <p className="text-white/80">
                    Practice everything together!
                  </p>
                </div>
              </div>
            </button>
          </div>
        </main>
      </div>
    );
  }

  // Game Complete Screen
  if (gameState === 'complete') {
    const percentage = Math.round((score / totalRounds) * 100);
    let message = '';
    let emoji = '';

    if (percentage >= 90) {
      message = 'Amazing listener!';
      emoji = '🌟';
    } else if (percentage >= 70) {
      message = 'Great job!';
      emoji = '⭐';
    } else if (percentage >= 50) {
      message = 'Good practice!';
      emoji = '👍';
    } else {
      message = 'Keep practicing!';
      emoji = '💪';
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1
            className="text-5xl font-bold text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            {message}
          </h1>
          <p className="text-3xl text-white/90 mb-8">
            You got{' '}
            <span className="font-bold text-yellow-300">{score}</span> out of{' '}
            <span className="font-bold">{totalRounds}</span> correct!
          </p>

          <div className="space-y-4">
            <button
              onClick={() => startGame(selectedPhase!)}
              className="w-full max-w-sm mx-auto p-4 bg-white text-orange-600 rounded-2xl font-bold text-xl hover:bg-white/90 transition-all"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              Play Again! 🔄
            </button>
            <Link
              href="/games/sound-games"
              className="block w-full max-w-sm mx-auto p-4 bg-white/20 text-white rounded-2xl font-bold text-xl hover:bg-white/30 transition-all"
              style={{ fontFamily: 'Comic Sans MS, cursive' }}
            >
              Back to Sound Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Main Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-500">
      {/* Header */}
      <header className="p-4 flex items-center justify-between">
        <Link
          href="/games/sound-games"
          className="text-white/80 hover:text-white text-2xl"
        >
          ←
        </Link>

        {/* Score & Timer */}
        <div className="flex items-center gap-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">
              ⭐ {score}/{totalRounds}
            </span>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">
              ⏱️ {formatTime(timeRemaining)}
            </span>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* ESL Tip (if applicable) */}
        {currentRound?.eslNote && (
          <div className="bg-yellow-400 text-yellow-900 rounded-xl p-3 mb-4 text-center">
            <span className="font-bold">💡 ESL Tip:</span>{' '}
            {currentRound.eslNote}
          </div>
        )}

        {/* I Spy Prompt Area */}
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p
            className="text-2xl text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            I spy something that begins with...
          </p>

          {/* Big ear icon - tap to replay */}
          <button
            onClick={handleReplay}
            disabled={isPlaying}
            className={`
              text-9xl transition-transform
              ${isPlaying ? 'animate-pulse scale-110' : 'hover:scale-110'}
            `}
          >
            👂
          </button>

          <p className="text-white/70 mt-4">
            {isPlaying ? 'Listening...' : 'Tap the ear to hear again'}
          </p>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-2 gap-4">
          {currentRound?.options.map((option, index) => (
            <button
              key={`${option.word}-${index}`}
              onClick={() => handleOptionSelect(option)}
              disabled={gameState !== 'playing' || isPlaying}
              className={`
                p-6 rounded-3xl border-4 transition-all transform
                ${
                  feedback?.correct && option.word === currentRound.targetWord.word
                    ? 'bg-green-400 border-green-300 scale-110'
                    : 'bg-white/90 border-white hover:scale-105 hover:bg-white'
                }
                ${gameState !== 'playing' || isPlaying ? 'opacity-70' : ''}
              `}
            >
              <span className="text-7xl block mb-2">{option.image}</span>
              {/* NO WORD TEXT SHOWN - purely visual! */}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`
              mt-6 p-4 rounded-2xl text-center text-xl font-bold
              ${feedback.correct ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}
            `}
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            {feedback.message}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-8">
          <div className="flex justify-between text-white/70 text-sm mb-2">
            <span>Progress</span>
            <span>
              {roundsPlayed}/{totalRounds}
            </span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all duration-500"
              style={{ width: `${(roundsPlayed / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
