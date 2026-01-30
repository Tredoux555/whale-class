'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// ==========================================
// PHONICS CURRICULUM DATA
// ==========================================
const PHONICS_STAGES = {
  cvc: {
    name: 'CVC Words',
    emoji: '🐱',
    color: 'from-green-400 to-emerald-500',
    description: 'cat, bed, pig, hot, cup',
    words: [
      { word: 'cat', picture: '🐱' },
      { word: 'bat', picture: '🦇' },
      { word: 'hat', picture: '🎩' },
      { word: 'mat', picture: '🧹' },
      { word: 'rat', picture: '🐀' },
      { word: 'bed', picture: '🛏️' },
      { word: 'pet', picture: '🐕' },
      { word: 'jet', picture: '✈️' },
      { word: 'net', picture: '🥅' },
      { word: 'wet', picture: '💧' },
      { word: 'pig', picture: '🐷' },
      { word: 'big', picture: '🐘' },
      { word: 'dig', picture: '⛏️' },
      { word: 'wig', picture: '💇' },
      { word: 'fig', picture: '🫐' },
      { word: 'hot', picture: '🔥' },
      { word: 'pot', picture: '🍲' },
      { word: 'dot', picture: '⚫' },
      { word: 'cot', picture: '🛏️' },
      { word: 'dog', picture: '🐕' },
      { word: 'cup', picture: '☕' },
      { word: 'nut', picture: '🥜' },
      { word: 'hut', picture: '🏠' },
      { word: 'bug', picture: '🐛' },
      { word: 'mug', picture: '🍵' },
    ],
  },
  diphthongs: {
    name: 'Diphthongs',
    emoji: '🐄',
    color: 'from-orange-400 to-amber-500',
    description: 'oi/oy, ou/ow, au/aw',
    words: [
      { word: 'boy', picture: '👦' },
      { word: 'toy', picture: '🧸' },
      { word: 'joy', picture: '😊' },
      { word: 'oil', picture: '🛢️' },
      { word: 'coin', picture: '🪙' },
      { word: 'cow', picture: '🐄' },
      { word: 'how', picture: '❓' },
      { word: 'now', picture: '⏰' },
      { word: 'owl', picture: '🦉' },
      { word: 'out', picture: '🚪' },
      { word: 'loud', picture: '📢' },
      { word: 'saw', picture: '🪚' },
      { word: 'paw', picture: '🐾' },
      { word: 'jaw', picture: '🦷' },
      { word: 'raw', picture: '🥩' },
    ],
  },
  digraphs: {
    name: 'Digraphs',
    emoji: '🚢',
    color: 'from-purple-400 to-violet-500',
    description: 'sh, ch, th, wh, ck, ng',
    words: [
      { word: 'ship', picture: '🚢' },
      { word: 'shop', picture: '🏪' },
      { word: 'fish', picture: '🐟' },
      { word: 'dish', picture: '🍽️' },
      { word: 'wish', picture: '⭐' },
      { word: 'chip', picture: '🍟' },
      { word: 'chop', picture: '🔪' },
      { word: 'chin', picture: '👤' },
      { word: 'rich', picture: '💰' },
      { word: 'this', picture: '👆' },
      { word: 'that', picture: '👉' },
      { word: 'thin', picture: '📏' },
      { word: 'bath', picture: '🛁' },
      { word: 'duck', picture: '🦆' },
      { word: 'kick', picture: '🦶' },
      { word: 'rock', picture: '🪨' },
      { word: 'king', picture: '🤴' },
      { word: 'ring', picture: '💍' },
      { word: 'sing', picture: '🎤' },
      { word: 'song', picture: '🎵' },
    ],
  },
  blends: {
    name: 'Blends',
    emoji: '🐸',
    color: 'from-teal-400 to-cyan-500',
    description: 'bl, br, cl, cr, dr, fl, fr...',
    words: [
      { word: 'frog', picture: '🐸' },
      { word: 'flag', picture: '🚩' },
      { word: 'clap', picture: '👏' },
      { word: 'crab', picture: '🦀' },
      { word: 'drum', picture: '🥁' },
      { word: 'drip', picture: '💧' },
      { word: 'star', picture: '⭐' },
      { word: 'stop', picture: '🛑' },
      { word: 'spin', picture: '🌀' },
      { word: 'snail', picture: '🐌' },
      { word: 'swim', picture: '🏊' },
      { word: 'swing', picture: '🎠' },
      { word: 'truck', picture: '🚚' },
      { word: 'tree', picture: '🌳' },
      { word: 'grass', picture: '🌿' },
      { word: 'brick', picture: '🧱' },
      { word: 'brush', picture: '🖌️' },
      { word: 'plant', picture: '🌱' },
      { word: 'block', picture: '🧊' },
      { word: 'clock', picture: '🕐' },
    ],
  },
  vowelTeams: {
    name: 'Vowel Teams',
    emoji: '🌧️',
    color: 'from-red-400 to-rose-500',
    description: 'ai, ay, ee, ea, oa, ow, oo',
    words: [
      { word: 'rain', picture: '🌧️' },
      { word: 'train', picture: '🚂' },
      { word: 'play', picture: '🎮' },
      { word: 'day', picture: '☀️' },
      { word: 'bee', picture: '🐝' },
      { word: 'tree', picture: '🌳' },
      { word: 'sea', picture: '🌊' },
      { word: 'team', picture: '👥' },
      { word: 'boat', picture: '⛵' },
      { word: 'goat', picture: '🐐' },
      { word: 'coat', picture: '🧥' },
      { word: 'road', picture: '🛤️' },
      { word: 'snow', picture: '❄️' },
      { word: 'grow', picture: '🌱' },
      { word: 'moon', picture: '🌙' },
      { word: 'food', picture: '🍔' },
      { word: 'book', picture: '📖' },
      { word: 'cook', picture: '👨‍🍳' },
      { word: 'pie', picture: '🥧' },
      { word: 'night', picture: '🌃' },
    ],
  },
  rControlled: {
    name: 'R-Controlled',
    emoji: '⭐',
    color: 'from-blue-400 to-indigo-500',
    description: 'ar, or, er, ir, ur',
    words: [
      { word: 'car', picture: '🚗' },
      { word: 'star', picture: '⭐' },
      { word: 'jar', picture: '🫙' },
      { word: 'farm', picture: '🌾' },
      { word: 'arm', picture: '💪' },
      { word: 'park', picture: '🏞️' },
      { word: 'fork', picture: '🍴' },
      { word: 'corn', picture: '🌽' },
      { word: 'horn', picture: '📯' },
      { word: 'horse', picture: '🐴' },
      { word: 'bird', picture: '🐦' },
      { word: 'girl', picture: '👧' },
      { word: 'dirt', picture: '🪴' },
      { word: 'fern', picture: '🌿' },
      { word: 'fur', picture: '🦊' },
      { word: 'burn', picture: '🔥' },
      { word: 'turn', picture: '↩️' },
      { word: 'surf', picture: '🏄' },
    ],
  },
};

