// components/SentenceBuilderGame.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw, X } from 'lucide-react';

interface GameSentenceBuilder {
  picture: string;
  pictureDescription: string; // What the picture shows
  targetSentence: string;
  words: string[];
  distractorWords: string[];
  difficulty: 'easy' | 'medium' | 'hard';
}

const SentenceBuilderGame: React.FC = () => {
  // Complete sentence progression - picture FIRST, then build sentence describing it
  const sentenceSequence: GameSentenceBuilder[] = [
    // Phase 1: Easy 3-word sentences (Weeks 15-16)
    {
      picture: '🐱',
      pictureDescription: 'A cat',
      targetSentence: 'the cat sat',
      words: ['the', 'cat', 'sat'],
      distractorWords: ['dog', 'ran', 'bat'],
      difficulty: 'easy'
    },
    {
      picture: '🦇',
      pictureDescription: 'A bat',
      targetSentence: 'the bat is',
      words: ['the', 'bat', 'is'],
      distractorWords: ['cat', 'sat', 'big'],
      difficulty: 'easy'
    },
    {
      picture: '👨',
      pictureDescription: 'A man running',
      targetSentence: 'the man ran',
      words: ['the', 'man', 'ran'],
      distractorWords: ['cat', 'sat', 'van'],
      difficulty: 'easy'
    },
    {
      picture: '🚐',
      pictureDescription: 'A van',
      targetSentence: 'the van is',
      words: ['the', 'van', 'is'],
      distractorWords: ['bat', 'big', 'red'],
      difficulty: 'easy'
    },

    // Phase 2: Medium 4-word sentences (Weeks 17-20)
    {
      picture: '🐱',
      pictureDescription: 'A big cat',
      targetSentence: 'the cat is big',
      words: ['the', 'cat', 'is', 'big'],
      distractorWords: ['dog', 'bat', 'sat', 'hot'],
      difficulty: 'medium'
    },
    {
      picture: '🐶',
      pictureDescription: 'A red dog',
      targetSentence: 'the dog is red',
      words: ['the', 'dog', 'is', 'red'],
      distractorWords: ['cat', 'bat', 'sat', 'hot'],
      difficulty: 'medium'
    },
    {
      picture: '🐔',
      pictureDescription: 'A hen sitting down',
      targetSentence: 'the hen sat down',
      words: ['the', 'hen', 'sat', 'down'],
      distractorWords: ['cat', 'ran', 'big', 'up'],
      difficulty: 'medium'
    },
    {
      picture: '🐷',
      pictureDescription: 'A hot pig',
      targetSentence: 'the pig is hot',
      words: ['the', 'pig', 'is', 'hot'],
      distractorWords: ['dog', 'cat', 'big', 'cold'],
      difficulty: 'medium'
    },
    {
      picture: '🐠',
      pictureDescription: 'A blue fish',
      targetSentence: 'the fish is blue',
      words: ['the', 'fish', 'is', 'blue'],
      distractorWords: ['cat', 'red', 'big', 'sat'],
      difficulty: 'medium'
    },
    {
      picture: '🦊',
      pictureDescription: 'A bad fox',
      targetSentence: 'the fox is bad',
      words: ['the', 'fox', 'is', 'bad'],
      distractorWords: ['cat', 'dog', 'good', 'big'],
      difficulty: 'medium'
    },

    // Phase 3: Medium 4-word with 'on' and 'in' (Weeks 21-22)
    {
      picture: '📍',
      pictureDescription: 'A cat on a mat',
      targetSentence: 'the cat sat on mat',
      words: ['the', 'cat', 'sat', 'on', 'mat'],
      distractorWords: ['dog', 'ran', 'in', 'bed', 'bat'],
      difficulty: 'medium'
    },
    {
      picture: '📦',
      pictureDescription: 'A dog in a box',
      targetSentence: 'the dog is in box',
      words: ['the', 'dog', 'is', 'in', 'box'],
      distractorWords: ['cat', 'on', 'bed', 'bat', 'big'],
      difficulty: 'medium'
    },
    {
      picture: '🗑️',
      pictureDescription: 'A fish in a bin',
      targetSentence: 'the fish is in bin',
      words: ['the', 'fish', 'is', 'in', 'bin'],
      distractorWords: ['bat', 'on', 'bed', 'big', 'hot'],
      difficulty: 'medium'
    },
    {
      picture: '🛏️',
      pictureDescription: 'A cat on a bed',
      targetSentence: 'the cat sat on bed',
      words: ['the', 'cat', 'sat', 'on', 'bed'],
      distractorWords: ['dog', 'ran', 'in', 'mat', 'bat'],
      difficulty: 'medium'
    },

    // Phase 4: Hard 5-word sentences (Weeks 23-24)
    {
      picture: '🐱',
      pictureDescription: 'A cat and dog playing',
      targetSentence: 'the cat and dog play',
      words: ['the', 'cat', 'and', 'dog', 'play'],
      distractorWords: ['bat', 'sat', 'run', 'sleep', 'big'],
      difficulty: 'hard'
    },
    {
      picture: '📍',
      pictureDescription: 'A cat sitting on a mat',
      targetSentence: 'the cat sat on mat',
      words: ['the', 'cat', 'sat', 'on', 'mat'],
      distractorWords: ['dog', 'ran', 'in', 'bed', 'rat'],
      difficulty: 'hard'
    },
    {
      picture: '🐶',
      pictureDescription: 'A dog running to a boy',
      targetSentence: 'the dog ran to me',
      words: ['the', 'dog', 'ran', 'to', 'me'],
      distractorWords: ['cat', 'sat', 'in', 'you', 'him'],
      difficulty: 'hard'
    },
    {
      picture: '🐔',
      pictureDescription: 'A hen in a pen',
      targetSentence: 'the hen is in pen',
      words: ['the', 'hen', 'is', 'in', 'pen'],
      distractorWords: ['cat', 'big', 'on', 'bed', 'net'],
      difficulty: 'hard'
    },
    {
      picture: '🐷',
      pictureDescription: 'A pig in mud',
      targetSentence: 'the pig is in mud',
      words: ['the', 'pig', 'is', 'in', 'mud'],
      distractorWords: ['dog', 'big', 'on', 'bed', 'hot'],
      difficulty: 'hard'
    },
    {
      picture: '🐠',
      pictureDescription: 'A fish swimming fast',
      targetSentence: 'the fish can swim fast',
      words: ['the', 'fish', 'can', 'swim', 'fast'],
      distractorWords: ['cat', 'run', 'jump', 'slow', 'big'],
      difficulty: 'hard'
    },

    // Phase 5: Hard 5-word sentences continued (Weeks 25-26)
    {
      picture: '🐱',
      pictureDescription: 'A cat we can see',
      targetSentence: 'i can see the cat',
      words: ['i', 'can', 'see', 'the', 'cat'],
      distractorWords: ['dog', 'hear', 'smell', 'bat', 'big'],
      difficulty: 'hard'
    },
    {
      picture: '⚽',
      pictureDescription: 'A very big ball',
      targetSentence: 'the ball is very big',
      words: ['the', 'ball', 'is', 'very', 'big'],
      distractorWords: ['bat', 'small', 'hot', 'round', 'fast'],
      difficulty: 'hard'
    },
    {
      picture: '🐱',
      pictureDescription: 'A cat sitting still',
      targetSentence: 'the cat will sit down',
      words: ['the', 'cat', 'will', 'sit', 'down'],
      distractorWords: ['dog', 'run', 'stand', 'up', 'big'],
      difficulty: 'hard'
    },
  ];

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtWords, setBuiltWords] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);

  const currentSentence = sentenceSequence[currentSentenceIndex];
  const targetWords = currentSentence.targetSentence.split(' ');
  const isCorrect = builtWords.join(' ') === currentSentence.targetSentence;

  // Initialize available words
  useEffect(() => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
    setIsComplete(false);
  }, [currentSentenceIndex]);

  // Play word sound
  const playWordSound = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Handle drag start from available words
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    word: string,
    index: number
  ) => {
    setDraggedWord(word);
    setDraggedFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over drop zone
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop in sentence builder
  const handleDropInSentence = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggedWord || draggedFromIndex === null) return;

    // Add word to built sentence
    const newBuilt = [...builtWords, draggedWord];
    setBuiltWords(newBuilt);

    // Remove from available words
    const newAvailable = availableWords.filter((_, i) => i !== draggedFromIndex);
    setAvailableWords(newAvailable);

    // Check if word is correct for this position
    if (draggedWord === targetWords[newBuilt.length - 1]) {
      setFeedback('✓ Good!');
      setTimeout(() => setFeedback(''), 1500);

      // Check if sentence is now complete and correct
      if (newBuilt.join(' ') === currentSentence.targetSentence) {
        setIsComplete(true);
        setShowCelebration(true);
        setFeedback('✓ Perfect sentence!');

        // Auto-advance after delay
        setTimeout(() => {
          if (currentSentenceIndex < sentenceSequence.length - 1) {
            setCurrentSentenceIndex(currentSentenceIndex + 1);
          } else {
            setCurrentSentenceIndex(0);
          }
        }, 2500);
      }
    } else {
      // Wrong word for this position
      setFeedback('❌ Not that word!');
      // Remove the last word if incorrect
      setBuiltWords(newBuilt.slice(0, -1));
      setAvailableWords([...newAvailable, draggedWord].sort(() => Math.random() - 0.5));
      setTimeout(() => setFeedback(''), 1500);
    }

    setDraggedWord(null);
    setDraggedFromIndex(null);
  };

  // Remove word from built sentence
  const removeWordFromSentence = (index: number) => {
    const word = builtWords[index];
    const newBuilt = builtWords.filter((_, i) => i !== index);
    setBuiltWords(newBuilt);

    // Add back to available words
    setAvailableWords([...availableWords, word].sort(() => Math.random() - 0.5));
    setFeedback('');
  };

  // Navigate
  const goToPrevious = () => {
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(currentSentenceIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentSentenceIndex < sentenceSequence.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    }
  };

  // Reset current sentence
  const resetSentence = () => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
    setIsComplete(false);
  };

  const getDifficultyColor = () => {
    switch (currentSentence.difficulty) {
      case 'easy':
        return 'from-green-50 to-green-100';
      case 'medium':
        return 'from-blue-50 to-blue-100';
      case 'hard':
        return 'from-purple-50 to-purple-100';
      default:
        return 'from-gray-50 to-gray-100';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColor()} p-4 flex flex-col items-center justify-center`}>
      {/* Header */}
      <div className="w-full max-w-5xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={goToPrevious}
            disabled={currentSentenceIndex === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Sentence Progress</p>
            <p className="text-gray-800 font-semibold">
              {currentSentenceIndex + 1} of {sentenceSequence.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {currentSentence.difficulty === 'easy' && '🟩 Easy (3 words)'}
              {currentSentence.difficulty === 'medium' && '🟦 Medium (4-5 words)'}
              {currentSentence.difficulty === 'hard' && '🟪 Hard (5 words)'}
            </p>
          </div>

          <button
            onClick={goToNext}
            disabled={currentSentenceIndex === sentenceSequence.length - 1}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main game container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-8">
        
        {/* PICTURE AT TOP - What we're describing */}
        <div className="text-center mb-8 p-6 bg-gradient-to-r from-yellow-100 to-orange-100 rounded-2xl border-4 border-orange-300">
          <p className="text-gray-700 font-semibold mb-4">Look at the picture, then build a sentence about it:</p>
          <div className="text-9xl mb-4">
            {currentSentence.picture}
          </div>
          <p className="text-gray-600 text-lg font-semibold" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
            {currentSentence.pictureDescription}
          </p>
        </div>

        {/* Sentence builder area - Where they build */}
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border-2 border-indigo-300">
          <p className="text-gray-700 font-semibold mb-4 text-center">Drag words to build a sentence about this picture:</p>
          
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropInSentence}
            className="flex flex-wrap gap-3 justify-center items-center min-h-20 bg-white rounded-xl p-4 border-4 border-dashed border-indigo-400"
          >
            {builtWords.length === 0 ? (
              <span className="text-gray-400 text-center text-lg">Drag words here to describe the picture...</span>
            ) : (
              builtWords.map((word, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  <button
                    onClick={() => playWordSound(word)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-3 px-5 rounded-lg transition-all text-lg"
                    style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
                  >
                    {word}
                  </button>
                  <button
                    onClick={() => removeWordFromSentence(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`text-center mt-4 px-6 py-3 rounded-lg font-semibold inline-block w-full text-lg ${
              feedback.includes('✓') 
                ? 'bg-green-200 text-green-800' 
                : 'bg-red-200 text-red-800'
            }`}>
              {feedback}
            </div>
          )}

          {/* Progress indicator */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              {builtWords.length} of {targetWords.length} words
            </p>
          </div>
        </div>

        {/* Available words to drag */}
        <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300">
          <p className="text-center text-gray-700 font-semibold mb-4">Available Words (Drag to build the sentence above)</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {availableWords.map((word, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, word, index)}
                onClick={() => playWordSound(word)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-5 rounded-xl text-lg cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-all hover:scale-110"
                title={`Click to hear '${word}', drag to build`}
                style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600 mb-2" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              {currentSentence.targetSentence}
            </p>
            <p className="text-lg text-gray-700">
              {currentSentence.picture} {currentSentence.pictureDescription}
            </p>
            <p className="text-gray-600 mt-3">Next sentence coming...</p>
          </div>
        )}

        {/* Reset button */}
        {!showCelebration && (
          <div className="text-center">
            <button
              onClick={resetSentence}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition"
            >
              <RotateCcw size={20} />
              Reset Sentence
            </button>
          </div>
        )}
      </div>

      {/* Difficulty guide */}
      <div className="w-full max-w-5xl mt-8 bg-white rounded-xl shadow-lg p-6">
        <p className="font-bold text-gray-800 mb-3">📚 Difficulty Levels:</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="font-bold text-green-600">🟩 Easy</p>
            <p className="text-gray-600">3 words</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>the cat sat</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-blue-600">🟦 Medium</p>
            <p className="text-gray-600">4-5 words</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>the cat is big</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-purple-600">🟪 Hard</p>
            <p className="text-gray-600">5 words</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>the cat and dog play</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-5xl mt-8 bg-indigo-50 rounded-xl shadow-lg p-6 border-2 border-indigo-300">
        <p className="font-bold text-indigo-800 mb-3">💡 How to Play:</p>
        <ol className="text-sm text-indigo-700 space-y-2">
          <li>1. Look at the big picture at the top</li>
          <li>2. Read the picture description</li>
          <li>3. Look at the available words at the bottom (orange)</li>
          <li>4. Click any word to hear how to say it</li>
          <li>5. Drag words in the correct order to describe what you see</li>
          <li>6. When the sentence is complete and correct, you'll see a celebration! 🎉</li>
        </ol>
      </div>
    </div>
  );
};

export default SentenceBuilderGame;

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [builtWords, setBuiltWords] = useState<string[]>([]);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [isComplete, setIsComplete] = useState(false);

  const currentSentence = sentenceSequence[currentSentenceIndex];
  const targetWords = currentSentence.targetSentence.split(' ');
  const isCorrect = builtWords.join(' ') === currentSentence.targetSentence;

  // Initialize available words
  useEffect(() => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
    setIsComplete(false);
  }, [currentSentenceIndex]);

  // Play word sound
  const playWordSound = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Handle drag start from available words
  const handleDragStart = (
    e: React.DragEvent<HTMLDivElement>,
    word: string,
    index: number
  ) => {
    setDraggedWord(word);
    setDraggedFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over drop zone
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop in sentence builder
  const handleDropInSentence = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggedWord || draggedFromIndex === null) return;

    // Add word to built sentence
    const newBuilt = [...builtWords, draggedWord];
    setBuiltWords(newBuilt);

    // Remove from available words
    const newAvailable = availableWords.filter((_, i) => i !== draggedFromIndex);
    setAvailableWords(newAvailable);

    // Check if sentence is complete and correct
    if (newBuilt.join(' ') === currentSentence.targetSentence) {
      setIsComplete(true);
      setShowCelebration(true);
      setFeedback('✓ Perfect sentence!');

      // Auto-advance after delay
      setTimeout(() => {
        if (currentSentenceIndex < sentenceSequence.length - 1) {
          setCurrentSentenceIndex(currentSentenceIndex + 1);
        } else {
          setCurrentSentenceIndex(0);
        }
      }, 2500);
    } else if (newBuilt.length < targetWords.length) {
      // Sentence not complete yet, but on right track
      if (newBuilt[newBuilt.length - 1] === targetWords[newBuilt.length - 1]) {
        setFeedback('✓ Good!');
        setTimeout(() => setFeedback(''), 1500);
      } else {
        setFeedback('❌ Not quite!');
        // Remove the last word if incorrect
        setBuiltWords(newBuilt.slice(0, -1));
        setAvailableWords([...newAvailable, draggedWord].sort(() => Math.random() - 0.5));
        setTimeout(() => setFeedback(''), 1500);
      }
    }

    setDraggedWord(null);
    setDraggedFromIndex(null);
  };

  // Remove word from built sentence
  const removeWordFromSentence = (index: number) => {
    const word = builtWords[index];
    const newBuilt = builtWords.filter((_, i) => i !== index);
    setBuiltWords(newBuilt);

    // Add back to available words
    setAvailableWords([...availableWords, word].sort(() => Math.random() - 0.5));
    setFeedback('');
  };

  // Navigate
  const goToPrevious = () => {
    if (currentSentenceIndex > 0) {
      setCurrentSentenceIndex(currentSentenceIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentSentenceIndex < sentenceSequence.length - 1) {
      setCurrentSentenceIndex(currentSentenceIndex + 1);
    }
  };

  // Reset current sentence
  const resetSentence = () => {
    const allWords = [...currentSentence.words, ...currentSentence.distractorWords];
    const shuffled = allWords.sort(() => Math.random() - 0.5);
    setAvailableWords(shuffled);
    setBuiltWords([]);
    setFeedback('');
    setShowCelebration(false);
    setIsComplete(false);
  };

  const getDifficultyColor = () => {
    switch (currentSentence.difficulty) {
      case 'easy':
        return 'from-green-50 to-green-100';
      case 'medium':
        return 'from-blue-50 to-blue-100';
      case 'hard':
        return 'from-purple-50 to-purple-100';
      default:
        return 'from-gray-50 to-gray-100';
    }
  };

  return (
    <div className={`min-h-screen bg-gradient-to-br ${getDifficultyColor()} p-4 flex flex-col items-center justify-center`}>
      {/* Header */}
      <div className="w-full max-w-5xl mb-8">
        <div className="flex justify-between items-center mb-4">
          <button
            onClick={goToPrevious}
            disabled={currentSentenceIndex === 0}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            <ChevronLeft size={20} />
            Previous
          </button>

          <div className="text-center">
            <p className="text-gray-600 text-sm mb-1">Sentence Progress</p>
            <p className="text-gray-800 font-semibold">
              {currentSentenceIndex + 1} of {sentenceSequence.length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {currentSentence.difficulty === 'easy' && '🟩 Easy (2-3 words)'}
              {currentSentence.difficulty === 'medium' && '🟦 Medium (4 words)'}
              {currentSentence.difficulty === 'hard' && '🟪 Hard (5 words)'}
            </p>
          </div>

          <button
            onClick={goToNext}
            disabled={currentSentenceIndex === sentenceSequence.length - 1}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Main game container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl p-8">
        
        {/* Picture at top */}
        <div className="text-center mb-8">
          <p className="text-gray-700 font-semibold mb-4">Build this sentence to see the picture:</p>
          <div className="text-9xl mb-4 transition-all duration-300">
            {isCorrect ? currentSentence.picture : '?'}
          </div>
          <p className="text-gray-600 text-sm">Picture will appear when sentence is complete!</p>
        </div>

        {/* Sentence builder area */}
        <div className="mb-8 p-6 bg-gradient-to-r from-indigo-50 to-blue-50 rounded-2xl border-2 border-indigo-300 min-h-24">
          <p className="text-gray-700 font-semibold mb-4 text-center">Drag words here to build the sentence:</p>
          
          <div
            onDragOver={handleDragOver}
            onDrop={handleDropInSentence}
            className="flex flex-wrap gap-3 justify-center items-center min-h-16 bg-white rounded-xl p-4 border-2 border-dashed border-indigo-300"
          >
            {builtWords.length === 0 ? (
              <span className="text-gray-400 text-center">Drag words here...</span>
            ) : (
              builtWords.map((word, index) => (
                <div
                  key={index}
                  className="relative group"
                >
                  <button
                    onClick={() => playWordSound(word)}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold py-2 px-4 rounded-lg transition-all"
                    style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
                  >
                    {word}
                  </button>
                  <button
                    onClick={() => removeWordFromSentence(index)}
                    className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Feedback */}
          {feedback && (
            <div className={`text-center mt-4 px-6 py-3 rounded-lg font-semibold inline-block w-full ${
              feedback.includes('✓') 
                ? 'bg-green-200 text-green-800' 
                : 'bg-red-200 text-red-800'
            }`}>
              {feedback}
            </div>
          )}

          {/* Progress indicator */}
          <div className="text-center mt-4">
            <p className="text-sm text-gray-600">
              {builtWords.length} of {targetWords.length} words
            </p>
          </div>
        </div>

        {/* Available words to drag */}
        <div className="mb-8 p-6 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-2xl border-2 border-dashed border-orange-300">
          <p className="text-center text-gray-700 font-semibold mb-4">Available Words (Drag to build sentence above)</p>
          <div className="flex flex-wrap gap-3 justify-center">
            {availableWords.map((word, index) => (
              <div
                key={index}
                draggable
                onDragStart={(e) => handleDragStart(e, word, index)}
                onClick={() => playWordSound(word)}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-5 rounded-xl text-lg cursor-grab active:cursor-grabbing shadow-md hover:shadow-lg transition-all hover:scale-110"
                title={`Click to hear '${word}', drag to build`}
                style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
              >
                {word}
              </div>
            ))}
          </div>
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mb-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              {currentSentence.picture} {currentSentence.targetSentence}
            </p>
            <p className="text-gray-600 mt-3">Next sentence coming...</p>
          </div>
        )}

        {/* Reset button */}
        {!showCelebration && (
          <div className="text-center">
            <button
              onClick={resetSentence}
              className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 mx-auto transition"
            >
              <RotateCcw size={20} />
              Reset Sentence
            </button>
          </div>
        )}
      </div>

      {/* Difficulty guide */}
      <div className="w-full max-w-5xl mt-8 bg-white rounded-xl shadow-lg p-6">
        <p className="font-bold text-gray-800 mb-3">📚 Difficulty Levels:</p>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-center">
            <p className="font-bold text-green-600">🟩 Easy</p>
            <p className="text-gray-600">2-3 words</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>cat sat</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-blue-600">🟦 Medium</p>
            <p className="text-gray-600">4 words</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>the cat is big</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-purple-600">🟪 Hard</p>
            <p className="text-gray-600">5 words</p>
            <p className="text-xs text-gray-500" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>the cat and dog play</p>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="w-full max-w-5xl mt-8 bg-indigo-50 rounded-xl shadow-lg p-6 border-2 border-indigo-300">
        <p className="font-bold text-indigo-800 mb-3">💡 How to Play:</p>
        <ol className="text-sm text-indigo-700 space-y-2">
          <li>1. Look at the available words at the bottom (orange)</li>
          <li>2. Click any word to hear how to say it</li>
          <li>3. Drag words to the box above to build the sentence</li>
          <li>4. Click the X to remove a word if you make a mistake</li>
          <li>5. When the sentence is complete and correct, the picture appears! 🎉</li>
        </ol>
      </div>
    </div>
  );
};

export default SentenceBuilderGame;
