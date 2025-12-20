// lib/games/audio-paths.ts
// Central audio path configuration for all games

export const AUDIO_PATHS = {
  // UI Sounds
  ui: {
    correct: '/audio/ui/correct.mp3',
    wrong: '/audio/ui/wrong.mp3',
    celebration: '/audio/ui/celebration.mp3',
    complete: '/audio/ui/complete.mp3',
    unlock: '/audio/ui/unlock.mp3',
    click: '/audio/ui/click.mp3',
    whoosh: '/audio/ui/whoosh.mp3',
    countdown: '/audio/ui/countdown.mp3',
    instructions: '/audio/ui/instructions.mp3',
  },
  
  // Letter sounds (a-z)
  letters: {
    a: '/audio/letters/a.mp3',
    b: '/audio/letters/b.mp3',
    c: '/audio/letters/c.mp3',
    d: '/audio/letters/d.mp3',
    e: '/audio/letters/e.mp3',
    f: '/audio/letters/f.mp3',
    g: '/audio/letters/g.mp3',
    h: '/audio/letters/h.mp3',
    i: '/audio/letters/i.mp3',
    j: '/audio/letters/j.mp3',
    k: '/audio/letters/k.mp3',
    l: '/audio/letters/l.mp3',
    m: '/audio/letters/m.mp3',
    n: '/audio/letters/n.mp3',
    o: '/audio/letters/o.mp3',
    p: '/audio/letters/p.mp3',
    q: '/audio/letters/q.mp3',
    r: '/audio/letters/r.mp3',
    s: '/audio/letters/s.mp3',
    t: '/audio/letters/t.mp3',
    u: '/audio/letters/u.mp3',
    v: '/audio/letters/v.mp3',
    w: '/audio/letters/w.mp3',
    x: '/audio/letters/x.mp3',
    y: '/audio/letters/y.mp3',
    z: '/audio/letters/z.mp3',
    celebration: '/audio/letters/celebration.mp3',
  },
  
  // Helper functions
  getLetter: (letter: string) => `/audio/letters/${letter.toLowerCase()}.mp3`,
  getWord: (word: string, series: 'pink' | 'blue' | 'green') => `/audio/words/${series}/${word.toLowerCase()}.mp3`,
  getSightWord: (word: string) => `/audio/sight-words/${word.toLowerCase()}.mp3`,
  getSentence: (num: number) => `/audio/sentences/sentence-${num.toString().padStart(2, '0')}.mp3`,
};

// Audio player utility class
export class GameAudio {
  private static audioCache: Map<string, HTMLAudioElement> = new Map();
  private static celebrationToggle: boolean = false;
  
  static play(path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        let audio = this.audioCache.get(path);
        if (!audio) {
          audio = new Audio(path);
          this.audioCache.set(path, audio);
        }
        audio.currentTime = 0;
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error(`Failed to play: ${path}`));
        audio.play().catch(reject);
      } catch (e) {
        reject(e);
      }
    });
  }
  
  static playLetter(letter: string): Promise<void> {
    return this.play(AUDIO_PATHS.getLetter(letter));
  }
  
  static playWord(word: string, series: 'pink' | 'blue' | 'green'): Promise<void> {
    return this.play(AUDIO_PATHS.getWord(word, series));
  }
  
  static playSightWord(word: string): Promise<void> {
    return this.play(AUDIO_PATHS.getSightWord(word));
  }
  
  static playSentence(num: number): Promise<void> {
    return this.play(AUDIO_PATHS.getSentence(num));
  }
  
  static playUI(sound: keyof typeof AUDIO_PATHS.ui): Promise<void> {
    return this.play(AUDIO_PATHS.ui[sound]);
  }
  
  static playCorrect(): Promise<void> {
    return this.play(AUDIO_PATHS.ui.correct);
  }
  
  static playWrong(): Promise<void> {
    return this.play(AUDIO_PATHS.ui.wrong);
  }
  
  // Alternates between celebration and complete sounds
  static playCelebration(): Promise<void> {
    this.celebrationToggle = !this.celebrationToggle;
    if (this.celebrationToggle) {
      return this.play(AUDIO_PATHS.ui.celebration);
    } else {
      return this.play(AUDIO_PATHS.ui.complete);
    }
  }
  
  // Play only celebration (for big wins like completing a group)
  static playBigCelebration(): Promise<void> {
    return this.play(AUDIO_PATHS.ui.celebration);
  }
  
  // Preload audio files for smoother playback
  static preload(paths: string[]): void {
    paths.forEach(path => {
      if (!this.audioCache.has(path)) {
        const audio = new Audio();
        audio.preload = 'auto';
        audio.src = path;
        this.audioCache.set(path, audio);
      }
    });
  }
}

