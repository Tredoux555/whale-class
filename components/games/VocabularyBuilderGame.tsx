'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  VOCABULARY_CATEGORIES,
  getWordsByCategory,
  getCategoryById,
  VocabularyWord,
  VocabularyCategory,
} from '@/lib/games/vocabulary-data';

interface VocabularyBuilderGameProps {
  categoryId?: string; // optional - if not provided, show category selector
  onComplete?: () => void;
  onBack?: () => void;
}

export default function VocabularyBuilderGame({
  categoryId: initialCategoryId,
  onComplete,
  onBack,
}: VocabularyBuilderGameProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategoryId || null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);

  // Load words when category changes
  useEffect(() => {
    if (selectedCategory) {
      const categoryWords = getWordsByCategory(selectedCategory);
      setWords(categoryWords);
      setCurrentIndex(0);
      setIsComplete(false);
    }
  }, [selectedCategory]);

  // Auto-play audio when word changes
  useEffect(() => {
    if (words.length > 0 && currentIndex < words.length && selectedCategory && !isComplete) {
      // Small delay to ensure UI has rendered
      const timer = setTimeout(() => {
        playAudio(words[currentIndex].audioUrl);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [currentIndex, words, selectedCategory, isComplete]);

  const playAudio = useCallback((url: string) => {
    setIsPlaying(true);
    const audio = new Audio(url);
    audio.play().catch(() => {}); // Ignore errors if audio missing
    audio.onended = () => setIsPlaying(false);
    audio.onerror = () => setIsPlaying(false);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < words.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsComplete(true);
      onComplete?.();
    }
  }, [currentIndex, words.length, onComplete]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }, [currentIndex]);

  const handleCategorySelect = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
  }, []);

  const handlePlayAgain = useCallback(() => {
    setCurrentIndex(0);
    setIsComplete(false);
  }, []);

  const handleChooseCategory = useCallback(() => {
    setSelectedCategory(null);
    setCurrentIndex(0);
    setIsComplete(false);
    setWords([]);
  }, []);

  // Category Selector Screen
  const CategorySelector = () => (
    <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-purple-700 mb-2">
          📚 Vocabulary Builder
        </h1>
        <p className="text-lg text-gray-600">Choose a category to start learning!</p>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-2xl">
        {VOCABULARY_CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => handleCategorySelect(category.id)}
            className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-lg 
                       hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200
                       border-2 border-transparent hover:border-purple-300 min-h-[140px]"
          >
            <span className="text-5xl mb-3">{category.icon}</span>
            <span className="text-lg font-semibold text-gray-700">{category.name}</span>
            <span className="text-sm text-gray-500">{category.words.length} words</span>
          </button>
        ))}
      </div>

      {/* Back Button */}
      {onBack && (
        <button
          onClick={onBack}
          className="mt-8 px-6 py-3 text-gray-600 hover:text-gray-800 
                     flex items-center gap-2 transition-colors"
        >
          <span>←</span>
          <span>Back to Games</span>
        </button>
      )}
    </div>
  );

  // Word Card Screen
  const WordCard = () => {
    const currentWord = words[currentIndex];
    const category = getCategoryById(selectedCategory!);
    const progress = ((currentIndex + 1) / words.length) * 100;

    return (
      <div className="flex flex-col items-center justify-between min-h-[90vh] px-4 py-6">
        {/* Header with Back & Progress */}
        <div className="w-full max-w-lg">
          {/* Top Bar */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={handleChooseCategory}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-800 
                         px-3 py-2 rounded-xl hover:bg-white/50 transition-all"
            >
              <span>←</span>
              <span className="text-sm font-medium">Categories</span>
            </button>
            <div className="flex items-center gap-2 bg-white/70 px-4 py-2 rounded-full shadow-sm">
              <span className="text-xl">{category?.icon}</span>
              <span className="font-medium text-gray-700">{category?.name}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-green-400 to-emerald-500 
                         transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-center text-gray-600 mt-2 font-medium">
            Word {currentIndex + 1} of {words.length}
          </p>
        </div>

        {/* Main Word Card */}
        <div className="flex-1 flex items-center justify-center w-full py-6">
          <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 w-full max-w-md 
                          transform transition-all duration-300 hover:shadow-2xl">
            {/* Large Emoji */}
            <div className="flex justify-center mb-6">
              <span 
                className="text-[150px] leading-none drop-shadow-lg 
                           animate-bounce-slow select-none"
                style={{ animationDuration: '3s' }}
              >
                {currentWord.image}
              </span>
            </div>

            {/* Word Text */}
            <h2 className="text-4xl md:text-5xl font-bold text-center text-gray-800 mb-6 
                           tracking-wide capitalize">
              {currentWord.word}
            </h2>

            {/* Tap to Hear Button */}
            <button
              onClick={() => playAudio(currentWord.audioUrl)}
              disabled={isPlaying}
              className={`w-full py-4 px-6 rounded-2xl font-semibold text-lg
                         flex items-center justify-center gap-3 transition-all duration-200
                         ${isPlaying 
                           ? 'bg-purple-200 text-purple-600' 
                           : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 active:scale-95 shadow-lg hover:shadow-xl'
                         }`}
            >
              <span className="text-2xl">{isPlaying ? '🔊' : '🔈'}</span>
              <span>{isPlaying ? 'Playing...' : 'Tap to Hear'}</span>
            </button>
          </div>
        </div>

        {/* Navigation Arrows */}
        <div className="flex items-center justify-between w-full max-w-md px-4">
          <button
            onClick={handlePrevious}
            disabled={currentIndex === 0}
            className={`flex items-center justify-center w-16 h-16 rounded-full shadow-lg 
                       transition-all duration-200 ${
                         currentIndex === 0
                           ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                           : 'bg-white text-purple-600 hover:bg-purple-50 hover:shadow-xl active:scale-95'
                       }`}
          >
            <span className="text-3xl">←</span>
          </button>

          {/* Dot Indicators (show up to 10) */}
          <div className="flex gap-1 flex-wrap justify-center max-w-[200px]">
            {words.slice(0, 10).map((_, idx) => (
              <div
                key={idx}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  idx === currentIndex
                    ? 'bg-purple-600 w-4'
                    : idx < currentIndex
                    ? 'bg-green-400'
                    : 'bg-gray-300'
                }`}
              />
            ))}
            {words.length > 10 && (
              <span className="text-xs text-gray-400 ml-1">+{words.length - 10}</span>
            )}
          </div>

          <button
            onClick={handleNext}
            className="flex items-center justify-center w-16 h-16 rounded-full shadow-lg 
                       bg-gradient-to-r from-green-400 to-emerald-500 text-white
                       hover:from-green-500 hover:to-emerald-600 hover:shadow-xl 
                       active:scale-95 transition-all duration-200"
          >
            <span className="text-3xl">→</span>
          </button>
        </div>
      </div>
    );
  };

  // Completion Screen
  const CompletionScreen = () => {
    const category = getCategoryById(selectedCategory!);

    return (
      <div className="flex flex-col items-center justify-center min-h-[80vh] px-4">
        {/* Confetti Celebration */}
        <div className="text-center mb-8 animate-bounce-slow" style={{ animationDuration: '2s' }}>
          <div className="text-6xl mb-4">
            🎉 🎊 ⭐ 🎊 🎉
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-purple-700 mb-2">
            Amazing Job!
          </h1>
          <p className="text-xl text-gray-600">
            You learned all {words.length} {category?.name} words!
          </p>
        </div>

        {/* Stats Card */}
        <div className="bg-white rounded-3xl shadow-xl p-8 mb-8 w-full max-w-sm">
          <div className="flex items-center justify-center gap-4 mb-4">
            <span className="text-5xl">{category?.icon}</span>
            <div>
              <p className="text-2xl font-bold text-gray-800">{words.length}</p>
              <p className="text-gray-600">Words Learned</p>
            </div>
          </div>
          <div className="w-full bg-green-100 rounded-full h-4 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full" />
          </div>
          <p className="text-center text-green-600 font-semibold mt-2">100% Complete!</p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-sm">
          <button
            onClick={handlePlayAgain}
            className="flex-1 py-4 px-6 rounded-2xl font-semibold text-lg
                       bg-gradient-to-r from-purple-500 to-pink-500 text-white
                       hover:from-purple-600 hover:to-pink-600 
                       shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200
                       flex items-center justify-center gap-2"
          >
            <span>🔄</span>
            <span>Play Again</span>
          </button>
          
          <button
            onClick={handleChooseCategory}
            className="flex-1 py-4 px-6 rounded-2xl font-semibold text-lg
                       bg-white text-purple-600 border-2 border-purple-300
                       hover:bg-purple-50 hover:border-purple-400
                       shadow-lg hover:shadow-xl active:scale-95 transition-all duration-200
                       flex items-center justify-center gap-2"
          >
            <span>📚</span>
            <span>New Category</span>
          </button>
        </div>

        {/* Back to Games */}
        {onBack && (
          <button
            onClick={onBack}
            className="mt-6 px-6 py-3 text-gray-600 hover:text-gray-800 
                       flex items-center gap-2 transition-colors"
          >
            <span>←</span>
            <span>Back to Games</span>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50">
      {/* Custom Animation Styles */}
      <style jsx global>{`
        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        .animate-bounce-slow {
          animation: bounce-slow 3s ease-in-out infinite;
        }
      `}</style>

      {!selectedCategory ? (
        <CategorySelector />
      ) : !isComplete ? (
        <WordCard />
      ) : (
        <CompletionScreen />
      )}
    </div>
  );
}