type Stage = keyof typeof PHONICS_STAGES;
type GameMode = 'select' | 'wordMatch' | 'soundSort' | 'results';

interface GameState {
  stage: Stage | null;
  mode: GameMode;
  currentQuestion: number;
  score: number;
  totalQuestions: number;
  questions: any[];
  answers: boolean[];
  startTime: number | null;
}

// Shuffle array
function shuffle<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default function PhonicsChallengePage() {
  const router = useRouter();
  const [gameState, setGameState] = useState<GameState>({
    stage: null,
    mode: 'select',
    currentQuestion: 0,
    score: 0,
    totalQuestions: 10,
    questions: [],
    answers: [],
    startTime: null,
  });
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  // Generate questions for word match game
  const generateWordMatchQuestions = useCallback((stage: Stage) => {
    const stageData = PHONICS_STAGES[stage];
    const words = shuffle(stageData.words).slice(0, 10);

    return words.map(item => {
      const otherWords = stageData.words.filter(w => w.word !== item.word);
      const wrongAnswers = shuffle(otherWords).slice(0, 3).map(w => w.word);
      const options = shuffle([item.word, ...wrongAnswers]);

      return {
        type: 'wordMatch',
        picture: item.picture,
        correctAnswer: item.word,
        options,
      };
    });
  }, []);

  // Start game
  const startGame = (stage: Stage, mode: 'wordMatch' | 'soundSort') => {
    const questions = mode === 'wordMatch'
      ? generateWordMatchQuestions(stage)
      : generateWordMatchQuestions(stage); // Same for now

    setGameState({
      stage,
      mode,
      currentQuestion: 0,
      score: 0,
      totalQuestions: questions.length,
      questions,
      answers: [],
      startTime: Date.now(),
    });
    setSelectedAnswer(null);
    setShowFeedback(false);
  };

  // Handle answer selection
  const handleAnswer = (answer: string) => {
    if (showFeedback) return;

    const question = gameState.questions[gameState.currentQuestion];
    const correct = answer === question.correctAnswer;

    setSelectedAnswer(answer);
    setIsCorrect(correct);
    setShowFeedback(true);

    setTimeout(() => {
      const newAnswers = [...gameState.answers, correct];
      const newScore = correct ? gameState.score + 1 : gameState.score;

      if (gameState.currentQuestion + 1 >= gameState.totalQuestions) {
        // Game over
        setGameState(prev => ({
          ...prev,
          mode: 'results',
          score: newScore,
          answers: newAnswers,
        }));
      } else {
        // Next question
        setGameState(prev => ({
          ...prev,
          currentQuestion: prev.currentQuestion + 1,
          score: newScore,
          answers: newAnswers,
        }));
      }
      setSelectedAnswer(null);
      setShowFeedback(false);
    }, 1000);
  };

  // Reset game
  const resetGame = () => {
    setGameState({
      stage: null,
      mode: 'select',
      currentQuestion: 0,
      score: 0,
      totalQuestions: 10,
      questions: [],
      answers: [],
      startTime: null,
    });
  };

  // Calculate stars based on score
  const getStars = (score: number, total: number) => {
    const percentage = score / total;
    if (percentage >= 0.9) return 3;
    if (percentage >= 0.7) return 2;
    if (percentage >= 0.5) return 1;
    return 0;
  };

  // ==========================================
  // STAGE SELECT SCREEN
  // ==========================================
  if (gameState.mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.back()}
              className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white text-xl"
            >
              ←
            </button>
            <h1 className="text-2xl font-bold text-white">🎮 Phonics Challenge</h1>
            <div className="w-12" />
          </div>

          {/* Subtitle */}
          <p className="text-center text-white/70 mb-8">
            Pick a stage to practice! Show your parents what you learned!
          </p>

          {/* Stage Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Object.entries(PHONICS_STAGES).map(([key, stage]) => (
              <button
                key={key}
                onClick={() => startGame(key as Stage, 'wordMatch')}
                className={`bg-gradient-to-br ${stage.color} p-6 rounded-2xl shadow-lg hover:scale-105 transition-all text-left`}
              >
                <span className="text-4xl mb-2 block">{stage.emoji}</span>
                <h3 className="text-white font-bold text-lg">{stage.name}</h3>
                <p className="text-white/70 text-sm">{stage.description}</p>
              </button>
            ))}
          </div>

          {/* Instructions */}
          <div className="mt-8 bg-white/10 rounded-2xl p-6 text-center">
            <h3 className="text-white font-bold mb-2">How to Play</h3>
            <p className="text-white/70">
              Look at the picture, then tap the word that matches!<br/>
              Get stars to show your parents! ⭐⭐⭐
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // RESULTS SCREEN
  // ==========================================
  if (gameState.mode === 'results') {
    const stars = getStars(gameState.score, gameState.totalQuestions);
    const stageName = gameState.stage ? PHONICS_STAGES[gameState.stage].name : '';
    const stageEmoji = gameState.stage ? PHONICS_STAGES[gameState.stage].emoji : '';
    const timeTaken = gameState.startTime
      ? Math.round((Date.now() - gameState.startTime) / 1000)
      : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center shadow-2xl">
          {/* Stars */}
          <div className="text-6xl mb-4">
            {[1, 2, 3].map(i => (
              <span key={i} className={i <= stars ? '' : 'opacity-30'}>⭐</span>
            ))}
          </div>

          {/* Score */}
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {stars === 3 ? 'Amazing!' : stars === 2 ? 'Great Job!' : stars === 1 ? 'Good Try!' : 'Keep Practicing!'}
          </h2>

          <p className="text-gray-600 mb-6">
            {stageEmoji} {stageName}
          </p>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-green-100 rounded-xl p-4">
              <p className="text-3xl font-bold text-green-600">{gameState.score}/{gameState.totalQuestions}</p>
              <p className="text-green-700 text-sm">Correct</p>
            </div>
            <div className="bg-blue-100 rounded-xl p-4">
              <p className="text-3xl font-bold text-blue-600">{timeTaken}s</p>
              <p className="text-blue-700 text-sm">Time</p>
            </div>
          </div>

          {/* Message for parents */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-amber-800 text-sm">
              👨‍👩‍👧 <strong>Show your parents!</strong><br/>
              "I got {gameState.score} out of {gameState.totalQuestions} on {stageName}!"
            </p>
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={resetGame}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"
            >
              Pick Another
            </button>
            <button
              onClick={() => gameState.stage && startGame(gameState.stage, 'wordMatch')}
              className="flex-1 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold hover:shadow-lg"
            >
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // GAME SCREEN (Word Match)
  // ==========================================
  const question = gameState.questions[gameState.currentQuestion];
  const stageData = gameState.stage ? PHONICS_STAGES[gameState.stage] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-md mx-auto">
        {/* Progress Bar */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={resetGame}
            className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white"
          >
            ✕
          </button>
          <div className="flex-1 h-3 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-400 to-emerald-400 transition-all"
              style={{ width: `${((gameState.currentQuestion + 1) / gameState.totalQuestions) * 100}%` }}
            />
          </div>
          <span className="text-white font-bold">
            {gameState.currentQuestion + 1}/{gameState.totalQuestions}
          </span>
        </div>

        {/* Score */}
        <div className="text-center mb-4">
          <span className="text-white/70">Score: </span>
          <span className="text-white font-bold text-xl">{gameState.score}</span>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-3xl p-8 shadow-2xl">
          {/* Picture */}
          <div className="text-center mb-6">
            <span className="text-9xl block mb-4">{question.picture}</span>
            <p className="text-gray-500">Tap the word that matches!</p>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            {question.options.map((option: string) => {
              let buttonClass = "py-4 px-6 rounded-xl font-bold text-lg transition-all ";

              if (showFeedback) {
                if (option === question.correctAnswer) {
                  buttonClass += "bg-green-500 text-white scale-105";
                } else if (option === selectedAnswer) {
                  buttonClass += "bg-red-500 text-white";
                } else {
                  buttonClass += "bg-gray-100 text-gray-400";
                }
              } else {
                buttonClass += "bg-gradient-to-r from-blue-500 to-indigo-500 text-white hover:scale-105 hover:shadow-lg";
              }

              return (
                <button
                  key={option}
                  onClick={() => handleAnswer(option)}
                  disabled={showFeedback}
                  className={buttonClass}
                >
                  {option}
                </button>
              );
            })}
          </div>

          {/* Feedback */}
          {showFeedback && (
            <div className={`mt-4 text-center text-2xl font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
              {isCorrect ? '✓ Correct!' : `✗ It's "${question.correctAnswer}"`}
            </div>
          )}
        </div>

        {/* Stage indicator */}
        {stageData && (
          <p className="text-center text-white/50 mt-4">
            {stageData.emoji} {stageData.name}
          </p>
        )}
      </div>
    </div>
  );
}
