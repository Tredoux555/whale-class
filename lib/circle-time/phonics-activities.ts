// lib/circle-time/phonics-activities.ts
// Fun phonics activities for Friday circle time

import { PhonicsActivity } from './types';

export const PHONICS_ACTIVITIES: PhonicsActivity[] = [
  // === GAMES ===
  {
    id: 'letter-bingo',
    name: 'Letter Sound Bingo',
    icon: '🎯',
    type: 'game',
    description: 'Children have bingo cards with letters. Teacher says a sound, children cover the matching letter. First to get a row wins!',
    materials: ['Letter bingo cards', 'Bingo markers/chips', 'Letter cards for teacher'],
    targetSkill: 'letter-sounds',
    ageRange: '3-5',
    duration: '10-15 mins',
  },
  {
    id: 'sound-hunt',
    name: 'Sound Scavenger Hunt',
    icon: '🔍',
    type: 'game',
    description: 'Give children a target sound (e.g., /s/). They hunt around the room for objects that start with that sound.',
    materials: ['Basket for collecting items', 'Letter card for target sound'],
    targetSkill: 'letter-sounds',
    ageRange: '3-6',
    duration: '10 mins',
  },
  {
    id: 'matching-pairs',
    name: 'Sound Matching Pairs',
    icon: '🃏',
    type: 'game',
    description: 'Memory game with picture cards. Match pictures that start with the same sound (cat-car, ball-bat).',
    materials: ['Picture matching cards (pairs with same beginning sound)'],
    targetSkill: 'letter-sounds',
    ageRange: '4-6',
    duration: '10 mins',
  },
  {
    id: 'rhyme-time',
    name: 'Rhyme Time Toss',
    icon: '⚾',
    type: 'game',
    description: 'Sit in a circle. Say a word, toss the ball to a child who must say a rhyming word. Cat-hat-bat-mat!',
    materials: ['Soft ball', 'Word list for teacher'],
    targetSkill: 'rhyming',
    ageRange: '3-5',
    duration: '10 mins',
  },
  {
    id: 'beginning-sound-sort',
    name: 'Beginning Sound Sort',
    icon: '📦',
    type: 'game',
    description: 'Sort picture cards or small objects into bins labeled with letters based on beginning sounds.',
    materials: ['Picture cards or small objects', 'Sorting bins', 'Letter labels'],
    targetSkill: 'letter-sounds',
    ageRange: '4-6',
    duration: '10 mins',
  },
  {
    id: 'i-spy-sounds',
    name: 'I Spy Letter Sounds',
    icon: '👁️',
    type: 'game',
    description: '"I spy with my little eye something that starts with /b/." Children guess objects in the room.',
    materials: ['None needed'],
    targetSkill: 'letter-sounds',
    ageRange: '3-6',
    duration: '5-10 mins',
  },
  {
    id: 'word-building',
    name: 'CVC Word Building',
    icon: '🔤',
    type: 'game',
    description: 'Use letter tiles to build simple 3-letter words. Sound out each letter, then blend together.',
    materials: ['Letter tiles or magnetic letters', 'Word cards with pictures'],
    targetSkill: 'blending',
    ageRange: '4-6',
    duration: '10-15 mins',
  },
  {
    id: 'sound-boxes',
    name: 'Elkonin Sound Boxes',
    icon: '⬜',
    type: 'game',
    description: 'Push a counter into each box as you say each sound in a word. C-A-T = 3 counters.',
    materials: ['Sound box sheets', 'Counters or chips', 'Picture cards'],
    targetSkill: 'segmenting',
    ageRange: '4-6',
    duration: '10 mins',
  },

  // === MOVEMENT ===
  {
    id: 'letter-freeze',
    name: 'Letter Freeze Dance',
    icon: '💃',
    type: 'movement',
    description: 'Dance to music. When music stops, teacher shows a letter. Children freeze and say the sound!',
    materials: ['Music', 'Large letter cards'],
    targetSkill: 'letter-sounds',
    ageRange: '3-5',
    duration: '10 mins',
  },
  {
    id: 'phonics-hopscotch',
    name: 'Phonics Hopscotch',
    icon: '🦘',
    type: 'movement',
    description: 'Hopscotch with letters instead of numbers. Say the sound as you hop on each letter!',
    materials: ['Floor letters or tape', 'Letter cards'],
    targetSkill: 'letter-sounds',
    ageRange: '3-6',
    duration: '10 mins',
  },
  {
    id: 'letter-yoga',
    name: 'Alphabet Yoga',
    icon: '🧘',
    type: 'movement',
    description: 'Make letter shapes with your body! A = legs apart, arms up. T = arms out to sides.',
    materials: ['Letter cards with body positions'],
    targetSkill: 'letter-sounds',
    ageRange: '3-6',
    duration: '10 mins',
  },
  {
    id: 'sound-jump',
    name: 'Sound Jump',
    icon: '🐸',
    type: 'movement',
    description: 'Letters on floor. Teacher says a sound, children jump to that letter. "Jump to /m/!"',
    materials: ['Large floor letters'],
    targetSkill: 'letter-sounds',
    ageRange: '3-5',
    duration: '10 mins',
  },

  // === SONGS ===
  {
    id: 'alphabet-song',
    name: 'Alphabet Sound Song',
    icon: '🎵',
    type: 'song',
    description: 'Sing the alphabet with SOUNDS instead of letter names. "Ah, buh, kuh, duh, eh, fff, guh..."',
    materials: ['Alphabet chart with pictures'],
    targetSkill: 'letter-sounds',
    ageRange: '3-6',
    duration: '5 mins',
  },
  {
    id: 'letter-song',
    name: 'Letter of the Week Song',
    icon: '🎤',
    type: 'song',
    description: 'Sing a simple song featuring the focus letter: "B says /b/, B says /b/, ball and bat and baby, B says /b/!"',
    materials: ['Focus letter card'],
    targetSkill: 'letter-sounds',
    ageRange: '3-5',
    duration: '5 mins',
  },
  {
    id: 'rhyming-songs',
    name: 'Rhyming Songs',
    icon: '🎶',
    type: 'song',
    description: 'Sing songs with lots of rhymes: "Down by the Bay", "Willoughby Wallaby Woo". Emphasize the rhyming words.',
    materials: ['Song lyrics'],
    targetSkill: 'rhyming',
    ageRange: '3-5',
    duration: '5-10 mins',
  },

  // === CRAFTS ===
  {
    id: 'letter-collage',
    name: 'Letter Sound Collage',
    icon: '✂️',
    type: 'craft',
    description: 'Cut out pictures from magazines that start with the focus letter. Glue onto a large letter shape.',
    materials: ['Large letter template', 'Magazines', 'Scissors', 'Glue'],
    targetSkill: 'letter-sounds',
    ageRange: '4-6',
    duration: '15 mins',
  },
  {
    id: 'playdough-letters',
    name: 'Playdough Letters',
    icon: '🎨',
    type: 'craft',
    description: 'Roll playdough to form letters. Say the sound while building each letter.',
    materials: ['Playdough', 'Letter cards for reference'],
    targetSkill: 'letter-sounds',
    ageRange: '3-5',
    duration: '10 mins',
  },
  {
    id: 'sand-writing',
    name: 'Sand/Salt Tray Writing',
    icon: '🏖️',
    type: 'craft',
    description: 'Trace letters in sand or salt tray while saying the sound. Great for tactile learners.',
    materials: ['Shallow tray', 'Sand or salt', 'Letter cards'],
    targetSkill: 'letter-sounds',
    ageRange: '3-6',
    duration: '10 mins',
  },

  // === SENSORY ===
  {
    id: 'letter-sensory-bin',
    name: 'Letter Hunt Sensory Bin',
    icon: '🫧',
    type: 'sensory',
    description: 'Hide magnetic letters in rice/beans. Children dig to find letters and say their sounds.',
    materials: ['Sensory bin', 'Rice or beans', 'Magnetic letters'],
    targetSkill: 'letter-sounds',
    ageRange: '3-5',
    duration: '10 mins',
  },
  {
    id: 'texture-letters',
    name: 'Sandpaper Letters',
    icon: '✋',
    type: 'sensory',
    description: 'Trace textured letters while saying the sound. Montessori classic!',
    materials: ['Sandpaper letters'],
    targetSkill: 'letter-sounds',
    ageRange: '3-5',
    duration: '10 mins',
  },
];

export function getActivitiesByType(type: PhonicsActivity['type']): PhonicsActivity[] {
  return PHONICS_ACTIVITIES.filter(a => a.type === type);
}

export function getActivitiesBySkill(skill: PhonicsActivity['targetSkill']): PhonicsActivity[] {
  return PHONICS_ACTIVITIES.filter(a => a.targetSkill === skill);
}

export function getActivityById(id: string): PhonicsActivity | undefined {
  return PHONICS_ACTIVITIES.find(a => a.id === id);
}

