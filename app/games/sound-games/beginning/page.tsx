// app/games/sound-games/beginning/page.tsx
// I Spy Beginning Sounds Game
// FIXED: Race conditions, stale state, single audio system

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  BEGINNING_SOUNDS,
  getSoundsByPhase,
  getDistractorWords,
  PHONEME_AUDIO,
  type SoundGroup,
  type SoundWord,
} from '@/lib/sound-games/sound-games-data';
import { getRandomPhrase, CORRECT_PHRASES, ENCOURAGEMENT_PHRASES } from '@/lib/sound-games/sound-utils';
import { GameAudio } from '@/lib/games/audio-paths';
import { WordImageSimple } from '@/components/sound-games/WordImage';

type GamePhase = 1 | 2 | 3 | 'vowel' | 'all';
type GameState = 'selecting' | 'playing' | 'feedback' | 'complete';

interface GameRound {
  targetSound: string;
  targetWord: SoundWord;
  options: SoundWord[];
  eslNote?: string;
}

export default function ISpyBeginningGame() {
  const [selectedPhase, setSelectedPhase] = useState<GamePhase | null>(null);
  const [gameState, setGameState] = useState<GameState>('selecting');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [score, setScore] = useState(0);
  const [totalRounds, setTotalRounds] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300);

  // TIMEOUT REFS - Track all timeouts to prevent race conditions
  const wordTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const advanceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear ALL pending timeouts - call before any new action
  const clearAllTimeouts = useCallback(() => {
    if (wordTimeoutRef.current) {
      clearTimeout(wordTimeoutRef.current);
      wordTimeoutRef.current = null;
    }
    if (advanceTimeoutRef.current) {
      clearTimeout(advanceTimeoutRef.current);
      advanceTimeoutRef.current = null;
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimeouts();
      GameAudio.stop();
    };
  }, [clearAllTimeouts]);

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

  // Play the letter sound directly (instruction audio disabled - too long)
  const playTargetSound = useCallback(async (sound: string, includeInstruction: boolean = true) => {
    // Stop all audio first
    GameAudio.stop();
    setIsPlaying(true);
    
    try {
      // Play letter sound directly from letters folder
      await GameAudio.play(`/audio-new/letters/${sound}.mp3`);
    } catch (err) {
      console.error('Error in playTargetSound:', err);
    }
    
    setIsPlaying(false);
  }, []);

  // Start a new game - IMMEDIATELY play audio on user click
  const startGame = async (phase: GamePhase) => {
    clearAllTimeouts();
    GameAudio.stop();
    
    const firstRound = generateRound(phase);
    
    setSelectedPhase(phase);
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);
    setTotalRounds(10);
    setSessionStart(Date.now());
    setTimeRemaining(300);
    setCurrentRound(firstRound);
    setFeedback(null);

    // Play immediately - don't use setTimeout (browser blocks delayed audio)
    await playTargetSound(firstRound.targetSound);
  };

  // Handle option selection - FIXED race conditions
  const handleOptionSelect = async (selected: SoundWord) => {
    if (gameState !== 'playing' || isPlaying) return;

    // CRITICAL: Clear all pending timeouts before ANY new action
    clearAllTimeouts();
    GameAudio.stop();

    const isCorrect = selected.word === currentRound?.targetWord.word;

    if (isCorrect) {
      // Use functional update to ensure we get latest score
      setScore(prev => prev + 1);
      setFeedback({ correct: true, message: getRandomPhrase(CORRECT_PHRASES) });
      
      await GameAudio.playCorrect();
      
      // Word audio disabled - files are broken, will rebuild daily
      // wordTimeoutRef.current = setTimeout(async () => {
      //   await GameAudio.playWord(selected.word, 'pink');
      // }, 500);

      setGameState('feedback');

      // Use functional update to get CURRENT roundsPlayed value
      advanceTimeoutRef.current = setTimeout(() => {
        setRoundsPlayed(prev => {
          const newRoundsPlayed = prev + 1;
          
          if (newRoundsPlayed >= totalRounds) {
            setGameState('complete');
            GameAudio.playCelebration();
          } else {
            setFeedback(null);
            setGameState('playing');
            const nextRound = generateRound(selectedPhase!);
            setCurrentRound(nextRound);
            playTargetSound(nextRound.targetSound);
          }
          
          return newRoundsPlayed;
        });
      }, 2000);

    } else {
      // Wrong answer
      setFeedback({ correct: false, message: getRandomPhrase(ENCOURAGEMENT_PHRASES) });
      await GameAudio.playWrong();

      retryTimeoutRef.current = setTimeout(async () => {
        setFeedback(null);
        await playTargetSound(currentRound!.targetSound, false);
      }, 1500);
    }
  };

  // Replay just the sound (no instruction)
  const handleReplay = async () => {
    if (currentRound && !isPlaying) {
      clearAllTimeouts(); // Clear any pending actions when user wants to hear again
      await playTargetSound(currentRound.targetSound, false);
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
        clearAllTimeouts();
        setGameState('complete');
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, sessionStart, clearAllTimeouts]);

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
          <Link href="/games/sound-games" className="flex items-center gap-2 text-white/80 hover:text-white">
            <span className="text-2xl">←</span>
            <span>Back to Sound Games</span>
          </Link>
        </header>

        <main className="max-w-2xl mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4">👂</div>
            <h1 className="text-4xl font-bold text-white mb-2" >
              I Spy Beginning Sounds
            </h1>
            <p className="text-white/90 text-lg">Choose your level:</p>
          </div>

          <div className="space-y-4">
            <button onClick={() => startGame(1)} className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🟢</span>
                <div>
                  <h2 className="text-2xl font-bold text-white" >Phase 1: Easy Sounds</h2>
                  <p className="text-white/80">s, m, f, n, p, t, c, h</p>
                </div>
              </div>
            </button>

            <button onClick={() => startGame(2)} className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🟡</span>
                <div>
                  <h2 className="text-2xl font-bold text-white" >Phase 2: Medium Sounds</h2>
                  <p className="text-white/80">b, d, g, j, w, y</p>
                </div>
              </div>
            </button>

            <button onClick={() => startGame(3)} className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🔴</span>
                <div>
                  <h2 className="text-2xl font-bold text-white" >Phase 3: Hard Sounds (ESL)</h2>
                  <p className="text-white/80">v, th, r, l, z, sh, ch</p>
                </div>
              </div>
            </button>

            <button onClick={() => startGame('vowel')} className="w-full p-6 bg-white/20 backdrop-blur-sm rounded-2xl border-4 border-white/40 hover:bg-white/30 transition-all text-left">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🔵</span>
                <div>
                  <h2 className="text-2xl font-bold text-white" >Vowel Sounds</h2>
                  <p className="text-white/80">a, e, i, o, u (short sounds)</p>
                </div>
              </div>
            </button>

            <button onClick={() => startGame('all')} className="w-full p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl border-4 border-white/40 hover:opacity-90 transition-all text-left">
              <div className="flex items-center gap-4">
                <span className="text-5xl">🌈</span>
                <div>
                  <h2 className="text-2xl font-bold text-white" >All Sounds Mixed</h2>
                  <p className="text-white/80">Practice everything together!</p>
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

    if (percentage >= 90) { message = 'Amazing listener!'; emoji = '🌟'; }
    else if (percentage >= 70) { message = 'Great job!'; emoji = '⭐'; }
    else if (percentage >= 50) { message = 'Good practice!'; emoji = '👍'; }
    else { message = 'Keep practicing!'; emoji = '💪'; }

    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1 className="text-5xl font-bold text-white mb-4" >{message}</h1>
          <p className="text-3xl text-white/90 mb-8">
            You got <span className="font-bold text-yellow-300">{score}</span> out of <span className="font-bold">{totalRounds}</span> correct!
          </p>

          <div className="space-y-4">
            <button onClick={() => startGame(selectedPhase!)} className="w-full max-w-sm mx-auto p-4 bg-white text-orange-600 rounded-2xl font-bold text-xl hover:bg-white/90 transition-all" >
              Play Again! 🔄
            </button>
            <Link href="/games/sound-games" className="block w-full max-w-sm mx-auto p-4 bg-white/20 text-white rounded-2xl font-bold text-xl hover:bg-white/30 transition-all" >
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
      <header className="p-4 flex items-center justify-between">
        <Link href="/games/sound-games" className="text-white/80 hover:text-white text-2xl">←</Link>
        <div className="flex items-center gap-6">
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">⭐ {score}/{totalRounds}</span>
          </div>
          <div className="bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
            <span className="text-white font-bold">⏱️ {formatTime(timeRemaining)}</span>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {currentRound?.eslNote && (
          <div className="bg-yellow-400 text-yellow-900 rounded-xl p-3 mb-4 text-center">
            <span className="font-bold">💡 ESL Tip:</span> {currentRound.eslNote}
          </div>
        )}

        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p className="text-2xl text-white mb-4" >
            I spy something that begins with...
          </p>

          <button
            onClick={handleReplay}
            disabled={isPlaying}
            className={`text-9xl transition-transform ${isPlaying ? 'animate-pulse scale-110' : 'hover:scale-110'}`}
          >
            👂
          </button>

          <p className="text-white/70 mt-4">
            {isPlaying ? '🔊 Listening...' : 'Tap the ear to hear again'}
          </p>
          
          {/* Debug info */}
          {currentRound && (
            <p className="text-white/50 text-xs mt-2">
              Sound: /{currentRound.targetSound}/
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          {currentRound?.options.map((option, index) => (
            <button
              key={`${option.word}-${index}`}
              onClick={() => handleOptionSelect(option)}
              disabled={gameState !== 'playing' || isPlaying}
              className={`
                aspect-square rounded-2xl sm:rounded-3xl border-[5px] transition-all transform overflow-hidden
                shadow-lg hover:shadow-xl
                ${feedback?.correct && option.word === currentRound.targetWord.word
                  ? 'bg-green-400 border-green-300 scale-105 ring-4 ring-green-300/50'
                  : 'bg-white border-white hover:scale-[1.02]'
                }
                ${gameState !== 'playing' || isPlaying ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <WordImageSimple word={option.word} size={200} className="!w-full !h-full !rounded-none" />
            </button>
          ))}
        </div>

        {feedback && (
          <div
            className={`mt-6 p-4 rounded-2xl text-center text-xl font-bold ${feedback.correct ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`}
            
          >
            {feedback.message}
          </div>
        )}

        <div className="mt-8">
          <div className="flex justify-between text-white/70 text-sm mb-2">
            <span>Progress</span>
            <span>{roundsPlayed}/{totalRounds}</span>
          </div>
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all duration-500" style={{ width: `${(roundsPlayed / totalRounds) * 100}%` }} />
          </div>
        </div>
      </main>
    </div>
  );
}
