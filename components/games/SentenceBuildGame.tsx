// components/games/SentenceBuildGame.tsx
// Build sentences by arranging words with audio

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { SENTENCES, SentenceData } from '@/lib/games/game-data';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';

const LEVELS = [
  { id: 'level-1', name: 'Easy', color: '#22c55e', description: '3-4 words' },
  { id: 'level-2', name: 'Medium', color: '#3b82f6', description: '4-5 words' },
  { id: 'level-3', name: 'Hard', color: '#8b5cf6', description: '5-7 words' },
];

export default function SentenceBuildGame() {
  const router = useRouter();
  
  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [placedWords, setPlacedWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const totalQuestions = 5;

  const startGame = (level: string) => {
    setSelectedLevel(level);
    const levelSentences = SENTENCES[level] || [];
    const shuffled = [...levelSentences].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setSentences(shuffled);
    setCurrentIndex(0);
    setScore(0);
    setGameComplete(false);
    setPlacedWords([]);
  };

  // Setup words for current sentence
  useEffect(() => {
    if (sentences.length === 0 || currentIndex >= sentences.length) return;
    
    const sentence = sentences[currentIndex];
    setAvailableWords([...sentence.words].sort(() => Math.random() - 0.5));
    setPlacedWords([]);
  }, [currentIndex, sentences]);

  // Play sentence audio
  const playAudio = () => {
    if (sentences.length === 0 || currentIndex >= sentences.length) return;
    GameAudio.playSentence(currentIndex + 1);
  };

  // Cleanup: Stop audio when component unmounts
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  const handleWordTap = (word: string, index: number) => {
    if (showCorrect || showWrong) return;
    
    setPlacedWords(prev => [...prev, word]);
    setAvailableWords(prev => {
      const newWords = [...prev];
      newWords.splice(index, 1);
      return newWords;
    });
  };

  const handlePlacedTap = (index: number) => {
    if (showCorrect || showWrong) return;
    
    const word = placedWords[index];
    setPlacedWords(prev => {
      const newPlaced = [...prev];
      newPlaced.splice(index, 1);
      return newPlaced;
    });
    setAvailableWords(prev => [...prev, word]);
  };

  // Check answer when all words placed
  useEffect(() => {
    // Don't check if showing feedback or no sentences
    if (showCorrect || showWrong) return;
    if (sentences.length === 0 || currentIndex >= sentences.length) return;
    
    const sentence = sentences[currentIndex];
    
    // Only check when user has placed ALL words
    if (placedWords.length !== sentence.words.length) return;
    
    // Small delay to ensure state is settled
    const timer = setTimeout(() => {
      const isCorrect = placedWords.every((word, i) => word === sentence.words[i]);
      
      if (isCorrect) {
        setScore(prev => prev + 1);
        setShowCorrect(true);
        setShowConfetti(true);
        GameAudio.playCorrect().catch(console.error);
        setTimeout(() => setShowConfetti(false), 2000);
      } else {
        setShowWrong(true);
        GameAudio.playWrong().catch(console.error);
      }
    }, 100);
    
    return () => clearTimeout(timer);
  }, [placedWords.length, currentIndex, sentences.length, showCorrect, showWrong]);

  const handleNext = useCallback(() => {
    setShowCorrect(false);
    setShowWrong(false);
    setPlacedWords([]); // Clear placed words FIRST
    
    if (currentIndex + 1 >= totalQuestions) {
      setGameComplete(true);
      GameAudio.playUI('complete').catch(console.error);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  }, [currentIndex]);

  useEffect(() => {
    if (showCorrect) {
      const timer = setTimeout(handleNext, 1500);
      return () => clearTimeout(timer);
    }
  }, [showCorrect, handleNext]);

  const handleRetry = () => {
    setShowWrong(false);
    const sentence = sentences[currentIndex];
    setAvailableWords([...sentence.words].sort(() => Math.random() - 0.5));
    setPlacedWords([]);
  };

  // Level selection
  if (!selectedLevel) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400 p-4"
        style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">📝 Sentence Build</h1>
            <p className="text-white/90">Put the words in order!</p>
          </div>

          <div className="space-y-4">
            {LEVELS.map((level) => (
              <button key={level.id}
                onClick={() => startGame(level.id)}
                className="w-full p-6 bg-white rounded-2xl shadow-xl hover:scale-[1.02] transition-transform">
                <h3 className="text-xl font-bold" style={{ color: level.color }}>{level.name}</h3>
                <p className="text-gray-500 text-sm">{level.description}</p>
              </button>
            ))}
          </div>

          <button onClick={() => router.push('/games')}
            className="mt-8 w-full py-3 bg-white/20 text-white rounded-xl font-bold">
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // Game complete
  if (gameComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400"
        style={{ fontFamily: "'Comic Sans MS', cursive" }}>
        {score >= 4 && <Confetti />}
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">{score >= 4 ? '🏆' : '💪'}</div>
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {score >= 4 ? 'Amazing!' : 'Good Try!'}
          </h2>
          <p className="text-gray-600 text-xl mb-6">Score: {score}/{totalQuestions}</p>
          <div className="space-y-3">
            <button onClick={() => startGame(selectedLevel)}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-xl">
              🔄 Play Again
            </button>
            <button onClick={() => setSelectedLevel(null)}
              className="w-full py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xl">
              ← Choose Level
            </button>
          </div>
        </div>
      </div>
    );
  }

  const currentSentence = sentences[currentIndex];

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-teal-400 via-cyan-400 to-blue-400"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}>
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => setSelectedLevel(null)} className="text-white font-bold">← Back</button>
          <div className="text-white font-bold">{currentIndex + 1}/{totalQuestions}</div>
          <div className="text-white font-bold">⭐ {score}</div>
        </div>

        <div className="h-3 bg-white/30 rounded-full overflow-hidden mb-6">
          <div className="h-full bg-white rounded-full transition-all"
            style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }} />
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          {showCorrect && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-3xl z-10">
              <div className="text-center">
                <div className="text-8xl mb-4 animate-bounce">✅</div>
                <p className="text-white text-3xl font-bold">Perfect!</p>
              </div>
            </div>
          )}
          
          {showWrong && (
            <div className="absolute inset-0 flex items-center justify-center bg-orange-500/90 rounded-3xl z-10">
              <div className="text-center">
                <div className="text-6xl mb-4">🤔</div>
                <p className="text-white text-xl font-bold mb-4">
                  Correct order: {currentSentence.words.join(' ')}
                </p>
                <button onClick={handleRetry}
                  className="px-8 py-3 bg-white text-orange-500 rounded-xl font-bold">
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Image and audio */}
          <div className="text-center mb-6">
            <div className="text-7xl mb-2">{currentSentence.image}</div>
            <button onClick={playAudio}
              className="px-6 py-2 bg-blue-500 text-white rounded-full font-bold">
              🔊 Hear Sentence
            </button>
          </div>

          {/* Sentence slots */}
          <div className="flex flex-wrap justify-center gap-2 mb-8 min-h-[60px] p-4 bg-gray-100 rounded-xl">
            {placedWords.length === 0 ? (
              <p className="text-gray-400">Tap words to build the sentence</p>
            ) : (
              placedWords.map((word, index) => (
                <button key={`placed-${index}`}
                  onClick={() => handlePlacedTap(index)}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-xl">
                  {word}
                </button>
              ))
            )}
          </div>

          {/* Available words */}
          <div className="flex flex-wrap justify-center gap-3">
            {availableWords.map((word, index) => (
              <button key={`avail-${index}`}
                onClick={() => handleWordTap(word, index)}
                className="px-5 py-3 bg-gradient-to-br from-purple-400 to-pink-400 text-white rounded-xl font-bold text-xl shadow-lg hover:scale-110 active:scale-95 transition-transform">
                {word}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
