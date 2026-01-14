// components/games/CapitalLetterTraceGame.tsx
// Uppercase letter tracing game A-Z - based on LetterTraceGame

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UPPERCASE_DATA, UPPERCASE_STROKES } from '@/lib/games/uppercase-strokes';
import { StrokePoint, STROKE_TOLERANCE, validateStroke } from '@/lib/games/letter-strokes';
import { GameAudio } from '@/lib/games/audio-paths';
import Confetti from './Confetti';

const PROGRESS_KEY = 'capital-letter-trace-progress';
const CANVAS_SIZE = 300;

interface TraceProgress {
  completedLetters: string[];
}

type GamePhase = 'watching' | 'ready' | 'tracing' | 'complete';

export default function CapitalLetterTraceGame() {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const isAnimatingRef = useRef(false);

  const [progress, setProgress] = useState<TraceProgress>({ completedLetters: [] });
  const [letterIndex, setLetterIndex] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('watching');
  const [currentStrokeIndex, setCurrentStrokeIndex] = useState(0);
  const [userStrokes, setUserStrokes] = useState<StrokePoint[][]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [strokeFeedback, setStrokeFeedback] = useState<'none' | 'good' | 'bad'>('none');
  const [attempts, setAttempts] = useState(0);
  const [childId, setChildId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const currentStrokeRef = useRef<StrokePoint[]>([]);
  
  const currentLetter = UPPERCASE_DATA[letterIndex];
  const strokeData = UPPERCASE_STROKES[currentLetter.letter];

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(PROGRESS_KEY);
      if (saved) {
        try { setProgress(JSON.parse(saved)); } catch (e) { console.error(e); }
      }
      const session = localStorage.getItem('studentSession');
      if (session) {
        try {
          const { childId: id } = JSON.parse(session);
          setChildId(id);
          startGameSession(id);
        } catch (e) { console.error(e); }
      }
    }
  }, []);

  const startGameSession = async (cId: string) => {
    try {
      const res = await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', childId: cId, gameId: 'capital-letter-tracer', gameName: 'Capital Letter Tracer' })
      });
      const data = await res.json();
      if (data.sessionId) setSessionId(data.sessionId);
    } catch (e) { console.error(e); }
  };

  const endGameSession = useCallback(async () => {
    if (!sessionId) return;
    try {
      await fetch('/api/games/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'end', sessionId, itemsCompleted: progress.completedLetters.length, itemsTotal: 26, itemsMastered: progress.completedLetters })
      });
    } catch (e) { console.error(e); }
  }, [sessionId, progress.completedLetters]);

  useEffect(() => {
    return () => { GameAudio.stop(); };
  }, []);

  const saveProgress = (newProgress: TraceProgress) => {
    setProgress(newProgress);
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(newProgress));
  };

  const scalePoint = (p: StrokePoint): StrokePoint => ({ x: (p.x / 100) * CANVAS_SIZE, y: (p.y / 100) * CANVAS_SIZE });
  const unscalePoint = (p: StrokePoint): StrokePoint => ({ x: (p.x / CANVAS_SIZE) * 100, y: (p.y / CANVAS_SIZE) * 100 });

  const getContext = (): CanvasRenderingContext2D | null => canvasRef.current?.getContext('2d') || null;

  const drawGuide = useCallback(() => {
    const ctx = getContext();
    if (!ctx || !strokeData) return;
    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#dbeafe';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    strokeData.strokes.forEach((stroke, idx) => {
      ctx.beginPath();
      ctx.strokeStyle = idx < currentStrokeIndex ? '#10b981' : '#d1d5db';
      ctx.lineWidth = idx === currentStrokeIndex ? 25 : 20;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      stroke.forEach((p, i) => {
        const sp = scalePoint(p);
        i === 0 ? ctx.moveTo(sp.x, sp.y) : ctx.lineTo(sp.x, sp.y);
      });
      ctx.stroke();
    });

    userStrokes.forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 8;
      stroke.forEach((p, i) => {
        const sp = scalePoint(p);
        i === 0 ? ctx.moveTo(sp.x, sp.y) : ctx.lineTo(sp.x, sp.y);
      });
      ctx.stroke();
    });

    const current = currentStrokeRef.current;
    if (current.length > 1) {
      ctx.beginPath();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 8;
      current.forEach((p, i) => {
        const sp = scalePoint(p);
        i === 0 ? ctx.moveTo(sp.x, sp.y) : ctx.lineTo(sp.x, sp.y);
      });
      ctx.stroke();
    }

    if (gamePhase === 'ready' || gamePhase === 'tracing') {
      const targetStroke = strokeData.strokes[currentStrokeIndex];
      if (targetStroke && targetStroke.length > 0) {
        const start = scalePoint(targetStroke[0]);
        ctx.beginPath();
        ctx.fillStyle = '#ef4444';
        ctx.arc(start.x, start.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${currentStrokeIndex + 1}`, start.x, start.y);
      }
    }
  }, [strokeData, currentStrokeIndex, userStrokes, gamePhase]);

  useEffect(() => { drawGuide(); }, [drawGuide]);

  const animateStroke = useCallback((strokeIdx: number) => {
    if (!strokeData || isAnimatingRef.current) return;
    isAnimatingRef.current = true;
    const stroke = strokeData.strokes[strokeIdx];
    if (!stroke) { isAnimatingRef.current = false; return; }
    
    let pointIdx = 0;
    const ctx = getContext();
    if (!ctx) { isAnimatingRef.current = false; return; }

    const animate = () => {
      if (pointIdx >= stroke.length) {
        isAnimatingRef.current = false;
        if (strokeIdx < strokeData.strokes.length - 1) {
          setTimeout(() => animateStroke(strokeIdx + 1), 300);
        } else {
          setGamePhase('ready');
        }
        return;
      }
      drawGuide();
      ctx.beginPath();
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      for (let i = 0; i <= pointIdx; i++) {
        const sp = scalePoint(stroke[i]);
        i === 0 ? ctx.moveTo(sp.x, sp.y) : ctx.lineTo(sp.x, sp.y);
      }
      ctx.stroke();
      pointIdx++;
      animationRef.current = requestAnimationFrame(animate);
    };
    animate();
  }, [strokeData, drawGuide]);

  useEffect(() => {
    if (gamePhase === 'watching' && strokeData) {
      const timer = setTimeout(() => animateStroke(0), 500);
      return () => clearTimeout(timer);
    }
  }, [gamePhase, strokeData, animateStroke]);

  const getPointerPos = (e: React.MouseEvent | React.TouchEvent): StrokePoint | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    if (clientX === undefined || clientY === undefined) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    if (gamePhase !== 'ready' && gamePhase !== 'tracing') return;
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;
    setIsDrawing(true);
    setGamePhase('tracing');
    currentStrokeRef.current = [unscalePoint(pos)];
  };

  const handlePointerMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pos = getPointerPos(e);
    if (!pos) return;
    currentStrokeRef.current.push(unscalePoint(pos));
    drawGuide();
  };

  const handlePointerUp = () => {
    if (!isDrawing || !strokeData) return;
    setIsDrawing(false);
    const userStroke = currentStrokeRef.current;
    const targetStroke = strokeData.strokes[currentStrokeIndex];
    
    if (userStroke.length < 5) {
      currentStrokeRef.current = [];
      drawGuide();
      return;
    }

    const isValid = validateStroke(userStroke, targetStroke, STROKE_TOLERANCE + 5);
    
    if (isValid) {
      setStrokeFeedback('good');
      GameAudio.play('correct');
      const newUserStrokes = [...userStrokes, userStroke];
      setUserStrokes(newUserStrokes);
      currentStrokeRef.current = [];
      
      if (currentStrokeIndex >= strokeData.strokes.length - 1) {
        setShowConfetti(true);
        const newCompleted = [...new Set([...progress.completedLetters, currentLetter.letter])];
        saveProgress({ completedLetters: newCompleted });
        setTimeout(() => {
          setShowConfetti(false);
          if (letterIndex < UPPERCASE_DATA.length - 1) {
            setLetterIndex(letterIndex + 1);
            resetLetter();
          } else {
            setGamePhase('complete');
          }
        }, 2000);
      } else {
        setCurrentStrokeIndex(currentStrokeIndex + 1);
      }
    } else {
      setStrokeFeedback('bad');
      GameAudio.play('incorrect');
      setAttempts(attempts + 1);
      currentStrokeRef.current = [];
    }
    
    setTimeout(() => setStrokeFeedback('none'), 500);
    drawGuide();
  };

  const resetLetter = () => {
    setGamePhase('watching');
    setCurrentStrokeIndex(0);
    setUserStrokes([]);
    setAttempts(0);
    currentStrokeRef.current = [];
  };

  const handleBack = async () => {
    await endGameSession();
    router.push('/games');
  };

  if (gamePhase === 'complete') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl p-8 text-center max-w-md shadow-2xl">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Excellent!</h1>
          <p className="text-gray-600 mb-6">You traced all capital letters!</p>
          <div className="flex gap-4 justify-center">
            <button onClick={() => { setLetterIndex(0); resetLetter(); }} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-bold">Play Again</button>
            <button onClick={handleBack} className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold">Back</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 to-indigo-600 p-4">
      {showConfetti && <Confetti />}
      
      <div className="max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <button onClick={handleBack} className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-white text-center">
            <div className="text-2xl font-bold">Capital {currentLetter.letter}</div>
            <div className="text-white/80 text-sm">{letterIndex + 1} / 26</div>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold">
            {progress.completedLetters.length}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xl mb-4">
          <div className="text-center mb-4">
            <span className="text-6xl">{currentLetter.image}</span>
            <div className="text-gray-600 mt-2">{currentLetter.word}</div>
          </div>
          
          <div className={`relative mx-auto rounded-2xl overflow-hidden ${strokeFeedback === 'good' ? 'ring-4 ring-green-400' : strokeFeedback === 'bad' ? 'ring-4 ring-red-400' : ''}`} style={{ width: CANVAS_SIZE, height: CANVAS_SIZE }}>
            <canvas
              ref={canvasRef}
              width={CANVAS_SIZE}
              height={CANVAS_SIZE}
              onMouseDown={handlePointerDown}
              onMouseMove={handlePointerMove}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="touch-none cursor-crosshair"
            />
          </div>

          <div className="text-center mt-4 text-gray-600">
            {gamePhase === 'watching' && <span>Watch how to write...</span>}
            {gamePhase === 'ready' && <span>Start at the red dot!</span>}
            {gamePhase === 'tracing' && <span>Stroke {currentStrokeIndex + 1} of {strokeData?.strokes.length || 1}</span>}
          </div>
        </div>

        <div className="bg-white/20 rounded-full h-3 overflow-hidden">
          <div className="bg-white h-full transition-all" style={{ width: `${(progress.completedLetters.length / 26) * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
