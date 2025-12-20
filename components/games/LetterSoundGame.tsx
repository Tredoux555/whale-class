// components/games/LetterSoundGame.tsx
// Letter Sound Game with progressive group unlock and recorded audio

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  LETTER_GROUPS, 
  LetterGroup, 
  LetterData,
} from '@/lib/games/game-data';
import { GameAudio, AUDIO_PATHS } from '@/lib/games/audio-paths';
import Confetti from './Confetti';

interface Props {
  phase?: string;
}

const PROGRESS_KEY = 'letter-game-progress';

interface GameProgress {
  completedGroups: string[];
  scores: Record<string, number>;
}

export default function LetterSoundGame({ phase }: Props) {
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Progress state
  const [progress, setProgress] = useState<GameProgress>({ completedGroups: [], scores: {} });
  const [selectedGroup, setSelectedGroup] = useState<LetterGroup | null>(null);
  
  // Game state
  const [letters, setLetters] = useState<LetterData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [options, setOptions] = useState<LetterData[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [wrongAnswer, setWrongAnswer] = useState('');
  const [gameComplete, setGameComplete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const totalQuestions = 5;

  // Load progress from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        try {
          setProgress(JSON.parse(saved));
        } catch (e) {
          console.error('Failed to load progress:', e);
        }
      }
    }
  }, []);

  // Save progress
  const saveProgress = (newProgress: GameProgress) => {
    setProgress(newProgress);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress));
    }
  };

  // Check if group is unlocked
  const isGroupUnlocked = (group: LetterGroup): boolean => {
    if (!group.unlockRequirement) return true;
    return progress.completedGroups.includes(group.unlockRequirement);
  };

  // Start game with selected group
  const startGame = (group: LetterGroup) => {
    setSelectedGroup(group);
    const shuffled = [...group.letters].sort(() => Math.random() - 0.5);
    setLetters(shuffled.slice(0, totalQuestions));
    setCurrentIndex(0);
    setScore(0);
    setGameComplete(false);
    setShowConfetti(false);
  };

  // Generate options when letter changes
  useEffect(() => {
    if (!selectedGroup || letters.length === 0 || currentIndex >= letters.length) return;

    const currentLetter = letters[currentIndex];
    const otherLetters = selectedGroup.letters
      .filter(l => l.letter !== currentLetter.letter)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [currentLetter, ...otherLetters].sort(() => Math.random() - 0.5);
    setOptions(allOptions);
  }, [currentIndex, letters, selectedGroup]);

  // Play letter audio
  const playAudio = useCallback(() => {
    if (letters.length === 0 || currentIndex >= letters.length || isPlaying) return;

    const letter = letters[currentIndex];
    setIsPlaying(true);
    
    GameAudio.play(letter.audioUrl)
      .catch(console.error)
      .finally(() => setIsPlaying(false));
  }, [currentIndex, letters, isPlaying]);


  // Handle answer selection
  const handleAnswer = (selected: LetterData) => {
    if (showCorrect || showWrong || gameComplete) return;

    const correct = selected.letter === letters[currentIndex].letter;

    if (correct) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      setShowConfetti(true);
      GameAudio.playCorrect().catch(console.error);
      
      setTimeout(() => setShowConfetti(false), 2000);
      
      // Auto-advance after correct answer
      setTimeout(() => {
        setShowCorrect(false);
        
        if (currentIndex + 1 >= totalQuestions) {
          // Check if passed (need 4/5 to unlock next group)
          const finalScore = score + 1;
          if (finalScore >= 4 && selectedGroup) {
            const newProgress = {
              ...progress,
              completedGroups: [...new Set([...progress.completedGroups, selectedGroup.id])],
              scores: { ...progress.scores, [selectedGroup.id]: finalScore },
            };
            saveProgress(newProgress);
            GameAudio.playUI('unlock').catch(console.error);
          }
          setGameComplete(true);
          GameAudio.playUI('complete').catch(console.error);
        } else {
          setCurrentIndex(prev => prev + 1);
        }
      }, 1500);
    } else {
      // Wrong answer - show feedback but DON'T advance
      setWrongAnswer(letters[currentIndex].letter.toUpperCase());
      setShowWrong(true);
      GameAudio.playWrong().catch(console.error);
      
      // Just hide the feedback after delay, stay on same question
      setTimeout(() => {
        setShowWrong(false);
        // Play the sound again so they can try again
        playAudio();
      }, 1500);
    }
  };



  // Reset to group selection
  const resetToGroupSelection = () => {
    setSelectedGroup(null);
    setLetters([]);
    setCurrentIndex(0);
    setScore(0);
    setGameComplete(false);
  };

  // ==========================================
  // RENDER: Group Selection Screen
  // ==========================================
  if (!selectedGroup) {
    return (
      <div 
        className="min-h-screen bg-gradient-to-br from-red-400 via-orange-400 to-yellow-400 p-4"
        style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
      >
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white drop-shadow-lg mb-2">
              🔊 Letter Sounds
            </h1>
            <p className="text-white/90 text-lg">
              Choose a group to practice!
            </p>
          </div>

          <div className="space-y-4">
            {LETTER_GROUPS.map((group) => {
              const unlocked = isGroupUnlocked(group);
              const completed = progress.completedGroups.includes(group.id);
              const bestScore = progress.scores[group.id];

              return (
                <button
                  key={group.id}
                  onClick={() => unlocked && startGame(group)}
                  disabled={!unlocked}
                  className={`w-full p-6 rounded-2xl text-left transition-all ${
                    unlocked
                      ? 'bg-white shadow-xl hover:scale-[1.02] hover:shadow-2xl active:scale-[0.98]'
                      : 'bg-gray-300 opacity-60 cursor-not-allowed'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div 
                        className="w-16 h-16 rounded-full flex items-center justify-center text-3xl"
                        style={{ backgroundColor: unlocked ? group.color + '20' : '#ccc' }}
                      >
                        {unlocked ? group.icon : '🔒'}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">
                          {group.name}
                        </h3>
                        <p className="text-gray-500">
                          {group.letters.map(l => l.letter.toUpperCase()).join(' ')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      {completed && (
                        <div className="flex items-center gap-1 text-green-500 font-bold">
                          <span>✓</span>
                          <span>{bestScore}/5</span>
                        </div>
                      )}
                      {!unlocked && (
                        <p className="text-sm text-gray-500">
                          Complete {group.unlockRequirement} first
                        </p>
                      )}
                    </div>
                  </div>

                  {completed && (
                    <div className="mt-3 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          width: `${(bestScore || 0) / 5 * 100}%`,
                          backgroundColor: group.color 
                        }}
                      />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 bg-white/20 backdrop-blur rounded-2xl p-4 text-center">
            <p className="text-white font-bold">
              Groups Completed: {progress.completedGroups.length} / {LETTER_GROUPS.length}
            </p>
            {progress.completedGroups.length === LETTER_GROUPS.length && (
              <p className="text-yellow-200 mt-2">🏆 Amazing! You've mastered all letters!</p>
            )}
          </div>

          <button
            onClick={() => router.push('/games')}
            className="mt-6 w-full py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30"
          >
            ← Back to Games
          </button>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Game Complete Screen
  // ==========================================
  if (gameComplete) {
    const passed = score >= 4;
    
    return (
      <div 
        className="min-h-screen flex items-center justify-center p-4"
        style={{ 
          fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
          background: `linear-gradient(135deg, ${selectedGroup.color}dd, ${selectedGroup.color}99)`,
        }}
      >
        {passed && <Confetti />}
        
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          <div className="text-6xl mb-4">
            {passed ? '🎉' : '💪'}
          </div>
          
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {passed ? 'Great Job!' : 'Keep Practicing!'}
          </h2>
          
          <p className="text-gray-600 text-xl mb-4">
            You got {score} out of {totalQuestions}!
          </p>

          {passed && !progress.completedGroups.includes(selectedGroup.id) && (
            <p className="text-green-600 font-bold mb-4">
              🔓 Next group unlocked!
            </p>
          )}

          <div className="flex justify-center gap-2 mb-6">
            {[1, 2, 3, 4, 5].map((star) => (
              <span 
                key={star} 
                className={`text-4xl ${star <= score ? 'animate-pulse' : 'opacity-30'}`}
              >
                ⭐
              </span>
            ))}
          </div>

          <div className="space-y-3">
            <button
              onClick={() => startGame(selectedGroup)}
              className="w-full py-4 bg-green-500 text-white rounded-2xl font-bold text-xl hover:bg-green-600 shadow-lg active:scale-95 transition-transform"
            >
              🔄 Play Again
            </button>
            
            <button
              onClick={resetToGroupSelection}
              className="w-full py-4 bg-gray-200 text-gray-700 rounded-2xl font-bold text-xl hover:bg-gray-300 active:scale-95 transition-transform"
            >
              🎯 What's Next?
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RENDER: Game Play Screen
  // ==========================================
  const currentLetter = letters[currentIndex];

  return (
    <div 
      className="min-h-screen p-4"
      style={{ 
        fontFamily: "'Comic Sans MS', 'Comic Sans', cursive",
        background: `linear-gradient(135deg, ${selectedGroup.color}dd, ${selectedGroup.color}99)`,
      }}
    >
      {showConfetti && <Confetti />}

      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={resetToGroupSelection}
            className="text-white font-bold hover:scale-105 transition-transform"
          >
            ← Back
          </button>
          <div className="text-white font-bold">
            {selectedGroup.icon} {selectedGroup.name}
          </div>
          <div className="text-white font-bold">
            ⭐ {score}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-white/80 text-sm mb-1">
            <span>Question {currentIndex + 1} of {totalQuestions}</span>
          </div>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-white rounded-full transition-all duration-500"
              style={{ width: `${((currentIndex + 1) / totalQuestions) * 100}%` }}
            />
          </div>
        </div>

        {/* Game Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6 relative overflow-hidden">
          {/* Correct Feedback */}
          {showCorrect && (
            <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-3xl z-10">
              <div className="text-center">
                <div className="text-8xl mb-4 animate-bounce">✅</div>
                <p className="text-white text-3xl font-bold">Great Job!</p>
              </div>
            </div>
          )}
          
          {/* Wrong Feedback */}
          {showWrong && (
            <div className="absolute inset-0 flex items-center justify-center bg-orange-500/90 rounded-3xl z-10">
              <div className="text-center">
                <div className="text-6xl mb-4">🤔</div>
                <p className="text-white text-2xl font-bold mb-2">Try Again!</p>
                <p className="text-white/80">The answer is: <strong>{wrongAnswer}</strong></p>
              </div>
            </div>
          )}

          {/* Question */}
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-700 mb-6">
              Listen and find the letter!
            </h2>
            
            {/* Play Sound Button */}
            <button
              onClick={playAudio}
              disabled={isPlaying}
              className={`w-32 h-32 rounded-full flex items-center justify-center mx-auto shadow-xl transition-all ${
                isPlaying 
                  ? 'bg-gray-400 scale-95' 
                  : 'bg-gradient-to-br from-blue-400 to-blue-600 hover:scale-110 active:scale-95'
              }`}
            >
              <span className="text-6xl text-white">
                {isPlaying ? '🔊' : '🔈'}
              </span>
            </button>
            
            <p className="text-gray-500 mt-4">
              {isPlaying ? 'Playing...' : 'Tap to hear the sound again'}
            </p>
          </div>

          {/* Letter Options */}
          <div className="grid grid-cols-2 gap-4">
            {options.map((option, index) => (
              <button
                key={`${option.letter}-${index}`}
                onClick={() => handleAnswer(option)}
                disabled={showCorrect || showWrong}
                className="h-24 bg-gradient-to-br from-purple-100 to-pink-100 rounded-2xl flex flex-col items-center justify-center text-4xl font-bold text-gray-800 shadow-lg hover:scale-105 hover:shadow-xl transition-all active:scale-95 disabled:opacity-50"
              >
                <span>{option.letter.toLowerCase()}</span>
                <span className="text-2xl mt-1">{option.image}</span>
              </button>
            ))}
          </div>

          {/* Hint */}
          <div className="text-center mt-6">
            <p className="text-gray-400 text-sm">
              Hint: {currentLetter.word} starts with this letter {currentLetter.image}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
