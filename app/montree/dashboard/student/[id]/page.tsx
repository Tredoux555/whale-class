// /montree/dashboard/student/[id]/page.tsx
// Student work capture page with swipeable curriculum
// Swipe left/right to navigate works, tap to record progress
'use client';

import { useState, useEffect, useRef, use } from 'react';
import Link from 'next/link';
import { CURRICULUM, getAllWorks } from '@/lib/montree/curriculum-data';

interface Student {
  id: string;
  name: string;
  photo_url?: string;
}

interface Work {
  id: string;
  name: string;
  chineseName?: string;
  description: string;
  ageRange: string;
  materials: string[];
}

interface StudentWork {
  id: string;
  work_id: string;
  work_name: string;
  area: string;
  status: 'not_started' | 'presented' | 'practicing' | 'mastered';
  photo_url?: string;
  notes?: string;
  created_at: string;
}

const AREAS = [
  { id: 'practical_life', name: 'Practical Life', emoji: '🧹', color: 'bg-green-600', textColor: 'text-green-600' },
  { id: 'sensorial', name: 'Sensorial', emoji: '👁️', color: 'bg-orange-500', textColor: 'text-orange-500' },
  { id: 'mathematics', name: 'Math', emoji: '🔢', color: 'bg-blue-600', textColor: 'text-blue-600' },
  { id: 'language', name: 'Language', emoji: '📚', color: 'bg-pink-600', textColor: 'text-pink-600' },
  { id: 'cultural', name: 'Culture', emoji: '🌍', color: 'bg-purple-600', textColor: 'text-purple-600' },
];

const STATUS_CONFIG = {
  not_started: { label: '○', color: 'bg-gray-300 text-gray-700', next: 'presented' },
  presented: { label: 'P', color: 'bg-amber-400 text-amber-900', next: 'practicing' },
  practicing: { label: 'Pr', color: 'bg-blue-400 text-blue-900', next: 'mastered' },
  mastered: { label: 'M', color: 'bg-green-500 text-white', next: 'not_started' },
};

export default function StudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<Student | null>(null);
  const [selectedArea, setSelectedArea] = useState<string>('practical_life');
  const [currentWorkIndex, setCurrentWorkIndex] = useState(0);
  const [areaWorks, setAreaWorks] = useState<Work[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCapture, setShowCapture] = useState(false);
  
  // Swipe state
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load student data
  useEffect(() => {
    fetch(`/api/montree/students/${id}`)
      .then(r => r.json())
      .then(data => {
        setStudent(data.student);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  // Load works for selected area from curriculum
  useEffect(() => {
    const area = CURRICULUM.find(a => a.id === selectedArea);
    if (area) {
      const works = area.categories.flatMap(cat => cat.works);
      setAreaWorks(works);
      setCurrentWorkIndex(0);
    }
  }, [selectedArea]);

  const currentWork = areaWorks[currentWorkIndex];
  const currentAreaConfig = AREAS.find(a => a.id === selectedArea);

  // Touch handlers for swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diff = e.touches[0].clientX - touchStartX.current;
    // Add resistance at edges
    const canGoNext = currentWorkIndex < areaWorks.length - 1;
    const canGoPrev = currentWorkIndex > 0;
    let resistance = 1;
    if ((diff > 0 && !canGoPrev) || (diff < 0 && !canGoNext)) {
      resistance = 0.2;
    }
    setTranslateX(diff * resistance);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    const threshold = 50;
    
    if (translateX < -threshold && currentWorkIndex < areaWorks.length - 1) {
      setCurrentWorkIndex(prev => prev + 1);
    } else if (translateX > threshold && currentWorkIndex > 0) {
      setCurrentWorkIndex(prev => prev - 1);
    }
    setTranslateX(0);
  };


  if (loading) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">Student not found</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="px-4 py-3 flex items-center gap-3 border-b border-gray-800">
        <Link href="/montree/dashboard" className="text-gray-400 hover:text-white text-xl">
          ←
        </Link>
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 flex items-center justify-center">
          <span className="text-white font-bold text-lg">{student.name.charAt(0)}</span>
        </div>
        <h1 className="text-xl font-bold text-white flex-1">{student.name}</h1>
      </header>

      {/* Area Tabs */}
      <div className="flex gap-1 p-2 overflow-x-auto border-b border-gray-800">
        {AREAS.map(area => (
          <button
            key={area.id}
            onClick={() => setSelectedArea(area.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all
              ${selectedArea === area.id 
                ? `${area.color} text-white` 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
          >
            {area.emoji} {area.name}
          </button>
        ))}
      </div>
