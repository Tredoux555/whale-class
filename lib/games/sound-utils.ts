// lib/games/sound-utils.ts
// Audio utilities with CORRECT Montessori letter sounds

// ============================================
// CORRECT LETTER SOUNDS (Montessori phonics)
// ============================================

// These are the SHORT, PURE sounds - not letter names!
// Critical for teaching reading - must be accurate
const LETTER_SOUNDS: Record<string, string> = {
  // VOWELS - Short sounds only (for beginning readers)
  'a': 'a',      // as in "apple" - short /æ/ - mouth open, tongue low
  'e': 'e',      // as in "egg" - short /ɛ/ - mouth slightly open
  'i': 'i',      // as in "igloo" - short /ɪ/ - mouth barely open
  'o': 'o',      // as in "octopus" - short /ɒ/ - mouth round
  'u': 'u',      // as in "up" - short /ʌ/ - mouth relaxed
  
  // CONSONANTS - Pure sounds without "uh" at the end
  'b': 'b',      // lips together, quick release - NOT "buh"
  'c': 'k',      // hard c sound - back of throat
  'd': 'd',      // tongue behind teeth, quick release - NOT "duh"
  'f': 'fff',    // continuous - teeth on lip, blow air
  'g': 'g',      // hard g - back of throat - NOT "guh"
  'h': 'h',      // breathy exhale - just air
  'j': 'j',      // like "jump" - NOT "jay"
  'k': 'k',      // same as hard c - back of throat
  'l': 'lll',    // continuous - tongue behind teeth
  'm': 'mmm',    // continuous - lips together, hum
  'n': 'nnn',    // continuous - tongue behind teeth, hum through nose
  'p': 'p',      // lips together, quick puff - NOT "puh"
  'q': 'kw',     // always followed by u, makes "kw"
  'r': 'rrr',    // continuous - tongue curled back
  's': 'sss',    // continuous - hissing snake sound
  't': 't',      // tongue behind teeth, quick release - NOT "tuh"
  'v': 'vvv',    // continuous - teeth on lip, vibrate
  'w': 'w',      // lips rounded - NOT "wuh"
  'x': 'ks',     // combination sound
  'y': 'y',      // like "yes" - NOT "yuh"
  'z': 'zzz',    // continuous - buzzing bee sound
};

// Words to demonstrate each letter sound
const SOUND_EXAMPLE_WORDS: Record<string, string> = {
  'a': 'apple',
  'b': 'ball',
  'c': 'cat',
  'd': 'dog',
  'e': 'egg',
  'f': 'fish',
  'g': 'go',
  'h': 'hat',
  'i': 'it',
  'j': 'jump',
  'k': 'kite',
  'l': 'lamp',
  'm': 'man',
  'n': 'net',
  'o': 'on',
  'p': 'pig',
  'q': 'queen',
  'r': 'run',
  's': 'sun',
  't': 'top',
  'u': 'up',
  'v': 'van',
  'w': 'wet',
  'x': 'box',
  'y': 'yes',
  'z': 'zip',
};

// ============================================
// SPEECH SYNTHESIS CONFIGURATION
// ============================================

let speechSynthesis: SpeechSynthesis | null = null;
let voices: SpeechSynthesisVoice[] = [];

// Initialize speech synthesis
function initSpeech(): boolean {
  if (typeof window === 'undefined') return false;
  
  speechSynthesis = window.speechSynthesis;
  voices = speechSynthesis.getVoices();
  
  // Voices may load async
  if (voices.length === 0) {
    speechSynthesis.onvoiceschanged = () => {
      voices = speechSynthesis!.getVoices();
    };
  }
  
  return true;
}

// Get best voice for children's content
function getChildFriendlyVoice(): SpeechSynthesisVoice | null {
  if (voices.length === 0) return null;
  
  // Prefer these voices (clearer for phonics)
  const preferredVoices = [
    'Samantha',      // macOS - clear female
    'Karen',         // macOS Australian
    'Daniel',        // macOS British
    'Google US English',
    'Microsoft Zira', // Windows
    'Microsoft David', // Windows
  ];
  
  for (const name of preferredVoices) {
    const voice = voices.find(v => v.name.includes(name));
    if (voice) return voice;
  }
  
  // Fallback to first English voice
  return voices.find(v => v.lang.startsWith('en')) || voices[0];
}

// ============================================
// LETTER SOUND FUNCTIONS
// ============================================

/**
 * Speak a letter's SOUND (not its name)
 * This is the most important function for phonics teaching
 */
export function speakLetterSound(letter: string): void {
  if (!initSpeech() || !speechSynthesis) return;
  
  // Cancel any ongoing speech
  speechSynthesis.cancel();
  
  const lowerLetter = letter.toLowerCase();
  const soundText = LETTER_SOUNDS[lowerLetter] || letter;
  
  const utterance = new SpeechSynthesisUtterance(soundText);
  
  // Configure for clear, slow pronunciation
  utterance.rate = 0.6;        // Slower for clarity
  utterance.pitch = 1.0;       // Natural pitch
  utterance.volume = 1.0;      // Full volume
  
  const voice = getChildFriendlyVoice();
  if (voice) utterance.voice = voice;
  
  speechSynthesis.speak(utterance);
}

