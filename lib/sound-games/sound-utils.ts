// lib/sound-games/sound-utils.ts
// Audio utilities for Sound Games - ELEVENLABS ONLY
// NO browser speech synthesis - use pre-recorded audio only

import { GameAudio, AUDIO_PATHS } from '@/lib/games/audio-paths';

// ============================================
// WORD AUDIO LOOKUP
// Maps words to their audio file locations
// ============================================

// All words we have audio for (from ElevenLabs generation)
const PINK_WORDS = new Set([
  'cat', 'bat', 'hat', 'rat', 'mat', 'sat', 'fat', 'pat', 'van', 'ran', 'can', 'fan', 'man', 'pan', 'bag', 'tag',
  'bed', 'red', 'fed', 'let', 'met', 'net', 'pet', 'set', 'wet', 'hen', 'pen', 'ten', 'den', 'men',
  'bit', 'fit', 'hit', 'kit', 'lit', 'pit', 'sit', 'big', 'dig', 'fig', 'pig', 'wig', 'bin', 'fin', 'pin', 'dip', 'hip', 'lip', 'tip', 'zip',
  'box', 'fox', 'hot', 'lot', 'not', 'pot', 'rot', 'got', 'dog', 'fog', 'hog', 'jog', 'log', 'cop', 'hop', 'mop', 'top',
  'bug', 'dug', 'hug', 'jug', 'mug', 'rug', 'tug', 'bus', 'cut', 'hut', 'nut', 'put',
  'sun', 'cup', 'pup', 'leg', 'peg', 'wet', 'map', 'cap', 'nap', 'tap', 'lap', 'gap',
  'cot', 'dot', 'ham', 'jam', 'ram', 'yam', 'cab', 'dab', 'jab', 'lab', 'tab',
  'bib', 'rib', 'cob', 'gob', 'job', 'mob', 'rob', 'sob', 'cub', 'hub', 'pub', 'rub', 'sub', 'tub',
  'bud', 'cud', 'mud', 'bad', 'dad', 'had', 'lad', 'mad', 'pad', 'sad', 'wag', 'beg', 'keg', 'gum', 'hum', 'mum', 'sum', 'yum',
  'bun', 'fun', 'gun', 'nun', 'pun', 'run', 'dim', 'him', 'rim', 'vim', 'gym', 'hem', 'cod', 'god', 'mod', 'nod', 'pod', 'rod', 'sod',
]);

const GREEN_WORDS = new Set([
  'ship', 'shop', 'shut', 'shed', 'shell', 'shin', 'shot', 'shun',
  'chip', 'chop', 'chat', 'chin', 'check', 'chess', 'chest', 'chill',
  'thin', 'thick', 'than', 'them', 'then', 'this', 'that', 'thud',
  'fish', 'dish', 'wish', 'mesh', 'cash', 'dash', 'gash', 'hash', 'lash', 'mash', 'rash', 'bash', 'gush', 'hush', 'mush', 'rush', 'much', 'such', 'rich', 'with', 'math', 'bath', 'path',
]);

const BLUE_WORDS = new Set([
  'black', 'blank', 'blast', 'blend', 'bless', 'blind', 'block', 'blot', 'blush',
  'clam', 'clap', 'class', 'clip', 'clock', 'cloth', 'club', 'cluck',
  'flag', 'flap', 'flat', 'flesh', 'flip', 'flock', 'flop', 'floss', 'fluff', 'flush',
  'glad', 'glass', 'glen', 'glob', 'glum', 'glut',
  'plan', 'plop', 'plot', 'plug', 'plum', 'plus', 'plush',
  'slab', 'slam', 'slap', 'slash', 'slat', 'sled', 'slid', 'slim', 'slip', 'slit', 'slob', 'slop', 'slot', 'slug', 'slum', 'slush',
]);

const SIGHT_WORDS = new Set([
  'the', 'a', 'is', 'it', 'in', 'on', 'to', 'and', 'he', 'she', 'we', 'me', 'be',
  'my', 'you', 'do', 'no', 'so', 'go', 'of', 'or', 'for', 'are', 'was', 'his', 'her',
  'has', 'had', 'but', 'not', 'can', 'will', 'up', 'down', 'out', 'all', 'said', 'see',
  'look', 'come', 'here', 'there', 'where', 'what', 'when', 'who', 'how', 'this', 'that',
  'with', 'they', 'have', 'from', 'one', 'two', 'three', 'four', 'five',
]);

