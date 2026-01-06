// app/games/sound-games/blending/page.tsx
// Sound Blending Game
// PURELY AUDITORY - NO LETTERS SHOWN
// Hear "/c/ - /a/ - /t/" → Find the picture of "cat"

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CVC_WORDS,
  type CVCWord,
} from '@/lib/sound-games/sound-games-data';
import {
  soundGameAudio,
  getRandomPhrase,
  CORRECT_PHRASES,
  ENCOURAGEMENT_PHRASES,
} from '@/lib/sound-games/sound-utils';

type GameState = 'intro' | 'playing' | 'feedback' | 'complete';

interface GameRound {
  targetWord: CVCWord;
  options: CVCWord[];
}

export default function SoundBlendingGame() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [blendStep, setBlendStep] = useState<'slow' | 'fast' | 'done'>('slow');

  // Generate a round
  const generateRound = useCallback((): GameRound => {
    // Pick target word
    const targetWord = CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];

    // Get 3 distractor words (different from target)
    const otherWords = CVC_WORDS.filter((w) => w.word !== targetWord.word);
    const shuffled = [...otherWords].sort(() => Math.random() - 0.5);
    const distractors = shuffled.slice(0, 3);

    // Combine and shuffle
    const allOptions = [targetWord, ...distractors].sort(
      () => Math.random() - 0.5
    );

    return {
      targetWord,
      options: allOptions,
    };
  }, []);

  // Play sounds slowly then blend
  const playBlendingSequence = async (word: CVCWord) => {
    setIsPlaying(true);
    setBlendStep('slow');

    // Say "Listen carefully..."
    await soundGameAudio.speakWord('Listen carefully');
    await new Promise((r) => setTimeout(r, 500));

    // Say each sound slowly with pauses
    // For "cat" → "/c/ ... /a/ ... /t/"
    await soundGameAudio.speakSoundsSlowly(word.sounds, 600);

    await new Promise((r) => setTimeout(r, 800));
    setBlendStep('fast');

    // Now blend faster
    await soundGameAudio.speakWord('Now blend them together');
    await new Promise((r) => setTimeout(r, 400));

    // Faster blending
    await soundGameAudio.speakSoundsSlowly(word.sounds, 200);

    await new Promise((r) => setTimeout(r, 500));
    setBlendStep('done');

    // Ask the question
    await soundGameAudio.speakWord('What word is it? Find the picture!');

    setIsPlaying(false);
  };

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);

    const firstRound = generateRound();
    setCurrentRound(firstRound);

    setTimeout(() => {
      playBlendingSequence(firstRound.targetWord);
    }, 500);
  };

  // Handle selection
  const handleOptionSelect = async (selected: CVCWord) => {
    if (gameState !== 'playing' || isPlaying) return;

    const isCorrect = selected.word === currentRound?.targetWord.word;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback({
        correct: true,
        message: getRandomPhrase(CORRECT_PHRASES),
      });

      await soundGameAudio.playCorrect();

      setTimeout(async () => {
        await soundGameAudio.speakWord(
          `Yes! ${selected.sounds.join(' ')} makes ${selected.word}!`
        );
      }, 500);
    } else {
      setFeedback({
        correct: false,
        message: getRandomPhrase(ENCOURAGEMENT_PHRASES),
      });

      await soundGameAudio.playWrong();

      setTimeout(() => {
        setFeedback(null);
        playBlendingSequence(currentRound!.targetWord);
      }, 2000);
      return;
    }

    setGameState('feedback');

    setTimeout(() => {
      const newRoundsPlayed = roundsPlayed + 1;
      setRoundsPlayed(newRoundsPlayed);

      if (newRoundsPlayed >= totalRounds) {
        setGameState('complete');
        soundGameAudio.playCelebration();
      } else {
        setFeedback(null);
        setGameState('playing');
        const nextRound = generateRound();
        setCurrentRound(nextRound);
        setTimeout(() => {
          playBlendingSequence(nextRound.targetWord);
        }, 500);
      }
    }, 2500);
  };

  const handleReplay = () => {
    if (currentRound && !isPlaying) {
      playBlendingSequence(currentRound.targetWord);
    }
  };

  // Intro Screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl mb-6">🔗</div>
          <h1
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Sound Blending
          </h1>
          <p className="text-xl text-white/90 mb-6">
            Listen to the sounds, then blend them together to make a word!
          </p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-8">
            <p className="text-white">
              <strong>Example:</strong>
              <br />
              "/c/ ... /a/ ... /t/" → 🐱 cat!
            </p>
          </div>

          <button
            onClick={startGame}
            className="w-full p-4 bg-white text-indigo-600 rounded-2xl font-bold text-xl"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Start Blending! 🎮
          </button>

          <Link
            href="/games/sound-games"
            className="block mt-4 text-white/70 hover:text-white"
          >
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
      <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Sound Blender!
          </h1>
          <p className="text-2xl text-white/90 mb-8">
            Score: <span className="font-bold text-yellow-300">{score}</span>/
            {totalRounds}
          </p>

          <div className="space-y-4">
            <button
              onClick={startGame}
              className="w-full max-w-sm mx-auto p-4 bg-white text-indigo-600 rounded-2xl font-bold text-xl"
            >
              Play Again! 🔄
            </button>
            <Link
              href="/games/sound-games"
              className="block w-full max-w-sm mx-auto p-4 bg-white/20 text-white rounded-2xl font-bold text-xl"
            >
              Back to Sound Games
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-indigo-500 to-violet-500">
      <header className="p-4 flex items-center justify-between">
        <Link href="/games/sound-games" className="text-white/80 text-2xl">
          ←
        </Link>
        <div className="bg-white/20 rounded-full px-4 py-2">
          <span className="text-white font-bold">
            ⭐ {score}/{totalRounds}
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Blending Animation Area */}
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p
            className="text-xl text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Blend the sounds together!
          </p>

          {/* Visual representation of blending - NO letters, just circles */}
          <div className="flex justify-center gap-4 mb-6">
            {currentRound?.targetWord.sounds.map((_, index) => (
              <div
                key={index}
                className={`
                  w-16 h-16 rounded-full flex items-center justify-center
                  transition-all duration-300
                  ${
                    blendStep === 'slow'
                      ? 'bg-white/30 scale-100'
                      : blendStep === 'fast'
                        ? 'bg-white/50 scale-90'
                        : 'bg-white/70 scale-75'
                  }
                `}
                style={{
                  animationDelay: `${index * 200}ms`,
                }}
              >
                <span className="text-3xl">🔊</span>
              </div>
            ))}
          </div>

          {/* Link symbol shows when blending */}
          {blendStep !== 'slow' && (
            <div className="text-5xl animate-pulse mb-4">🔗</div>
          )}

          {/* Replay button */}
          <button
            onClick={handleReplay}
            disabled={isPlaying}
            className={`
              px-6 py-3 bg-white/30 rounded-full text-white font-bold
              ${isPlaying ? 'animate-pulse' : 'hover:bg-white/40'}
            `}
          >
            {isPlaying ? '🔊 Listening...' : '🔊 Hear Again'}
          </button>
        </div>

        {/* Options */}
        <div className="grid grid-cols-2 gap-4">
          {currentRound?.options.map((option, index) => (
            <button
              key={`${option.word}-${index}`}
              onClick={() => handleOptionSelect(option)}
              disabled={gameState !== 'playing' || isPlaying}
              className={`
                p-6 rounded-3xl border-4 transition-all transform
                ${
                  feedback?.correct &&
                  option.word === currentRound.targetWord.word
                    ? 'bg-green-400 border-green-300 scale-110'
                    : 'bg-white/90 border-white hover:scale-105'
                }
              `}
            >
              <span className="text-7xl block">{option.image}</span>
            </button>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-6 p-4 rounded-2xl text-center text-xl font-bold ${
              feedback.correct
                ? 'bg-green-400 text-green-900'
                : 'bg-red-400 text-red-900'
            }`}
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            {feedback.message}
          </div>
        )}

        {/* Progress */}
        <div className="mt-8">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white transition-all"
              style={{ width: `${(roundsPlayed / totalRounds) * 100}%` }}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
