// components/04-LetterTracerNew.tsx
// EXCEPTIONAL Letter Tracer - Waypoint-guided tracing with correct Montessori formation
// Lowercase first (a-z), then uppercase (A-Z) - with proper stroke order

'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Volume2, RotateCcw, Play, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { GameAudio } from '@/lib/games/audio-paths';

interface Point { x: number; y: number; }
interface Waypoint extends Point { collected: boolean; index: number; }

// =============================================================================
// SVG LETTER PATHS - Correct Montessori/educational stroke order
// All paths in 0-250 coordinate space
// Based on Reading Universe / Neuhaus stroke directions
// =============================================================================

// LOWERCASE LETTERS (a-z) - Correct stroke order
// Coordinate system: x-height top=80, baseline=195, descender=240
// Letters should sit ON the baseline, not above it with tails
const LOWERCASE_PATHS: Record<string, string> = {
  // COORDINATE SYSTEM:
  // - x-height top (a,c,e,m,n,o,r,s,u,v,w,x,z): y=80
  // - baseline: y=195  
  // - ascender top (b,d,f,h,k,l,t): y=50
  // - descender bottom (g,j,p,q,y): y=240
  // - horizontal center: x=125, width ~90px (80-170)

  // a: bowl on baseline, stem on right - start at 2 o'clock, counterclockwise, up, down
  a: "M 165 105 Q 165 80 125 80 Q 85 80 85 137 Q 85 195 125 195 Q 165 195 165 137 L 165 80 L 165 195",
  
  // b: tall stem + bowl at bottom - down full height, then bowl
  b: "M 80 50 L 80 195 M 80 137 Q 80 195 125 195 Q 170 195 170 137 Q 170 80 125 80 L 80 80",
  
  // c: open curve - start at 2 o'clock, counterclockwise, stop at 4 o'clock
  c: "M 170 100 Q 170 80 125 80 Q 80 80 80 137 Q 80 195 125 195 Q 170 195 170 175",
  
  // d: bowl + tall stem - counterclockwise bowl, then tall stem down
  d: "M 165 105 Q 165 80 125 80 Q 85 80 85 137 Q 85 195 125 195 Q 165 195 165 137 M 165 50 L 165 195",
  
  // e: horizontal line, then counterclockwise curl
  e: "M 80 137 L 170 137 Q 170 80 125 80 Q 80 80 80 137 Q 80 195 125 195 Q 170 195 170 170",
  
  // f: curve at top, down, crossbar - starts with hook, down to baseline, cross
  f: "M 170 70 Q 140 50 115 70 L 115 195 M 80 110 L 150 110",
  
  // g: bowl + descender with hook - counterclockwise bowl, down below baseline, hook left
  g: "M 165 105 Q 165 80 125 80 Q 85 80 85 137 Q 85 195 125 195 Q 165 195 165 137 L 165 240 Q 165 255 125 255 Q 90 255 80 235",
  
  // h: tall stem + hump - down full height, back up, over hump, down
  h: "M 80 50 L 80 195 M 80 110 Q 80 80 125 80 Q 170 80 170 110 L 170 195",
  
  // i: short stem + dot - down from x-height, dot above
  i: "M 125 80 L 125 195 M 125 55 L 126 56",
  
  // j: stem + descender hook + dot - down below baseline, hook left, dot above  
  j: "M 140 80 L 140 240 Q 140 255 100 255 Q 75 255 65 235 M 140 55 L 141 56",
  
  // k: tall stem + diagonal arms - down full height, slant in, slant out
  k: "M 80 50 L 80 195 M 165 80 L 80 137 L 165 195",
  
  // l: tall stem only - simple vertical line
  l: "M 125 50 L 125 195",
  
  // m: down + two humps - down, up over first hump, down, up over second hump, down
  m: "M 45 195 L 45 80 Q 45 65 85 65 Q 125 65 125 95 L 125 195 M 125 95 Q 125 65 165 65 Q 205 65 205 95 L 205 195",
  
  // n: down + one hump - down, up over hump, down
  n: "M 80 195 L 80 80 Q 80 65 125 65 Q 170 65 170 95 L 170 195",
  
  // o: closed oval - counterclockwise full circle
  o: "M 170 137 Q 170 80 125 80 Q 80 80 80 137 Q 80 195 125 195 Q 170 195 170 137",
  
  // p: stem below baseline + bowl - down below baseline, then bowl at x-height
  p: "M 80 80 L 80 240 M 80 137 Q 80 80 125 80 Q 170 80 170 137 Q 170 195 125 195 L 80 195",
  
  // q: bowl + stem below baseline with tail - counterclockwise bowl, down, tail right
  q: "M 165 105 Q 165 80 125 80 Q 85 80 85 137 Q 85 195 125 195 Q 165 195 165 137 L 165 240 L 190 220",
  
  // r: down + shoulder - down, back up, curve over right
  r: "M 80 195 L 80 80 Q 80 65 110 65 Q 145 65 160 85",
  
  // s: S-curve - top curve right, middle, bottom curve left
  s: "M 160 95 Q 125 80 90 95 Q 60 115 125 137 Q 190 160 160 180 Q 125 195 90 180",
  
  // t: stem + crossbar - tall stem (but shorter than b/d), crossbar near top
  t: "M 125 55 L 125 195 M 85 80 L 165 80",
  
  // u: down + curve + up - down, curve at bottom, up
  u: "M 80 80 L 80 160 Q 80 195 125 195 Q 170 195 170 160 L 170 80",
  
  // v: diagonal down + diagonal up
  v: "M 60 80 L 125 195 L 190 80",
  
  // w: four diagonals - down, up, down, up
  w: "M 30 80 L 70 195 L 125 110 L 180 195 L 220 80",
  
  // x: two crossing diagonals
  x: "M 70 80 L 180 195 M 180 80 L 70 195",
  
  // y: two diagonals, second continues to descender
  y: "M 70 80 L 125 150 M 180 80 L 90 240",
  
  // z: horizontal, diagonal, horizontal
  z: "M 70 80 L 180 80 L 70 195 L 180 195",
};

