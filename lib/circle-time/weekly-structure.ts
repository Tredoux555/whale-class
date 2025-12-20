// lib/circle-time/weekly-structure.ts
// Weekly structure constants and generators

import { DayOfWeek, DayFocus, DailyPlan, WeeklyTheme, CircleSegment } from './types';

// Day configuration
export const DAY_CONFIG: Record<DayOfWeek, { focus: DayFocus; label: string; icon: string; color: string }> = {
  monday: {
    focus: 'theme-intro',
    label: 'Theme Introduction',
    icon: '🎵',
    color: '#ef4444',  // red
  },
  tuesday: {
    focus: 'book-1',
    label: 'Book 1 Day',
    icon: '📖',
    color: '#f97316',  // orange
  },
  wednesday: {
    focus: 'book-2',
    label: 'Book 2 Day',
    icon: '📚',
    color: '#eab308',  // yellow
  },
  thursday: {
    focus: 'review-production',
    label: 'Review & Create',
    icon: '🎨',
    color: '#22c55e',  // green
  },
  friday: {
    focus: 'phonics-fun',
    label: 'Phonics Fun',
    icon: '🔤',
    color: '#3b82f6',  // blue
  },
};

// Daily structure template (in thirds)
export const DAILY_STRUCTURE = {
  warmup: { duration: '5-10 mins', order: 1 },
  main: { duration: '10-15 mins', order: 2 },
  activities: { duration: '10-15 mins', order: 3 },
  closing: { duration: '5 mins', order: 4 },
};

// Generate a week's plan from a theme
export function generateWeeklyPlan(theme: WeeklyTheme, weekOf: string): DailyPlan[] {
  return [
    generateMondayPlan(theme),
    generateTuesdayPlan(theme),
    generateWednesdayPlan(theme),
    generateThursdayPlan(theme),
    generateFridayPlan(theme),
  ];
}

function generateMondayPlan(theme: WeeklyTheme): DailyPlan {
  return {
    day: 'monday',
    focus: 'theme-intro',
    warmup: {
      title: 'Hello Song & Movement',
      duration: '5 mins',
      content: 'Gather children, sing hello song, do morning stretches',
      notes: 'Get energy out before sitting',
    },
    main: {
      title: `Introduce Theme: ${theme.name}`,
      duration: '10 mins',
      content: `Teach theme song: "${theme.song.title}"\n\nIntroduce flashcards with key vocabulary:\n${theme.flashcards.map(w => `• ${w}`).join('\n')}`,
      materials: ['Theme flashcards', 'Song lyrics/video'],
      notes: theme.song.actions || 'Add movements to the song',
    },
    activities: {
      title: 'Flashcard Games',
      duration: '10 mins',
      content: `Play vocabulary games with flashcards:\n• "What's Missing?" - Remove one card, guess which\n• "Show Me" - Kids point to correct card\n• "Pass the Card" - Music stops, name the card\n• "Categories" - Sort cards by attribute`,
      materials: ['Theme flashcards'],
    },
    closing: {
      title: 'Theme Song & Goodbye',
      duration: '5 mins',
      content: `Sing ${theme.song.title} one more time together.\nPreview: "Tomorrow we'll read a special book about ${theme.name}!"`,
    },
  };
}

function generateTuesdayPlan(theme: WeeklyTheme): DailyPlan {
  const book = theme.book1;
  return {
    day: 'tuesday',
    focus: 'book-1',
    warmup: {
      title: 'Theme Song Review',
      duration: '5 mins',
      content: `Sing "${theme.song.title}" with actions.\nQuick flashcard review - show 3-4 cards.`,
      materials: ['Flashcards'],
    },
    main: {
      title: `Read: ${book.title}`,
      duration: '15 mins',
      content: `Read "${book.title}"${book.author ? ` by ${book.author}` : ''}\n\nBefore reading:\n• Show cover, predict what it's about\n• Connect to theme vocabulary\n\nDuring reading:\n• Pause for questions\n• Point out theme connections\n\nAfter reading:\n• What was your favorite part?\n• What did we learn?`,
      materials: ['Book: ' + book.title],
    },
    activities: {
      title: 'Book Activities',
      duration: '10 mins',
      content: book.activities.map(a => `**${a.name}** (${a.type})\n${a.description}${a.materials ? `\nMaterials: ${a.materials.join(', ')}` : ''}`).join('\n\n'),
      materials: book.activities.flatMap(a => a.materials || []),
    },
    closing: {
      title: 'Closing Song',
      duration: '5 mins',
      content: `Sing theme song or goodbye song.\nReminder: "Tomorrow we have another ${theme.name} book!"`,
    },
  };
}

