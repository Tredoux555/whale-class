// components/games/LetterTraceGame.tsx
// Trace letters with finger/mouse

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { GamePhase } from '@/lib/games/types';
import { ALL_LETTERS, VOWELS } from '@/lib/games/game-data';
import { speakLetter } from '@/lib/games/sound-utils';
import GameWrapper, { CompleteFeedback } from './GameWrapper';

interface Props {
  phase: GamePhase;
}

interface Point {
  x: number;
  y: number;
}

export default function LetterTraceGame({ phase }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [letters, setLetters] = useState<typeof ALL_LETTERS>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [score, setScore] = useState(0);
  const [gameComplete, setGameComplete] = useState(false);
  const [traced, setTraced] = useState(false);

  const totalQuestions = 10;

  // Initialize game - start with vowels
  useEffect(() => {
    const shuffled = [...VOWELS, ...ALL_LETTERS.slice(5, 15)].sort(() => Math.random() - 0.5);
    setLetters(shuffled.slice(0, totalQuestions));
  }, []);

  // Draw the letter template
  const drawLetterTemplate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || letters.length === 0 || currentIndex >= letters.length) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw dotted letter outline
    ctx.font = 'bold 280px "Comic Sans MS", cursive';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // Dotted outline
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.strokeText(letters[currentIndex].letter, canvas.width / 2, canvas.height / 2);
    
    // Faint fill
    ctx.fillStyle = 'rgba(200, 200, 200, 0.2)';
    ctx.fillText(letters[currentIndex].letter, canvas.width / 2, canvas.height / 2);
    
    ctx.setLineDash([]);
  }, [currentIndex, letters]);

  useEffect(() => {
    drawLetterTemplate();
  }, [drawLetterTemplate]);

  // Get position from event (mouse or touch)
  const getPosition = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    setTraced(true);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getPosition(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 20;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const pos = getPosition(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    setTraced(false);
    drawLetterTemplate();
  };

  const handleComplete = () => {
    if (!traced) return;

    // Speak the letter
    speakLetter(letters[currentIndex].letter);
    setScore(prev => prev + 1);

    setTimeout(() => {
      if (currentIndex + 1 >= totalQuestions) {
        setGameComplete(true);
      } else {
        setCurrentIndex(prev => prev + 1);
        setTraced(false);
      }
    }, 1000);
  };

  if (letters.length === 0) {
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
            setTraced(false);
            setLetters([...VOWELS, ...ALL_LETTERS.slice(5, 15)].sort(() => Math.random() - 0.5).slice(0, totalQuestions));
          }}
          onExit={() => router.push('/games')}
        />
      </GameWrapper>
    );
  }

  const currentLetter = letters[currentIndex];

  return (
    <GameWrapper 
      score={score} 
      totalQuestions={totalQuestions} 
      currentQuestion={currentIndex + 1}
    >
      <div className="text-center">
        {/* Instructions */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-gray-700 mb-2">
            Trace the letter!
          </h2>
          <p className="text-gray-500">
            Use your finger to trace: <strong className="text-4xl text-blue-600">{currentLetter.letter.toUpperCase()}</strong>
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {currentLetter.image} {currentLetter.word}
          </p>
        </div>

        {/* Canvas */}
        <div className="relative inline-block">
          <canvas
            ref={canvasRef}
            width={350}
            height={350}
            className="border-4 border-gray-200 rounded-3xl bg-white touch-none"
            style={{ maxWidth: '100%', height: 'auto' }}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={clearCanvas}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300 transition-colors"
          >
            🗑️ Clear
          </button>
          <button
            onClick={handleComplete}
            disabled={!traced}
            className="px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            ✓ Done!
          </button>
        </div>

        {/* Speak button */}
        <button
          onClick={() => speakLetter(currentLetter.letter)}
          className="mt-4 px-4 py-2 bg-blue-100 text-blue-600 rounded-lg font-bold hover:bg-blue-200 transition-colors"
        >
          🔊 Hear the sound
        </button>
      </div>
    </GameWrapper>
  );
}

