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

// LOWERCASE LETTERS (a-z) - Correct Montessori stroke order
// =============================================================================
// COORDINATE SYSTEM (canvas 300x300):
// - Top line (ascender top for b,d,f,h,k,l,t): y=40
// - Midline (x-height top for a,c,e,m,n,o,r,s,u,v,w,x,z): y=100
// - Baseline: y=200
// - Descender line (bottom of g,j,p,q,y): y=260
// - Horizontal center: x=150, letter width ~100px (100-200)
// - Padding: 40px on all sides ensures nothing goes off canvas
//
// STROKE ORDER RULES:
// - Vertical strokes go TOP to BOTTOM (down first)
// - Circle letters (a,c,d,g,o,q) start at 2 o'clock, go COUNTERCLOCKWISE
// - Letters with stems: DOWN first, then retrace UP, then continue
// - Continuous paths where possible (no M in middle except for dots/crosses)
// =============================================================================
const LOWERCASE_PATHS: Record<string, string> = {
  // a: Start 2 o'clock, counterclockwise circle, up right side, down to baseline
  a: "M 190 120 Q 190 100 150 100 Q 110 100 110 150 Q 110 200 150 200 Q 190 200 190 150 L 190 100 L 190 200",
  
  // b: DOWN from top, retrace UP to midline, CLOCKWISE bump - CONTINUOUS
  b: "M 100 40 L 100 200 L 100 100 Q 100 100 150 100 Q 200 100 200 150 Q 200 200 150 200 Q 100 200 100 200",
  
  // c: Start 2 o'clock, counterclockwise curve, stop with opening facing right
  c: "M 190 120 Q 190 100 150 100 Q 110 100 110 150 Q 110 200 150 200 Q 190 200 190 180",
  
  // d: Start 2 o'clock counterclockwise circle, then UP to top line, down to baseline  
  d: "M 190 120 Q 190 100 150 100 Q 110 100 110 150 Q 110 200 150 200 Q 190 200 190 150 L 190 40 L 190 200",
  
  // e: Start middle, horizontal right, then counterclockwise around, stop with opening
  e: "M 110 150 L 190 150 Q 190 100 150 100 Q 110 100 110 150 Q 110 200 150 200 Q 190 200 190 175",
  
  // f: Hook from top, DOWN to baseline, LIFT, cross at midline
  f: "M 180 55 Q 150 40 130 60 L 130 200 M 95 100 L 165 100",
  
  // g: Start 2 o'clock counterclockwise, continues DOWN below baseline, hook LEFT
  g: "M 190 120 Q 190 100 150 100 Q 110 100 110 150 Q 110 200 150 200 Q 190 200 190 150 L 190 255 Q 190 270 150 270 Q 115 270 105 250",
  
  // h: DOWN from top to baseline, retrace UP, hump RIGHT, DOWN - CONTINUOUS
  h: "M 100 40 L 100 200 L 100 110 Q 100 100 150 100 Q 200 100 200 130 L 200 200",
  
  // i: DOWN from midline to baseline, LIFT, dot above
  i: "M 150 100 L 150 200 M 150 70 L 151 71",
  
  // j: DOWN from midline BELOW baseline, curve hook LEFT, LIFT, dot above
  j: "M 160 100 L 160 255 Q 160 270 120 270 Q 90 270 80 250 M 160 70 L 161 71",
  
  // k: DOWN from top to baseline, LIFT, diagonal IN to stem, diagonal OUT - separate strokes
  k: "M 100 40 L 100 200 M 185 100 L 100 145 M 100 145 L 185 200",
  
  // l: DOWN from top line to baseline (simplest letter)
  l: "M 150 40 L 150 200",
  
  // m: DOWN first, retrace UP, hump, DOWN, retrace UP, hump, DOWN - CONTINUOUS
  m: "M 55 100 L 55 200 L 55 110 Q 55 85 95 85 Q 135 85 135 110 L 135 200 L 135 110 Q 135 85 175 85 Q 215 85 215 110 L 215 200",
  
  // n: DOWN first, retrace UP, hump, DOWN - CONTINUOUS
  n: "M 100 100 L 100 200 L 100 110 Q 100 85 150 85 Q 200 85 200 110 L 200 200",
  
  // o: Start 2 o'clock, counterclockwise full circle back to start
  o: "M 190 150 Q 190 100 150 100 Q 110 100 110 150 Q 110 200 150 200 Q 190 200 190 150",
  
  // p: DOWN from midline BELOW baseline, retrace UP, clockwise bump - CONTINUOUS
  p: "M 100 100 L 100 260 L 100 100 Q 100 100 150 100 Q 200 100 200 150 Q 200 200 150 200 Q 100 200 100 150",
  
  // q: Counterclockwise circle, continues DOWN to descender, tail kicks RIGHT - CONTINUOUS
  q: "M 190 120 Q 190 100 150 100 Q 110 100 110 150 Q 110 200 150 200 Q 185 200 190 180 L 190 255 L 215 235",
  
  // r: DOWN first, retrace UP, small curve to the right - CONTINUOUS
  r: "M 100 100 L 100 200 L 100 110 Q 100 90 130 90 Q 165 90 180 105",
  
  // s: Counterclockwise top curve, reverse direction, clockwise bottom curve
  s: "M 180 115 Q 150 100 120 115 Q 85 130 150 150 Q 215 170 180 185 Q 150 200 120 185",
  
  // t: DOWN from above midline to baseline, LIFT, cross at midline
  t: "M 150 55 L 150 200 M 110 100 L 190 100",
  
  // u: DOWN, curve at bottom, UP, then DOWN again to complete - CONTINUOUS
  u: "M 100 100 L 100 165 Q 100 200 150 200 Q 200 200 200 165 L 200 100 L 200 200",
  
  // v: Diagonal down to center point, diagonal back up
  v: "M 80 100 L 150 200 L 220 100",
  
  // w: Down, up, down, up (zigzag - 4 points)
  w: "M 50 100 L 90 200 L 150 120 L 210 200 L 250 100",
  
  // x: Diagonal down-right, LIFT, diagonal down-left (strokes cross)
  x: "M 90 100 L 210 200 M 210 100 L 90 200",
  
  // y: Diagonal to center, LIFT, diagonal continuing BELOW baseline
  y: "M 90 100 L 150 155 M 210 100 L 115 255",
  
  // z: Horizontal right, diagonal down-left, horizontal right
  z: "M 90 100 L 210 100 L 90 200 L 210 200",
};

