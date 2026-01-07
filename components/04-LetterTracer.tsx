// components/LetterTracer.tsx

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Volume2, RotateCcw } from 'lucide-react';

interface LetterTracerProps {
  childId?: string;
  onComplete?: () => void;
}

const LetterTracer: React.FC<LetterTracerProps> = ({ childId, onComplete }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentLetter, setCurrentLetter] = useState('A');
  const [isAnimating, setIsAnimating] = useState(true);
  const [isTracing, setIsTracing] = useState(false);
  const [tracePoints, setTracePoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);
  const [accuracyScore, setAccuracyScore] = useState(0);
  
  // Get childId from session if not provided as prop
  const [effectiveChildId, setEffectiveChildId] = useState<string | undefined>(childId);

  const letterStrokes = {
    A: [
      { x: 100, y: 50 },
      { x: 50, y: 200 },
      { x: 100, y: 50 },
      { x: 150, y: 200 },
      { x: 65, y: 120 },
      { x: 135, y: 120 }
    ],
    B: [
      { x: 80, y: 50 },
      { x: 80, y: 200 },
      { x: 80, y: 50 },
      { x: 140, y: 50 },
      { x: 140, y: 120 },
      { x: 80, y: 120 },
      { x: 80, y: 120 },
      { x: 145, y: 120 },
      { x: 145, y: 200 },
      { x: 80, y: 200 }
    ],
    C: [
      { x: 140, y: 60 },
      { x: 80, y: 60 },
      { x: 60, y: 100 },
      { x: 60, y: 150 },
      { x: 80, y: 190 },
      { x: 140, y: 190 }
    ],
    D: [
      { x: 70, y: 50 },
      { x: 70, y: 200 },
      { x: 70, y: 50 },
      { x: 130, y: 75 },
      { x: 145, y: 125 },
      { x: 130, y: 175 },
      { x: 70, y: 200 }
    ],
    E: [
      { x: 70, y: 50 },
      { x: 70, y: 200 },
      { x: 70, y: 50 },
      { x: 140, y: 50 },
      { x: 70, y: 125 },
      { x: 130, y: 125 },
      { x: 70, y: 200 },
      { x: 140, y: 200 }
    ],
    F: [
      { x: 70, y: 50 },
      { x: 70, y: 200 },
      { x: 70, y: 50 },
      { x: 140, y: 50 },
      { x: 70, y: 125 },
      { x: 130, y: 125 }
    ],
    G: [
      { x: 140, y: 60 },
      { x: 80, y: 60 },
      { x: 60, y: 100 },
      { x: 60, y: 150 },
      { x: 80, y: 190 },
      { x: 140, y: 190 },
      { x: 140, y: 190 },
      { x: 140, y: 130 },
      { x: 100, y: 130 }
    ],
    H: [
      { x: 60, y: 50 },
      { x: 60, y: 200 },
      { x: 140, y: 50 },
      { x: 140, y: 200 },
      { x: 60, y: 125 },
      { x: 140, y: 125 }
    ],
    I: [
      { x: 100, y: 50 },
      { x: 100, y: 200 }
    ],
    J: [
      { x: 140, y: 50 },
      { x: 140, y: 180 },
      { x: 120, y: 195 },
      { x: 80, y: 195 }
    ],
    K: [
      { x: 70, y: 50 },
      { x: 70, y: 200 },
      { x: 70, y: 70 },
      { x: 140, y: 50 },
      { x: 70, y: 125 },
      { x: 140, y: 200 }
    ],
    L: [
      { x: 80, y: 50 },
      { x: 80, y: 200 },
      { x: 80, y: 200 },
      { x: 140, y: 200 }
    ],
    M: [
      { x: 50, y: 200 },
      { x: 50, y: 50 },
      { x: 50, y: 50 },
      { x: 100, y: 120 },
      { x: 100, y: 120 },
      { x: 150, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 200 }
    ],
    N: [
      { x: 60, y: 200 },
      { x: 60, y: 50 },
      { x: 60, y: 50 },
      { x: 140, y: 200 },
      { x: 140, y: 200 },
      { x: 140, y: 50 }
    ],
    O: [
      { x: 100, y: 50 },
      { x: 140, y: 70 },
      { x: 150, y: 125 },
      { x: 140, y: 180 },
      { x: 100, y: 200 },
      { x: 60, y: 180 },
      { x: 50, y: 125 },
      { x: 60, y: 70 },
      { x: 100, y: 50 }
    ],
    P: [
      { x: 80, y: 50 },
      { x: 80, y: 200 },
      { x: 80, y: 50 },
      { x: 140, y: 50 },
      { x: 140, y: 120 },
      { x: 80, y: 120 }
    ],
    Q: [
      { x: 100, y: 50 },
      { x: 140, y: 70 },
      { x: 150, y: 125 },
      { x: 140, y: 180 },
      { x: 100, y: 200 },
      { x: 60, y: 180 },
      { x: 50, y: 125 },
      { x: 60, y: 70 },
      { x: 100, y: 50 },
      { x: 130, y: 170 },
      { x: 160, y: 210 }
    ],
    R: [
      { x: 80, y: 50 },
      { x: 80, y: 200 },
      { x: 80, y: 50 },
      { x: 140, y: 50 },
      { x: 140, y: 120 },
      { x: 80, y: 120 },
      { x: 80, y: 120 },
      { x: 140, y: 200 }
    ],
    S: [
      { x: 140, y: 60 },
      { x: 80, y: 60 },
      { x: 60, y: 80 },
      { x: 80, y: 100 },
      { x: 120, y: 100 },
      { x: 140, y: 120 },
      { x: 120, y: 140 },
      { x: 60, y: 140 },
      { x: 80, y: 160 },
      { x: 140, y: 180 }
    ],
    T: [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 100, y: 50 },
      { x: 100, y: 200 }
    ],
    U: [
      { x: 60, y: 50 },
      { x: 60, y: 170 },
      { x: 80, y: 195 },
      { x: 120, y: 195 },
      { x: 140, y: 170 },
      { x: 140, y: 170 },
      { x: 140, y: 50 }
    ],
    V: [
      { x: 50, y: 50 },
      { x: 100, y: 200 },
      { x: 100, y: 200 },
      { x: 150, y: 50 }
    ],
    W: [
      { x: 40, y: 50 },
      { x: 65, y: 200 },
      { x: 65, y: 200 },
      { x: 100, y: 100 },
      { x: 100, y: 100 },
      { x: 135, y: 200 },
      { x: 135, y: 200 },
      { x: 160, y: 50 }
    ],
    X: [
      { x: 50, y: 50 },
      { x: 150, y: 200 },
      { x: 150, y: 50 },
      { x: 50, y: 200 }
    ],
    Y: [
      { x: 50, y: 50 },
      { x: 100, y: 120 },
      { x: 150, y: 50 },
      { x: 100, y: 120 },
      { x: 100, y: 120 },
      { x: 100, y: 200 }
    ],
    Z: [
      { x: 50, y: 50 },
      { x: 150, y: 50 },
      { x: 150, y: 50 },
      { x: 50, y: 200 },
      { x: 50, y: 200 },
      { x: 150, y: 200 }
    ]
  };

  const canvas = canvasRef.current;

  // Get childId from session if not provided
  useEffect(() => {
    if (!effectiveChildId) {
      const session = localStorage.getItem('student_session');
      if (session) {
        try {
          const parsed = JSON.parse(session);
          setEffectiveChildId(parsed.childId);
        } catch (err) {
          console.error('Error parsing session:', err);
        }
      }
    }
  }, [effectiveChildId]);

  // Draw letter outline
  const drawOutline = (ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const strokes = letterStrokes[currentLetter as keyof typeof letterStrokes];
    let currentStroke: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < strokes.length; i++) {
      const point = strokes[i];

      if (currentStroke.length > 0) {
        const lastPoint = currentStroke[currentStroke.length - 1];
        const distance = Math.sqrt(
          Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
        );

        if (distance > 50) {
          if (currentStroke.length > 0) {
            ctx.beginPath();
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            for (let j = 1; j < currentStroke.length; j++) {
              ctx.lineTo(currentStroke[j].x, currentStroke[j].y);
            }
            ctx.stroke();
          }
          currentStroke = [point];
        } else {
          currentStroke.push(point);
        }
      } else {
        currentStroke.push(point);
      }
    }

    if (currentStroke.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let j = 1; j < currentStroke.length; j++) {
        ctx.lineTo(currentStroke[j].x, currentStroke[j].y);
      }
      ctx.stroke();
    }
  };

  // Animate strokes
  const animateStrokes = async (ctx: CanvasRenderingContext2D) => {
    const strokes = letterStrokes[currentLetter as keyof typeof letterStrokes];
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let currentStroke: Array<{ x: number; y: number }> = [];

    for (let i = 0; i < strokes.length; i++) {
      const point = strokes[i];

      if (currentStroke.length > 0) {
        const lastPoint = currentStroke[currentStroke.length - 1];
        const distance = Math.sqrt(
          Math.pow(point.x - lastPoint.x, 2) + Math.pow(point.y - lastPoint.y, 2)
        );

        if (distance > 50) {
          if (currentStroke.length > 1) {
            ctx.beginPath();
            ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
            for (let j = 1; j < currentStroke.length; j++) {
              ctx.lineTo(currentStroke[j].x, currentStroke[j].y);
            }
            ctx.stroke();
            await new Promise(resolve => setTimeout(resolve, 300));
          }
          currentStroke = [point];
        } else {
          currentStroke.push(point);
        }
      } else {
        currentStroke.push(point);
      }
    }

    if (currentStroke.length > 1) {
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);
      for (let j = 1; j < currentStroke.length; j++) {
        ctx.lineTo(currentStroke[j].x, currentStroke[j].y);
      }
      ctx.stroke();
    }

    await new Promise(resolve => setTimeout(resolve, 800));
    setIsAnimating(false);
    setIsTracing(true);
  };

  // Initialize canvas
  useEffect(() => {
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 200;
    canvas.height = 250;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawOutline(ctx);

    if (isAnimating) {
      animateStrokes(ctx);
    }
  }, [currentLetter, isAnimating, canvas]);

  // Calculate accuracy based on stroke similarity
  const calculateAccuracy = (): number => {
    if (tracePoints.length < 20) return 0;

    const referenceStrokes = letterStrokes[currentLetter as keyof typeof letterStrokes];
    const referenceCoverage = new Set<string>();

    // Create a grid representation of reference strokes
    for (const point of referenceStrokes) {
      const gridKey = `${Math.round(point.x / 5)},${Math.round(point.y / 5)}`;
      referenceCoverage.add(gridKey);
    }

    // Check trace points overlap
    let matchCount = 0;
    for (const point of tracePoints) {
      const gridKey = `${Math.round(point.x / 5)},${Math.round(point.y / 5)}`;
      if (referenceCoverage.has(gridKey)) {
        matchCount++;
      }
    }

    const accuracy = Math.round((matchCount / Math.max(referenceCoverage.size, 1)) * 100);
    return Math.min(accuracy, 100);
  };

  // Handle pointer down
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isTracing || isComplete) return;
    const rect = canvas?.getBoundingClientRect();
    if (!rect) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setTracePoints([point]);
  };

  // Handle pointer move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isTracing || isComplete || tracePoints.length === 0) return;

    const rect = canvas?.getBoundingClientRect();
    if (!rect || !canvas) return;

    const point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const newPoints = [...tracePoints, point];
    setTracePoints(newPoints);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(tracePoints[tracePoints.length - 1].x, tracePoints[tracePoints.length - 1].y);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();

    // Check for completion
    if (newPoints.length > 40) {
      const accuracy = calculateAccuracy();
      setAccuracyScore(accuracy);
      setIsComplete(true);
      setShowCelebration(true);
      setTimeout(() => setShowCelebration(false), 2000);
    }
  };

  // Handle pointer up
  const handlePointerUp = () => {
    setTracePoints([]);
  };

  // Save progress (simplified - can be extended later)
  const saveProgress = async () => {
    if (!isComplete || !effectiveChildId) return;
    
    // Save progress via API if childId is available
    try {
      await fetch('/api/student/game-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameType: 'letter_tracer',
          childId: effectiveChildId,
          itemId: currentLetter,
          completed: true,
        }),
      });
      
      setTimeout(() => {
        goToNextLetter();
      }, 1000);
    } catch (err) {
      console.error('Error saving progress:', err);
      // Still allow navigation even if save fails
      setTimeout(() => {
        goToNextLetter();
      }, 1000);
    }
  };

  // Navigate letters
  const goToPreviousLetter = () => {
    const letters = Object.keys(letterStrokes);
    const currentIndex = letters.indexOf(currentLetter);
    if (currentIndex > 0) {
      setCurrentLetter(letters[currentIndex - 1]);
      reset();
    }
  };

  const goToNextLetter = () => {
    const letters = Object.keys(letterStrokes);
    const currentIndex = letters.indexOf(currentLetter);
    if (currentIndex < letters.length - 1) {
      setCurrentLetter(letters[currentIndex + 1]);
      reset();
    } else if (onComplete) {
      onComplete();
    }
  };

  const reset = () => {
    setIsAnimating(true);
    setIsTracing(false);
    setTracePoints([]);
    setIsComplete(false);
    setShowCelebration(false);
    setAccuracyScore(0);
  };

  const playAudio = async () => {
    // Use ElevenLabs pre-recorded audio
    const { GameAudio } = await import('@/lib/games/audio-paths');
    GameAudio.playLetterNow(currentLetter.toLowerCase());
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full">
        
        {/* Header */}
        <div className="mb-4 pb-4 border-b-2 border-indigo-200">
          <h2 className="text-2xl font-bold text-indigo-600">Letter Tracer</h2>
        </div>

        {/* Letter Display */}
        <div className="text-center mb-8">
          <h1 className="text-6xl font-bold text-indigo-600 mb-2">{currentLetter}</h1>
          <p className="text-gray-600 text-lg mb-2">
            {isAnimating ? 'Watch the letter' : isComplete ? `Great job!` : 'Now your turn!'}
          </p>
        </div>

        {/* Canvas */}
        <div 
          className="border-4 border-dashed border-indigo-300 rounded-lg bg-white mb-6 flex items-center justify-center"
          style={{ touchAction: 'none' }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="cursor-crosshair"
            style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
          />
        </div>

        {/* Celebration */}
        {showCelebration && (
          <div className="text-center mb-6 animate-bounce">
            <p className="text-4xl mb-2">🎉</p>
            <p className="text-2xl font-bold text-green-600">Well done!</p>
          </div>
        )}

        {/* Controls */}
        <div className="space-y-3 mb-6">
          {isComplete && (
            <button
              onClick={saveProgress}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              Continue to Next Letter
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={playAudio}
              className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              <Volume2 size={20} />
              Say
            </button>
            <button
              onClick={reset}
              className="flex-1 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
            >
              <RotateCcw size={20} />
              Retry
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={goToPreviousLetter}
            disabled={currentLetter === 'A'}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <ChevronLeft size={20} />
            Previous
          </button>
          <button
            onClick={goToNextLetter}
            disabled={currentLetter === 'Z'}
            className="flex-1 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition"
          >
            Next
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Letter progress */}
        <div className="text-center text-sm text-gray-500">
          Letter {Object.keys(letterStrokes).indexOf(currentLetter) + 1} of {Object.keys(letterStrokes).length}
        </div>
      </div>
    </div>
  );
};

export default LetterTracer;
