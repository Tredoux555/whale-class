'use client';

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  GrammarType,
  GrammarSentence,
  GrammarWord,
  GRAMMAR_SYMBOLS,
  LEVEL_INFO,
  getSentencesByLevel,
  getWordIndicesByType,
} from '@/lib/games/grammar-data';

// ============================================
// Types
// ============================================
interface GrammarSymbolsGameProps {
  level?: 1 | 2 | 3;
  onComplete?: () => void;
  onBack?: () => void;
}

type GamePhase = 'level-select' | 'playing' | 'sentence-complete' | 'level-complete';

// ============================================
// Grammar Symbol Component (SVG-based)
// ============================================
const GrammarSymbol = ({ type, size = 32 }: { type: GrammarType; size?: number }) => {
  const config = GRAMMAR_SYMBOLS[type];

  if (type === 'verb') {
    // Red circle for verbs
    return (
      <div
        className="rounded-full flex-shrink-0"
        style={{
          width: size,
          height: size,
          backgroundColor: config.color,
        }}
      />
    );
  }

  // Triangle for noun, adjective, article (different sizes)
  const triangleSize = type === 'article' ? size * 0.75 : type === 'adjective' ? size * 0.85 : size;

  return (
    <svg
      width={triangleSize}
      height={triangleSize}
      viewBox="0 0 32 32"
      className="flex-shrink-0"
    >
      <polygon points="16,4 28,28 4,28" fill={config.color} />
    </svg>
  );
};

// ============================================
// Word Button Component
// ============================================
interface WordButtonProps {
  word: GrammarWord;
  index: number;
  isMarked: boolean;
  isTarget: boolean;
  currentTargetType: GrammarType;
  onTap: (index: number) => void;
  showAllMarked: boolean;
}

const WordButton = ({
  word,
  index,
  isMarked,
  isTarget,
  currentTargetType,
  onTap,
  showAllMarked,
}: WordButtonProps) => {
  const [isShaking, setIsShaking] = useState(false);

  const handleClick = () => {
    if (isMarked) return;

    if (isTarget && word.type === currentTargetType) {
      onTap(index);
    } else if (!showAllMarked) {
      // Wrong tap - shake animation
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isMarked || showAllMarked}
      className={`
        relative flex flex-col items-center gap-2 px-4 py-3 min-h-[80px] min-w-[80px]
        rounded-xl transition-all duration-200
        ${isShaking ? 'animate-shake' : ''}
        ${isMarked 
          ? 'bg-green-50 border-2 border-green-300 shadow-inner' 
          : 'bg-white border-2 border-gray-200 shadow-md hover:shadow-lg hover:border-amber-300 active:scale-95'
        }
        ${showAllMarked ? 'cursor-default' : 'cursor-pointer'}
      `}
    >
      {/* Word text */}
      <span
        className={`
          text-xl font-semibold
          ${isMarked ? 'text-gray-700' : 'text-gray-800'}
        `}
      >
        {word.word}
      </span>

      {/* Grammar symbol (shown when marked) */}
      {isMarked && (
        <div className="flex items-center justify-center animate-pop">
          <GrammarSymbol type={word.type} size={28} />
        </div>
      )}
    </button>
  );
};

// ============================================
// Level Selection Screen
// ============================================
interface LevelSelectProps {
  onSelectLevel: (level: 1 | 2 | 3) => void;
  onBack?: () => void;
}