// UPPERCASE LETTERS (A-Z) - Correct stroke order
const UPPERCASE_PATHS: Record<string, string> = {
  A: "M 40 210 L 125 40 L 210 210 M 75 145 L 175 145",
  B: "M 60 40 L 60 210 M 60 40 L 130 40 Q 175 40 175 75 Q 175 125 130 125 L 60 125 M 60 125 L 140 125 Q 185 125 185 167 Q 185 210 140 210 L 60 210",
  C: "M 195 70 Q 125 20 60 70 Q 15 125 60 180 Q 125 235 195 180",
  D: "M 60 40 L 60 210 M 60 40 L 110 40 Q 185 40 185 125 Q 185 210 110 210 L 60 210",
  E: "M 175 40 L 60 40 L 60 210 L 175 210 M 60 125 L 145 125",
  F: "M 175 40 L 60 40 L 60 210 M 60 125 L 145 125",
  G: "M 195 70 Q 125 20 60 70 Q 15 125 60 180 Q 125 235 195 180 L 195 125 L 140 125",
  H: "M 60 40 L 60 210 M 190 40 L 190 210 M 60 125 L 190 125",
  I: "M 125 40 L 125 210",
  J: "M 165 40 L 165 170 Q 165 210 125 210 Q 85 210 85 180",
  K: "M 60 40 L 60 210 M 175 40 L 60 125 L 175 210",
  L: "M 60 40 L 60 210 L 175 210",
  M: "M 40 210 L 40 40 L 125 140 L 210 40 L 210 210",
  N: "M 60 210 L 60 40 L 190 210 L 190 40",
  O: "M 195 125 Q 195 40 125 40 Q 55 40 55 125 Q 55 210 125 210 Q 195 210 195 125",
  P: "M 60 40 L 60 210 M 60 40 L 135 40 Q 180 40 180 82 Q 180 125 135 125 L 60 125",
  Q: "M 195 125 Q 195 40 125 40 Q 55 40 55 125 Q 55 210 125 210 Q 195 210 195 125 M 150 175 L 205 230",
  R: "M 60 40 L 60 210 M 60 40 L 135 40 Q 180 40 180 82 Q 180 125 135 125 L 60 125 M 115 125 L 185 210",
  S: "M 175 70 Q 175 40 135 40 L 115 40 Q 65 40 65 82 Q 65 110 115 125 L 135 135 Q 185 150 185 182 Q 185 210 135 210 L 115 210 Q 65 210 65 185",
  T: "M 40 40 L 210 40 M 125 40 L 125 210",
  U: "M 60 40 L 60 165 Q 60 210 125 210 Q 190 210 190 165 L 190 40",
  V: "M 40 40 L 125 210 L 210 40",
  W: "M 25 40 L 70 210 L 125 100 L 180 210 L 225 40",
  X: "M 50 40 L 200 210 M 200 40 L 50 210",
  Y: "M 50 40 L 125 125 L 200 40 M 125 125 L 125 210",
  Z: "M 50 40 L 200 40 L 50 210 L 200 210",
};