// ============================================
// SOUND GAME AUDIO CLASS
// Uses ElevenLabs pre-recorded audio ONLY
// ============================================

class SoundGameAudio {
  // Play a phoneme/letter sound
  async playPhoneme(phonemePath: string): Promise<void> {
    await GameAudio.play(phonemePath);
  }

  // Play a letter sound by letter
  async playLetter(letter: string): Promise<void> {
    await GameAudio.playLetter(letter.toLowerCase());
  }

  // Play a word - finds it in our audio library
  async playWord(word: string): Promise<void> {
    const cleanWord = word.toLowerCase().replace(/[^a-z]/g, '');
    
    // Try to find the word in our libraries
    if (SIGHT_WORDS.has(cleanWord)) {
      await GameAudio.playSightWord(cleanWord);
    } else if (PINK_WORDS.has(cleanWord)) {
      await GameAudio.playWord(cleanWord, 'pink');
    } else if (GREEN_WORDS.has(cleanWord)) {
      await GameAudio.playWord(cleanWord, 'green');
    } else if (BLUE_WORDS.has(cleanWord)) {
      await GameAudio.playWord(cleanWord, 'blue');
    } else {
      // Word not in library - just spell it out letter by letter
      console.warn(`Word "${cleanWord}" not in audio library, spelling out`);
      await this.spellWord(cleanWord);
    }
  }

  // Spell out a word letter by letter
  async spellWord(word: string): Promise<void> {
    const letters = word.toLowerCase().split('');
    for (const letter of letters) {
      if (letter.match(/[a-z]/)) {
        await GameAudio.playLetter(letter);
        await this.wait(100);
      }
    }
  }

  // Play sounds separately for blending/segmenting
  async playSoundsSlowly(sounds: string[], delayMs: number = 500): Promise<void> {
    for (let i = 0; i < sounds.length; i++) {
      await GameAudio.playLetter(sounds[i].toLowerCase());
      if (i < sounds.length - 1) {
        await this.wait(delayMs);
      }
    }
  }

  // Play word with stretched middle sound (for middle sound game)
  async playWordStretched(word: string, middleSound: string): Promise<void> {
    // First play the whole word
    await this.playWord(word);
    await this.wait(400);
    
    // Then play the middle sound emphasized
    await GameAudio.playLetter(middleSound.toLowerCase());
  }

  // Utility: wait for ms
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Play celebration sound
  async playCelebration(): Promise<void> {
    await GameAudio.playCelebration();
  }

  // Play correct sound
  async playCorrect(): Promise<void> {
    await GameAudio.playCorrect();
  }

  // Play wrong sound
  async playWrong(): Promise<void> {
    await GameAudio.playWrong();
  }

  // Stop all audio
  stop(): void {
    GameAudio.stop();
  }

  // DEPRECATED: These methods no longer use speech synthesis
  // They now use pre-recorded audio or stay silent
  
  async speakWord(text: string): Promise<void> {
    // Try to play as a word first
    const words = text.toLowerCase().split(/\s+/);
    for (const word of words) {
      const cleanWord = word.replace(/[^a-z]/g, '');
      if (cleanWord) {
        // Check if it's a single letter
        if (cleanWord.length === 1) {
          await GameAudio.playLetter(cleanWord);
        } else {
          await this.playWord(cleanWord);
        }
        await this.wait(200);
      }
    }
  }

  async speakWordStretched(word: string, middleSound: string): Promise<void> {
    await this.playWordStretched(word, middleSound);
  }

  async speakSoundsSlowly(sounds: string[], delayMs: number = 500): Promise<void> {
    await this.playSoundsSlowly(sounds, delayMs);
  }
}

// Singleton instance
export const soundGameAudio = new SoundGameAudio();

// ============================================
// I SPY PHRASES - Now just the target sound, no long phrase
// ============================================

export const I_SPY_PHRASES = {
  beginning: (sound: string) => sound,
  ending: (sound: string) => sound,
  middle: (sound: string) => sound,
};

export const CORRECT_PHRASES = [
  'Yes!',
  'Great!',
  'Perfect!',
  'Amazing!',
  'Super!',
];

export const ENCOURAGEMENT_PHRASES = [
  'Try again!',
  'Almost!',
  'Keep trying!',
  'Listen again!',
];

export function getRandomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}