function generateWednesdayPlan(theme: WeeklyTheme): DailyPlan {
  const book = theme.book2;
  return {
    day: 'wednesday',
    focus: 'book-2',
    warmup: {
      title: 'Theme Song & Review',
      duration: '5 mins',
      content: `Sing "${theme.song.title}"\nQuick review: "What book did we read yesterday? What happened?"`,
    },
    main: {
      title: `Read: ${book.title}`,
      duration: '15 mins',
      content: `Read "${book.title}"${book.author ? ` by ${book.author}` : ''}\n\nConnect to Book 1:\n• How is this book similar/different?\n• Same theme, different story\n\nDuring reading:\n• Use theme vocabulary\n• Encourage predictions`,
      materials: ['Book: ' + book.title],
    },
    activities: {
      title: 'Theme Activities',
      duration: '10 mins',
      content: book.activities.map(a => `**${a.name}** (${a.type})\n${a.description}${a.materials ? `\nMaterials: ${a.materials.join(', ')}` : ''}`).join('\n\n'),
      materials: book.activities.flatMap(a => a.materials || []),
    },
    closing: {
      title: 'Closing Activity',
      duration: '5 mins',
      content: `Theme song with actions.\n"Tomorrow we'll review everything and make something special!"`,
    },
  };
}

function generateThursdayPlan(theme: WeeklyTheme): DailyPlan {
  return {
    day: 'thursday',
    focus: 'review-production',
    warmup: {
      title: 'Theme Song & Flashcard Game',
      duration: '5 mins',
      content: `Sing "${theme.song.title}" - can they do it from memory?\nFlashcard game: Quick recall of all vocabulary`,
      materials: ['Flashcards'],
    },
    main: {
      title: 'Review & Discussion',
      duration: '10 mins',
      content: `Review the week:\n• What was our theme? ${theme.name}\n• What songs did we learn?\n• What books did we read?\n  - ${theme.book1.title}\n  - ${theme.book2.title}\n• What new words did we learn?\n\nDiscussion questions:\n• What was your favorite part?\n• What did you learn about ${theme.name}?`,
    },
    activities: {
      title: 'Creative Production',
      duration: '15 mins',
      content: `Children create something related to the theme:\n\nOptions:\n• Art project (drawing, painting, collage)\n• Craft related to books\n• Acting out favorite book scene\n• Create their own ${theme.name} story\n• Build/construct something theme-related`,
      materials: ['Art supplies', 'Craft materials'],
      notes: 'Let children choose their production method',
    },
    closing: {
      title: 'Share & Celebrate',
      duration: '5 mins',
      content: `Children share what they created.\nSing theme song one final time.\n"Tomorrow is Phonics Fun day!"`,
    },
  };
}

function generateFridayPlan(theme: WeeklyTheme): DailyPlan {
  return {
    day: 'friday',
    focus: 'phonics-fun',
    warmup: {
      title: 'Alphabet Song & Movement',
      duration: '5 mins',
      content: `Sing alphabet song with movements.\nQuick letter review - show 5 random letters, say their sounds.`,
    },
    main: {
      title: 'Phonics Focus Activity',
      duration: '15 mins',
      content: `Choose from phonics activities:\n• Letter Sound Bingo\n• Sound Scavenger Hunt\n• Phonics Hopscotch\n• Letter Building with playdough\n• Sound Sorting Game\n\n(See Phonics Activity Bank for full details)`,
      materials: ['Phonics materials', 'Letter cards'],
      notes: 'Pick 1-2 main activities based on current letter focus',
    },
    activities: {
      title: 'Phonics Games',
      duration: '10 mins',
      content: `Fun phonics games:\n• "I Spy" with letter sounds\n• Rhyming ball toss\n• Letter freeze dance\n• Sound matching pairs\n• Beginning sound sort`,
      materials: ['Game materials'],
    },
    closing: {
      title: 'Week Celebration',
      duration: '5 mins',
      content: `Sing favorite song from the week.\nCelebrate learning!\n"Great week everyone! See you next week for a new theme!"`,
    },
  };
}

