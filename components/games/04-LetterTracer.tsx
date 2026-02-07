// components/04-LetterTracer.tsx
// Letter Tracer - FIXED: Better completion detection, larger canvas, clearer demo

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Volume2, RotateCcw, Play } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

interface Point { x: number; y: number; }

const LetterTracer: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [currentLetter, setCurrentLetter] = useState('A');
  const [phase, setPhase] = useState<'demo' | 'trace' | 'complete'>('demo');
  const [tracePoints, setTracePoints] = useState<Point[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [score, setScore] = useState(0);

  // Letter stroke data (simplified key points)
  const letterStrokes: Record<string, Point[][]> = {
    A: [[{x:150,y:50}, {x:75,y:250}], [{x:150,y:50}, {x:225,y:250}], [{x:100,y:160}, {x:200,y:160}]],
    B: [[{x:75,y:50}, {x:75,y:250}], [{x:75,y:50}, {x:175,y:50}, {x:200,y:75}, {x:200,y:125}, {x:175,y:150}, {x:75,y:150}], [{x:75,y:150}, {x:175,y:150}, {x:200,y:175}, {x:200,y:225}, {x:175,y:250}, {x:75,y:250}]],
    C: [[{x:225,y:75}, {x:175,y:50}, {x:100,y:50}, {x:50,y:100}, {x:50,y:200}, {x:100,y:250}, {x:175,y:250}, {x:225,y:225}]],
    D: [[{x:75,y:50}, {x:75,y:250}], [{x:75,y:50}, {x:150,y:50}, {x:200,y:100}, {x:200,y:200}, {x:150,y:250}, {x:75,y:250}]],
    E: [[{x:75,y:50}, {x:75,y:250}], [{x:75,y:50}, {x:200,y:50}], [{x:75,y:150}, {x:175,y:150}], [{x:75,y:250}, {x:200,y:250}]],
    F: [[{x:75,y:50}, {x:75,y:250}], [{x:75,y:50}, {x:200,y:50}], [{x:75,y:150}, {x:175,y:150}]],
    G: [[{x:225,y:75}, {x:175,y:50}, {x:100,y:50}, {x:50,y:100}, {x:50,y:200}, {x:100,y:250}, {x:175,y:250}, {x:225,y:200}, {x:225,y:150}, {x:150,y:150}]],
    H: [[{x:75,y:50}, {x:75,y:250}], [{x:225,y:50}, {x:225,y:250}], [{x:75,y:150}, {x:225,y:150}]],
    I: [[{x:150,y:50}, {x:150,y:250}]],
    J: [[{x:200,y:50}, {x:200,y:200}, {x:150,y:250}, {x:100,y:250}, {x:75,y:200}]],
    K: [[{x:75,y:50}, {x:75,y:250}], [{x:200,y:50}, {x:75,y:150}], [{x:75,y:150}, {x:200,y:250}]],
    L: [[{x:75,y:50}, {x:75,y:250}], [{x:75,y:250}, {x:200,y:250}]],
    M: [[{x:50,y:250}, {x:50,y:50}], [{x:50,y:50}, {x:150,y:150}], [{x:150,y:150}, {x:250,y:50}], [{x:250,y:50}, {x:250,y:250}]],
    N: [[{x:75,y:250}, {x:75,y:50}], [{x:75,y:50}, {x:225,y:250}], [{x:225,y:250}, {x:225,y:50}]],
    O: [[{x:150,y:50}, {x:75,y:100}, {x:75,y:200}, {x:150,y:250}, {x:225,y:200}, {x:225,y:100}, {x:150,y:50}]],
    P: [[{x:75,y:50}, {x:75,y:250}], [{x:75,y:50}, {x:175,y:50}, {x:200,y:75}, {x:200,y:125}, {x:175,y:150}, {x:75,y:150}]],
    Q: [[{x:150,y:50}, {x:75,y:100}, {x:75,y:200}, {x:150,y:250}, {x:225,y:200}, {x:225,y:100}, {x:150,y:50}], [{x:175,y:200}, {x:250,y:275}]],
    R: [[{x:75,y:50}, {x:75,y:250}], [{x:75,y:50}, {x:175,y:50}, {x:200,y:75}, {x:200,y:125}, {x:175,y:150}, {x:75,y:150}], [{x:150,y:150}, {x:225,y:250}]],
    S: [[{x:200,y:75}, {x:150,y:50}, {x:100,y:50}, {x:50,y:100}, {x:100,y:150}, {x:200,y:150}, {x:250,y:200}, {x:200,y:250}, {x:100,y:250}, {x:50,y:225}]],
    T: [[{x:50,y:50}, {x:250,y:50}], [{x:150,y:50}, {x:150,y:250}]],
    U: [[{x:75,y:50}, {x:75,y:200}, {x:100,y:250}, {x:200,y:250}, {x:225,y:200}, {x:225,y:50}]],
    V: [[{x:50,y:50}, {x:150,y:250}], [{x:150,y:250}, {x:250,y:50}]],
    W: [[{x:25,y:50}, {x:75,y:250}], [{x:75,y:250}, {x:150,y:100}], [{x:150,y:100}, {x:225,y:250}], [{x:225,y:250}, {x:275,y:50}]],
    X: [[{x:50,y:50}, {x:250,y:250}], [{x:250,y:50}, {x:50,y:250}]],
    Y: [[{x:50,y:50}, {x:150,y:150}], [{x:250,y:50}, {x:150,y:150}], [{x:150,y:150}, {x:150,y:250}]],
    Z: [[{x:50,y:50}, {x:250,y:50}], [{x:250,y:50}, {x:50,y:250}], [{x:50,y:250}, {x:250,y:250}]],
  };

  const getStrokes = () => letterStrokes[currentLetter] || letterStrokes['A'];

  // Draw the guide outline
  const drawGuide = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, 300, 300);
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 40;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    getStrokes().forEach(stroke => {
      if (stroke.length < 2) return;
      ctx.beginPath();
      ctx.moveTo(stroke[0].x, stroke[0].y);
      stroke.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    });

    // Draw start dot
    const firstStroke = getStrokes()[0];
    if (firstStroke && firstStroke[0]) {
      ctx.fillStyle = '#22c55e';
      ctx.beginPath();
      ctx.arc(firstStroke[0].x, firstStroke[0].y, 15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'white';
      ctx.font = 'bold 16px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('1', firstStroke[0].x, firstStroke[0].y);
    }
  }, [currentLetter]);

  // Animate demonstration
  const runDemo = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setPhase('demo');
    drawGuide(ctx);

    // Animate each stroke
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of getStrokes()) {
      if (stroke.length < 2) continue;
      
      for (let i = 0; i < stroke.length - 1; i++) {
        const start = stroke[i];
        const end = stroke[i + 1];
        const steps = 20;
        
        for (let step = 0; step <= steps; step++) {
          const t = step / steps;
          const x = start.x + (end.x - start.x) * t;
          const y = start.y + (end.y - start.y) * t;
          
          if (step === 0 && i === 0) {
            ctx.beginPath();
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x, y);
          }
          
          // Draw finger indicator
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(x, y, 12, 0, Math.PI * 2);
          ctx.fill();
          
          await new Promise(r => setTimeout(r, 30));
          
          // Redraw guide + progress
          drawGuide(ctx);
          ctx.strokeStyle = '#3b82f6';
          ctx.lineWidth = 8;
          
          // Redraw completed parts
          const completedStrokes = getStrokes().slice(0, getStrokes().indexOf(stroke));
          completedStrokes.forEach(s => {
            ctx.beginPath();
            ctx.moveTo(s[0].x, s[0].y);
            s.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
            ctx.stroke();
          });
          
          // Redraw current stroke progress
          ctx.beginPath();
          ctx.moveTo(stroke[0].x, stroke[0].y);
          for (let j = 0; j <= i; j++) {
            ctx.lineTo(stroke[j + 1].x, stroke[j + 1].y);
          }
          const currentX = start.x + (end.x - start.x) * t;
          const currentY = start.y + (end.y - start.y) * t;
          ctx.lineTo(currentX, currentY);
          ctx.stroke();
        }
      }
      await new Promise(r => setTimeout(r, 300));
    }

    await new Promise(r => setTimeout(r, 500));
    setPhase('trace');
    drawGuide(ctx);
  }, [currentLetter, drawGuide, getStrokes]);

  // Initialize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    canvas.width = 300;
    canvas.height = 300;
    
    runDemo();
  }, [currentLetter, runDemo]);

  // Calculate trace accuracy
  const calculateAccuracy = useCallback((): number => {
    if (tracePoints.length < 30) return 0;
    
    let nearPoints = 0;
    const threshold = 35; // pixels
    
    // Check each trace point against stroke paths
    for (const point of tracePoints) {
      for (const stroke of getStrokes()) {
        for (let i = 0; i < stroke.length - 1; i++) {
          const dist = pointToLineDistance(point, stroke[i], stroke[i + 1]);
          if (dist < threshold) {
            nearPoints++;
            break;
          }
        }
      }
    }
    
    return Math.min(100, Math.round((nearPoints / tracePoints.length) * 100));
  }, [tracePoints, getStrokes]);

  // Point to line distance helper
  const pointToLineDistance = (point: Point, lineStart: Point, lineEnd: Point): number => {
    const A = point.x - lineStart.x;
    const B = point.y - lineStart.y;
    const C = lineEnd.x - lineStart.x;
    const D = lineEnd.y - lineStart.y;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    
    let xx, yy;
    if (param < 0) { xx = lineStart.x; yy = lineStart.y; }
    else if (param > 1) { xx = lineEnd.x; yy = lineEnd.y; }
    else { xx = lineStart.x + param * C; yy = lineStart.y + param * D; }
    
    return Math.sqrt((point.x - xx) ** 2 + (point.y - yy) ** 2);
  };

  // Handle drawing
  const getPointerPos = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase !== 'trace') return;
    setIsDrawing(true);
    const point = getPointerPos(e);
    setTracePoints([point]);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || phase !== 'trace') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const point = getPointerPos(e);
    const newPoints = [...tracePoints, point];
    setTracePoints(newPoints);
    
    // Draw trace
    if (tracePoints.length > 0) {
      const lastPoint = tracePoints[tracePoints.length - 1];
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(lastPoint.x, lastPoint.y);
      ctx.lineTo(point.x, point.y);
      ctx.stroke();
    }
  };

  const handlePointerUp = async () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    // Check completion
    if (tracePoints.length >= 50) {
      const accuracy = calculateAccuracy();
      if (accuracy >= 50) {
        setPhase('complete');
        setScore(prev => prev + 1);
        await GameAudio.playCorrect();
      }
    }
  };

  const reset = () => {
    setTracePoints([]);
    setPhase('demo');
    runDemo();
  };

  const nextLetter = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx = letters.indexOf(currentLetter);
    if (idx < 25) {
      setCurrentLetter(letters[idx + 1]);
      setTracePoints([]);
      setPhase('demo');
    }
  };

  const prevLetter = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx = letters.indexOf(currentLetter);
    if (idx > 0) {
      setCurrentLetter(letters[idx - 1]);
      setTracePoints([]);
      setPhase('demo');
    }
  };

  const playAudio = () => {
    GameAudio.playLetterNow(currentLetter.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/games" className="text-indigo-600 font-bold">← Back</Link>
          <div className="text-indigo-600 font-bold">⭐ {score}</div>
        </div>

        {/* Letter Display */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="text-center mb-4">
            <h1 className="text-6xl font-bold text-indigo-600 mb-2">{currentLetter}</h1>
            <p className="text-gray-600">
              {phase === 'demo' && '👀 Watch how to write it...'}
              {phase === 'trace' && '✏️ Now trace the letter!'}
              {phase === 'complete' && '🎉 Great job!'}
            </p>
          </div>

          {/* Canvas */}
          <div className="bg-gray-50 rounded-xl p-2 mb-4" style={{ touchAction: 'none' }}>
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              className="w-full aspect-square cursor-crosshair rounded-lg"
              style={{ maxWidth: '300px', margin: '0 auto', display: 'block' }}
            />
          </div>

          {/* Controls */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <button onClick={playAudio} className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
              <Volume2 size={20} /> Say
            </button>
            <button onClick={() => runDemo()} className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
              <Play size={20} /> Demo
            </button>
            <button onClick={reset} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2">
              <RotateCcw size={20} /> Reset
            </button>
          </div>

          {/* Complete state */}
          {phase === 'complete' && (
            <button onClick={nextLetter} disabled={currentLetter === 'Z'} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl mb-4">
              Continue to {currentLetter === 'Z' ? 'Done!' : String.fromCharCode(currentLetter.charCodeAt(0) + 1)} →
            </button>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            <button onClick={prevLetter} disabled={currentLetter === 'A'} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl flex items-center justify-center">
              <ChevronLeft size={20} /> Prev
            </button>
            <button onClick={nextLetter} disabled={currentLetter === 'Z'} className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-bold py-3 rounded-xl flex items-center justify-center">
              Next <ChevronRight size={20} />
            </button>
          </div>

          <div className="text-center text-sm text-gray-500 mt-4">
            Letter {currentLetter.charCodeAt(0) - 64} of 26
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterTracer;