const LevelSelect = ({ onSelectLevel, onBack }: LevelSelectProps) => {
  const levels: (1 | 2 | 3)[] = [1, 2, 3];

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50 p-6">
      {/* Header */}
      <div className="max-w-lg mx-auto">
        {onBack && (
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-amber-700 hover:text-amber-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
        )}

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-amber-800 mb-2">Grammar Symbols</h1>
          <p className="text-amber-600">Learn the Montessori grammar symbols!</p>
        </div>

        {/* Symbol Legend */}
        <div className="bg-white/70 rounded-2xl p-4 mb-8 shadow-md">
          <h2 className="text-lg font-semibold text-gray-700 mb-3 text-center">Grammar Symbols</h2>
          <div className="grid grid-cols-2 gap-3">
            {(Object.entries(GRAMMAR_SYMBOLS) as [GrammarType, typeof GRAMMAR_SYMBOLS.noun][]).map(
              ([type, config]) => (
                <div key={type} className="flex items-center gap-2 bg-white rounded-lg p-2">
                  <GrammarSymbol type={type} size={24} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">{config.name}</span>
                    <span className="text-xs text-gray-500">{config.childName}</span>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Level Cards */}
        <div className="space-y-4">
          {levels.map((level) => {
            const info = LEVEL_INFO[level];
            return (
              <button
                key={level}
                onClick={() => onSelectLevel(level)}
                className="w-full bg-white rounded-2xl p-5 shadow-md hover:shadow-xl 
                           transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]
                           border-2 border-transparent hover:border-amber-300"
              >
                <div className="flex items-center gap-4">
                  <div className="text-4xl">{info.icon}</div>
                  <div className="text-left flex-1">
                    <h3 className="text-lg font-bold text-amber-800">{info.title}</h3>
                    <p className="text-amber-600 font-medium">{info.subtitle}</p>
                    <p className="text-sm text-gray-500 mt-1">{info.description}</p>
                  </div>
                  <svg
                    className="w-6 h-6 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================
// Main Game Component
// ============================================
export default function GrammarSymbolsGame({
  level: initialLevel,
  onComplete,
  onBack,
}: GrammarSymbolsGameProps) {
  // State
  const [selectedLevel, setSelectedLevel] = useState<1 | 2 | 3 | null>(initialLevel ?? null);
  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [markedWords, setMarkedWords] = useState<Set<number>>(new Set());
  const [currentTargetTypeIndex, setCurrentTargetTypeIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>(initialLevel ? 'playing' : 'level-select');
  const [score, setScore] = useState(0);

  // Get sentences for current level
  const sentences = useMemo(() => {
    if (!selectedLevel) return [];
    return getSentencesByLevel(selectedLevel);
  }, [selectedLevel]);

  const currentSentence = sentences[currentSentenceIndex];

  // Get target types for this level
  const targetTypes = useMemo(() => {
    if (!selectedLevel) return [];
    return LEVEL_INFO[selectedLevel].targetTypes;
  }, [selectedLevel]);

  const currentTargetType = targetTypes[currentTargetTypeIndex];

  // Get indices of target words for current type
  const targetWordIndices = useMemo(() => {
    if (!currentSentence || !currentTargetType) return [];
    return getWordIndicesByType(currentSentence, currentTargetType);
  }, [currentSentence, currentTargetType]);

  // Check if all targets of current type are found
  const allCurrentTargetsFound = useMemo(() => {
    return targetWordIndices.every((idx) => markedWords.has(idx));
  }, [targetWordIndices, markedWords]);

  // Handle word tap
  const handleWordTap = useCallback(
    (index: number) => {
      if (!currentSentence) return;

      const word = currentSentence.words[index];
      if (word.type === currentTargetType && !markedWords.has(index)) {
        setMarkedWords((prev) => new Set([...prev, index]));
        setScore((prev) => prev + 10);
      }
    },
    [currentSentence, currentTargetType, markedWords]
  );

  // Effect: Check for completion of current type targets
  useEffect(() => {
    if (!allCurrentTargetsFound || gamePhase !== 'playing') return;

    // Short delay before moving to next phase
    const timer = setTimeout(() => {
      // Check if there are more types to find in this sentence
      if (currentTargetTypeIndex < targetTypes.length - 1) {
        setCurrentTargetTypeIndex((prev) => prev + 1);
      } else {
        // All types found - sentence complete
        setGamePhase('sentence-complete');
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [allCurrentTargetsFound, currentTargetTypeIndex, targetTypes.length, gamePhase]);

  // Handle next sentence
  const handleNextSentence = () => {
    if (currentSentenceIndex < sentences.length - 1) {
      setCurrentSentenceIndex((prev) => prev + 1);
      setMarkedWords(new Set());
      setCurrentTargetTypeIndex(0);
      setGamePhase('playing');
    } else {
      // Level complete
      setGamePhase('level-complete');
    }
  };

  // Handle level selection
  const handleSelectLevel = (level: 1 | 2 | 3) => {
    setSelectedLevel(level);
    setCurrentSentenceIndex(0);
    setMarkedWords(new Set());
    setCurrentTargetTypeIndex(0);
    setScore(0);
    setGamePhase('playing');
  };

  // Handle back to levels
  const handleBackToLevels = () => {
    setSelectedLevel(null);
    setGamePhase('level-select');
  };

  // Handle complete
  const handleComplete = () => {
    onComplete?.();
    handleBackToLevels();
  };

  // ==========================================
  // Render: Level Selection
  // ==========================================
  if (gamePhase === 'level-select') {
    return <LevelSelect onSelectLevel={handleSelectLevel} onBack={onBack} />;
  }

  // ==========================================
  // Render: Level Complete Screen
  // ==========================================
  if (gamePhase === 'level-complete') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 via-emerald-50 to-teal-50 p-6 flex items-center justify-center">
        <div className="max-w-md mx-auto text-center">
          <div className="text-8xl mb-6 animate-bounce">🎉</div>
          <h1 className="text-3xl font-bold text-green-700 mb-4">Amazing Job!</h1>
          <p className="text-xl text-green-600 mb-2">
            You completed Level {selectedLevel}!
          </p>
          <p className="text-lg text-green-500 mb-8">
            Score: <span className="font-bold">{score}</span> points
          </p>

          <div className="space-y-3">
            {selectedLevel && selectedLevel < 3 && (
              <button
                onClick={() => handleSelectLevel((selectedLevel + 1) as 1 | 2 | 3)}
                className="w-full py-4 px-6 bg-green-500 text-white text-lg font-semibold 
                           rounded-xl shadow-lg hover:bg-green-600 transition-colors"
              >
                Try Level {selectedLevel + 1} →
              </button>
            )}
            <button
              onClick={handleBackToLevels}
              className="w-full py-4 px-6 bg-amber-500 text-white text-lg font-semibold 
                         rounded-xl shadow-lg hover:bg-amber-600 transition-colors"
            >
              Choose Another Level
            </button>
            {onComplete && (
              <button
                onClick={handleComplete}
                className="w-full py-3 px-6 bg-gray-200 text-gray-700 font-semibold 
                           rounded-xl hover:bg-gray-300 transition-colors"
              >
                Finish Game
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // Render: Main Game Screen
  // ==========================================
  if (!currentSentence || !currentTargetType) {
    return <div className="p-6">Loading...</div>;
  }

  const levelInfo = selectedLevel ? LEVEL_INFO[selectedLevel] : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-yellow-50">
      {/* Header */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-sm shadow-sm z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleBackToLevels}
            className="flex items-center gap-1 text-amber-700 hover:text-amber-800 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">Levels</span>
          </button>

          <div className="text-center">
            <span className="text-sm text-gray-500">
              Sentence {currentSentenceIndex + 1} of {sentences.length}
            </span>
          </div>

          <div className="flex items-center gap-1 bg-amber-100 px-3 py-1 rounded-full">
            <span className="text-amber-600 text-sm font-medium">⭐ {score}</span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-gray-200">
        <div
          className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-300"
          style={{ width: `${((currentSentenceIndex + 1) / sentences.length) * 100}%` }}
        />
      </div>

      {/* Instruction Banner */}
      <div className="max-w-2xl mx-auto px-4 pt-6">
        <div
          className={`
            rounded-2xl p-4 mb-6 shadow-md
            ${gamePhase === 'sentence-complete' 
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-2 border-green-300' 
              : 'bg-white border-2 border-amber-200'
            }
          `}
        >
          {gamePhase === 'sentence-complete' ? (
            <div className="text-center">
              <span className="text-2xl">🎉</span>
              <p className="text-lg font-semibold text-green-700">Great Job!</p>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-3">
              <GrammarSymbol type={currentTargetType} size={36} />
              <div className="text-center">
                <p className="text-lg font-semibold text-amber-800">
                  Tap all the{' '}
                  <span className="uppercase">{GRAMMAR_SYMBOLS[currentTargetType].childName}s</span>
                </p>
                <p className="text-sm text-amber-600">
                  ({GRAMMAR_SYMBOLS[currentTargetType].name}s)
                </p>
              </div>
              <GrammarSymbol type={currentTargetType} size={36} />
            </div>
          )}
        </div>
      </div>

      {/* Sentence Display */}
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white/50 rounded-3xl p-6 shadow-lg border border-amber-100">
          <div className="flex flex-wrap justify-center gap-3">
            {currentSentence.words.map((word, index) => (
              <WordButton
                key={`${currentSentence.id}-${index}`}
                word={word}
                index={index}
                isMarked={markedWords.has(index)}
                isTarget={word.type === currentTargetType}
                currentTargetType={currentTargetType}
                onTap={handleWordTap}
                showAllMarked={gamePhase === 'sentence-complete'}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Next Button (when sentence complete) */}
      {gamePhase === 'sentence-complete' && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white to-transparent">
          <div className="max-w-md mx-auto">
            <button
              onClick={handleNextSentence}
              className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-xl font-bold rounded-2xl shadow-lg hover:from-green-600 hover:to-emerald-600 active:scale-[0.98] transition-all duration-200"
            >
              {currentSentenceIndex < sentences.length - 1 ? 'Next Sentence →' : 'Finish Level! 🎉'}
            </button>
          </div>
        </div>
      )}

      {/* Symbol Legend (bottom) */}
      {gamePhase === 'playing' && levelInfo && (
        <div className="fixed bottom-4 left-4 right-4">
          <div className="max-w-sm mx-auto bg-white/90 backdrop-blur-sm rounded-xl p-3 shadow-md">
            <div className="flex justify-center gap-4">
              {levelInfo.targetTypes.map((type) => (
                <div
                  key={type}
                  className={`
                    flex items-center gap-2 px-3 py-1 rounded-lg
                    ${type === currentTargetType ? 'bg-amber-100 ring-2 ring-amber-400' : 'bg-gray-50'}
                  `}
                >
                  <GrammarSymbol type={type} size={20} />
                  <span className="text-xs font-medium text-gray-700">
                    {GRAMMAR_SYMBOLS[type].childName}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Custom Animations */}
      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes pop {
          0% { transform: scale(0); opacity: 0; }
          70% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
        .animate-pop {
          animation: pop 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
