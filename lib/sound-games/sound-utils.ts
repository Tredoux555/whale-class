// lib/sound-games/sound-utils.ts
// Audio utilities for Sound Games
// Handles both pre-recorded phonemes and Web Speech API for words

// ============================================
// AUDIO PLAYER CLASS
// ============================================

class SoundGameAudio {
  private audioCache: Map<string, HTMLAudioElement> = new Map();
  private speechSynthesis: SpeechSynthesis | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.speechSynthesis = window.speechSynthesis;
    }
  }

  // Play pre-recorded phoneme audio
  async playPhoneme(phonemePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let audio = this.audioCache.get(phonemePath);
        
        if (!audio) {
          audio = new Audio(phonemePath);
          this.audioCache.set(phonemePath, audio);
        }
        
        audio.currentTime = 0;
        audio.onended = () => resolve();
        audio.onerror = () => {
          // Fallback to speech synthesis if audio file missing
          console.warn(`Audio file not found: ${phonemePath}, using speech fallback`);
          this.speakPhoneme(phonemePath).then(resolve).catch(reject);
        };
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  // Fallback: Use speech synthesis for phoneme (not ideal but works)
  private async speakPhoneme(phonemePath: string): Promise<void> {
    // Extract sound from path like '/audio/phonemes/m.mp3' -> 'm'
    const match = phonemePath.match(/\/([a-z]+)\.mp3$/);
    const sound = match ? match[1] : '';
    
    return this.speakText(sound, { rate: 0.5, pitch: 1.0 });
  }

  // Use Web Speech API for words (this works well for full words)
  async speakWord(word: string): Promise<void> {
    return this.speakText(word, { rate: 0.8, pitch: 1.1 });
  }

  // Speak with dramatic stretching for middle sounds
  async speakWordStretched(word: string, middleSound: string): Promise<void> {
    // For "cat" with middle /a/, say "c - aaaaaa - t"
    const sounds = word.split('');
    
    // Speak first sound
    await this.speakText(sounds[0], { rate: 0.6, pitch: 1.0 });
    await this.wait(300);
    
    // Stretch middle vowel
    const stretchedMiddle = middleSound.repeat(3);
    await this.speakText(stretchedMiddle, { rate: 0.4, pitch: 1.2 });
    await this.wait(300);
    
    // Speak last sound
    await this.speakText(sounds[sounds.length - 1], { rate: 0.6, pitch: 1.0 });
  }

  // Speak sounds separately for blending/segmenting
  async speakSoundsSlowly(sounds: string[], delayMs: number = 500): Promise<void> {
    for (let i = 0; i < sounds.length; i++) {
      await this.speakText(sounds[i], { rate: 0.5, pitch: 1.0 });
      if (i < sounds.length - 1) {
        await this.wait(delayMs);
      }
    }
  }

  // Core speech function
  private speakText(
    text: string,
    options: { rate?: number; pitch?: number } = {}
  ): Promise<void> {
    return new Promise((resolve) => {
      if (!this.speechSynthesis) {
        resolve();
        return;
      }

      // Cancel any ongoing speech
      this.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options.rate ?? 0.8;
      utterance.pitch = options.pitch ?? 1.1;
      utterance.volume = 1;

      // Try to use a clear voice
      const voices = this.speechSynthesis.getVoices();
      const preferredVoice = voices.find(
        (v) =>
          v.name.includes('Samantha') ||
          v.name.includes('Karen') ||
          v.name.includes('Google') ||
          v.lang.startsWith('en-US')
      );
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();

      this.speechSynthesis.speak(utterance);
    });
  }

  // Utility: wait for ms
  private wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Play celebration sound
  async playCelebration(): Promise<void> {
    const celebrationPath = '/audio/celebration.mp3';
    try {
      let audio = this.audioCache.get(celebrationPath);
      if (!audio) {
        audio = new Audio(celebrationPath);
        this.audioCache.set(celebrationPath, audio);
      }
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // No celebration sound available, that's okay
    }
  }

  // Play correct sound
  async playCorrect(): Promise<void> {
    const correctPath = '/audio/correct.mp3';
    try {
      let audio = this.audioCache.get(correctPath);
      if (!audio) {
        audio = new Audio(correctPath);
        this.audioCache.set(correctPath, audio);
      }
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Fallback beep
    }
  }

  // Play wrong sound
  async playWrong(): Promise<void> {
    const wrongPath = '/audio/wrong.mp3';
    try {
      let audio = this.audioCache.get(wrongPath);
      if (!audio) {
        audio = new Audio(wrongPath);
        this.audioCache.set(wrongPath, audio);
      }
      audio.currentTime = 0;
      await audio.play();
    } catch {
      // Fallback
    }
  }
}

// Singleton instance
export const soundGameAudio = new SoundGameAudio();

// ============================================
// I SPY PHRASES
// ============================================

export const I_SPY_PHRASES = {
  beginning: (sound: string) =>
    `I spy with my little eye, something that begins with ${sound}`,
  ending: (sound: string) =>
    `I spy with my little eye, something that ends with ${sound}`,
  middle: (sound: string) =>
    `I spy with my little eye, something with ${sound} in the middle`,
};

export const CORRECT_PHRASES = [
  'Yes! Great listening!',
  'You got it!',
  'Excellent ears!',
  'Perfect!',
  'Amazing!',
  'Super listener!',
];

export const ENCOURAGEMENT_PHRASES = [
  'Try again! Listen carefully.',
  'Almost! Listen one more time.',
  'Keep trying!',
  'You can do it!',
];

export function getRandomPhrase(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}
