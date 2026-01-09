// Vocabulary Data for Whale Education Platform
// 6 Categories with 15-20 words each for children ages 2-6

export interface VocabularyWord {
  word: string;
  image: string; // emoji
  audioUrl: string;
  category: string;
}

export interface VocabularyCategory {
  id: string;
  name: string;
  icon: string; // emoji
  words: VocabularyWord[];
}

export const VOCABULARY_CATEGORIES: VocabularyCategory[] = [
  // 1. Animals (20 words)
  {
    id: 'animals',
    name: 'Animals',
    icon: '🐾',
    words: [
      { word: 'cat', image: '🐱', audioUrl: '/audio/vocabulary/animals/cat.mp3', category: 'animals' },
      { word: 'dog', image: '🐶', audioUrl: '/audio/vocabulary/animals/dog.mp3', category: 'animals' },
      { word: 'bird', image: '🐦', audioUrl: '/audio/vocabulary/animals/bird.mp3', category: 'animals' },
      { word: 'fish', image: '🐟', audioUrl: '/audio/vocabulary/animals/fish.mp3', category: 'animals' },
      { word: 'pig', image: '🐷', audioUrl: '/audio/vocabulary/animals/pig.mp3', category: 'animals' },
      { word: 'cow', image: '🐄', audioUrl: '/audio/vocabulary/animals/cow.mp3', category: 'animals' },
      { word: 'horse', image: '🐴', audioUrl: '/audio/vocabulary/animals/horse.mp3', category: 'animals' },
      { word: 'duck', image: '🦆', audioUrl: '/audio/vocabulary/animals/duck.mp3', category: 'animals' },
      { word: 'frog', image: '🐸', audioUrl: '/audio/vocabulary/animals/frog.mp3', category: 'animals' },
      { word: 'bee', image: '🐝', audioUrl: '/audio/vocabulary/animals/bee.mp3', category: 'animals' },
      { word: 'ant', image: '🐜', audioUrl: '/audio/vocabulary/animals/ant.mp3', category: 'animals' },
      { word: 'bear', image: '🐻', audioUrl: '/audio/vocabulary/animals/bear.mp3', category: 'animals' },
      { word: 'lion', image: '🦁', audioUrl: '/audio/vocabulary/animals/lion.mp3', category: 'animals' },
      { word: 'tiger', image: '🐯', audioUrl: '/audio/vocabulary/animals/tiger.mp3', category: 'animals' },
      { word: 'elephant', image: '🐘', audioUrl: '/audio/vocabulary/animals/elephant.mp3', category: 'animals' },
      { word: 'monkey', image: '🐵', audioUrl: '/audio/vocabulary/animals/monkey.mp3', category: 'animals' },
      { word: 'rabbit', image: '🐰', audioUrl: '/audio/vocabulary/animals/rabbit.mp3', category: 'animals' },
      { word: 'snake', image: '🐍', audioUrl: '/audio/vocabulary/animals/snake.mp3', category: 'animals' },
      { word: 'turtle', image: '🐢', audioUrl: '/audio/vocabulary/animals/turtle.mp3', category: 'animals' },
      { word: 'owl', image: '🦉', audioUrl: '/audio/vocabulary/animals/owl.mp3', category: 'animals' },
    ],
  },

  // 2. Food (20 words)
  {
    id: 'food',
    name: 'Food',
    icon: '🍎',
    words: [
      { word: 'apple', image: '🍎', audioUrl: '/audio/vocabulary/food/apple.mp3', category: 'food' },
      { word: 'banana', image: '🍌', audioUrl: '/audio/vocabulary/food/banana.mp3', category: 'food' },
      { word: 'bread', image: '🍞', audioUrl: '/audio/vocabulary/food/bread.mp3', category: 'food' },
      { word: 'milk', image: '🥛', audioUrl: '/audio/vocabulary/food/milk.mp3', category: 'food' },
      { word: 'egg', image: '🥚', audioUrl: '/audio/vocabulary/food/egg.mp3', category: 'food' },
      { word: 'cheese', image: '🧀', audioUrl: '/audio/vocabulary/food/cheese.mp3', category: 'food' },
      { word: 'cake', image: '🎂', audioUrl: '/audio/vocabulary/food/cake.mp3', category: 'food' },
      { word: 'cookie', image: '🍪', audioUrl: '/audio/vocabulary/food/cookie.mp3', category: 'food' },
      { word: 'rice', image: '🍚', audioUrl: '/audio/vocabulary/food/rice.mp3', category: 'food' },
      { word: 'soup', image: '🍲', audioUrl: '/audio/vocabulary/food/soup.mp3', category: 'food' },
      { word: 'meat', image: '🍖', audioUrl: '/audio/vocabulary/food/meat.mp3', category: 'food' },
      { word: 'fish', image: '🐟', audioUrl: '/audio/vocabulary/food/fish.mp3', category: 'food' },
      { word: 'carrot', image: '🥕', audioUrl: '/audio/vocabulary/food/carrot.mp3', category: 'food' },
      { word: 'corn', image: '🌽', audioUrl: '/audio/vocabulary/food/corn.mp3', category: 'food' },
      { word: 'grape', image: '🍇', audioUrl: '/audio/vocabulary/food/grape.mp3', category: 'food' },
      { word: 'orange', image: '🍊', audioUrl: '/audio/vocabulary/food/orange.mp3', category: 'food' },
      { word: 'pizza', image: '🍕', audioUrl: '/audio/vocabulary/food/pizza.mp3', category: 'food' },
      { word: 'water', image: '💧', audioUrl: '/audio/vocabulary/food/water.mp3', category: 'food' },
      { word: 'juice', image: '🧃', audioUrl: '/audio/vocabulary/food/juice.mp3', category: 'food' },
      { word: 'ice cream', image: '🍦', audioUrl: '/audio/vocabulary/food/ice-cream.mp3', category: 'food' },
    ],
  },

  // 3. Body (15 words)
  {
    id: 'body',
    name: 'Body',
    icon: '🖐️',
    words: [
      { word: 'hand', image: '🖐️', audioUrl: '/audio/vocabulary/body/hand.mp3', category: 'body' },
      { word: 'foot', image: '🦶', audioUrl: '/audio/vocabulary/body/foot.mp3', category: 'body' },
      { word: 'eye', image: '👁️', audioUrl: '/audio/vocabulary/body/eye.mp3', category: 'body' },
      { word: 'nose', image: '👃', audioUrl: '/audio/vocabulary/body/nose.mp3', category: 'body' },
      { word: 'ear', image: '👂', audioUrl: '/audio/vocabulary/body/ear.mp3', category: 'body' },
      { word: 'mouth', image: '👄', audioUrl: '/audio/vocabulary/body/mouth.mp3', category: 'body' },
      { word: 'head', image: '🗣️', audioUrl: '/audio/vocabulary/body/head.mp3', category: 'body' },
      { word: 'arm', image: '💪', audioUrl: '/audio/vocabulary/body/arm.mp3', category: 'body' },
      { word: 'leg', image: '🦵', audioUrl: '/audio/vocabulary/body/leg.mp3', category: 'body' },
      { word: 'finger', image: '👆', audioUrl: '/audio/vocabulary/body/finger.mp3', category: 'body' },
      { word: 'toe', image: '🦶', audioUrl: '/audio/vocabulary/body/toe.mp3', category: 'body' },
      { word: 'hair', image: '💇', audioUrl: '/audio/vocabulary/body/hair.mp3', category: 'body' },
      { word: 'face', image: '😊', audioUrl: '/audio/vocabulary/body/face.mp3', category: 'body' },
      { word: 'teeth', image: '🦷', audioUrl: '/audio/vocabulary/body/teeth.mp3', category: 'body' },
      { word: 'tongue', image: '👅', audioUrl: '/audio/vocabulary/body/tongue.mp3', category: 'body' },
    ],
  },

  // 4. Home (15 words)
  {
    id: 'home',
    name: 'Home',
    icon: '🏠',
    words: [
      { word: 'bed', image: '🛏️', audioUrl: '/audio/vocabulary/home/bed.mp3', category: 'home' },
      { word: 'chair', image: '🪑', audioUrl: '/audio/vocabulary/home/chair.mp3', category: 'home' },
      { word: 'door', image: '🚪', audioUrl: '/audio/vocabulary/home/door.mp3', category: 'home' },
      { word: 'window', image: '🪟', audioUrl: '/audio/vocabulary/home/window.mp3', category: 'home' },
      { word: 'table', image: '🪵', audioUrl: '/audio/vocabulary/home/table.mp3', category: 'home' },
      { word: 'lamp', image: '💡', audioUrl: '/audio/vocabulary/home/lamp.mp3', category: 'home' },
      { word: 'sofa', image: '🛋️', audioUrl: '/audio/vocabulary/home/sofa.mp3', category: 'home' },
      { word: 'clock', image: '🕐', audioUrl: '/audio/vocabulary/home/clock.mp3', category: 'home' },
      { word: 'cup', image: '☕', audioUrl: '/audio/vocabulary/home/cup.mp3', category: 'home' },
      { word: 'plate', image: '🍽️', audioUrl: '/audio/vocabulary/home/plate.mp3', category: 'home' },
      { word: 'spoon', image: '🥄', audioUrl: '/audio/vocabulary/home/spoon.mp3', category: 'home' },
      { word: 'fork', image: '🍴', audioUrl: '/audio/vocabulary/home/fork.mp3', category: 'home' },
      { word: 'bowl', image: '🥣', audioUrl: '/audio/vocabulary/home/bowl.mp3', category: 'home' },
      { word: 'pot', image: '🍲', audioUrl: '/audio/vocabulary/home/pot.mp3', category: 'home' },
      { word: 'pan', image: '🍳', audioUrl: '/audio/vocabulary/home/pan.mp3', category: 'home' },
    ],
  },

  // 5. Nature (15 words)
  {
    id: 'nature',
    name: 'Nature',
    icon: '🌳',
    words: [
      { word: 'tree', image: '🌳', audioUrl: '/audio/vocabulary/nature/tree.mp3', category: 'nature' },
      { word: 'flower', image: '🌸', audioUrl: '/audio/vocabulary/nature/flower.mp3', category: 'nature' },
      { word: 'sun', image: '☀️', audioUrl: '/audio/vocabulary/nature/sun.mp3', category: 'nature' },
      { word: 'moon', image: '🌙', audioUrl: '/audio/vocabulary/nature/moon.mp3', category: 'nature' },
      { word: 'star', image: '⭐', audioUrl: '/audio/vocabulary/nature/star.mp3', category: 'nature' },
      { word: 'rain', image: '🌧️', audioUrl: '/audio/vocabulary/nature/rain.mp3', category: 'nature' },
      { word: 'cloud', image: '☁️', audioUrl: '/audio/vocabulary/nature/cloud.mp3', category: 'nature' },
      { word: 'grass', image: '🌿', audioUrl: '/audio/vocabulary/nature/grass.mp3', category: 'nature' },
      { word: 'rock', image: '🪨', audioUrl: '/audio/vocabulary/nature/rock.mp3', category: 'nature' },
      { word: 'leaf', image: '🍃', audioUrl: '/audio/vocabulary/nature/leaf.mp3', category: 'nature' },
      { word: 'river', image: '🏞️', audioUrl: '/audio/vocabulary/nature/river.mp3', category: 'nature' },
      { word: 'mountain', image: '⛰️', audioUrl: '/audio/vocabulary/nature/mountain.mp3', category: 'nature' },
      { word: 'sea', image: '🌊', audioUrl: '/audio/vocabulary/nature/sea.mp3', category: 'nature' },
      { word: 'snow', image: '❄️', audioUrl: '/audio/vocabulary/nature/snow.mp3', category: 'nature' },
      { word: 'wind', image: '💨', audioUrl: '/audio/vocabulary/nature/wind.mp3', category: 'nature' },
    ],
  },

  // 6. Colors & Shapes (15 words)
  {
    id: 'colors-shapes',
    name: 'Colors & Shapes',
    icon: '🎨',
    words: [
      { word: 'red', image: '🔴', audioUrl: '/audio/vocabulary/colors-shapes/red.mp3', category: 'colors-shapes' },
      { word: 'blue', image: '🔵', audioUrl: '/audio/vocabulary/colors-shapes/blue.mp3', category: 'colors-shapes' },
      { word: 'green', image: '🟢', audioUrl: '/audio/vocabulary/colors-shapes/green.mp3', category: 'colors-shapes' },
      { word: 'yellow', image: '🟡', audioUrl: '/audio/vocabulary/colors-shapes/yellow.mp3', category: 'colors-shapes' },
      { word: 'black', image: '⚫', audioUrl: '/audio/vocabulary/colors-shapes/black.mp3', category: 'colors-shapes' },
      { word: 'white', image: '⚪', audioUrl: '/audio/vocabulary/colors-shapes/white.mp3', category: 'colors-shapes' },
      { word: 'pink', image: '💗', audioUrl: '/audio/vocabulary/colors-shapes/pink.mp3', category: 'colors-shapes' },
      { word: 'orange', image: '🟠', audioUrl: '/audio/vocabulary/colors-shapes/orange.mp3', category: 'colors-shapes' },
      { word: 'purple', image: '🟣', audioUrl: '/audio/vocabulary/colors-shapes/purple.mp3', category: 'colors-shapes' },
      { word: 'brown', image: '🟤', audioUrl: '/audio/vocabulary/colors-shapes/brown.mp3', category: 'colors-shapes' },
      { word: 'circle', image: '⭕', audioUrl: '/audio/vocabulary/colors-shapes/circle.mp3', category: 'colors-shapes' },
      { word: 'square', image: '🟦', audioUrl: '/audio/vocabulary/colors-shapes/square.mp3', category: 'colors-shapes' },
      { word: 'triangle', image: '🔺', audioUrl: '/audio/vocabulary/colors-shapes/triangle.mp3', category: 'colors-shapes' },
      { word: 'star', image: '⭐', audioUrl: '/audio/vocabulary/colors-shapes/star.mp3', category: 'colors-shapes' },
      { word: 'heart', image: '❤️', audioUrl: '/audio/vocabulary/colors-shapes/heart.mp3', category: 'colors-shapes' },
    ],
  },
];

// Helper to get all words flat (100 total words)
export const ALL_VOCABULARY_WORDS: VocabularyWord[] = VOCABULARY_CATEGORIES.flatMap(c => c.words);

// Helper to get words by category
export const getWordsByCategory = (categoryId: string): VocabularyWord[] => {
  return VOCABULARY_CATEGORIES.find(c => c.id === categoryId)?.words || [];
};

// Helper to get category by ID
export const getCategoryById = (categoryId: string): VocabularyCategory | undefined => {
  return VOCABULARY_CATEGORIES.find(c => c.id === categoryId);
};

// Helper to get random words for mixed practice
export const getRandomWords = (count: number): VocabularyWord[] => {
  const shuffled = [...ALL_VOCABULARY_WORDS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
