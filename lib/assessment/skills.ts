// lib/assessment/skills.ts
// Assessment skill definitions and configuration

export interface SkillConfig {
  code: string;
  name: string;
  order: number;
  itemCount: number;
  gameRoute: string;
  audioIntro: string;
  description: string;
  teacherAssisted?: boolean;
}

// The 8 skills tested in order
export const ASSESSMENT_SKILLS: SkillConfig[] = [
  {
    code: 'letter_recognition',
    name: 'Letter Recognition',
    order: 1,
    itemCount: 8,
    gameRoute: '/montree/dashboard/games/letter-match',
    audioIntro: '/audio-new/assessment/skill_letter_recognition.mp3',
    description: 'Find the matching letters'
  },
  {
    code: 'letter_sounds',
    name: 'Letter Sounds',
    order: 2,
    itemCount: 6,
    gameRoute: '/montree/dashboard/games/letter-sounds',
    audioIntro: '/audio-new/assessment/skill_letter_sounds.mp3',
    description: 'Match sounds to letters'
  },
  {
    code: 'beginning_sounds',
    name: 'Beginning Sounds',
    order: 3,
    itemCount: 6,
    gameRoute: '/montree/dashboard/games/sound-games/beginning',
    audioIntro: '/audio-new/assessment/skill_beginning_sounds.mp3',
    description: 'What sound does it start with?'
  },
  {
    code: 'ending_sounds',
    name: 'Ending Sounds',
    order: 4,
    itemCount: 5,
    gameRoute: '/montree/dashboard/games/sound-games/ending',
    audioIntro: '/audio-new/assessment/skill_ending_sounds.mp3',
    description: 'What sound does it end with?'
  },
  {
    code: 'middle_sounds',
    name: 'Middle Sounds',
    order: 5,
    itemCount: 4,
    gameRoute: '/montree/dashboard/games/sound-games/middle',
    audioIntro: '/audio-new/assessment/skill_middle_sounds.mp3',
    description: 'What sound is in the middle?'
  },
  {
    code: 'blending',
    name: 'Sound Blending',
    order: 6,
    itemCount: 5,
    gameRoute: '/montree/dashboard/games/sound-games/blending',
    audioIntro: '/audio-new/assessment/skill_blending.mp3',
    description: 'Put the sounds together'
  },
  {
    code: 'reading_words',
    name: 'Word Reading',
    order: 7,
    itemCount: 10,
    gameRoute: '/montree/dashboard/games/reading/words',
    audioIntro: '/audio-new/assessment/skill_reading_words.mp3',
    description: 'Read simple words',
    teacherAssisted: true
  },
  {
    code: 'reading_sentences',
    name: 'Sentence Reading',
    order: 8,
    itemCount: 5,
    gameRoute: '/montree/dashboard/games/reading/sentences',
    audioIntro: '/audio-new/assessment/skill_reading_sentences.mp3',
    description: 'Read simple sentences',
    teacherAssisted: true
  }
];

// Total items across all skills
export const TOTAL_ASSESSMENT_ITEMS = ASSESSMENT_SKILLS.reduce(
  (sum, skill) => sum + skill.itemCount, 
  0
);

// Get skill by code
export function getSkillByCode(code: string): SkillConfig | undefined {
  return ASSESSMENT_SKILLS.find(s => s.code === code);
}

// Get skill by order
export function getSkillByOrder(order: number): SkillConfig | undefined {
  return ASSESSMENT_SKILLS.find(s => s.order === order);
}

// Get next skill
export function getNextSkill(currentOrder: number): SkillConfig | undefined {
  return ASSESSMENT_SKILLS.find(s => s.order === currentOrder + 1);
}

// Check if all skills complete
export function isAssessmentComplete(currentOrder: number): boolean {
  return currentOrder >= ASSESSMENT_SKILLS.length;
}
