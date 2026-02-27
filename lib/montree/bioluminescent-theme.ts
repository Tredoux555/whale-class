// lib/montree/bioluminescent-theme.ts
// Bioluminescent Depth design system for the Montree Home experience
// Dark living backgrounds with self-luminous mint/jade accents
// Used exclusively by home parent components (/montree/home/*)

export const BIO = {
  // Core hex values
  deep: '#0A1F1C',
  surface: '#0D2B27',
  card: '#122E2A',
  mint: '#4ADE80',
  jade: '#10B981',
  amber: '#F59E0B',
  white90: 'rgba(255, 255, 255, 0.9)',
  white60: 'rgba(255, 255, 255, 0.6)',
  white30: 'rgba(255, 255, 255, 0.3)',

  // Tailwind utility classes — backgrounds
  bg: {
    deep: 'bg-[#0A1F1C]',
    surface: 'bg-[#0D2B27]',
    card: 'bg-[#122E2A]/80',
    cardSolid: 'bg-[#122E2A]',
    gradient: 'bg-gradient-to-b from-[#0A1F1C] via-[#0D2B27] to-[#0A1F1C]',
    mintSubtle: 'bg-[#4ADE80]/10',
    amberSubtle: 'bg-[#F59E0B]/10',
  },

  // Text classes
  text: {
    primary: 'text-white/90',
    secondary: 'text-white/60',
    muted: 'text-white/30',
    mint: 'text-[#4ADE80]',
    jade: 'text-[#10B981]',
    amber: 'text-[#F59E0B]',
  },

  // Border classes
  border: {
    glow: 'border-[#4ADE80]/20',
    glowStrong: 'border-[#4ADE80]/40',
    subtle: 'border-white/5',
    dim: 'border-white/10',
    amber: 'border-[#F59E0B]/20',
  },

  // Button classes
  btn: {
    mint: 'bg-[#4ADE80] hover:bg-[#22C55E] text-[#0A1F1C] font-semibold',
    ghost: 'bg-white/10 hover:bg-white/15 text-white/80',
    dark: 'bg-[#0D2B27] hover:bg-[#164340] text-white',
    outline: 'border border-[#4ADE80]/30 hover:border-[#4ADE80]/50 text-[#4ADE80] bg-transparent',
  },

  // Box shadow values (not classes — use with style prop)
  glow: {
    soft: '0 0 20px rgba(74,222,128,0.15)',
    medium: '0 0 30px rgba(74,222,128,0.25)',
    strong: '0 0 40px rgba(74,222,128,0.35)',
    amber: '0 0 15px rgba(245,158,11,0.2)',
    inner: 'inset 0 0 20px rgba(74,222,128,0.08)',
  },

  // Status colors for progress
  status: {
    not_started: { ring: 'stroke-white/10', bg: 'bg-white/5', text: 'text-white/30', label: 'Not started' },
    presented: { ring: 'stroke-[#F59E0B]', bg: 'bg-[#F59E0B]/10', text: 'text-[#F59E0B]', label: 'Presented' },
    practicing: { ring: 'stroke-[#10B981]', bg: 'bg-[#10B981]/10', text: 'text-[#10B981]', label: 'Practicing' },
    mastered: { ring: 'stroke-[#4ADE80]', bg: 'bg-[#4ADE80]/10', text: 'text-[#4ADE80]', label: 'Mastered' },
  },

  // Area icons
  areaIcon: {
    practical_life: '🧹',
    sensorial: '🔴',
    mathematics: '🔢',
    language: '✏️',
    cultural: '🌍',
  } as Record<string, string>,

  // Area display names
  areaLabel: {
    practical_life: 'Practical Life',
    sensorial: 'Sensorial',
    mathematics: 'Mathematics',
    language: 'Language',
    cultural: 'Cultural',
  } as Record<string, string>,
  // Wooden shelf colors
  shelf: {
    plank: 'linear-gradient(180deg, #8B6914 0%, #A0782C 15%, #8B6914 50%, #7A5C12 85%, #6B4E0E 100%)',
    plankEdge: 'linear-gradient(180deg, #6B4E0E 0%, #5A4210 50%, #4A3608 100%)',
    shadow: '0 4px 12px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)',
    edgeShadow: '0 2px 6px rgba(0,0,0,0.5)',
    grain: 'repeating-linear-gradient(90deg, transparent 0px, transparent 3px, rgba(0,0,0,0.03) 3px, rgba(0,0,0,0.03) 4px)',
  },

  // Work icon map — representative emoji for common Montessori works
  workIcon: {
    // Practical Life
    'Carrying a Mat': '🧶', 'Carrying a Tray': '🍽️', 'Pouring': '🫗',
    'Spooning': '🥄', 'Folding': '👕', 'Buttoning': '🔘',
    'Polishing': '✨', 'Sweeping': '🧹', 'Washing': '🧽',
    'Cutting': '✂️', 'Sewing': '🧵', 'Lacing': '👟',
    'Twisting': '🔩', 'Squeezing': '🍋', 'Tonging': '🥢',
    'Table Scrubbing': '🫧', 'Plant Care': '🌱', 'Food Prep': '🥕',
    // Sensorial
    'Pink Tower': '🏗️', 'Brown Stair': '📐', 'Red Rods': '📏',
    'Cylinder Blocks': '🔲', 'Color Tablets': '🎨', 'Knobless Cylinders': '⚪',
    'Geometric Solids': '🔷', 'Constructive Triangles': '🔺',
    'Binomial Cube': '🧊', 'Trinomial Cube': '🎲',
    'Sound Cylinders': '🔔', 'Baric Tablets': '⚖️',
    'Thermic Tablets': '🌡️', 'Fabric Box': '🧣',
    'Mystery Bag': '👜', 'Geometric Cabinet': '📦',
    // Mathematics
    'Number Rods': '📊', 'Sandpaper Numbers': '🔢',
    'Spindle Box': '🎯', 'Cards and Counters': '🃏',
    'Short Bead Stair': '📿', 'Teen Board': '🔟',
    'Ten Board': '🔢', 'Hundred Board': '💯',
    'Golden Beads': '✨', 'Stamp Game': '📮',
    'Addition Strip Board': '➕', 'Subtraction Strip Board': '➖',
    'Multiplication Bead Board': '✖️', 'Division Board': '➗',
    // Language
    'Sandpaper Letters': '✋', 'Moveable Alphabet': '🔤',
    'Metal Insets': '✏️', 'Object Box': '📦',
    'Phonogram Cards': '🗂️', 'Grammar Symbols': '📝',
    'Sentence Analysis': '📖', 'Word Study': '📚',
    'Reading Cards': '🏷️', 'Phonetic Reading': '👄',
    // Cultural
    'Globe': '🌍', 'Puzzle Map': '🗺️', 'Land & Water Forms': '🏝️',
    'Botany': '🌿', 'Zoology': '🦋', 'History': '⏳',
    'Science': '🔬', 'Art': '🖼️', 'Music': '🎵',
    'Calendar': '📅', 'Weather': '🌤️', 'Flags': '🏳️',
  } as Record<string, string>,
} as const;
