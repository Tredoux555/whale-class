// lib/circle-time/theme-library.ts
// Pre-built themes with books, songs, and activities

import { WeeklyTheme } from './types';

export const THEME_LIBRARY: WeeklyTheme[] = [
  {
    id: 'farm-animals',
    name: 'Farm Animals',
    icon: '🐄',
    color: '#22c55e',
    song: {
      title: 'Old MacDonald Had a Farm',
      actions: 'Make animal sounds and movements for each animal',
    },
    flashcards: ['cow', 'pig', 'chicken', 'horse', 'sheep', 'duck', 'barn', 'farmer', 'tractor', 'hay'],
    book1: {
      title: 'Click, Clack, Moo: Cows That Type',
      author: 'Doreen Cronin',
      activities: [
        {
          name: 'Animal Sounds Match',
          type: 'game',
          description: 'Match animal pictures to their sounds. Play audio or make sounds, children point to correct animal.',
          materials: ['Animal picture cards', 'Sound clips or teacher voice'],
          duration: '10 mins',
        },
        {
          name: 'Farm Animal Movements',
          type: 'movement',
          description: 'Move like different farm animals - waddle like a duck, gallop like a horse, peck like a chicken.',
          duration: '5 mins',
        },
      ],
    },
    book2: {
      title: 'Big Red Barn',
      author: 'Margaret Wise Brown',
      activities: [
        {
          name: 'Barn Collage',
          type: 'craft',
          description: 'Create a barn scene with red paper barn and animal stickers/cutouts.',
          materials: ['Red paper', 'Animal stickers', 'Glue', 'Scissors'],
          duration: '15 mins',
        },
        {
          name: 'Farm Sorting',
          type: 'sensory',
          description: 'Sort toy farm animals into categories - animals with 2 legs vs 4 legs, big vs small.',
          materials: ['Toy farm animals', 'Sorting trays'],
          duration: '10 mins',
        },
      ],
    },
  },
  {
    id: 'weather',
    name: 'Weather',
    icon: '🌦️',
    color: '#3b82f6',
    song: {
      title: 'Rain Rain Go Away',
      actions: 'Wiggle fingers down for rain, make sunshine with arms',
    },
    flashcards: ['sun', 'rain', 'cloud', 'wind', 'snow', 'rainbow', 'umbrella', 'hot', 'cold', 'storm'],
    book1: {
      title: 'The Snowy Day',
      author: 'Ezra Jack Keats',
      activities: [
        {
          name: 'Snowflake Craft',
          type: 'craft',
          description: 'Fold and cut paper to make snowflakes. Hang around the classroom.',
          materials: ['White paper', 'Scissors', 'String'],
          duration: '15 mins',
        },
        {
          name: 'Snow Sensory Bin',
          type: 'sensory',
          description: 'Play with fake snow (cotton balls or instant snow) and small figures.',
          materials: ['Cotton balls or instant snow', 'Small figures', 'Bin'],
          duration: '10 mins',
        },
      ],
    },
    book2: {
      title: 'Cloudy With a Chance of Meatballs',
      author: 'Judi Barrett',
      activities: [
        {
          name: 'Weather Chart',
          type: 'discussion',
          description: 'Look outside, discuss today\'s weather. Add to class weather chart.',
          materials: ['Weather chart', 'Weather symbols'],
          duration: '5 mins',
        },
        {
          name: 'Silly Weather Drawing',
          type: 'craft',
          description: 'Draw silly weather like in the book - what if it rained cookies?',
          materials: ['Paper', 'Crayons'],
          duration: '10 mins',
        },
      ],
    },
  },
  {
    id: 'colors',
    name: 'Colors',
    icon: '🌈',
    color: '#8b5cf6',
    song: {
      title: 'I Can Sing a Rainbow',
      actions: 'Point to colors in room, make rainbow arc with arms',
    },
    flashcards: ['red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink', 'black', 'white', 'rainbow'],
    book1: {
      title: 'Brown Bear, Brown Bear, What Do You See?',
      author: 'Bill Martin Jr.',
      activities: [
        {
          name: 'Color Hunt',
          type: 'game',
          description: 'Hunt around the room for objects of each color in the book.',
          duration: '10 mins',
        },
        {
          name: 'Animal Color Match',
          type: 'craft',
          description: 'Color animals to match the book (brown bear, red bird, etc.)',
          materials: ['Coloring pages', 'Crayons'],
          duration: '10 mins',
        },
      ],
    },
    book2: {
      title: 'Mouse Paint',
      author: 'Ellen Stoll Walsh',
      activities: [
        {
          name: 'Color Mixing',
          type: 'sensory',
          description: 'Mix primary colors to make secondary colors, just like the mice!',
          materials: ['Paint', 'Paper', 'Brushes'],
          duration: '15 mins',
        },
        {
          name: 'Mouse Moves',
          type: 'movement',
          description: 'Move like mice - tip toe, hide, splash in paint puddles.',
          duration: '5 mins',
        },
      ],
    },
  },
  {
    id: 'family',
    name: 'My Family',
    icon: '👨‍👩‍👧‍👦',
    color: '#ec4899',
    song: {
      title: 'The Finger Family',
      actions: 'Hold up each finger for family member',
    },
    flashcards: ['mom', 'dad', 'brother', 'sister', 'baby', 'grandma', 'grandpa', 'family', 'love', 'home'],
    book1: {
      title: 'The Family Book',
      author: 'Todd Parr',
      activities: [
        {
          name: 'My Family Drawing',
          type: 'craft',
          description: 'Draw a picture of your family. Share with the class.',
          materials: ['Paper', 'Crayons'],
          duration: '15 mins',
        },
        {
          name: 'Family Discussion',
          type: 'discussion',
          description: 'Who is in your family? What do you like to do together?',
          duration: '10 mins',
        },
      ],
    },
    book2: {
      title: 'Llama Llama Misses Mama',
      author: 'Anna Dewdney',
      activities: [
        {
          name: 'Feelings Talk',
          type: 'discussion',
          description: 'How does Llama feel? When do you miss your family? It\'s okay to feel that way!',
          duration: '10 mins',
        },
        {
          name: 'Family Photo Share',
          type: 'discussion',
          description: 'Children share family photos brought from home.',
          materials: ['Family photos from home'],
          duration: '10 mins',
        },
      ],
    },
  },
  {
    id: 'food',
    name: 'Healthy Food',
    icon: '🍎',
    color: '#ef4444',
    song: {
      title: 'Apples and Bananas',
      actions: 'Pretend to eat, rub tummy',
    },
    flashcards: ['apple', 'banana', 'carrot', 'milk', 'bread', 'egg', 'vegetables', 'fruit', 'healthy', 'yummy'],
    book1: {
      title: 'The Very Hungry Caterpillar',
      author: 'Eric Carle',
      activities: [
        {
          name: 'Food Sequence',
          type: 'game',
          description: 'Put food cards in order that the caterpillar ate them.',
          materials: ['Food picture cards'],
          duration: '10 mins',
        },
        {
          name: 'Caterpillar Craft',
          type: 'craft',
          description: 'Make a caterpillar from circles/egg cartons.',
          materials: ['Circles or egg cartons', 'Paint', 'Pipe cleaners'],
          duration: '15 mins',
        },
      ],
    },
    book2: {
      title: 'Eating the Alphabet',
      author: 'Lois Ehlert',
      activities: [
        {
          name: 'Food Tasting',
          type: 'sensory',
          description: 'Taste different fruits and vegetables. Describe flavors.',
          materials: ['Assorted fruits/vegetables', 'Plates'],
          duration: '15 mins',
        },
        {
          name: 'Food Sorting',
          type: 'game',
          description: 'Sort foods into fruits vs vegetables, or by color.',
          materials: ['Toy food or food pictures'],
          duration: '10 mins',
        },
      ],
    },
  },
];

export function getThemeById(id: string): WeeklyTheme | undefined {
  return THEME_LIBRARY.find(t => t.id === id);
}

export function getThemesByCategory(category: string): WeeklyTheme[] {
  // Could add categories later
  return THEME_LIBRARY;
}

