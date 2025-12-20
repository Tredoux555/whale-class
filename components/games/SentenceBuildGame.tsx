// components/games/SentenceBuildGame.tsx
// Drag words to build sentences

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SENTENCES } from '@/lib/games/game-data';
import { speakSentence, playCorrectSound, playWrongSound } from '@/lib/games/sound-utils';
import GameWrapper, { CorrectFeedback, WrongFeedback, CompleteFeedback } from './GameWrapper';

interface Props {
  level: string;
}

interface SentenceData {
  words: string[];
  image: string;
}

export default function SentenceBuildGame({ level }: Props) {
  const router = useRouter();
  const [sentences, setSentences] = useState<SentenceData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedWords, setSelectedWords] = useState<string[]>([]);
  const [availableWords, setAvailableWords] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [showCorrect, setShowCorrect] = useState(false);
  const [showWrong, setShowWrong] = useState(false);
  const [gameComplete, setGameComplete] = useState(false);

  const totalQuestions = 5;

  // Get sentences
  useEffect(() => {
    const levelKey = level as keyof typeof SENTENCES;
    const sentenceList = SENTENCES[levelKey] || SENTENCES['level-1'];
    const shuffled = [...sentenceList].sort(() => Math.random() - 0.5).slice(0, totalQuestions);
    setSentences(shuffled);
  }, [level]);

  // Setup words for current sentence
  useEffect(() => {
    if (sentences.length === 0 || currentIndex >= sentences.length) return;

    const words = [...sentences[currentIndex].words];
    setAvailableWords(words.sort(() => Math.random() - 0.5));
    setSelectedWords([]);
  }, [currentIndex, sentences]);

  const handleWordClick = (word: string, index: number) => {
    if (showCorrect || showWrong) return;

    setSelectedWords(prev => [...prev, word]);
    
    const newAvailable = [...availableWords];
    newAvailable.splice(index, 1);
    setAvailableWords(newAvailable);
  };

  const handleRemoveWord = (index: number) => {
    if (showCorrect || showWrong) return;

    const word = selectedWords[index];
    
    const newSelected = [...selectedWords];
    newSelected.splice(index, 1);
    setSelectedWords(newSelected);
    
    setAvailableWords(prev => [...prev, word]);
  };

  const checkAnswer = () => {
    if (showCorrect || showWrong) return;

    const correctSentence = sentences[currentIndex].words;
    const isCorrect = selectedWords.length === correctSentence.length &&
      selectedWords.every((word, index) => word === correctSentence[index]);

    if (isCorrect) {
      setScore(prev => prev + 1);
      setShowCorrect(true);
      speakSentence(correctSentence.join(' '));
    } else {
      setShowWrong(true);
    }
  };

  const handleNextQuestion = () => {
    setShowCorrect(false);
    setShowWrong(false);

    if (currentIndex + 1 >= totalQuestions) {
      setGameComplete(true);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (sentences.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-4xl animate-spin">🎮</div>
      </div>
    );
  }

  if (gameComplete) {
    return (
      <GameWrapper score={score} totalQuestions={totalQuestions} currentQuestion={totalQuestions}>
        <CompleteFeedback
          score={score}
          total={totalQuestions}
          onPlayAgain={() => {
            setCurrentIndex(0);
            setScore(0);
            setGameComplete(false);
            setSentences(prev => [...prev].sort(() => Math.random() - 0.5));
          }}
          onExit={() => router.push('/games')}
        />
      </GameWrapper>
    );
  }

  const currentSentence = sentences[currentIndex];

  return (
    <GameWrapper 
      score={score} 
      totalQuestions={totalQuestions} 
      currentQuestion={currentIndex + 1}
      showCelebration={showCorrect}
    >
      <div className="relative">
        {showCorrect && <CorrectFeedback onComplete={handleNextQuestion} />}
        {showWrong && (
          <WrongFeedback 
            correctAnswer={currentSentence.words.join(' ')} 
            onComplete={handleNextQuestion} 
          />
        )}

        {/* Picture hint */}
        <div className="text-center mb-6">
          <div className="text-7xl mb-2">{currentSentence.image}</div>
          <h2 className="text-xl font-bold text-gray-700">
            Build a sentence about this picture!
          </h2>
        </div>

        {/* Sentence building area */}
        <div className="bg-gray-100 rounded-2xl p-4 mb-6 min-h-[70px] flex flex-wrap items-center justify-center gap-2">
          {selectedWords.length === 0 ? (
            <p className="text-gray-400 text-lg">Tap words below to build the sentence</p>
          ) : (
            selectedWords.map((word, index) => (
              <button
                key={`selected-${index}`}
                onClick={() => handleRemoveWord(index)}
                className="px-4 py-2 bg-teal-500 text-white rounded-xl text-xl font-bold shadow-lg hover:scale-105 transition-transform"
                style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
              >
                {word}
              </button>
            ))
          )}
        </div>

        {/* Available words */}
        <div className="flex flex-wrap justify-center gap-3 mb-6">
          {availableWords.map((word, index) => (
            <button
              key={`available-${index}`}
              onClick={() => handleWordClick(word, index)}
              disabled={showCorrect || showWrong}
              className="px-4 py-2 bg-white border-2 border-gray-300 rounded-xl text-xl font-bold text-gray-700 shadow hover:scale-105 hover:border-teal-400 transition-all disabled:opacity-50"
              style={{ fontFamily: "'Comic Sans MS', 'Comic Sans', cursive" }}
            >
              {word}
            </button>
          ))}
        </div>

        {/* Check button */}
        <div className="text-center">
          <button
            onClick={checkAnswer}
            disabled={selectedWords.length === 0 || showCorrect || showWrong}
            className="px-10 py-4 bg-teal-500 text-white rounded-2xl text-xl font-bold hover:bg-teal-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            ✓ Check Sentence
          </button>
        </div>

        {/* Hear sentence button */}
        <div className="text-center mt-4">
          <button
            onClick={() => speakSentence(currentSentence.words.join(' '))}
            className="px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-bold hover:bg-blue-200 transition-colors"
          >
            🔊 Hear the sentence
          </button>
        </div>
      </div>
    </GameWrapper>
  );
}

