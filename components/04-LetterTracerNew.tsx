// components/04-LetterTracerNew.tsx
// EXCEPTIONAL Letter Tracer - Waypoint-guided tracing with animated demos
// Built from deep research: LetterSchool-style waypoint collection + SVG animations

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Volume2, RotateCcw, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

interface Point { x: number; y: number; }
interface Waypoint extends Point { collected: boolean; index: number; }

// =============================================================================
// SVG LETTER PATHS - All paths in 0-250 coordinate space
// Single continuous strokes where possible for smooth tracing
// =============================================================================
const LETTER_SVG_PATHS: Record<string, string> = {
  // Each letter uses coordinates 0-250 for consistency with canvas
  A: "M 125 30 L 45 220 M 125 30 L 205 220 M 70 155 L 180 155",
  B: "M 60 30 L 60 220 M 60 30 L 140 30 Q 190 30 190 80 Q 190 125 140 125 L 60 125 M 60 125 L 150 125 Q 200 125 200 172 Q 200 220 150 220 L 60 220",
  C: "M 200 70 Q 125 15 70 70 Q 20 125 70 185 Q 125 240 200 185",
  D: "M 60 30 L 60 220 M 60 30 L 120 30 Q 200 30 200 125 Q 200 220 120 220 L 60 220",
  E: "M 190 30 L 60 30 L 60 220 L 190 220 M 60 125 L 160 125",
  F: "M 190 30 L 60 30 L 60 220 M 60 125 L 150 125",
  G: "M 200 70 Q 125 15 70 70 Q 20 125 70 185 Q 125 240 200 185 L 200 125 L 140 125",
  H: "M 60 30 L 60 220 M 190 30 L 190 220 M 60 125 L 190 125",
  I: "M 125 30 L 125 220",
  J: "M 175 30 L 175 175 Q 175 220 125 220 Q 75 220 75 175",
  K: "M 60 30 L 60 220 M 190 30 L 60 130 L 190 220",
  L: "M 60 30 L 60 220 L 190 220",
  M: "M 35 220 L 35 30 L 125 140 L 215 30 L 215 220",
  N: "M 60 220 L 60 30 L 190 220 L 190 30",
  O: "M 125 30 Q 50 30 50 125 Q 50 220 125 220 Q 200 220 200 125 Q 200 30 125 30",
  P: "M 60 30 L 60 220 M 60 30 L 145 30 Q 195 30 195 80 Q 195 130 145 130 L 60 130",
  Q: "M 125 30 Q 50 30 50 125 Q 50 220 125 220 Q 200 220 200 125 Q 200 30 125 30 M 155 175 L 220 240",
  R: "M 60 30 L 60 220 M 60 30 L 145 30 Q 195 30 195 80 Q 195 130 145 130 L 60 130 M 125 130 L 200 220",
  S: "M 190 65 Q 190 30 145 30 L 105 30 Q 60 30 60 75 Q 60 110 105 125 L 145 140 Q 190 155 190 190 Q 190 220 145 220 L 105 220 Q 60 220 60 190",
  T: "M 35 30 L 215 30 M 125 30 L 125 220",
  U: "M 60 30 L 60 175 Q 60 220 125 220 Q 190 220 190 175 L 190 30",
  V: "M 35 30 L 125 220 L 215 30",
  W: "M 25 30 L 75 220 L 125 100 L 175 220 L 225 30",
  X: "M 50 30 L 200 220 M 200 30 L 50 220",
  Y: "M 50 30 L 125 130 L 200 30 M 125 130 L 125 220",
  Z: "M 50 30 L 200 30 L 50 220 L 200 220",
};

