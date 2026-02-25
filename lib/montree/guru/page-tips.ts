// lib/montree/guru/page-tips.ts
// Static tip definitions per page for GuruContextBubble
// Role-aware: 'parent' = homeschool only, 'teacher' = teacher only, 'both' = everyone

export interface TipConfig {
  text: string;
  role: 'parent' | 'teacher' | 'both';
}

export const PAGE_TIPS: Record<string, TipConfig[]> = {
  dashboard: [
    { text: "Tap on a child to see their week view and log today's work.", role: 'both' },
    { text: 'Try to do 2–4 focused activities per day. Quality over quantity!', role: 'parent' },
    { text: "The concern cards below are your shortcut to personalised Montessori advice.", role: 'parent' },
    { text: 'Check in on students who haven't had progress logged this week.', role: 'teacher' },
  ],
  weekView: [
    { text: 'Try presenting no more than 2 new works per day — let mastery come naturally.', role: 'parent' },
    { text: 'Tap on a work to see the quick guide, or long-press for full details.', role: 'both' },
    { text: 'The coloured dots show which Montessori area each work belongs to.', role: 'parent' },
    { text: 'Use the notes field to record observations — the Guru uses them for personalised advice.', role: 'both' },
  ],
  curriculum: [
    { text: 'Works are ordered in the Montessori sequence — earlier ones build foundations for later ones.', role: 'both' },
    { text: "Use the 'Recommended' filter to see what's next in sequence for your child.", role: 'parent' },
    { text: 'Tap a work to see materials needed, presentation steps, and video demonstrations.', role: 'both' },
    { text: 'Most Montessori materials can be made at home with everyday items.', role: 'parent' },
  ],
  progress: [
    { text: 'Tap an area bar to filter the timeline and focus on one subject.', role: 'both' },
    { text: "Don't worry about the pace — every child's timeline is different.", role: 'parent' },
    { text: 'Photos in the strip are from recent captures — tap to see full size.', role: 'both' },
    { text: 'Look for patterns over months, not days. Progress is rarely linear.', role: 'parent' },
  ],
  guru: [
    { text: 'The Guru remembers your past conversations about each child.', role: 'both' },
    { text: 'Be specific in your questions — "Joey won\'t sit still during pouring" gets better advice than "Joey is unfocused".', role: 'both' },
    { text: 'The Guru knows your child\'s progress data and tailors every response.', role: 'parent' },
  ],
  capture: [
    { text: 'Photos help you track progress and share achievements with parents.', role: 'teacher' },
    { text: "Take photos during activities — they're a beautiful record of your child's journey.", role: 'parent' },
    { text: 'You can tag multiple children in group photos.', role: 'teacher' },
  ],
};

/**
 * Get the next tip for a page that hasn't been dismissed yet.
 * Uses localStorage to track which tips have been shown per page.
 */
export function getNextTip(
  pageKey: string,
  role: 'parent' | 'teacher'
): TipConfig | null {
  const tips = PAGE_TIPS[pageKey];
  if (!tips) return null;

  // Filter tips for this role
  const relevantTips = tips.filter(
    t => t.role === role || t.role === 'both'
  );
  if (relevantTips.length === 0) return null;

  // Check which tip index we're on
  const storageKey = `guru_tip_index_${pageKey}`;
  const currentIndex = parseInt(localStorage.getItem(storageKey) || '0', 10);

  // If all tips shown, return null
  if (currentIndex >= relevantTips.length) return null;

  return relevantTips[currentIndex];
}

/**
 * Advance to the next tip for a page (called on dismiss).
 */
export function advanceTip(pageKey: string): void {
  const storageKey = `guru_tip_index_${pageKey}`;
  const currentIndex = parseInt(localStorage.getItem(storageKey) || '0', 10);
  localStorage.setItem(storageKey, String(currentIndex + 1));
}
