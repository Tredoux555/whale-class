// app/games/sound-games/segmenting/page.tsx
// Sound Segmenting Game - ElevenLabs audio only
// FIXED: Better audio handling and immediate playback

'use client';

import React, { useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { CVC_WORDS, type CVCWord } from '@/lib/sound-games/sound-games-data';
import { soundGameAudio, getRandomPhrase, CORRECT_PHRASES, ENCOURAGEMENT_PHRASES } from '@/lib/sound-games/sound-utils';

type GameState = 'intro' | 'playing' | 'feedback' | 'complete';

export default function SoundSegmentingGame() {
  const [gameState, setGameState] = useState<GameState>('intro');
  const [currentWord, setCurrentWord] = useState<CVCWord | null>(null);
  const [tappedSounds, setTappedSounds] = useState<number[]>([]);
  const [score, setScore] = useState(0);
  const [roundsPlayed, setRoundsPlayed] = useState(0);
  const [totalRounds] = useState(10);
  const [feedback, setFeedback] = useState<{ correct: boolean; message: string } | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const getRandomWord = useCallback((): CVCWord => {
    return CVC_WORDS[Math.floor(Math.random() * CVC_WORDS.length)];
  }, []);

  // Simple audio play function
  const playAudio = async (path: string): Promise<void> => {
    return new Promise((resolve) => {
      try {
        if (audioRef.current) {
          audioRef.current.pause();
          audioRef.current.currentTime = 0;
        }
        
        const audio = new Audio(path);
        audioRef.current = audio;
        
        audio.onended = () => resolve();
        audio.onerror = (e) => {
          console.warn('Audio error:', path, e);
          resolve();
        };
        
        audio.play().catch((err) => {
          console.warn('Audio play failed:', path, err);
          resolve();
        });
      } catch (e) {
        console.warn('Audio exception:', e);
        resolve();
      }
    });
  };

  // Play sounds slowly
  const playSoundsSlowly = async (sounds: string[], delayMs: number = 400) => {
    for (let i = 0; i < sounds.length; i++) {
      await playAudio(`/audio-new/letters/${sounds[i].toLowerCase()}.mp3`);
      if (i < sounds.length - 1) {
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  };

  const playWord = async (word: CVCWord) => {
    setIsPlaying(true);
    await soundGameAudio.playWord(word.word);
    setIsPlaying(false);
  };

  const startGame = async () => {
    const firstWord = getRandomWord();
    
    setGameState('playing');
    setScore(0);
    setRoundsPlayed(0);
    setCurrentWord(firstWord);
    setTappedSounds([]);
    setShowHint(false);

    // Play immediately on user click
    await playWord(firstWord);
  };

  // Handle circle tap - play the sound for that position
  const handleCircleTap = async (index: number) => {
    if (gameState !== 'playing' || isPlaying || !currentWord) return;
    if (tappedSounds.includes(index)) return;

    const newTapped = [...tappedSounds, index];
    setTappedSounds(newTapped);

    // Play the sound for this tap position
    setIsPlaying(true);
    const soundIndex = newTapped.length - 1;
    if (soundIndex < currentWord.sounds.length) {
      await playAudio(`/audio-new/letters/${currentWord.sounds[soundIndex].toLowerCase()}.mp3`);
    } else {
      // Extra tap beyond the word length
      await soundGameAudio.playWrong();
    }
    setIsPlaying(false);
  };

  // Check the answer when user clicks Check
  const checkAnswer = async (tappedCount: number) => {
    if (!currentWord) return;

    const correctCount = currentWord.sounds.length;
    const isCorrect = tappedCount === correctCount;

    if (isCorrect) {
      setScore((prev) => prev + 1);
      setFeedback({ correct: true, message: getRandomPhrase(CORRECT_PHRASES) });
      await soundGameAudio.playCorrect();

      // Play the segmented sounds
      setTimeout(async () => {
        await playSoundsSlowly(currentWord.sounds, 400);
      }, 500);

      setGameState('feedback');

      setTimeout(async () => {
        const newRoundsPlayed = roundsPlayed + 1;
        setRoundsPlayed(newRoundsPlayed);

        if (newRoundsPlayed >= totalRounds) {
          setGameState('complete');
          soundGameAudio.playCelebration();
        } else {
          setFeedback(null);
          setGameState('playing');
          setTappedSounds([]);
          setShowHint(false);
          const nextWord = getRandomWord();
          setCurrentWord(nextWord);
          await playWord(nextWord);
        }
      }, 2500);
    } else {
      // WRONG ANSWER
      setFeedback({ 
        correct: false, 
        message: `${getRandomPhrase(ENCOURAGEMENT_PHRASES)} This word has ${correctCount} sounds.`
      });
      await soundGameAudio.playWrong();

      // Show the correct segmentation
      setTimeout(async () => {
        await playSoundsSlowly(currentWord.sounds, 400);
      }, 1000);

      // Reset after showing correct
      setTimeout(() => {
        setFeedback(null);
        setTappedSounds([]);
        setShowHint(true);
      }, 3000);
    }
  };

  const handleReplay = async () => {
    if (currentWord && !isPlaying) {
      await playWord(currentWord);
    }
  };

  const resetTaps = () => {
    setTappedSounds([]);
  };

  // Intro Screen
  if (gameState === 'intro') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 flex items-center justify-center">
        <div className="text-center p-8 max-w-md">
          <div className="text-8xl mb-6">✂️</div>
          <h1 className="text-4xl font-bold text-white mb-4" >Sound Segmenting</h1>
          <p className="text-xl text-white/90 mb-6">Break words into their sounds! Tap once for each sound you hear.</p>

          <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-8">
            <p className="text-white"><strong>Example:</strong><br />"cat" → tap tap tap (3 sounds: /c/ /a/ /t/)</p>
          </div>

          <button onClick={startGame} className="w-full p-4 bg-white text-rose-600 rounded-2xl font-bold text-xl" >
            Start Segmenting! 🎮
          </button>

          <Link href="/montree/games/sound-games" className="block mt-4 text-white/70 hover:text-white">← Back to Sound Games</Link>
        </div>
      </div>
    );
  }

  // Complete Screen
  if (gameState === 'complete') {
    const percentage = Math.round((score / totalRounds) * 100);
    const emoji = percentage >= 80 ? '🌟' : percentage >= 60 ? '⭐' : '👍';

    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-red-500 flex items-center justify-center">
        <div className="text-center p-8">
          <div className="text-9xl mb-6 animate-bounce">{emoji}</div>
          <h1 className="text-4xl font-bold text-white mb-4" >Sound Slicer!</h1>
          <p className="text-2xl text-white/90 mb-8">Score: <span className="font-bold text-yellow-300">{score}</span>/{totalRounds}</p>

          <div className="space-y-4">
            <button onClick={startGame} className="w-full max-w-sm mx-auto p-4 bg-white text-rose-600 rounded-2xl font-bold text-xl">Play Again! 🔄</button>
            <Link href="/montree/games/sound-games" className="block w-full max-w-sm mx-auto p-4 bg-white/20 text-white rounded-2xl font-bold text-xl">Back to Sound Games</Link>
          </div>
        </div>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-500 via-rose-500 to-red-500">
      <header className="p-4 flex items-center justify-between">
        <Link href="/montree/games/sound-games" className="text-white/80 text-2xl">←</Link>
        <div className="bg-white/20 rounded-full px-4 py-2">
          <span className="text-white font-bold">⭐ {score}/{totalRounds}</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white/20 backdrop-blur-sm rounded-3xl p-8 mb-8 text-center">
          <p className="text-xl text-white mb-4" >
            How many sounds in this word?
          </p>

          <div className="text-9xl mb-4">{currentWord?.image}</div>

          <button onClick={handleReplay} disabled={isPlaying} className={`px-6 py-3 bg-white/30 rounded-full text-white font-bold ${isPlaying ? 'animate-pulse' : 'hover:bg-white/40'}`}>
            {isPlaying ? '🔊 Listening...' : '🔊 Hear Again'}
          </button>
          
          {/* Debug info */}
          {currentWord && (
            <p className="text-white/50 text-xs mt-2">
              Word: {currentWord.word} | Sounds: {currentWord.sounds.length}
            </p>
          )}
        </div>

        {/* Hint after wrong answer */}
        {showHint && currentWord && (
          <div className="bg-yellow-400 text-yellow-900 rounded-xl p-3 mb-4 text-center">
            <span className="font-bold">💡 Hint:</span> "{currentWord.word}" has {currentWord.sounds.length} sounds!
          </div>
        )}

        {/* Tapping circles */}
        <div className="bg-white/10 rounded-2xl p-6 mb-6">
          <p className="text-white text-center mb-4">Tap a circle for each sound you hear:</p>
          <div className="flex justify-center gap-3 flex-wrap">
            {[0, 1, 2, 3, 4].map((index) => (
              <button
                key={index}
                onClick={() => handleCircleTap(index)}
                disabled={tappedSounds.includes(index) || gameState !== 'playing'}
                className={`
                  w-16 h-16 rounded-full border-4 transition-all transform
                  ${tappedSounds.includes(index) 
                    ? 'bg-yellow-400 border-yellow-300 scale-90' 
                    : 'bg-white/30 border-white/50 hover:scale-110 hover:bg-white/50'}
                `}
              >
                {tappedSounds.includes(index) && <span className="text-2xl">✓</span>}
              </button>
            ))}
          </div>
          <p className="text-white/70 text-center mt-4">Tapped: {tappedSounds.length} sounds</p>
        </div>

        {/* Check button */}
        <div className="flex justify-center gap-4 mb-6">
          <button
            onClick={resetTaps}
            disabled={tappedSounds.length === 0 || gameState !== 'playing'}
            className="px-6 py-3 bg-white/20 text-white rounded-xl font-bold hover:bg-white/30 disabled:opacity-50"
          >
            ↩️ Reset
          </button>
          <button
            onClick={() => checkAnswer(tappedSounds.length)}
            disabled={tappedSounds.length === 0 || gameState !== 'playing'}
            className="px-8 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 disabled:opacity-50"
          >
            ✓ Check Answer
          </button>
        </div>

        {feedback && (
          <div className={`p-4 rounded-2xl text-center text-xl font-bold ${feedback.correct ? 'bg-green-400 text-green-900' : 'bg-yellow-400 text-yellow-900'}`} >
            {feedback.message}
          </div>
        )}

        <div className="mt-8">
          <div className="h-3 bg-white/20 rounded-full overflow-hidden">
            <div className="h-full bg-white transition-all" style={{ width: `${(roundsPlayed / totalRounds) * 100}%` }} />
          </div>
        </div>
      </main>
    </div>
  );
}
