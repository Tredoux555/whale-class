// app/games/sound-games/middle/page.tsx
// Middle Sound Match Game - Hear word, tap the middle letter
// Child hears full word, identifies the middle vowel sound

'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { CVC_WORDS, type CVCWord } from '@/lib/sound-games/sound-games-data';
import { soundGameAudio, getRandomPhrase, CORRECT_PHRASES, ENCOURAGEMENT_PHRASES } from '@/lib/sound-games/sound-utils';

type GameState = 'intro' | 'playing' | 'feedback' | 'complete';

const VOWELS = ['a', 'e', 'i', 'o', 'u'];
const CONSONANTS = ['b', 'c', 'd', 'f', 'g', 'h', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'w'];

interface GameRound {
  word: CVCWord;
  options: string[]; // 4 letters: correct vowel + 3 distractors
}

export default function MiddleSoundGame() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentRound, setCurrentRound] = useState<GameRound | null>(null);
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string; correctLetter?: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [usedWords, setUsedWords] = useState<Set<string>>(new Set());
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Generate distractor letters
  const getDistractors = useCallback((correctVowel: string): string[] => {
    const shuffledConsonants = [...CONSONANTS].sort(() => Math.random() - 0.5);
    return shuffledConsonants.slice(0, 3);
  }, []);

  const getNextRound = useCallback((): GameRound => {
    // Try to get a word we haven't used
    let availableWords = CVC_WORDS.filter(w => !usedWords.has(w.word));
    if (availableWords.length === 0) {
      // Reset if we've used them all
      setUsedWords(new Set());
      availableWords = CVC_WORDS;
    }
    
    const randomWord = availableWords[Math.floor(Math.random() * availableWords.length)];
    const distractors = getDistractors(randomWord.middleSound);
    const options = [randomWord.middleSound, ...distractors].sort(() => Math.random() - 0.5);
    
    return { word: randomWord, options };
  }, [usedWords, getDistractors]);

  // Play full word audio
  const playWord = async (word: string): Promise<void> => {
    setIsPlaying(true);
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      
      const audio = new Audio(`/audio-new/words/${word}.mp3`);
      audioRef.current = audio;
      
      await new Promise<void>((resolve) => {
        audio.onended = () => resolve();
        audio.onerror = () => {
          console.warn('Audio error for word:', word);
          resolve();
        };
        audio.play().catch(() => resolve());
      });
    } catch (e) {
      console.warn('Audio exception:', e);
    }
    setIsPlaying(false);
  };

  const startGame = async () => {
    const firstRound = getNextRound();
    
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);
    setUsedWords(new Set([firstRound.word.word]));
    setCurrentRound(firstRound);
    setFeedback(null);

    // Play the word
    await playWord(firstRound.word.word);
  };

  const handleLetterSelect = async (selectedLetter: string) => {
    if (gameState !== 'playing' || isPlaying || !currentRound) return;

    const isCorrect = selectedLetter === currentRound.word.middleSound;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback({ correct: true, message: getRandomPhrase(CORRECT_PHRASES), correctLetter: selectedLetter });
      await soundGameAudio.playCorrect();

      // Play the word again as confirmation
      setTimeout(async () => {
        await playWord(currentRound.word.word);
      }, 500);

      setGameState('feedback');

      setTimeout(async () => {
        const newRoundsPlayed = roundsPlayed + 1;
        setRoundsPlayed(newRoundsPlayed);

        if (newRoundsPlayed >= totalRounds) {
          setGameState('complete');
          soundGameAudio.playCelebration();
        } else {
          setFeedback(null);
          setGameState('playing');
          const nextRound = getNextRound();
          setCurrentRound(nextRound);
          setUsedWords(prev => new Set([...prev, nextRound.word.word]));
          await playWord(nextRound.word.word);
        }
      }, 2000);
    } else {
      setFeedback({ correct: false, message: getRandomPhrase(ENCOURAGEMENT_PHRASES), correctLetter: currentRound.word.middleSound });
      await soundGameAudio.playWrong();

      setTimeout(async () => {
        setFeedback(null);
        await playWord(currentRound.word.word);
      }, 2000);
    }
  };

  const handleReplay = async () => {
    if (currentRound && !isPlaying) {
      await playWord(currentRound.word.word);
    }
  };

  // Intro Screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl mb-6">🎯</div>
          <h1 className="text-4xl font-bold text-white mb-4">Middle Sound Match</h1>
          <p className="text-xl text-white/90 mb-6">
            Listen to the word and find the <span className="font-bold">MIDDLE</span> sound!
          </p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-8">
            <p className="text-white font-bold mb-3">The 5 middle sounds:</p>
            <div className="flex justify-center gap-3">
              {VOWELS.map((v) => (
                <div 
                  key={v} 
                  className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-2xl font-bold text-purple-600"
                  style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
                >
                  {v}
                </div>
              ))}
            </div>
          </div>

          <button onClick={startGame} className="w-full p-4 bg-white text-purple-600 rounded-2xl font-bold text-xl">
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
      <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1 className="text-4xl font-bold text-white mb-4">Middle Sound Master!</h1>
          <p className="text-2xl text-white/90 mb-8">
            Score: <span className="font-bold text-yellow-300">{score}</span>/{totalRounds}
          </p>

          <div className="space-y-4">
            <button onClick={startGame} className="w-full max-w-sm mx-auto p-4 bg-white text-purple-600 rounded-2xl font-bold text-xl">
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
    <div className="min-h-screen bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500">
      <header className="p-4 flex items-center justify-between">
        <Link href="/games/sound-games" className="text-white/80 text-2xl">←</Link>
        <div className="bg-white/20 rounded-full px-4 py-2">
          <span className="text-white font-bold">⭐ {score}/{totalRounds}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p className="text-xl text-white mb-6">What sound is in the MIDDLE?</p>

          {/* Big speaker button */}
          <button 
            onClick={handleReplay} 
            disabled={isPlaying} 
            className={`bg-white rounded-3xl p-8 shadow-xl mb-4 transition-transform ${
              isPlaying ? 'animate-pulse scale-105' : 'hover:scale-105'
            }`}
          >
            <span className="text-8xl">🔊</span>
          </button>
          
          <p className="text-white/80 text-lg">
            {isPlaying ? 'Listen to the word...' : 'Tap to hear the word'}
          </p>
        </div>

        {/* Letter options - 2x2 grid */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
          {currentRound?.options.map((letter, index) => {
            const isCorrectAnswer = feedback?.correct && letter === currentRound.word.middleSound;
            const showAsCorrect = feedback && !feedback.correct && letter === feedback.correctLetter;
            
            return (
              <button
                key={`${letter}-${index}`}
                onClick={() => handleLetterSelect(letter)}
                disabled={gameState !== 'playing' || isPlaying}
                className={`
                  aspect-square rounded-2xl border-4 transition-all
                  flex items-center justify-center
                  ${isCorrectAnswer
                    ? 'bg-green-400 border-green-300 scale-105 ring-4 ring-green-300/50'
                    : showAsCorrect
                    ? 'bg-yellow-400 border-yellow-300 ring-4 ring-yellow-300/50'
                    : 'bg-white border-white/80 hover:scale-105'
                  }
                `}
                style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
              >
                <span className="text-6xl font-bold text-gray-800">
                  {letter}
                </span>
              </button>
            );
          })}
        </div>

        {/* Feedback message */}
        {feedback && (
          <div className={`mt-6 p-4 rounded-2xl text-center text-xl font-bold ${
            feedback.correct ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'
          }`}>
            {feedback.message}
            {!feedback.correct && feedback.correctLetter && (
              <span className="block mt-2">
                The middle sound is "{feedback.correctLetter}"!
              </span>
            )}
          </div>
        )}

        {/* Progress bar */}
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
