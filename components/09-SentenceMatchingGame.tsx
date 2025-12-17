// components/SentenceMatchingGame.tsx

'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';

interface SentenceItem {
  sentence: string;
  words: string[]; // Array of words in sentence for audio
  picture: string;
  correctPictureIndex: number; // Which picture is correct
}

interface GameSentence {
  sentence: string;
  words: string[];
  pictures: string[]; // Array of 3 pictures
  correctPictureIndex: number;
  difficulty: 'easy' | 'medium' | 'hard';
}

const SentenceMatchingGame: React.FC = () => {
  // Complete sentence progression using learned words
  const sentenceSequence: GameSentence[] = [
    // Phase 1: CVC Short A words (Weeks 13-16)
    {
      sentence: 'The cat sat.',
      words: ['the', 'cat', 'sat'],
      pictures: ['🐱', '🐶', '🦇'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },
    {
      sentence: 'The bat is big.',
      words: ['the', 'bat', 'is', 'big'],
      pictures: ['🦇', '🐱', '🎩'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },
    {
      sentence: 'The man ran.',
      words: ['the', 'man', 'ran'],
      pictures: ['👨', '👋', '🐀'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },
    {
      sentence: 'The van is red.',
      words: ['the', 'van', 'is', 'red'],
      pictures: ['🚐', '🚌', '🚗'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },
    {
      sentence: 'The cat and bat sat.',
      words: ['the', 'cat', 'and', 'bat', 'sat'],
      pictures: ['🐱', '🦇', '🐶'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The rat sat on the mat.',
      words: ['the', 'rat', 'sat', 'on', 'the', 'mat'],
      pictures: ['🐀', '🐱', '📍'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The fat cat ran.',
      words: ['the', 'fat', 'cat', 'ran'],
      pictures: ['🐱', '🐶', '🦇'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The fan is in the pan.',
      words: ['the', 'fan', 'is', 'in', 'the', 'pan'],
      pictures: ['🌀', '🍳', '🎯'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },

    // Phase 2: CVC Short E words (Weeks 17-18)
    {
      sentence: 'The bed is red.',
      words: ['the', 'bed', 'is', 'red'],
      pictures: ['🛏️', '🔴', '💡'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },
    {
      sentence: 'The hen sat on the net.',
      words: ['the', 'hen', 'sat', 'on', 'the', 'net'],
      pictures: ['🐔', '🥅', '🏠'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The pet is in the pen.',
      words: ['the', 'pet', 'is', 'in', 'the', 'pen'],
      pictures: ['🐕', '✏️', '🔟'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The men and the hen.',
      words: ['the', 'men', 'and', 'the', 'hen'],
      pictures: ['👨‍👨‍👧', '🐔', '🔔'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },

    // Phase 3: CVC Short I words (Weeks 19-20)
    {
      sentence: 'The pig is big.',
      words: ['the', 'pig', 'is', 'big'],
      pictures: ['🐷', '🦣', '🌀'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },
    {
      sentence: 'The fish is in the bin.',
      words: ['the', 'fish', 'is', 'in', 'the', 'bin'],
      pictures: ['🐠', '🗑️', '💡'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The cat sat on the wig.',
      words: ['the', 'cat', 'sat', 'on', 'the', 'wig'],
      pictures: ['👴', '🐱', '📌'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The big pig and the cat.',
      words: ['the', 'big', 'pig', 'and', 'the', 'cat'],
      pictures: ['🐷', '🐱', '🐠'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },

    // Phase 4: CVC Short O words (Weeks 21-22)
    {
      sentence: 'The dog is in the box.',
      words: ['the', 'dog', 'is', 'in', 'the', 'box'],
      pictures: ['🐶', '📦', '🔥'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The cat sat on top.',
      words: ['the', 'cat', 'sat', 'on', 'top'],
      pictures: ['🐱', '🎪', '🦊'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The fox is in the log.',
      words: ['the', 'fox', 'is', 'in', 'the', 'log'],
      pictures: ['🦊', '🪵', '🌫️'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The dog and the fox.',
      words: ['the', 'dog', 'and', 'the', 'fox'],
      pictures: ['🐶', '🦊', '🐷'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },

    // Phase 5: CVC Short U words (Weeks 21-22)
    {
      sentence: 'The bug is on the rug.',
      words: ['the', 'bug', 'is', 'on', 'the', 'rug'],
      pictures: ['🐛', '🧶', '☕'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The mug is hot.',
      words: ['the', 'mug', 'is', 'hot'],
      pictures: ['☕', '🔥', '🚌'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },
    {
      sentence: 'The bus is big.',
      words: ['the', 'bus', 'is', 'big'],
      pictures: ['🚌', '🦣', '☕'],
      correctPictureIndex: 0,
      difficulty: 'easy'
    },

    // Phase 6: 4-letter words (Weeks 23-24)
    {
      sentence: 'The bell is loud.',
      words: ['the', 'bell', 'is', 'loud'],
      pictures: ['🔔', '🎵', '💵'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The ball is on the hill.',
      words: ['the', 'ball', 'is', 'on', 'the', 'hill'],
      pictures: ['⚽', '⛰️', '💵'],
      correctPictureIndex: 0,
      difficulty: 'hard'
    },
    {
      sentence: 'The pill is small.',
      words: ['the', 'pill', 'is', 'small'],
      pictures: ['💊', '👶', '🔔'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The cat and the ball.',
      words: ['the', 'cat', 'and', 'the', 'ball'],
      pictures: ['⚽', '🐱', '🐶'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },

    // Phase 7: 5-letter words (Weeks 25-26)
    {
      sentence: 'The cat is small.',
      words: ['the', 'cat', 'is', 'small'],
      pictures: ['🐱', '👶', '🦣'],
      correctPictureIndex: 0,
      difficulty: 'medium'
    },
    {
      sentence: 'The cat will sit still.',
      words: ['the', 'cat', 'will', 'sit', 'still'],
      pictures: ['🐱', '⏸️', '🚀'],
      correctPictureIndex: 0,
      difficulty: 'hard'
    },
    {
      sentence: 'I can smell the cat.',
      words: ['i', 'can', 'smell', 'the', 'cat'],
      pictures: ['🐱', '👃', '🐶'],
      correctPictureIndex: 0,
      difficulty: 'hard'
    },
  ];

  const [currentSentenceIndex, setCurrentSentenceIndex] = useState(0);
  const [shuffledPictures, setShuffledPictures] = useState<string[]>([]);
  const [draggedPicture, setDraggedPicture] = useState<string | null>(null);
  const [matchedPicture, setMatchedPicture] = useState<string | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [feedback, setFeedback] = useState<string>('');
  const [draggedFromIndex, setDraggedFromIndex] = useState<number | null>(null);

  const currentSentence = sentenceSequence[currentSentenceIndex];

  // Initialize and shuffle pictures
  useEffect(() => {
    const shuffled = [...currentSentence.pictures].sort(() => Math.random() - 0.5);
    setShuffledPictures(shuffled);
    setMatchedPicture(null);
    setFeedback('');
    setShowCelebration(false);
  }, [currentSentenceIndex]);

  // Play word sound
  const playWordSound = (word: string) => {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.rate = 0.8;
    speechSynthesis.speak(utterance);
  };

  // Play picture sound (emoji name)
  const playPictureSound = (picture: string) => {
    // Map emoji to word
    const emojiToWord: { [key: string]: string } = {
      '🐱': 'cat',
      '🐶': 'dog',
      '🦇': 'bat',
      '🎩': 'hat',
      '🐀': 'rat',
      '👨': 'man',
      '👋': 'pat',
      '🚐': 'van',
      '🚌': 'bus',
      '🚗': 'car',
      '🛏️': 'bed',
      '🔴': 'red',
      '💡': 'light',
      '🐔': 'hen',
      '✏️': 'pen',
      '🥅': 'net',
      '🏠': 'den',
      '🔟': 'ten',
      '🐷': 'pig',
      '🐠': 'fish',
      '🗑️': 'bin',
      '👴': 'wig',
      '🌀': 'fan',
      '🍳': 'pan',
      '🎯': 'target',
      '🦣': 'elephant',
      '🐛': 'bug',
      '🧶': 'rug',
      '☕': 'mug',
      '🔔': 'bell',
      '⚽': 'ball',
      '⛰️': 'hill',
      '💵': 'bill',
      '💊': 'pill',
      '🎵': 'music',
      '👶': 'baby',
      '⏸️': 'pause',
      '🚀': 'rocket',
      '👃': 'nose',
      '🌫️': 'fog',
      '🦊': 'fox',
      '🪵': 'log',
      '📍': 'mat',
      '🍲': 'pot',
      '🔥': 'fire',
      '🎪': 'circus',
      '👨‍👨‍👧': 'family',
    };

    const word = emojiToWord[picture] || 'picture';
    playWordSound(word);
  };

  // Handle drag start from picture tiles
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, picture: string, index: number) => {
    setDraggedPicture(picture);
    setDraggedFromIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over drop zone
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop in box
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();

    if (!draggedPicture) return;

    // Check if this is the correct picture
    if (draggedPicture === currentSentence.pictures[currentSentence.correctPictureIndex]) {
      setMatchedPicture(draggedPicture);
      setFeedback('✓ Correct!');
      setShowCelebration(true);

      // Auto-advance after delay
      setTimeout(() => {
        if (currentSentenceIndex < sentenceSequence.length - 1) {
          setCurrentSentenceIndex(currentSentenceIndex + 1);
        } else {
          setCurrentSentenceIndex(0);
        }
      }, 2500);
    } else {
      setFeedback('❌ Not quite! Try again.');
      setTimeout(() => setFeedback(''), 2000);
    }

    setDraggedPicture(null);
    setDraggedFromIndex(null);
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
    const shuffled = [...currentSentence.pictures].sort(() => Math.random() - 0.5);
    setShuffledPictures(shuffled);
    setMatchedPicture(null);
    setFeedback('');
    setShowCelebration(false);
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
              {currentSentence.difficulty === 'easy' && '🟩 Easy'}
              {currentSentence.difficulty === 'medium' && '🟦 Medium'}
              {currentSentence.difficulty === 'hard' && '🟪 Hard'}
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
        <div className="grid grid-cols-2 gap-8">
          
          {/* LEFT SIDE: Picture tiles to drag */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-700 font-semibold mb-6 text-center">Drag a picture →</p>
            <div className="flex flex-wrap gap-4 justify-center">
              {shuffledPictures.map((picture, index) => {
                const isMatched = matchedPicture === picture;

                return (
                  <div
                    key={index}
                    draggable={!isMatched}
                    onDragStart={(e) => handleDragStart(e, picture, index)}
                    onClick={() => playPictureSound(picture)}
                    className={`
                      text-6xl p-6 rounded-2xl cursor-grab active:cursor-grabbing
                      transition-all duration-200 shadow-lg hover:shadow-xl
                      ${isMatched 
                        ? 'opacity-50 pointer-events-none' 
                        : 'bg-yellow-100 hover:bg-yellow-200 hover:scale-110'
                      }
                    `}
                    title="Click to hear picture name, drag to match"
                  >
                    {picture}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT SIDE: Sentence with blank box */}
          <div className="flex flex-col items-center justify-center">
            <p className="text-gray-700 font-semibold mb-8 text-center">← Match here</p>
            
            {/* Sentence display */}
            <div className="mb-8 text-center">
              <div 
                className="text-2xl leading-relaxed mb-4"
                style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}
              >
                {currentSentence.sentence.split(' ').map((word, index) => (
                  <span
                    key={index}
                    onClick={() => playWordSound(word.replace(/[.,!?]/g, ''))}
                    className="inline-block mr-3 mb-2 px-2 py-1 rounded hover:bg-blue-200 cursor-pointer transition-colors"
                    title="Click to hear the word"
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>

            {/* Drop zone for picture */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`
                w-40 h-40 rounded-2xl border-4 border-dashed flex items-center justify-center
                transition-all duration-200
                ${
                  matchedPicture
                    ? 'bg-green-200 border-green-500 shadow-lg'
                    : 'bg-gray-100 border-gray-300 hover:border-indigo-500 hover:bg-indigo-50'
                }
              `}
            >
              {matchedPicture ? (
                <div className="text-8xl animate-bounce">{matchedPicture}</div>
              ) : (
                <span className="text-6xl text-gray-300">?</span>
              )}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`inline-block px-6 py-3 rounded-lg font-semibold text-lg mt-6 ${
                feedback.includes('✓') 
                  ? 'bg-green-200 text-green-800' 
                  : 'bg-red-200 text-red-800'
              }`}>
                {feedback}
              </div>
            )}
          </div>
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mt-8 animate-bounce">
            <p className="text-6xl mb-4">🎉</p>
            <p className="text-3xl font-bold text-green-600 mb-2">Excellent!</p>
            <p className="text-2xl font-bold text-indigo-600" style={{ fontFamily: 'Comic Sans MS, Comic Sans, cursive' }}>
              {currentSentence.pictures[currentSentence.correctPictureIndex]} matches the sentence!
            </p>
            <p className="text-gray-600 mt-3">Next sentence coming...</p>
          </div>
        )}

        {/* Reset button */}
        {!showCelebration && (
          <div className="text-center mt-8">
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
            <p className="text-gray-600">Simple 2-3 word sentences</p>
            <p className="text-xs text-gray-500">The cat sat.</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-blue-600">🟦 Medium</p>
            <p className="text-gray-600">4-5 word sentences</p>
            <p className="text-xs text-gray-500">The dog is in the box.</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-purple-600">🟪 Hard</p>
            <p className="text-gray-600">Complex sentences</p>
            <p className="text-xs text-gray-500">The cat will sit still.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SentenceMatchingGame;
