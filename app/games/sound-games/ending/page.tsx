// app/games/sound-games/ending/page.tsx
// I Spy Ending Sounds Game
// FIXED: Race conditions, stale state, single audio system

'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ENDING_SOUNDS, PHONEME_AUDIO, type SoundWord } from '@/lib/sound-games/sound-games-data';
import { getRandomPhrase, CORRECT_PHRASES, ENCOURAGEMENT_PHRASES } from '@/lib/sound-games/sound-utils';
import { GameAudio } from '@/lib/games/audio-paths';
import { WordImageSimple } from '@/components/sound-games/WordImage';

type GameState = 'intro' | 'playing' | 'feedback' | 'complete';

interface GameRound {
  targetSound: string;
  targetWord: SoundWord;
  options: SoundWord[];
}

export default function ISpyEndingGame() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

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

  const generateRound = useCallback((): GameRound => {
    const soundGroup = ENDING_SOUNDS[Math.floor(Math.random() * ENDING_SOUNDS.length)];
    const targetWord = soundGroup.words[Math.floor(Math.random() * soundGroup.words.length)];
    
    const otherSounds = ENDING_SOUNDS.filter((s) => s.sound !== soundGroup.sound);
    const distractorPool = otherSounds.flatMap((s) => s.words);
    const shuffledDistractors = [...distractorPool].sort(() => Math.random() - 0.5);
    const distractors = shuffledDistractors.slice(0, 3);
    const allOptions = [targetWord, ...distractors].sort(() => Math.random() - 0.5);

    return { targetSound: soundGroup.sound, targetWord, options: allOptions };
  }, []);

  // Play instruction + phoneme sound
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

  // Start game - IMMEDIATELY play audio on user click
  const startGame = async () => {
    clearAllTimeouts();
    GameAudio.stop();

    const firstRound = generateRound();
    
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);
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
            const nextRound = generateRound();
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

  const handleReplay = async () => {
    if (currentRound && !isPlaying) {
      clearAllTimeouts(); // Clear any pending actions when user wants to hear again
      await playTargetSound(currentRound.targetSound, false);
    }
  };

  // Intro Screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl mb-6">🔚</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            I Spy Ending Sounds
          </h1>
          <p className="text-xl text-white/90 mb-8">
            Listen for the <span className="font-bold">LAST</span> sound in each word!
          </p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-8">
            <p className="text-white"><strong>Example:</strong> "ca-/t/" - Cat ends with /t/!</p>
          </div>

          <button onClick={startGame} className="w-full p-4 bg-white text-teal-600 rounded-2xl font-bold text-xl hover:bg-white/90 transition-all" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            Start Playing! 🎮
          </button>

          <Link href="/games/sound-games" className="block mt-4 text-white/70 hover:text-white">
            ← Back to Sound Games
          </Link>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (gameState === 'complete') {
    const percentage = Math.round((score / totalRounds) * 100);
    const emoji = percentage >= 80 ? '🌟' : percentage >= 60 ? '⭐' : '👍';

    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Great Listening!</h1>
          <p className="text-2xl text-white/90 mb-8">Score: <span className="font-bold text-yellow-300">{score}</span>/{totalRounds}</p>

          <div className="space-y-4">
            <button onClick={startGame} className="w-full max-w-sm mx-auto p-4 bg-white text-teal-600 rounded-2xl font-bold text-xl" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
              Play Again! 🔄
            </button>
            <Link href="/games/sound-games" className="block w-full max-w-sm mx-auto p-4 bg-white/20 text-white rounded-2xl font-bold text-xl">
              Back to Sound Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500">
      <header className="p-4 flex items-center justify-between">
        <Link href="/games/sound-games" className="text-white/80 text-2xl">←</Link>
        <div className="bg-white/20 rounded-full px-4 py-2">
          <span className="text-white font-bold">⭐ {score}/{totalRounds}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p className="text-2xl text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            I spy something that <span className="font-bold">ENDS</span> with...
          </p>

          <button 
            onClick={handleReplay} 
            disabled={isPlaying} 
            className={`text-9xl transition-transform ${isPlaying ? 'animate-pulse' : 'hover:scale-110'}`}
          >
            👂
          </button>

          <p className="text-white/70 mt-4">
            {isPlaying ? '🔊 Listening...' : 'Tap to hear again'}
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
                aspect-square rounded-2xl sm:rounded-3xl border-4 transition-all transform overflow-hidden
                shadow-lg hover:shadow-xl
                ${feedback?.correct && option.word === currentRound.targetWord.word
                  ? 'bg-green-400 border-green-300 scale-105 ring-4 ring-green-300/50'
                  : 'bg-white border-white/80 hover:scale-[1.02] hover:border-white'
                }
                ${gameState !== 'playing' || isPlaying ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="w-full h-full p-2 sm:p-3 flex items-center justify-center">
                <WordImageSimple word={option.word} size={140} className="w-full h-full max-w-[140px] max-h-[140px]" />
              </div>
            </button>
          ))}
        </div>

        {feedback && (
          <div className={`mt-6 p-4 rounded-2xl text-center text-xl font-bold ${feedback.correct ? 'bg-green-400 text-green-900' : 'bg-red-400 text-red-900'}`} style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            {feedback.message}
          </div>
        )}

        <div className="mt-8">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${(roundsPlayed / totalRounds) * 100}%` }} />
          </div>
        </div>
      </main>
    </div>
  );
}