// Letter order: lowercase first (a-z), then uppercase (A-Z)
const LETTER_ORDER = [
  'a','b','c','d','e','f','g','h','i','j','k','l','m',
  'n','o','p','q','r','s','t','u','v','w','x','y','z',
  'A','B','C','D','E','F','G','H','I','J','K','L','M',
  'N','O','P','Q','R','S','T','U','V','W','X','Y','Z'
];

const getLetterPath = (letter: string): string => {
  if (letter >= 'a' && letter <= 'z') return LOWERCASE_PATHS[letter] || '';
  if (letter >= 'A' && letter <= 'Z') return UPPERCASE_PATHS[letter] || '';
  return '';
};

const isLowercase = (letter: string): boolean => letter >= 'a' && letter <= 'z';

// =============================================================================
// COMPONENT
// =============================================================================
const LetterTracerNew: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [currentLetterIndex, setCurrentLetterIndex] = useState(0);
  const [phase, setPhase] = useState<'demo' | 'trace' | 'complete'>('demo');
  const [waypoints, setWaypoints] = useState<Waypoint[]>([]);
  const [currentWaypointIndex, setCurrentWaypointIndex] = useState(0);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tracePoints, setTracePoints] = useState<Point[]>([]);
  const [score, setScore] = useState(0);
  const [showSparkles, setShowSparkles] = useState<Point | null>(null);
  const [demoProgress, setDemoProgress] = useState(0);
  const [demoFingerPos, setDemoFingerPos] = useState<Point | null>(null);

  const currentLetter = LETTER_ORDER[currentLetterIndex];
  
  const SIZE = 250;
  const WAYPOINT_RADIUS = 20;
  const TOLERANCE = 40;
  const NUM_WAYPOINTS = 8;

  // Generate waypoints along path
  const generateWaypoints = useCallback((letter: string): Waypoint[] => {
    if (typeof document === 'undefined') return [];
    const pathData = getLetterPath(letter);
    if (!pathData) return [];

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", pathData);
    svg.appendChild(path);
    document.body.appendChild(svg);

    const totalLength = path.getTotalLength();
    const points: Waypoint[] = [];
    for (let i = 0; i <= NUM_WAYPOINTS; i++) {
      const point = path.getPointAtLength((i / NUM_WAYPOINTS) * totalLength);
      points.push({ x: point.x, y: point.y, collected: false, index: i });
    }
    document.body.removeChild(svg);
    return points;
  }, []);

  // Handle completion - MUST be before checkWaypointHit
  const handleComplete = useCallback(async () => {
    setPhase('complete');
    setScore(prev => prev + 1);
    await GameAudio.playCelebration();
    await new Promise(r => setTimeout(r, 500));
    GameAudio.playLetterNow(currentLetter.toLowerCase());
  }, [currentLetter]);

  // Check if user hit a waypoint
  const checkWaypointHit = useCallback((point: Point) => {
    if (currentWaypointIndex >= waypoints.length) return;
    const target = waypoints[currentWaypointIndex];
    if (!target || target.collected) return;
    
    const distance = Math.sqrt((point.x - target.x) ** 2 + (point.y - target.y) ** 2);
    if (distance < TOLERANCE) {
      const newWaypoints = [...waypoints];
      newWaypoints[currentWaypointIndex] = { ...target, collected: true };
      setWaypoints(newWaypoints);
      setShowSparkles({ x: target.x, y: target.y });
      setTimeout(() => setShowSparkles(null), 600);
      GameAudio.playCorrect();
      const nextIndex = currentWaypointIndex + 1;
      setCurrentWaypointIndex(nextIndex);
      if (nextIndex >= waypoints.length) handleComplete();
    }
  }, [currentWaypointIndex, waypoints, handleComplete]);

  // Run demo animation
  const runDemo = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setPhase('demo');
    setDemoProgress(0);
    setTracePoints([]);
    setCurrentWaypointIndex(0);
    setDemoFingerPos(null);
    
    const newWaypoints = generateWaypoints(currentLetter);
    setWaypoints(newWaypoints.map(w => ({ ...w, collected: false })));
    if (newWaypoints.length === 0) { setPhase('trace'); return; }

    const pathData = getLetterPath(currentLetter);
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
      const progress = Math.min((Date.now() - startTime) / duration, 1);
      setDemoProgress(progress);
      const point = path.getPointAtLength(progress * totalLength);
      setDemoFingerPos({ x: point.x, y: point.y });
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        document.body.removeChild(svg);
        setDemoFingerPos(null);
        setTimeout(() => { setPhase('trace'); setDemoProgress(0); }, 400);
      }
    };
    animationRef.current = requestAnimationFrame(animate);
  }, [currentLetter, generateWaypoints]);

  // Draw canvas
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);

    const pathData = getLetterPath(currentLetter);
    if (!pathData) return;

    // Draw letter guide (thick light stroke)
    ctx.strokeStyle = '#e0e7ff';
    ctx.lineWidth = 45;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(pathData));

    // Demo animation stroke
    if (phase === 'demo' && demoProgress > 0) {
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 10;
      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
      path.setAttribute("d", pathData);
      svg.appendChild(path);
      document.body.appendChild(svg);
      const totalLength = path.getTotalLength();
      ctx.beginPath();
      for (let i = 0; i <= demoProgress * totalLength; i += 2) {
        const pt = path.getPointAtLength(i);
        i === 0 ? ctx.moveTo(pt.x, pt.y) : ctx.lineTo(pt.x, pt.y);
      }
      ctx.stroke();
      document.body.removeChild(svg);
      
      // Finger indicator
      if (demoFingerPos) {
        ctx.fillStyle = '#f59e0b';
        ctx.shadowColor = '#f59e0b';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(demoFingerPos.x, demoFingerPos.y, 18, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.arc(demoFingerPos.x, demoFingerPos.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // User trace
    if (tracePoints.length > 1 && phase === 'trace') {
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(tracePoints[0].x, tracePoints[0].y);
      tracePoints.forEach(p => ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    // Waypoints in trace phase
    if (phase === 'trace') {
      waypoints.forEach((wp, i) => {
        if (wp.collected) {
          ctx.fillStyle = '#22c55e';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, WAYPOINT_RADIUS - 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(wp.x - 8, wp.y);
          ctx.lineTo(wp.x - 2, wp.y + 7);
          ctx.lineTo(wp.x + 9, wp.y - 6);
          ctx.stroke();
        } else if (i === currentWaypointIndex) {
          const pulse = 1 + Math.sin(Date.now() / 150) * 0.2;
          ctx.fillStyle = '#3b82f6';
          ctx.shadowColor = '#3b82f6';
          ctx.shadowBlur = 20 * pulse;
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, WAYPOINT_RADIUS * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = 'white';
          ctx.beginPath();
          ctx.arc(wp.x, wp.y, (WAYPOINT_RADIUS - 6) * pulse, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#3b82f6';
          ctx.font = `bold ${16 * pulse}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${i + 1}`, wp.x, wp.y + 1);
        } else if (i > currentWaypointIndex) {
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

    // Sparkles
    if (showSparkles) {
      const time = Date.now();
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time / 300;
        const dist = 25 + Math.sin(time / 80 + i) * 15;
        ctx.fillStyle = ['#fbbf24', '#f59e0b', '#22c55e', '#3b82f6', '#ec4899', '#8b5cf6'][i % 6];
        ctx.beginPath();
        ctx.arc(showSparkles.x + Math.cos(angle) * dist, showSparkles.y + Math.sin(angle) * dist, 4 + Math.sin(time / 40 + i * 2) * 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Complete celebration
    if (phase === 'complete') {
      ctx.strokeStyle = '#fbbf24';
      ctx.lineWidth = 12;
      ctx.shadowColor = '#fbbf24';
      ctx.shadowBlur = 20;
      ctx.stroke(new Path2D(pathData));
      ctx.shadowBlur = 0;
    }
  }, [phase, tracePoints, waypoints, currentWaypointIndex, showSparkles, demoProgress, demoFingerPos, currentLetter]);

  // Animation loop
  useEffect(() => {
    let frameId: number;
    const loop = () => { drawCanvas(); frameId = requestAnimationFrame(loop); };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [drawCanvas]);

  // Touch handlers
  const getPointerPos = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: (e.clientX - rect.left) * (SIZE / rect.width), y: (e.clientY - rect.top) * (SIZE / rect.height) };
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
    if (e.target instanceof HTMLElement) e.target.releasePointerCapture(e.pointerId);
    setIsDrawing(false);
  };

  // Navigation
  const reset = useCallback(() => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setTracePoints([]);
    setCurrentWaypointIndex(0);
    setShowSparkles(null);
    runDemo();
  }, [runDemo]);

  const changeLetter = useCallback((index: number) => {
    if (index < 0 || index >= LETTER_ORDER.length) return;
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    setCurrentLetterIndex(index);
    setTracePoints([]);
    setCurrentWaypointIndex(0);
    setShowSparkles(null);
    setPhase('demo');
  }, []);

  const nextLetter = () => changeLetter(currentLetterIndex + 1);
  const prevLetter = () => changeLetter(currentLetterIndex - 1);
  const playAudio = () => GameAudio.playLetterNow(currentLetter.toLowerCase());

  // Initialize on letter change
  useEffect(() => { runDemo(); return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); }; }, [currentLetterIndex]);

  const caseLabel = isLowercase(currentLetter) ? 'lowercase' : 'UPPERCASE';
  const letterNum = isLowercase(currentLetter) ? currentLetterIndex + 1 : currentLetterIndex - 25;
  const totalInCase = 26;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 p-4">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Link href="/games" className="text-indigo-600 font-bold text-lg">← Games</Link>
          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg">
            <Sparkles className="text-yellow-500" size={20} />
            <span className="font-bold text-indigo-600 text-lg">{score}</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-6 text-center">
            <div className="text-white/70 text-sm font-medium mb-1">{caseLabel}</div>
            <h1 className="text-8xl font-bold text-white drop-shadow-lg" style={{ fontFamily: 'system-ui' }}>
              {currentLetter}
            </h1>
            <p className="text-white/90 text-lg mt-2">
              {phase === 'demo' && '👀 Watch carefully...'}
              {phase === 'trace' && `✏️ Connect ${waypoints.length - currentWaypointIndex} more dots!`}
              {phase === 'complete' && '🎉 Amazing!'}
            </p>
          </div>

          <div className="p-5">
            <div className="relative bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl shadow-inner overflow-hidden" style={{ touchAction: 'none' }}>
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
              {phase === 'trace' && currentWaypointIndex === 0 && waypoints[0] && (
                <div className="absolute pointer-events-none animate-bounce" style={{ left: `${(waypoints[0].x / SIZE) * 100}%`, top: `${(waypoints[0].y / SIZE) * 100}%`, transform: 'translate(-50%, -130%)' }}>
                  <div className="bg-green-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg whitespace-nowrap">👆 Start here!</div>
                </div>
              )}
            </div>

            {phase === 'trace' && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-500 mb-2">
                  <span className="font-medium">Progress</span>
                  <span className="font-bold">{currentWaypointIndex} / {waypoints.length}</span>
                </div>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 transition-all duration-300 rounded-full" style={{ width: `${(currentWaypointIndex / waypoints.length) * 100}%` }} />
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3 mt-5">
              <button onClick={playAudio} className="bg-gradient-to-br from-amber-400 to-orange-500 hover:from-amber-500 hover:to-orange-600 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all">
                <Volume2 size={26} /><span className="text-sm">Listen</span>
              </button>
              <button onClick={() => runDemo()} className="bg-gradient-to-br from-blue-400 to-indigo-500 hover:from-blue-500 hover:to-indigo-600 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all">
                <Play size={26} /><span className="text-sm">Watch</span>
              </button>
              <button onClick={reset} className="bg-gradient-to-br from-pink-400 to-rose-500 hover:from-pink-500 hover:to-rose-600 text-white font-bold py-4 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95 transition-all">
                <RotateCcw size={26} /><span className="text-sm">Retry</span>
              </button>
            </div>

            {phase === 'complete' && (
              <button onClick={nextLetter} disabled={currentLetterIndex >= LETTER_ORDER.length - 1} className="w-full mt-4 bg-gradient-to-r from-green-400 via-emerald-500 to-teal-500 hover:from-green-500 hover:via-emerald-600 hover:to-teal-600 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold py-5 rounded-2xl shadow-xl active:scale-[0.98] transition-all text-xl">
                {currentLetterIndex >= LETTER_ORDER.length - 1 ? '🎊 All Done!' : `Next: ${LETTER_ORDER[currentLetterIndex + 1]} →`}
              </button>
            )}

            <div className="flex gap-3 mt-4">
              <button onClick={prevLetter} disabled={currentLetterIndex === 0} className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-1 transition-colors">
                <ChevronLeft size={22} /> Previous
              </button>
              <button onClick={nextLetter} disabled={currentLetterIndex >= LETTER_ORDER.length - 1} className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 disabled:text-slate-300 text-slate-700 font-bold py-4 rounded-2xl flex items-center justify-center gap-1 transition-colors">
                Next <ChevronRight size={22} />
              </button>
            </div>

            <div className="text-center text-slate-400 mt-4 text-sm font-medium">
              {caseLabel} letter {letterNum} of {totalInCase}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LetterTracerNew;
