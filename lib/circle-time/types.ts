// lib/circle-time/types.ts
// Type definitions for simplified circle time planner

export interface WeeklyTheme {
  id: string;
  name: string;
  icon: string;
  color: string;
  song: ThemeSong;
  flashcards: string[];  // Vocabulary words for the theme
  book1: Book;
  book2: Book;
  relatedWorks?: MontessoriWork[];  // Optional linked Montessori works
}

export interface ThemeSong {
  title: string;
  lyrics?: string;
  videoUrl?: string;
  actions?: string;  // Movement/actions to go with song
}

export interface Book {
  title: string;
  author?: string;
  coverUrl?: string;
  activities: BookActivity[];
}

export interface BookActivity {
  name: string;
  type: 'craft' | 'game' | 'discussion' | 'movement' | 'sensory' | 'writing';
  description: string;
  materials?: string[];
  duration?: string;  // e.g., "10 mins"
}

export interface MontessoriWork {
  id: string;
  name: string;
  area: string;
}

export interface DailyPlan {
  day: DayOfWeek;
  focus: DayFocus;
  warmup: CircleSegment;
  main: CircleSegment;
  activities: CircleSegment;
  closing: CircleSegment;
}

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday';

export type DayFocus = 
  | 'theme-intro'      // Monday - Song + Flashcards
  | 'book-1'           // Tuesday - First book
  | 'book-2'           // Wednesday - Second book  
  | 'review-production'// Thursday - Review & create
  | 'phonics-fun';     // Friday - Phonics activities

export interface CircleSegment {
  title: string;
  duration: string;
  content: string;
  materials?: string[];
  notes?: string;
}

export interface WeeklyCirclePlan {
  id: string;
  weekOf: string;  // Date string
  theme: WeeklyTheme;
  days: DailyPlan[];
  createdAt: string;
  notes?: string;
}

// Phonics activities for Friday
export interface PhonicsActivity {
  id: string;
  name: string;
  icon: string;
  type: 'game' | 'song' | 'movement' | 'craft' | 'sensory';
  description: string;
  materials: string[];
  targetSkill: 'letter-sounds' | 'blending' | 'segmenting' | 'rhyming' | 'vocabulary';
  ageRange: string;
  duration: string;
}

