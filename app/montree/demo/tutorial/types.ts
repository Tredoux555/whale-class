// Types for Tutorial
export interface Student {
  id: string;
  name: string;
  photo_url?: string;
  progress?: {
    presented: number;
    practicing: number;
    mastered: number;
    total: number;
  };
}

export interface TutorialStep {
  id: string;
  title: string;
  message: string;
  target?: string; // CSS selector or 'none'
  action?: 'tap' | 'hold' | 'scroll' | 'wait' | 'navigate';
  nextOn?: 'click' | 'auto' | 'manual';
  delay?: number;
  emoji?: string;
  highlight?: boolean;
  position?: 'top' | 'bottom' | 'center';
}
