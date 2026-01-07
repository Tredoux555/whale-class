// app/games/sound-games/segmenting/page.tsx
// Sound Segmenting Game - ElevenLabs audio only
// BUG FIX: Added proper wrong answer handling

'use client';

import React, { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { CVC_WORDS, type CVCWord } from '@/lib/sound-games/sound-games-data';
import { soundGameAudio, getRandomPhrase, CORRECT_PHRASES, ENCOURAGEMENT_PHRASES } from '@/lib/sound-games/sound-utils';

type GameState = 'intro' | 'playing' | 'feedback' | 'complete';

export default function SoundSegmentingGame() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentWord, setCurrentWord] = useState<CVCWord | null>(null);
  const [tappedSounds, setTappedSounds] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);

  const getRandomWord = useCallback((): CVCWord => {
    return CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];
  }, []);

  const playWord = async (word: CVCWord) => {
    setIsPlaying(true);
    await soundGameAudio.playWord(word.word);
    setIsPlaying(false);
  };

  const startGame = () => {
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);

    const firstWord = getRandomWord();
    setCurrentWord(firstWord);
    setTappedSounds([]);
    setShowHint(false);

    setTimeout(() => {
      playWord(firstWord);
    }, 500);
  };

  // Handle circle tap - play the sound for that position
  const handleCircleTap = async (index: number) => {
    if (gameState !== 'playing' || isPlaying || !currentWord) return;
    if (tappedSounds.includes(index)) return;

    const newTapped = [...tappedSounds, index];
    setTappedSounds(newTapped);

    // Play the sound for this tap position
    setIsPlaying(true);
    const soundIndex = newTapped.length - 1;
    if (soundIndex < currentWord.sounds.length) {
      await soundGameAudio.playLetter(currentWord.sounds[soundIndex]);
    } else {
      // Extra tap beyond the word length
      await soundGameAudio.playWrong();
    }
    setIsPlaying(false);
  };

  // Check the answer when user clicks Check
  const checkAnswer = async (tappedCount: number) => {
    if (!currentWord) return;

    const correctCount = currentWord.sounds.length;
    const isCorrect = tappedCount === correctCount;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback({ correct: true, message: getRandomPhrase(CORRECT_PHRASES) });
      await soundGameAudio.playCorrect();

      // Play the segmented sounds
      setTimeout(async () => {
        await soundGameAudio.playSoundsSlowly(currentWord.sounds, 400);
      }, 500);

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
          setTappedSounds([]);
          setShowHint(false);
          const nextWord = getRandomWord();
          setCurrentWord(nextWord);
          setTimeout(() => {
            playWord(nextWord);
          }, 500);
        }
      }, 2500);
    } else {
      // WRONG ANSWER - BUG FIX: Now properly handles wrong answers
      setFeedback({ 
        correct: false, 
        message: `${getRandomPhrase(ENCOURAGEMENT_PHRASES)} This word has ${correctCount} sounds.`
      });
      await soundGameAudio.playWrong();

      // Show the correct segmentation
      setTimeout(async () => {
        await soundGameAudio.playSoundsSlowly(currentWord.sounds, 400);
      }, 1000);

      // Reset and let them try again
      setTimeout(() => {
        setFeedback(null);
        setTappedSounds([]);
        playWord(currentWord);
      }, 3000);
    }
  };

  const handleSubmit = () => {
    if (currentWord && tappedSounds.length > 0) {
      checkAnswer(tappedSounds.length);
    }
  };

  const handleReset = () => {
    setTappedSounds([]);
    setFeedback(null);
  };

  // Show hint after 10 seconds
  useEffect(() => {
    if (gameState !== 'playing') return;

    const hintTimer = setTimeout(() => {
      setShowHint(true);
    }, 10000);

    return () => clearTimeout(hintTimer);
  }, [gameState, tappedSounds]);

  const handleReplay = () => {
    if (currentWord && !isPlaying) {
      playWord(currentWord);
    }
  };

  // Intro Screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl mb-6">✂️</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Sound Segmenting</h1>
          <p className="text-xl text-white/90 mb-6">Break words into their sounds! Tap a circle for each sound you hear.</p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-8">
            <p className="text-white mb-3"><strong>Example:</strong> 🐱 cat</p>
            <div className="flex justify-center gap-3">
              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center">👆</div>
              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center">👆</div>
              <div className="w-12 h-12 bg-white/50 rounded-full flex items-center justify-center">👆</div>
            </div>
            <p className="text-white/80 text-sm mt-2">3 taps for 3 sounds: /c/ /a/ /t/</p>
          </div>

          <button onClick={startGame} className="w-full p-4 bg-white text-rose-600 rounded-2xl font-bold text-xl" style={{ fontFamily: 'Comic Sans MS, cursive' }}>
            Start Segmenting! 🎮
          </button>

          <Link href="/games/sound-games" className="block mt-4 text-white/70 hover:text-white">← Back to Sound Games</Link>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (gameState === 'complete') {
    const percentage = Math.round((score / totalRounds) * 100);
    const emoji = percentage >= 80 ? '🌟' : percentage >= 60 ? '⭐' : '👍';

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1 className="text-4xl font-bold text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Sound Segmenter!</h1>
          <p className="text-2xl text-white/90 mb-8">Score: <span className="font-bold text-yellow-300">{score}</span>/{totalRounds}</p>

          <div className="space-y-4">
            <button onClick={startGame} className="w-full max-w-sm mx-auto p-4 bg-white text-rose-600 rounded-2xl font-bold text-xl">Play Again! 🔄</button>
            <Link href="/games/sound-games" className="block w-full max-w-sm mx-auto p-4 bg-white/20 text-white rounded-2xl font-bold text-xl">Back to Sound Games</Link>
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-red-500">
      <header className="p-4 flex items-center justify-between">
        <Link href="/games/sound-games" className="text-white/80 text-2xl">←</Link>
        <div className="bg-white/20 rounded-full px-4 py-2">
          <span className="text-white font-bold">⭐ {score}/{totalRounds}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p className="text-xl text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>How many sounds do you hear?</p>

          <div className="text-9xl mb-4">{currentWord?.image}</div>

          <button onClick={handleReplay} disabled={isPlaying} className={`px-6 py-3 bg-white/30 rounded-full text-white font-bold ${isPlaying ? 'animate-pulse' : 'hover:bg-white/40'}`}>
            {isPlaying ? '🔊 Listening...' : '🔊 Hear Word'}
          </button>

          {showHint && currentWord && (
            <p className="mt-4 text-white/70 text-sm">💡 Hint: This word has {currentWord.sounds.length} sounds</p>
          )}
        </div>

        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-6 mb-6">
          <p className="text-center text-white mb-4" style={{ fontFamily: 'Comic Sans MS, cursive' }}>Tap a circle for each sound:</p>

          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3, 4].map((index) => (
              <button
                key={index}
                onClick={() => handleCircleTap(index)}
                disabled={tappedSounds.includes(index) || isPlaying}
                className={`
                  w-16 h-16 rounded-full border-4 transition-all transform flex items-center justify-center text-2xl
                  ${tappedSounds.includes(index)
                    ? 'bg-green-400 border-green-300 scale-90'
                    : 'bg-white/30 border-white/50 hover:scale-110 hover:bg-white/50'
                  }
                `}
              >
                {tappedSounds.includes(index) ? '✓' : '○'}
              </button>
            ))}
          </div>

          <p className="text-center text-white text-2xl font-bold">
            {tappedSounds.length} sound{tappedSounds.length !== 1 ? 's' : ''} tapped
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={handleReset}
            disabled={tappedSounds.length === 0 || isPlaying}
            className="flex-1 p-4 bg-white/20 text-white rounded-2xl font-bold text-lg disabled:opacity-50"
          >
            Reset ↺
          </button>
          <button
            onClick={handleSubmit}
            disabled={tappedSounds.length === 0 || isPlaying}
            className="flex-1 p-4 bg-white text-rose-600 rounded-2xl font-bold text-lg disabled:opacity-50"
          >
            Check! ✓
          </button>
        </div>

        {feedback && (
          <div className={`mt-6 p-4 rounded-2xl text-center text-xl font-bold ${feedback.correct ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'}`} style={{ fontFamily: 'Comic Sans MS, cursive' }}>
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