// UPPERCASE LETTERS (A-Z) - Correct stroke order
// Coordinate system (canvas 300x300):
// - Top: y=40, Baseline: y=260, Center: x=150
const UPPERCASE_PATHS: Record<string, string> = {
  A: "M 50 260 L 150 40 L 250 260 M 90 175 L 210 175",
  B: "M 70 40 L 70 260 M 70 40 L 160 40 Q 210 40 210 85 Q 210 150 160 150 L 70 150 M 70 150 L 170 150 Q 220 150 220 205 Q 220 260 170 260 L 70 260",
  C: "M 230 80 Q 150 20 70 80 Q 20 150 70 220 Q 150 280 230 220",
  D: "M 70 40 L 70 260 M 70 40 L 130 40 Q 220 40 220 150 Q 220 260 130 260 L 70 260",
  E: "M 210 40 L 70 40 L 70 260 L 210 260 M 70 150 L 175 150",
  F: "M 210 40 L 70 40 L 70 260 M 70 150 L 175 150",
  G: "M 230 80 Q 150 20 70 80 Q 20 150 70 220 Q 150 280 230 220 L 230 150 L 165 150",
  H: "M 70 40 L 70 260 M 230 40 L 230 260 M 70 150 L 230 150",
  I: "M 150 40 L 150 260",
  J: "M 200 40 L 200 200 Q 200 260 150 260 Q 100 260 100 220",
  K: "M 70 40 L 70 260 M 210 40 L 70 150 L 210 260",
  L: "M 70 40 L 70 260 L 210 260",
  M: "M 50 260 L 50 40 L 150 170 L 250 40 L 250 260",
  N: "M 70 260 L 70 40 L 230 260 L 230 40",
  O: "M 230 150 Q 230 40 150 40 Q 70 40 70 150 Q 70 260 150 260 Q 230 260 230 150",
  P: "M 70 40 L 70 260 M 70 40 L 160 40 Q 215 40 215 100 Q 215 150 160 150 L 70 150",
  Q: "M 230 150 Q 230 40 150 40 Q 70 40 70 150 Q 70 260 150 260 Q 230 260 230 150 M 180 210 L 245 280",
  R: "M 70 40 L 70 260 M 70 40 L 160 40 Q 215 40 215 100 Q 215 150 160 150 L 70 150 M 140 150 L 220 260",
  S: "M 210 80 Q 210 40 160 40 L 140 40 Q 80 40 80 100 Q 80 130 140 150 L 160 160 Q 220 175 220 215 Q 220 260 160 260 L 140 260 Q 80 260 80 225",
  T: "M 50 40 L 250 40 M 150 40 L 150 260",
  U: "M 70 40 L 70 200 Q 70 260 150 260 Q 230 260 230 200 L 230 40",
  V: "M 50 40 L 150 260 L 250 40",
  W: "M 30 40 L 85 260 L 150 120 L 215 260 L 270 40",
  X: "M 60 40 L 240 260 M 240 40 L 60 260",
  Y: "M 60 40 L 150 150 L 240 40 M 150 150 L 150 260",
  Z: "M 60 40 L 240 40 L 60 260 L 240 260",
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
  
  const SIZE = 300;
  const WAYPOINT_RADIUS = 18;
  const TOLERANCE = 35;
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
        // Play letter sound right after demo animation completes
        GameAudio.playLetterNow(currentLetter.toLowerCase());
        setTimeout(() => { setPhase('trace'); setDemoProgress(0); }, 600);
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