// =============================================================================
// COMPONENT
// =============================================================================
const LetterTracerNew: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [currentLetter, setCurrentLetter] = useState('A');
  const [phase, setPhase] = useState<'demo' | 'trace' | 'complete'>('demo');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tracePoints, setTracePoints] = useState<Point[]>([]);
  const [score, setScore] = useState(0);
  const [showSparkles, setShowSparkles] = useState<Point | null>(null);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoFingerPos, setDemoFingerPos] = useState<Point | null>(null);

  // Constants - all using same 250x250 coordinate space
  const SIZE = 250;
  const WAYPOINT_RADIUS = 20;
  const TOLERANCE = 40;
  const NUM_WAYPOINTS = 8;

  // =============================================================================
  // WAYPOINT GENERATION
  // =============================================================================
  const generateWaypoints = useCallback((letter: string): Waypoint[] => {
    if (typeof document === 'undefined') return [];
    
    const pathData = LETTER_SVG_PATHS[letter];
    if (!pathData) return [];

    // Create temporary SVG to measure path
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);

    const totalLength = path.getTotalLength();
    const points: Waypoint[] = [];

    for (let i = 0; i <= NUM_WAYPOINTS; i++) {
      const distance = (i / NUM_WAYPOINTS) * totalLength;
      const point = path.getPointAtLength(distance);
      points.push({
        x: point.x,
        y: point.y,
        collected: false,
        index: i
      });
    }

    document.body.removeChild(svg);
    return points;
  }, []);

  // =============================================================================
  // DEMO ANIMATION
  // =============================================================================
  const runDemo = useCallback(async () => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    
    setPhase('demo');
    setDemoProgress(0);
    setTracePoints([]);
    setCurrentWaypointIndex(0);
    setDemoFingerPos(null);
    
    const newWaypoints = generateWaypoints(currentLetter);
    setWaypoints(newWaypoints.map(w => ({ ...w, collected: false })));

    if (newWaypoints.length === 0) {
      setPhase('trace');
      return;
    }

    // Create path for animation
    const pathData = LETTER_SVG_PATHS[currentLetter];
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);
    
    const totalLength = path.getTotalLength();
    const duration = 2500;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      setDemoProgress(progress);
      
      // Update finger position along path
      const point = path.getPointAtLength(progress * totalLength);
      setDemoFingerPos({ x: point.x, y: point.y });

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        document.body.removeChild(svg);
        setDemoFingerPos(null);
        setTimeout(() => {
          setPhase('trace');
          setDemoProgress(0);
        }, 400);
      }
    };

    animationRef.current = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      if (document.body.contains(svg)) {
        document.body.removeChild(svg);
      }
    };
  }, [currentLetter, generateWaypoints]);

  // =============================================================================
  // CANVAS DRAWING
  // =============================================================================
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, SIZE, SIZE);

    // Draw letter guide (thick light stroke)
    const pathData = LETTER_SVG_PATHS[currentLetter];
    if (pathData) {
      ctx.strokeStyle = '#e0e7ff';
      ctx.lineWidth = 45;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      const path2D = new Path2D(pathData);
      ctx.stroke(path2D);
    }

    // Draw demo animation stroke
    if (phase === 'demo' && demoProgress > 0) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Draw partial path using clipping
      const pathData = LETTER_SVG_PATHS[currentLetter];
      if (pathData) {
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathData);
        svg.appendChild(path);
        document.body.appendChild(svg);
        
        const totalLength = path.getTotalLength();
        const drawLength = demoProgress * totalLength;
        
        // Draw segments up to current progress
        ctx.beginPath();
        for (let i = 0; i <= drawLength; i += 2) {
          const point = path.getPointAtLength(Math.min(i, drawLength));
          if (i === 0) {
            ctx.moveTo(point.x, point.y);
          } else {
            ctx.lineTo(point.x, point.y);
          }
        }
        ctx.stroke();
        
        document.body.removeChild(svg);
      }
      
      // Draw finger indicator
      if (demoFingerPos) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(demoFingerPos.x, demoFingerPos.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        // Inner white dot
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(demoFingerPos.x, demoFingerPos.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw user's trace
    if (tracePoints.length > 1 && phase === 'trace') {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 12;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(tracePoints[0].x, tracePoints[0].y);
      tracePoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    // Draw waypoints in trace phase
    if (phase === 'trace') {
      waypoints.forEach((wp, i) => {
        if (wp.collected) {
          // Collected - green with checkmark
          ctx.fillStyle = '#22c55e';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, WAYPOINT_RADIUS - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // Checkmark
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 4;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(wp.x - 8, wp.y);
          ctx.lineTo(wp.x - 2, wp.y + 7);
          ctx.lineTo(wp.x + 9, wp.y - 6);
          ctx.stroke();
        } else if (i === currentWaypointIndex) {
          // Active waypoint - pulsing
          const pulse = 1 + Math.sin(Date.now() / 150) * 0.2;
          
          ctx.fillStyle = '#3b82f6';
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 20 * pulse;
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, WAYPOINT_RADIUS * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          
          // White center
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, (WAYPOINT_RADIUS - 6) * pulse, 0, Math.PI * 2);
          ctx.fill();
          
          // Number
          ctx.fillStyle = '#3b82f6';
          ctx.font = `bold ${16 * pulse}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${i + 1}`, wp.x, wp.y + 1);
        } else if (i > currentWaypointIndex) {
          // Future waypoints - faded
          ctx.fillStyle = 'rgba(156, 163, 175, 0.3)';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, WAYPOINT_RADIUS - 8, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.fillStyle = 'rgba(156, 163, 175, 0.5)';
          ctx.font = 'bold 12px system-ui';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${i + 1}`, wp.x, wp.y + 1);
        }
      });
    }

    // Draw sparkles
    if (showSparkles) {
      const time = Date.now();
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time / 300;
        const distance = 25 + Math.sin(time / 80 + i) * 15;
        const x = showSparkles.x + Math.cos(angle) * distance;
        const y = showSparkles.y + Math.sin(angle) * distance;
        const size = 4 + Math.sin(time / 40 + i * 2) * 2;
        
        ctx.fillStyle = ['#fbbf24', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6'][i % 6];
        ctx.beginPath();
        ctx.arc(x, y, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Complete celebration
    if (phase === 'complete') {
      // Draw completed stroke in gold
      const pathData = LETTER_SVG_PATHS[currentLetter];
      if (pathData) {
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 12;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = '#fbbf24';
        ctx.shadowBlur = 20;
        const path2D = new Path2D(pathData);
        ctx.stroke(path2D);
        ctx.shadowBlur = 0;
      }
    }
  }, [phase, tracePoints, waypoints, currentWaypointIndex, showSparkles, demoProgress, demoFingerPos, currentLetter]);

  // Animation loop
  useEffect(() => {
    let frameId: number;
    const loop = () => {
      drawCanvas();
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [drawCanvas]);

  // =============================================================================
  // TOUCH HANDLERS
  // =============================================================================
  const getPointerPos = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = SIZE / rect.width;
    const scaleY = SIZE / rect.height;
    
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const checkWaypointHit = useCallback((point: Point) => {
    if (currentWaypointIndex >= waypoints.length) return;
    
    const target = waypoints[currentWaypointIndex];
    if (!target || target.collected) return;
    
    const distance = Math.sqrt(
      (point.x - target.x) ** 2 + (point.y - target.y) ** 2
    );
    
    if (distance < TOLERANCE) {
      // Hit!
      const newWaypoints = [...waypoints];
      newWaypoints[currentWaypointIndex] = { ...target, collected: true };
      setWaypoints(newWaypoints);
      
      // Sparkle effect
      setShowSparkles({ x: target.x, y: target.y });
      setTimeout(() => setShowSparkles(null), 600);
      
      // Sound
      GameAudio.playCorrect();
      
      // Next waypoint
      const nextIndex = currentWaypointIndex + 1;
      setCurrentWaypointIndex(nextIndex);
      
      // Complete?
      if (nextIndex >= waypoints.length) {
        handleComplete();
      }
    }
  }, [currentWaypointIndex, waypoints]);

  const handleComplete = async () => {
    setPhase('complete');
    setScore(prev => prev + 1);
    await GameAudio.playCelebration();
    await new Promise(r => setTimeout(r, 500));
    GameAudio.playLetterNow(currentLetter.toLowerCase());
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (phase !== 'trace') return;
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDrawing(true);
    const point = getPointerPos(e);
    setTracePoints([point]);
    checkWaypointHit(point);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || phase !== 'trace') return;
    e.preventDefault();
    const point = getPointerPos(e);
    setTracePoints(prev => [...prev, point]);
    checkWaypointHit(point);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (e.target instanceof HTMLElement) {
      e.target.releasePointerCapture(e.pointerId);
    }
    setIsDrawing(false);
  };

  // =============================================================================
  // NAVIGATION
  // =============================================================================
  const reset = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setTracePoints([]);
    setCurrentWaypointIndex(0);
    setShowSparkles(null);
    runDemo();
  }, [runDemo]);

  const changeLetter = useCallback((newLetter: string) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    setCurrentLetter(newLetter);
    setTracePoints([]);
    setCurrentWaypointIndex(0);
    setShowSparkles(null);
    setPhase('demo');
  }, []);

  const nextLetter = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx = letters.indexOf(currentLetter);
    if (idx < 25) changeLetter(letters[idx + 1]);
  };

  const prevLetter = () => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const idx = letters.indexOf(currentLetter);
    if (idx > 0) changeLetter(letters[idx - 1]);
  };

  const playAudio = () => {
    GameAudio.playLetterNow(currentLetter.toLowerCase());
  };

  // Initialize on letter change
  useEffect(() => {
    runDemo();
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [currentLetter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <Link href="/games" className="text-indigo-600 font-bold text-lg">
            ← Games
          </Link>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
            <Sparkles className="text-yellow-500" size={20} />
            <span className="font-bold text-indigo-600 text-lg">{score}</span>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-center">
            <h1 className="text-8xl font-bold text-white drop-shadow-lg" style={{ fontFamily: 'system-ui' }}>
              {currentLetter}
            </h1>
            <p className="text-white/90 text-lg mt-2">
              {phase === 'demo' && '👀 Watch carefully...'}
              {phase === 'trace' && `✏️ Connect ${waypoints.length - currentWaypointIndex} more dots!`}
              {phase === 'complete' && '🎉 Amazing!'}
            </p>
          </div>

          {/* Canvas Area */}
          <div className="p-5">
            <div 
              className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-inner overflow-hidden"
              style={{ touchAction: 'none' }}
            >
              <canvas
                ref={canvasRef}
                width={SIZE}
                height={SIZE}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className="w-full aspect-square cursor-crosshair"
                style={{ touchAction: 'none' }}
              />
              
              {/* Start hint */}
              {phase === 'trace' && currentWaypointIndex === 0 && waypoints[0] && (
                <div
                  className="absolute pointer-events-none animate-bounce"
                  style={{
                    left: `${(waypoints[0].x / SIZE) * 100}%`,
                    top: `${(waypoints[0].y / SIZE) * 100}%`,
                    transform: 'translate(-50%, -130%)'
                  }}
                >
                  <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">
                    👆 Start here!
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {phase === 'trace' && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span className="font-medium">Progress</span>
                  <span className="font-bold">{currentWaypointIndex} / {waypoints.length}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300 rounded-full"
                    style={{ width: `${(currentWaypointIndex / waypoints.length) * 100}%` }}
                  />
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="grid grid-cols-3 gap-3 mt-5">
              <button 
                onClick={playAudio} 
                className="bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <Volume2 size={26} />
                <span className="text-sm">Listen</span>
              </button>
              <button 
                onClick={() => runDemo()} 
                className="bg-gradient-to-br from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <Play size={26} />
                <span className="text-sm">Watch</span>
              </button>
              <button 
                onClick={reset} 
                className="bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all"
              >
                <RotateCcw size={26} />
                <span className="text-sm">Retry</span>
              </button>
            </div>

            {/* Next Button (on complete) */}
            {phase === 'complete' && (
              <button 
                onClick={nextLetter} 
                disabled={currentLetter === 'Z'} 
                className="w-full mt-4 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 hover:from-green-500 hover:via-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all text-xl"
              >
                {currentLetter === 'Z' ? '🎊 All Done!' : `Next: ${String.fromCharCode(currentLetter.charCodeAt(0) + 1)} →`}
              </button>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-4">
              <button 
                onClick={prevLetter} 
                disabled={currentLetter === 'A'} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-1 transition-colors"
              >
                <ChevronLeft size={22} /> Previous
              </button>
              <button 
                onClick={nextLetter} 
                disabled={currentLetter === 'Z'} 
                className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-1 transition-colors"
              >
                Next <ChevronRight size={22} />
              </button>
            </div>

            {/* Progress text */}
            <div className="text-center text-slate-400 mt-4 text-sm font-medium">
              Letter {currentLetter.charCodeAt(0) - 64} of 26
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterTracerNew;
