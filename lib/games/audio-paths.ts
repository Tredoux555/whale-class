// lib/games/audio-paths.ts
// Audio system with overlap prevention

export const AUDIO_PATHS = {
  ui: {
    correct: '/audio-new/ui/correct.mp3',
    wrong: '/audio-new/ui/wrong.mp3',
    celebration: '/audio-new/ui/celebration.mp3',
    complete: '/audio-new/ui/complete.mp3',
    unlock: '/audio-new/ui/unlock.mp3',
    click: '/audio-new/ui/click.mp3',
    whoosh: '/audio-new/ui/whoosh.mp3',
    countdown: '/audio-new/ui/countdown.mp3',
    instructions: '/audio-new/ui/instructions.mp3',
  },
  getLetter: (letter: string) => `/audio-new/letters/${letter.toLowerCase()}.mp3`,
  getWord: (word: string, series: 'pink' | 'blue' | 'green' = 'pink') => 
    `/audio-new/words/${series}/${word.toLowerCase()}.mp3`,
  getSightWord: (word: string) => `/audio-new/sight-words/${word.toLowerCase()}.mp3`,
  getSentence: (num: number) => `/audio-new/sentences/sentence-${num.toString().padStart(2, '0')}.mp3`,
};

/**
 * GameAudio - Singleton audio manager that prevents overlapping sounds
 * 
 * Key features:
 * - Only one sound plays at a time (stops previous before playing new)
 * - Preloads frequently used sounds
 * - Provides both fire-and-forget and await-able play methods
 */
export class GameAudio {
  // Single active audio element - ensures no overlap
  private static currentAudio: HTMLAudioElement | null = null;
  
  // Cache for preloaded audio elements
  private static audioCache: Map<string, HTMLAudioElement> = new Map();
  
  // Track if we're currently playing
  private static isPlaying: boolean = false;
  
  // Celebration toggle for variety
  private static celebrationToggle: boolean = false;
  
  // Queue for sequential sounds
  private static audioQueue: string[] = [];
  private static isProcessingQueue: boolean = false;

  /**
   * Stop any currently playing audio immediately
   */
  static stop(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio.onended = null;
      this.currentAudio.onerror = null;
    }
    this.isPlaying = false;
    this.audioQueue = [];
    this.isProcessingQueue = false;
  }

  /**
   * Preload an audio file into cache
   */
  static preload(path: string): void {
    if (typeof window === 'undefined') return;
    if (this.audioCache.has(path)) return;
    
    const audio = new Audio();
    audio.preload = 'auto';
    audio.src = path;
    this.audioCache.set(path, audio);
  }

  /**
   * Preload common UI sounds
   */
  static preloadCommon(): void {
    // Preload UI sounds
    Object.values(AUDIO_PATHS.ui).forEach(path => this.preload(path));
    
    // Preload first few letters
    ['a', 'b', 'c', 'd', 'e', 's', 'a', 't', 'p', 'i', 'n'].forEach(letter => {
      this.preload(AUDIO_PATHS.getLetter(letter));
    });
  }

  /**
   * Play audio - stops any current audio first
   * Returns a promise that resolves when audio finishes
   */
  static play(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve();
        return;
      }

      // Stop any currently playing audio
      this.stop();

      try {
        // Try to get from cache first
        let audio = this.audioCache.get(path);
        
        if (audio) {
          // Clone the cached audio so we can play it fresh
          audio = audio.cloneNode(true) as HTMLAudioElement;
        } else {
          // Create new audio element
          audio = new Audio(path);
        }

        this.currentAudio = audio;
        this.isPlaying = true;

        audio.onended = () => {
          this.isPlaying = false;
          this.currentAudio = null;
          resolve();
        };

        audio.onerror = (e) => {
          console.warn(`Audio failed to play: ${path}`, e);
          this.isPlaying = false;
          this.currentAudio = null;
          // Resolve instead of reject to prevent game interruption
          resolve();
        };

        // Play with user interaction handling
        const playPromise = audio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch((error) => {
            // Auto-play was prevented (common on mobile)
            console.warn('Audio play prevented:', error);
            this.isPlaying = false;
            this.currentAudio = null;
            resolve();
          });
        }
      } catch (e) {
        console.warn('Audio error:', e);
        this.isPlaying = false;
        resolve();
      }
    });
  }

  /**
   * Play audio without waiting for it to finish
   * Still stops any previous audio
   */
  static playNow(path: string): void {
    this.play(path).catch(console.error);
  }

  /**
   * Play a sequence of sounds one after another
   */
  static async playSequence(paths: string[], delayBetween: number = 200): Promise<void> {
    for (let i = 0; i < paths.length; i++) {
      await this.play(paths[i]);
      if (i < paths.length - 1 && delayBetween > 0) {
        await new Promise(r => setTimeout(r, delayBetween));
      }
    }
  }

  /**
   * Play letter sound
   */
  static playLetter(letter: string): Promise<void> {
    return this.play(AUDIO_PATHS.getLetter(letter));
  }

  /**
   * Play letter sound (fire and forget)
   */
  static playLetterNow(letter: string): void {
    this.playNow(AUDIO_PATHS.getLetter(letter));
  }

  /**
   * Play word sound
   */
  static playWord(word: string, series: 'pink' | 'blue' | 'green' = 'pink'): Promise<void> {
    return this.play(AUDIO_PATHS.getWord(word, series));
  }

  /**
   * Play sight word sound
   */
  static playSightWord(word: string): Promise<void> {
    return this.play(AUDIO_PATHS.getSightWord(word));
  }

  /**
   * Play sentence sound
   */
  static playSentence(num: number): Promise<void> {
    return this.play(AUDIO_PATHS.getSentence(num));
  }

  /**
   * Play correct answer sound
   */
  static playCorrect(): Promise<void> {
    return this.play(AUDIO_PATHS.ui.correct);
  }

  /**
   * Play wrong answer sound
   */
  static playWrong(): Promise<void> {
    return this.play(AUDIO_PATHS.ui.wrong);
  }

  /**
   * Play celebration - alternates between celebration and complete sounds
   */
  static playCelebration(): Promise<void> {
    this.celebrationToggle = !this.celebrationToggle;
    return this.play(
      this.celebrationToggle ? AUDIO_PATHS.ui.celebration : AUDIO_PATHS.ui.complete
    );
  }

  /**
   * Play big celebration (always uses celebration sound)
   */
  static playBigCelebration(): Promise<void> {
    return this.play(AUDIO_PATHS.ui.celebration);
  }

  /**
   * Play unlock sound
   */
  static playUnlock(): Promise<void> {
    return this.play(AUDIO_PATHS.ui.unlock);
  }

  /**
   * Play any UI sound
   */
  static playUI(sound: keyof typeof AUDIO_PATHS.ui): Promise<void> {
    return this.play(AUDIO_PATHS.ui[sound]);
  }

  /**
   * Check if currently playing
   */
  static get playing(): boolean {
    return this.isPlaying;
  }
}

// Auto-preload common sounds when module loads (client-side only)
if (typeof window !== 'undefined') {
  // Delay preload slightly to not block initial render
  setTimeout(() => {
    GameAudio.preloadCommon();
  }, 1000);
}