/**
 * Speak a letter sound followed by an example word
 * e.g., "a... apple" or "sss... sun"
 */
export function speakLetterWithExample(letter: string): void {
  if (!initSpeech() || !speechSynthesis) return;
  
  speechSynthesis.cancel();
  
  const lowerLetter = letter.toLowerCase();
  const soundText = LETTER_SOUNDS[lowerLetter] || letter;
  const exampleWord = SOUND_EXAMPLE_WORDS[lowerLetter] || '';
  
  // First speak the sound
  const soundUtterance = new SpeechSynthesisUtterance(soundText);
  soundUtterance.rate = 0.5;
  soundUtterance.pitch = 1.0;
  
  const voice = getChildFriendlyVoice();
  if (voice) soundUtterance.voice = voice;
  
  // Then speak the example word
  soundUtterance.onend = () => {
    if (exampleWord) {
      setTimeout(() => {
        const wordUtterance = new SpeechSynthesisUtterance(exampleWord);
        wordUtterance.rate = 0.7;
        wordUtterance.pitch = 1.0;
        if (voice) wordUtterance.voice = voice;
        speechSynthesis!.speak(wordUtterance);
      }, 300);
    }
  };
  
  speechSynthesis.speak(soundUtterance);
}

/**
 * Legacy function name - redirects to speakLetterSound
 */
export function speakLetter(letter: string): void {
  speakLetterSound(letter);
}

// ============================================
// WORD FUNCTIONS
// ============================================

/**
 * Speak a word clearly
 */
export function speakWord(word: string): void {
  if (!initSpeech() || !speechSynthesis) return;
  
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.rate = 0.65;       // Slow and clear
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  const voice = getChildFriendlyVoice();
  if (voice) utterance.voice = voice;
  
  speechSynthesis.speak(utterance);
}

/**
 * Sound out a word letter by letter, then say the whole word
 * e.g., "c... a... t... cat!"
 */
export function soundOutWord(word: string): void {
  if (!initSpeech() || !speechSynthesis) return;
  
  speechSynthesis.cancel();
  
  const letters = word.toLowerCase().split('');
  let index = 0;
  
  const speakNextLetter = () => {
    if (index < letters.length) {
      const letter = letters[index];
      const soundText = LETTER_SOUNDS[letter] || letter;
      
      const utterance = new SpeechSynthesisUtterance(soundText);
      utterance.rate = 0.5;
      utterance.pitch = 1.0;
      
      const voice = getChildFriendlyVoice();
      if (voice) utterance.voice = voice;
      
      utterance.onend = () => {
        index++;
        setTimeout(speakNextLetter, 400);
      };
      
      speechSynthesis!.speak(utterance);
    } else {
      // After all letters, say the whole word
      setTimeout(() => {
        const wordUtterance = new SpeechSynthesisUtterance(word);
        wordUtterance.rate = 0.7;
        wordUtterance.pitch = 1.1; // Slightly higher for emphasis
        
        const voice = getChildFriendlyVoice();
        if (voice) wordUtterance.voice = voice;
        
        speechSynthesis!.speak(wordUtterance);
      }, 500);
    }
  };
  
  speakNextLetter();
}

/**
 * Speak a sentence slowly and clearly
 */
export function speakSentence(sentence: string): void {
  if (!initSpeech() || !speechSynthesis) return;
  
  speechSynthesis.cancel();
  
  const utterance = new SpeechSynthesisUtterance(sentence);
  utterance.rate = 0.55;       // Very slow for sentences
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  
  const voice = getChildFriendlyVoice();
  if (voice) utterance.voice = voice;
  
  speechSynthesis.speak(utterance);
}

// ============================================
// GAME FEEDBACK SOUNDS
// ============================================

/**
 * Play a happy sound for correct answers
 */
export function playCorrectSound(): void {
  playTone(523.25, 0.1);  // C5
  setTimeout(() => playTone(659.25, 0.1), 100);  // E5
  setTimeout(() => playTone(783.99, 0.15), 200); // G5
}

/**
 * Play a gentle "try again" sound
 */
export function playWrongSound(): void {
  playTone(300, 0.15);
  setTimeout(() => playTone(250, 0.2), 150);
}

/**
 * Play a click/tap sound
 */
export function playClickSound(): void {
  playTone(440, 0.05);
}

/**
 * Play a celebration fanfare
 */
export function playCelebrationSound(): void {
  const notes = [523, 587, 659, 698, 784, 880, 988, 1047]; // C major scale
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.1), i * 100);
  });
}

// Simple tone generator using Web Audio API
function playTone(frequency: number, duration: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
  } catch (e) {
    // Audio not supported - fail silently
  }
}

// ============================================
// EXPORTS
// ============================================

export {
  LETTER_SOUNDS,
  SOUND_EXAMPLE_WORDS,
};
