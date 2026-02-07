// components/games/LetterTraceGame.tsx
// Fixed version - no infinite loops, proper stroke animation

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LETTER_GROUPS, LetterData } from '@/lib/games/game-data';
import { GameAudio, AUDIO_PATHS } from '@/lib/games/audio-paths';
import {
  LETTER_STROKES,
  StrokePoint,
  STROKE_TOLERANCE,
  validateStroke,
  checkStrokeDirection,
  getLetterStrokes,
} from '@/lib/games/letter-strokes';
import Confetti from './Confetti';

const PROGRESS_KEY = 'letter-trace-progress';
const CANVAS_SIZE = 300;
const GAME_ID = 'letter-tracer';
const GAME_NAME = 'Letter Tracer';

interface TraceProgress {
  completedLetters: string[];
}

type GamePhase = 'watching' | 'ready' | 'tracing' | 'complete';

export default function LetterTraceGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);
  
  // Progress
  const [progress, setProgress] = useState<TraceProgress>({ completedLetters: [] });
  
  // Game state
  const [letterIndex, setLetterIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('watching');
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [userStrokes, setUserStrokes] = useState<StrokePoint[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [strokeFeedback, setStrokeFeedback] = useState<'none' | 'good' | 'bad'>('none');
  const [attempts, setAttempts] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Current drawing stroke (using ref to avoid re-renders during drawing)
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  
  // All letters
  const allLetters = LETTER_GROUPS.flatMap(g => g.letters);
  const currentLetter = allLetters[letterIndex];

  // Load progress on mount
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

  // Session tracking - start on mount, end on unmount
  useEffect(() => {
    const startSession = async () => {
      if (typeof window === 'undefined') return;
      const studentSession = localStorage.getItem('studentSession');
      if (!studentSession) return;
      
      try {
        const { childId } = JSON.parse(studentSession);
        const res = await fetch('/api/games/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'start',
            childId,
            gameId: GAME_ID,
            gameName: GAME_NAME,
          }),
        });
        const data = await res.json();
        if (data.sessionId) setSessionId(data.sessionId);
      } catch (e) {
        // Session tracking not available
      }
    };
    startSession();

    return () => {
      // End session on unmount
      const endSession = async () => {
        const studentSession = localStorage.getItem('studentSession');
        const currentSessionId = sessionId;
        if (!studentSession || !currentSessionId) return;
        
        try {
          const { childId } = JSON.parse(studentSession);
          const saved = localStorage.getItem(PROGRESS_KEY);
          const prog = saved ? JSON.parse(saved) : { completedLetters: [] };
          
          await fetch('/api/games/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'end',
              sessionId: currentSessionId,
              childId,
              gameId: GAME_ID,
              gameName: GAME_NAME,
              itemsCompleted: prog.completedLetters?.length || 0,
              itemsTotal: 26,
              itemsMastered: prog.completedLetters || [],
            }),
          });
        } catch (e) {
          // Failed to end session
        }
      };
      endSession();
    };
  }, [sessionId]);

  // Save progress
  const saveProgress = (newProgress: TraceProgress) => {
    setProgress(newProgress);
    if (typeof window !== 'undefined') {
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress));
    }
  };

  // Cleanup: Stop audio when component unmounts
  useEffect(() => {
    return () => {
      GameAudio.stop();
    };
  }, []);

  // Scale point from 0-100 to canvas size
  const scalePoint = (p: StrokePoint): StrokePoint => ({
    x: (p.x / 100) * CANVAS_SIZE,
    y: (p.y / 100) * CANVAS_SIZE,
  });

  // Scale point from canvas to 0-100
  const unscalePoint = (p: StrokePoint): StrokePoint => ({
    x: (p.x / CANVAS_SIZE) * 100,
    y: (p.y / CANVAS_SIZE) * 100,
  });

  // Get canvas context
  const getContext = (): CanvasRenderingContext2D | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  // Clear canvas
  const clearCanvas = () => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  };

  // Draw the gray letter background
  const drawLetterGuide = (ctx: CanvasRenderingContext2D, letter: string) => {
    ctx.font = `bold ${CANVAS_SIZE * 0.65}px "Comic Sans MS", cursive`;
    ctx.fillStyle = '#e5e7eb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, CANVAS_SIZE / 2, CANVAS_SIZE / 2);
  };

  // Draw a stroke path
  const drawPath = (
    ctx: CanvasRenderingContext2D,
    points: StrokePoint[],
    color: string,
    lineWidth: number,
    dashed: boolean = false,
    scaled: boolean = true
  ) => {
    if (points.length < 2) return;
    
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.setLineDash(dashed ? [8, 8] : []);
    
    const start = scaled ? scalePoint(points[0]) : points[0];
    ctx.moveTo(start.x, start.y);
    
    for (let i = 1; i < points.length; i++) {
      const p = scaled ? scalePoint(points[i]) : points[i];
      ctx.lineTo(p.x, p.y);
    }
    
    ctx.stroke();
    ctx.setLineDash([]);
  };

  // Draw start dot with number
  const drawStartDot = (ctx: CanvasRenderingContext2D, point: StrokePoint, number: number) => {
    const scaled = scalePoint(point);
    
    // Pulsing outer glow
    ctx.beginPath();
    ctx.fillStyle = '#22c55e40';
    ctx.arc(scaled.x, scaled.y, 22, 0, Math.PI * 2);
    ctx.fill();
    
    // Inner dot
    ctx.beginPath();
    ctx.fillStyle = '#22c55e';
    ctx.arc(scaled.x, scaled.y, 14, 0, Math.PI * 2);
    ctx.fill();
    
    // Number
    ctx.fillStyle = 'white';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number.toString(), scaled.x, scaled.y);
  };

  // Draw the current state of the canvas
  const drawCurrentState = (showGuide: boolean = true) => {
    const ctx = getContext();
    if (!ctx || !currentLetter) return;
    
    clearCanvas();
    
    // Draw gray letter background
    if (showGuide) {
      drawLetterGuide(ctx, currentLetter.letter);
    }
    
    const strokeData = getLetterStrokes(currentLetter.letter);
    if (!strokeData) return;
    
    // Draw completed user strokes in green
    userStrokes.forEach((stroke) => {
      drawPath(ctx, stroke, '#22c55e', 8, false, false);
    });
    
    // In ready/tracing phase, show the dotted guide for current stroke
    if ((gamePhase === 'ready' || gamePhase === 'tracing') && currentStrokeIndex < strokeData.strokes.length) {
      const currentPath = strokeData.strokes[currentStrokeIndex];
      
      // Draw dotted guide line
      drawPath(ctx, currentPath, '#93c5fd', 4, true, true);
      
      // Draw start dot
      drawStartDot(ctx, currentPath[0], currentStrokeIndex + 1);
    }
  };

  // Animate a single stroke demonstration
  const animateStroke = (
    strokePath: StrokePoint[],
    strokeIndex: number,
    onComplete: () => void
  ) => {
    const ctx = getContext();
    if (!ctx || !currentLetter || isAnimatingRef.current) return;
    
    isAnimatingRef.current = true;
    
    const strokeData = getLetterStrokes(currentLetter.letter);
    if (!strokeData) {
      isAnimatingRef.current = false;
      onComplete();
      return;
    }
    
    let pointIndex = 0;
    const animatedPoints: StrokePoint[] = [];
    const totalPoints = strokePath.length;
    
    // Animation speed: ~80ms per point for smooth, visible animation
    const animationSpeed = 80;
    
    const animate = () => {
      if (pointIndex >= totalPoints) {
        isAnimatingRef.current = false;
        onComplete();
        return;
      }
      
      // Add next point
      animatedPoints.push(strokePath[pointIndex]);
      
      // Redraw everything
      clearCanvas();
      drawLetterGuide(ctx, currentLetter.letter);
      
      // Draw already completed strokes from this animation session (previous strokes)
      for (let i = 0; i < strokeIndex; i++) {
        drawPath(ctx, strokeData.strokes[i], '#22c55e', 8, false, true);
      }
      
      // Draw current animated stroke
      if (animatedPoints.length >= 2) {
        drawPath(ctx, animatedPoints, '#3b82f6', 8, false, true);
      }
      
      // Draw moving pen indicator
      const currentPoint = scalePoint(strokePath[pointIndex]);
      ctx.beginPath();
      ctx.fillStyle = '#1d4ed8';
      ctx.arc(currentPoint.x, currentPoint.y, 12, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw white center for pen
      ctx.beginPath();
      ctx.fillStyle = 'white';
      ctx.arc(currentPoint.x, currentPoint.y, 6, 0, Math.PI * 2);
      ctx.fill();
      
      pointIndex++;
      animationRef.current = window.setTimeout(animate, animationSpeed);
    };
    
    animate();
  };

  // Play full letter animation (all strokes)
  const playFullAnimation = () => {
    if (isAnimatingRef.current || !currentLetter) return;
    
    // Cancel any existing animation
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    
    setGamePhase('watching');
    setCurrentStrokeIndex(0);
    setUserStrokes([]);
    currentStrokeRef.current = [];
    
    const strokeData = getLetterStrokes(currentLetter.letter);
    if (!strokeData) return;
    
    // Play letter sound
    GameAudio.playLetterNow(currentLetter.letter);
    
    let currentAnimStroke = 0;
    
    const animateNextStroke = () => {
      if (currentAnimStroke >= strokeData.strokes.length) {
        // All strokes animated, switch to ready phase
        setTimeout(() => {
          setGamePhase('ready');
          setCurrentStrokeIndex(0);
          drawCurrentState(true);
        }, 500);
        return;
      }
      
      animateStroke(
        strokeData.strokes[currentAnimStroke],
        currentAnimStroke,
        () => {
          currentAnimStroke++;
          // Brief pause between strokes
          setTimeout(animateNextStroke, 300);
        }
      );
    };
    
    animateNextStroke();
  };

  // Initialize and play animation when letter changes
  useEffect(() => {
    // Reset state for new letter
    setCurrentStrokeIndex(0);
    setUserStrokes([]);
    setAttempts(0);
    setStrokeFeedback('none');
    currentStrokeRef.current = [];
    
    // Small delay then play animation
    const timer = setTimeout(() => {
      playFullAnimation();
    }, 300);
    
    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
      isAnimatingRef.current = false;
    };
  }, [letterIndex]); // Only depend on letterIndex

  // Redraw when phase or stroke changes (but not during animation)
  useEffect(() => {
    if (!isAnimatingRef.current && gamePhase !== 'watching') {
      drawCurrentState(true);
    }
  }, [gamePhase, currentStrokeIndex, userStrokes.length]);

  // Get touch/mouse position
  const getPos = (e: React.TouchEvent | React.MouseEvent): StrokePoint => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    if ('touches' in e && e.touches.length > 0) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      };
    } else if ('clientX' in e) {
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    }
    return { x: 0, y: 0 };
  };

  // Handle drawing start
  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (gamePhase !== 'ready' && gamePhase !== 'tracing') return;
    if (isAnimatingRef.current) return;
    e.preventDefault();
    
    const strokeData = getLetterStrokes(currentLetter?.letter || '');
    if (!strokeData || currentStrokeIndex >= strokeData.strokes.length) return;
    
    const pos = getPos(e);
    const expectedPath = strokeData.strokes[currentStrokeIndex];
    const startPoint = unscalePoint(pos);
    
    // Check if starting near the correct start point
    if (!checkStrokeDirection(startPoint, expectedPath, STROKE_TOLERANCE * 1.8)) {
      setStrokeFeedback('bad');
      setTimeout(() => setStrokeFeedback('none'), 400);
      return;
    }
    
    setIsDrawing(true);
    setGamePhase('tracing');
    currentStrokeRef.current = [pos];
    
    // Draw the starting point
    const ctx = getContext();
    if (ctx) {
      ctx.beginPath();
      ctx.fillStyle = '#3b82f6';
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  // Handle drawing move
  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDrawing || gamePhase !== 'tracing') return;
    e.preventDefault();
    
    const pos = getPos(e);
    currentStrokeRef.current.push(pos);
    
    // Draw the line segment
    const ctx = getContext();
    if (ctx && currentStrokeRef.current.length >= 2) {
      const points = currentStrokeRef.current;
      const prevPoint = points[points.length - 2];
      
      ctx.beginPath();
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.moveTo(prevPoint.x, prevPoint.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
    }
  };

  // Handle drawing end - validate stroke
  const handleEnd = () => {
    if (!isDrawing || gamePhase !== 'tracing') return;
    setIsDrawing(false);
    
    const strokeData = getLetterStrokes(currentLetter?.letter || '');
    if (!strokeData || currentStrokeIndex >= strokeData.strokes.length) return;
    
    const expectedPath = strokeData.strokes[currentStrokeIndex];
    const userPoints = currentStrokeRef.current;
    
    // Convert to 0-100 scale for validation
    const normalizedStroke = userPoints.map(unscalePoint);
    
    // Validate
    const result = validateStroke(normalizedStroke, expectedPath, STROKE_TOLERANCE);
    
    if (result.valid) {
      // Correct stroke!
      setStrokeFeedback('good');
      GameAudio.playCorrect().catch(console.error);
      
      // Save the stroke (keep in canvas coordinates for redrawing)
      const savedStroke = [...currentStrokeRef.current];
      setUserStrokes(prev => [...prev, savedStroke]);
      currentStrokeRef.current = [];
      
      setTimeout(() => {
        setStrokeFeedback('none');
        
        if (currentStrokeIndex + 1 >= strokeData.strokes.length) {
          // Letter complete!
          handleLetterComplete();
        } else {
          // Next stroke
          setCurrentStrokeIndex(prev => prev + 1);
          setGamePhase('ready');
        }
      }, 400);
    } else {
      // Incorrect stroke
      setStrokeFeedback('bad');
      GameAudio.playWrong().catch(console.error);
      setAttempts(prev => prev + 1);
      
      setTimeout(() => {
        setStrokeFeedback('none');
        currentStrokeRef.current = [];
        
        // Redraw without the failed stroke
        drawCurrentState(true);
        
        // After 3 attempts, show animation again
        if (attempts >= 2) {
          setAttempts(0);
          playFullAnimation();
        } else {
          setGamePhase('ready');
        }
      }, 600);
    }
  };

  // Handle letter completion
  const handleLetterComplete = () => {
    setGamePhase('complete');
    setShowConfetti(true);
    GameAudio.playCelebration().catch(console.error);
    
    // Save progress
    if (currentLetter) {
      const newProgress = {
        completedLetters: [...new Set([...progress.completedLetters, currentLetter.letter])],
      };
      saveProgress(newProgress);
    }
    
    setTimeout(() => setShowConfetti(false), 2500);
  };

  // Navigation
  const nextLetter = () => {
    if (letterIndex < allLetters.length - 1) {
      setLetterIndex(prev => prev + 1);
    }
  };

  const prevLetter = () => {
    if (letterIndex > 0) {
      setLetterIndex(prev => prev - 1);
    }
  };

  // Replay animation
  const replayAnimation = () => {
    if (animationRef.current) {
      clearTimeout(animationRef.current);
    }
    isAnimatingRef.current = false;
    playFullAnimation();
  };

  // Clear and retry current stroke
  const clearCurrentStroke = () => {
    currentStrokeRef.current = [];
    setGamePhase('ready');
    drawCurrentState(true);
  };

  if (!currentLetter) return null;

  const strokeData = getLetterStrokes(currentLetter.letter);
  const totalStrokes = strokeData?.strokes.length || 1;
  const isLetterCompleted = progress.completedLetters.includes(currentLetter.letter);

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-orange-400 via-red-400 to-pink-400 p-4"
      style={{ fontFamily: "'Comic Sans MS', cursive" }}
    >
      {showConfetti && <Confetti />}

      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <button 
            onClick={() => router.push('/games')} 
            className="text-white font-bold text-lg"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-bold text-white">✏️ Letter Trace</h1>
          <div className="text-white font-bold">
            {letterIndex + 1}/{allLetters.length}
          </div>
        </div>

        {/* Letter Info Card */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-5xl">{currentLetter.image}</span>
              <div>
                <span className="text-4xl font-bold text-gray-800">
                  {currentLetter.letter.toUpperCase()} {currentLetter.letter}
                </span>
                {isLetterCompleted && <span className="ml-2 text-green-500 text-2xl">✓</span>}
              </div>
            </div>
            <button
              onClick={() => GameAudio.playLetterNow(currentLetter.letter)}
              className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 text-xl"
            >
              🔊
            </button>
          </div>
          
          {/* Stroke progress indicators */}
          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-gray-500">Strokes:</span>
            <div className="flex gap-1">
              {Array.from({ length: totalStrokes }).map((_, i) => {
                const isComplete = gamePhase === 'complete';
                const isCompleted = i < currentStrokeIndex;
                const isCurrent = i === currentStrokeIndex;
                
                let className = 'bg-gray-200 text-gray-500';
                if (isCompleted || isComplete) {
                  className = 'bg-green-500 text-white';
                } else if (isCurrent && !isComplete) {
                  className = 'bg-blue-500 text-white ring-4 ring-blue-200';
                }
                
                return (
                  <div
                    key={i}
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${className}`}
                  >
                    {i + 1}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Phase Instructions */}
        <div className="text-center mb-3 h-8">
          {gamePhase === 'watching' && (
            <p className="text-white font-bold text-lg animate-pulse">👀 Watch carefully...</p>
          )}
          {gamePhase === 'ready' && (
            <p className="text-white font-bold text-lg">✏️ Start at the green dot!</p>
          )}
          {gamePhase === 'tracing' && (
            <p className="text-yellow-200 font-bold text-lg">Keep going!</p>
          )}
          {gamePhase === 'complete' && (
            <p className="text-yellow-200 font-bold text-xl">🎉 Perfect!</p>
          )}
        </div>

        {/* Canvas Card */}
        <div 
          className={`bg-white rounded-2xl shadow-xl p-4 relative transition-all duration-200 ${
            strokeFeedback === 'good' ? 'ring-4 ring-green-400' :
            strokeFeedback === 'bad' ? 'ring-4 ring-red-400 animate-shake' : ''
          }`}
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_SIZE}
            height={CANVAS_SIZE}
            className="w-full aspect-square rounded-xl bg-slate-50 touch-none"
            style={{ cursor: gamePhase === 'ready' || gamePhase === 'tracing' ? 'crosshair' : 'default' }}
            onMouseDown={handleStart}
            onMouseMove={handleMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={handleStart}
            onTouchMove={handleMove}
            onTouchEnd={handleEnd}
          />
          
          {/* Feedback overlays */}
          {strokeFeedback === 'good' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="text-7xl animate-bounce">✓</span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="mt-4 grid grid-cols-4 gap-2">
          <button
            onClick={prevLetter}
            disabled={letterIndex === 0}
            className="py-3 bg-white text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ◀
          </button>
          <button
            onClick={replayAnimation}
            disabled={isAnimatingRef.current}
            className="py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-50 transition-all"
          >
            👀 Watch
          </button>
          <button
            onClick={clearCurrentStroke}
            disabled={gamePhase === 'watching' || gamePhase === 'complete'}
            className="py-3 bg-orange-500 text-white rounded-xl font-bold hover:bg-orange-600 disabled:opacity-50 transition-all"
          >
            Clear
          </button>
          <button
            onClick={nextLetter}
            disabled={letterIndex === allLetters.length - 1}
            className="py-3 bg-white text-gray-700 rounded-xl font-bold text-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            ▶
          </button>
        </div>

        {/* Next Letter Button (shown when complete) */}
        {gamePhase === 'complete' && letterIndex < allLetters.length - 1 && (
          <button
            onClick={nextLetter}
            className="mt-4 w-full py-4 bg-green-500 text-white rounded-xl font-bold text-xl hover:bg-green-600 shadow-lg transition-all"
          >
            Next Letter →
          </button>
        )}

        {/* Progress Bar */}
        <div className="mt-4 bg-white/20 rounded-xl p-3">
          <p className="text-white font-bold text-center mb-2">
            Letters Mastered: {progress.completedLetters.length} / {allLetters.length}
          </p>
          <div className="h-3 bg-white/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-yellow-400 rounded-full transition-all duration-500"
              style={{ width: `${(progress.completedLetters.length / allLetters.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Shake animation for wrong answers */}
      <style jsx>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
}
