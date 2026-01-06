// app/games/sound-games/middle/page.tsx
// Middle Sound Match Game
// PURELY AUDITORY - Uses colors for vowels, NO LETTERS
// "c-AAA-t has the /a/ sound in the middle!"

'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import {
  CVC_WORDS,
  VOWEL_COLORS,
  PHONEME_AUDIO,
  type CVCWord,
} from '@/lib/sound-games/sound-games-data';
import {
  soundGameAudio,
  getRandomPhrase,
  CORRECT_PHRASES,
  ENCOURAGEMENT_PHRASES,
} from '@/lib/sound-games/sound-utils';

type GameState = 'intro' | 'playing' | 'feedback' | 'complete';

const VOWELS = ['a', 'e', 'i', 'o', 'u'] as const;

// Key image for each vowel (visual cue without letters)
const VOWEL_IMAGES: Record<string, string> = {
  a: '🍎', // Apple
  e: '🥚', // Egg
  i: '🏠', // Igloo
  o: '🐙', // Octopus
  u: '☂️', // Umbrella
};

export default function MiddleSoundGame() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentWord, setCurrentWord] = useState<CVCWord | null>(null);
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{
    correct: boolean;
    message: string;
    correctVowel?: string;
  } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  // Get random CVC word
  const getRandomWord = useCallback((): CVCWord => {
    return CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];
  }, []);

  // Play the word with stretched middle sound
  const playWordStretched = async (word: CVCWord) => {
    setIsPlaying(true);

    // Say "Listen to the middle sound..."
    await soundGameAudio.speakWord('Listen to the middle sound');
    await new Promise((r) => setTimeout(r, 400));

    // Say the word with stretched middle: "c - AAAAA - t"
    await soundGameAudio.speakWordStretched(word.word, word.middleSound);

    await new Promise((r) => setTimeout(r, 300));

    // Repeat just the middle sound
    await soundGameAudio.speakWord(`What sound is in the middle?`);

    setIsPlaying(false);
  };

  // Start game
  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);

    const firstWord = getRandomWord();
    setCurrentWord(firstWord);

    setTimeout(() => {
      playWordStretched(firstWord);
    }, 500);
  };

  // Handle vowel selection
  const handleVowelSelect = async (selectedVowel: string) => {
    if (gameState !== 'playing' || isPlaying || !currentWord) return;

    const isCorrect = selectedVowel === currentWord.middleSound;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback({
        correct: true,
        message: getRandomPhrase(CORRECT_PHRASES),
        correctVowel: selectedVowel,
      });

      await soundGameAudio.playCorrect();

      setTimeout(async () => {
        await soundGameAudio.speakWord(
          `Yes! ${currentWord.word} has ${selectedVowel} in the middle!`
        );
      }, 500);
    } else {
      setFeedback({
        correct: false,
        message: getRandomPhrase(ENCOURAGEMENT_PHRASES),
        correctVowel: currentWord.middleSound,
      });

      await soundGameAudio.playWrong();

      // Show correct answer then try again
      setTimeout(() => {
        setFeedback(null);
        playWordStretched(currentWord);
      }, 2500);
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
        const nextWord = getRandomWord();
        setCurrentWord(nextWord);
        setTimeout(() => {
          playWordStretched(nextWord);
        }, 500);
      }
    }, 2500);
  };

  const handleReplay = () => {
    if (currentWord && !isPlaying) {
      playWordStretched(currentWord);
    }
  };

  // Intro Screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl mb-6">🎯</div>
          <h1
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Middle Sound Match
          </h1>
          <p className="text-xl text-white/90 mb-6">
            Listen for the sound in the <span className="font-bold">MIDDLE</span>{' '}
            of each word!
          </p>

          {/* Vowel Color Legend */}
          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-8">
            <p className="text-white font-bold mb-3">The 5 middle sounds:</p>
            <div className="flex justify-center gap-3">
              {VOWELS.map((v) => (
                <div key={v} className="text-center">
                  <div
                    className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-1"
                    style={{ backgroundColor: VOWEL_COLORS[v].color }}
                  >
                    {VOWEL_IMAGES[v]}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={startGame}
            className="w-full p-4 bg-white text-purple-600 rounded-2xl font-bold text-xl"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Start Playing! 🎮
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
      <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1
            className="text-4xl font-bold text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            Middle Sound Master!
          </h1>
          <p className="text-2xl text-white/90 mb-8">
            Score: <span className="font-bold text-yellow-300">{score}</span>/
            {totalRounds}
          </p>

          <div className="space-y-4">
            <button
              onClick={startGame}
              className="w-full max-w-sm mx-auto p-4 bg-white text-purple-600 rounded-2xl font-bold text-xl"
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
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
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
        {/* Word Display - Image only, no letters! */}
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p
            className="text-xl text-white mb-4"
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            What sound is in the MIDDLE?
          </p>

          {/* Big picture of the word */}
          <div className="text-9xl mb-4">{currentWord?.image}</div>

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

        {/* Vowel Choices - Colors and images only! */}
        <div className="grid grid-cols-5 gap-3">
          {VOWELS.map((vowel) => (
            <button
              key={vowel}
              onClick={() => handleVowelSelect(vowel)}
              disabled={gameState !== 'playing' || isPlaying}
              className={`
                p-4 rounded-2xl border-4 transition-all transform
                ${
                  feedback?.correct && vowel === currentWord?.middleSound
                    ? 'scale-110 ring-4 ring-white'
                    : feedback && !feedback.correct && vowel === feedback.correctVowel
                      ? 'ring-4 ring-yellow-300'
                      : 'hover:scale-105'
                }
              `}
              style={{
                backgroundColor: VOWEL_COLORS[vowel].color,
                borderColor: 'rgba(255,255,255,0.5)',
              }}
            >
              <span className="text-4xl block">{VOWEL_IMAGES[vowel]}</span>
            </button>
          ))}
        </div>

        {/* Vowel Legend */}
        <div className="mt-4 flex justify-center gap-2 text-sm text-white/70">
          {VOWELS.map((v) => (
            <span key={v} className="flex items-center gap-1">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: VOWEL_COLORS[v].color }}
              />
              {VOWEL_IMAGES[v]}
            </span>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div
            className={`mt-6 p-4 rounded-2xl text-center text-xl font-bold ${
              feedback.correct
                ? 'bg-green-400 text-green-900'
                : 'bg-yellow-400 text-yellow-900'
            }`}
            style={{ fontFamily: 'Comic Sans MS, cursive' }}
          >
            {feedback.message}
            {!feedback.correct && feedback.correctVowel && (
              <span className="block mt-2">
                The middle sound is {VOWEL_IMAGES[feedback.correctVowel]}!
              </span>
            )}
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
