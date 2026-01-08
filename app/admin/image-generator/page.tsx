'use client';

import { useState, useEffect } from 'react';

// ============================================
// COMPLETE SOUND OBJECTS DATA
// ============================================

const BEGINNING_SOUND_OBJECTS = [
  // Phase 1: Easy sounds (exist in Mandarin)
  { sound: 's', phase: 1, objects: ['sun', 'sock', 'soap', 'spoon', 'star', 'snake'] },
  { sound: 'm', phase: 1, objects: ['mop', 'moon', 'mouse', 'map', 'mug', 'mat'] },
  { sound: 'f', phase: 1, objects: ['fan', 'fish', 'fork', 'frog', 'fox', 'feather'] },
  { sound: 'n', phase: 1, objects: ['net', 'nut', 'nail', 'nest', 'nose', 'necklace'] },
  { sound: 'p', phase: 1, objects: ['pen', 'pig', 'pot', 'pin', 'pear', 'pan'] },
  { sound: 't', phase: 1, objects: ['top', 'tent', 'tiger', 'tape', 'tooth', 'toy'] },
  { sound: 'k', phase: 1, objects: ['cup', 'cat', 'car', 'cap', 'can', 'key'] },
  { sound: 'h', phase: 1, objects: ['hat', 'hen', 'horse', 'house', 'hammer', 'hand'] },
  // Phase 2: Medium difficulty
  { sound: 'b', phase: 2, objects: ['ball', 'bat', 'bed', 'bus', 'bug', 'box'] },
  { sound: 'd', phase: 2, objects: ['dog', 'doll', 'duck', 'door', 'drum', 'dish'] },
  { sound: 'g', phase: 2, objects: ['goat', 'gift', 'glass', 'grape', 'guitar', 'gold'] },
  { sound: 'j', phase: 2, objects: ['jet', 'jam', 'jug', 'jar', 'jeep', 'jump rope'] },
  { sound: 'w', phase: 2, objects: ['wig', 'web', 'watch', 'worm', 'wagon', 'wolf'] },
  // Phase 3: Hard sounds (don't exist in Mandarin)
  { sound: 'v', phase: 3, objects: ['van', 'vest', 'vase', 'violin', 'vine', 'vet'] },
  { sound: 'th', phase: 3, objects: ['thumb', 'three', 'think', 'thick', 'thorn', 'thimble'] },
  { sound: 'r', phase: 3, objects: ['ring', 'rug', 'rat', 'rain', 'rabbit', 'rocket'] },
  { sound: 'l', phase: 3, objects: ['leg', 'lamp', 'lid', 'log', 'leaf', 'lemon'] },
  { sound: 'z', phase: 3, objects: ['zip', 'zoo', 'zebra', 'zero', 'zigzag', 'zipper'] },
  // Vowels (short sounds)
  { sound: 'a', phase: 'vowel', objects: ['ant', 'apple', 'ax', 'alligator', 'astronaut', 'anchor'] },
  { sound: 'e', phase: 'vowel', objects: ['egg', 'elf', 'elephant', 'elbow', 'envelope', 'engine'] },
  { sound: 'i', phase: 'vowel', objects: ['igloo', 'insect', 'ink', 'iguana', 'inch', 'infant'] },
  { sound: 'o', phase: 'vowel', objects: ['octopus', 'ox', 'olive', 'otter', 'ostrich', 'orange'] },
  { sound: 'u', phase: 'vowel', objects: ['umbrella', 'umpire', 'unicorn', 'up arrow', 'under', 'utensil'] },
];

const ENDING_SOUND_OBJECTS = [
  { sound: 't', objects: ['cat', 'hat', 'bat', 'pot', 'net'] },
  { sound: 'p', objects: ['cup', 'cap', 'mop', 'map', 'top'] },
  { sound: 'n', objects: ['sun', 'pan', 'can', 'fan', 'pen'] },
  { sound: 'g', objects: ['dog', 'pig', 'bag', 'rug', 'bug'] },
  { sound: 'd', objects: ['bed', 'red', 'lid', 'mud', 'bud'] },
  { sound: 'x', objects: ['box', 'fox', 'six', 'wax', 'mix'] },
  { sound: 'm', objects: ['ham', 'jam', 'gum', 'drum', 'swim'] },
  { sound: 'b', objects: ['crab', 'web', 'tub', 'cab', 'cub'] },
];

const CVC_BY_VOWEL = [
  { vowel: 'a', words: ['cat', 'hat', 'bat', 'map', 'bag', 'pan', 'can', 'jam'] },
  { vowel: 'e', words: ['bed', 'pen', 'hen', 'net', 'web', 'leg', 'red', 'pet'] },
  { vowel: 'i', words: ['pig', 'big', 'wig', 'pin', 'sit', 'hit', 'lip', 'bib'] },
  { vowel: 'o', words: ['dog', 'log', 'pot', 'hot', 'top', 'mop', 'box', 'fox'] },
  { vowel: 'u', words: ['cup', 'pup', 'bus', 'jug', 'mug', 'hug', 'bug', 'tub'] },
];

// Get all unique words
function getAllUniqueWords(): string[] {
  const allWords = new Set<string>();
  
  BEGINNING_SOUND_OBJECTS.forEach(group => {
    group.objects.forEach(obj => allWords.add(obj.toLowerCase()));
  });
  
  ENDING_SOUND_OBJECTS.forEach(group => {
    group.objects.forEach(obj => allWords.add(obj.toLowerCase()));
  });
  
  CVC_BY_VOWEL.forEach(group => {
    group.words.forEach(word => allWords.add(word.toLowerCase()));
  });
  
  return Array.from(allWords).sort();
}

interface GeneratedImage {
  word: string;
  url: string;
  storagePath?: string;
  status: 'pending' | 'generating' | 'success' | 'error';
  error?: string;
}

export default function ImageGeneratorPage() {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'beginning' | 'ending' | 'cvc'>('all');
  const [selectedPhase, setSelectedPhase] = useState<number | 'vowel' | 'all'>('all');
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [generating, setGenerating] = useState(false);
  const [currentWord, setCurrentWord] = useState('');
  const [customWord, setCustomWord] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [stats, setStats] = useState({ total: 0, generated: 0, cost: 0 });

  // Load existing images on mount
  useEffect(() => {
    loadExistingImages();
  }, []);

  async function loadExistingImages() {
    try {
      const res = await fetch('/api/admin/image-generator/list');
      if (res.ok) {
        const data = await res.json();
        setExistingImages(data.images || []);
      }
    } catch (e) {
      console.error('Failed to load existing images:', e);
    }
  }

  function getFilteredWords(): string[] {
    let words: string[] = [];
    
    if (selectedCategory === 'all' || selectedCategory === 'beginning') {
      BEGINNING_SOUND_OBJECTS.forEach(group => {
        if (selectedPhase === 'all' || group.phase === selectedPhase) {
          words.push(...group.objects);
        }
      });
    }
    
    if (selectedCategory === 'all' || selectedCategory === 'ending') {
      ENDING_SOUND_OBJECTS.forEach(group => {
        words.push(...group.objects);
      });
    }
    
    if (selectedCategory === 'all' || selectedCategory === 'cvc') {
      CVC_BY_VOWEL.forEach(group => {
        words.push(...group.words);
      });
    }
    
    // Deduplicate and filter out already generated
    return [...new Set(words.map(w => w.toLowerCase()))]
      .filter(w => !existingImages.includes(w))
      .sort();
  }

  async function generateSingleImage(word: string): Promise<GeneratedImage> {
    setCurrentWord(word);
    
    try {
      const res = await fetch('/api/admin/image-generator/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ word }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        return { word, url: '', status: 'error', error: error.error || error.message };
      }
      
      const data = await res.json();
      return { 
        word, 
        url: data.url, 
        storagePath: data.storagePath, 
        status: 'success' 
      };
    } catch (e: any) {
      return { word, url: '', status: 'error', error: e.message };
    }
  }

  async function generateBatch() {
    const words = getFilteredWords();
    if (words.length === 0) {
      alert('No new images to generate! All words already have images.');
      return;
    }
    
    const confirmMsg = `Generate ${words.length} images?\nEstimated cost: $${(words.length * 0.04).toFixed(2)} - $${(words.length * 0.08).toFixed(2)}`;
    if (!confirm(confirmMsg)) return;
    
    setGenerating(true);
    setStats({ total: words.length, generated: 0, cost: 0 });
    
    const results: GeneratedImage[] = [];
    
    for (const word of words) {
      const result = await generateSingleImage(word);
      results.push(result);
      setImages([...results]);
      
      if (result.status === 'success') {
        setStats(prev => ({ 
          ...prev, 
          generated: prev.generated + 1, 
          cost: prev.cost + 0.04 
        }));
        setExistingImages(prev => [...prev, word]);
      }
      
      // Small delay to avoid rate limits
      await new Promise(r => setTimeout(r, 500));
    }
    
    setGenerating(false);
    setCurrentWord('');
  }

  async function generateCustom() {
    if (!customWord.trim()) return;
    
    setGenerating(true);
    const result = await generateSingleImage(customWord.trim().toLowerCase());
    setImages(prev => [result, ...prev]);
    
    if (result.status === 'success') {
      setExistingImages(prev => [...prev, customWord.trim().toLowerCase()]);
    }
    
    setGenerating(false);
    setCustomWord('');
  }

  const filteredWords = getFilteredWords();
  const allUniqueWords = getAllUniqueWords();

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-2">🎨 DALL-E Image Generator</h1>
        <p className="text-gray-600 mb-6">Generate Montessori-style illustrations for sound games</p>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{allUniqueWords.length}</div>
            <div className="text-gray-500">Total Words</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{existingImages.length}</div>
            <div className="text-gray-500">Generated</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">{allUniqueWords.length - existingImages.length}</div>
            <div className="text-gray-500">Remaining</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">${(existingImages.length * 0.04).toFixed(2)}</div>
            <div className="text-gray-500">Est. Spent</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as any)}
                className="border rounded px-3 py-2"
              >
                <option value="all">All Categories</option>
                <option value="beginning">Beginning Sounds</option>
                <option value="ending">Ending Sounds</option>
                <option value="cvc">CVC Words</option>
              </select>
            </div>

            {selectedCategory === 'beginning' && (
              <div>
                <label className="block text-sm font-medium mb-1">ESL Phase</label>
                <select 
                  value={selectedPhase}
                  onChange={e => setSelectedPhase(e.target.value === 'all' ? 'all' : e.target.value === 'vowel' ? 'vowel' : parseInt(e.target.value))}
                  className="border rounded px-3 py-2"
                >
                  <option value="all">All Phases</option>
                  <option value="1">Phase 1 (Easy)</option>
                  <option value="2">Phase 2 (Medium)</option>
                  <option value="3">Phase 3 (Hard)</option>
                  <option value="vowel">Vowels</option>
                </select>
              </div>
            )}

            <div className="flex-1" />

            <div>
              <label className="block text-sm font-medium mb-1">Custom Word</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customWord}
                  onChange={e => setCustomWord(e.target.value)}
                  placeholder="e.g. helicopter"
                  className="border rounded px-3 py-2 w-40"
                />
                <button
                  onClick={generateCustom}
                  disabled={generating || !customWord.trim()}
                  className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 disabled:opacity-50"
                >
                  Generate
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Batch Generate */}
        <div className="bg-white p-4 rounded-lg shadow mb-6">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-medium">{filteredWords.length} words</span>
              <span className="text-gray-500 ml-2">ready to generate</span>
              {filteredWords.length > 0 && (
                <span className="text-gray-400 ml-2">
                  (Est. ${(filteredWords.length * 0.04).toFixed(2)} - ${(filteredWords.length * 0.08).toFixed(2)})
                </span>
              )}
            </div>
            <button
              onClick={generateBatch}
              disabled={generating || filteredWords.length === 0}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
            >
              {generating ? (
                <>
                  <span className="animate-spin">⏳</span>
                  Generating "{currentWord}"... ({stats.generated}/{stats.total})
                </>
              ) : (
                <>🚀 Generate All</>
              )}
            </button>
          </div>
        </div>

        {/* Word List Preview */}
        {filteredWords.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="font-medium mb-2">Words to Generate:</h3>
            <div className="flex flex-wrap gap-2">
              {filteredWords.slice(0, 50).map(word => (
                <span key={word} className="bg-gray-100 px-2 py-1 rounded text-sm">
                  {word}
                </span>
              ))}
              {filteredWords.length > 50 && (
                <span className="text-gray-400">+{filteredWords.length - 50} more</span>
              )}
            </div>
          </div>
        )}

        {/* Generated Images */}
        {images.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-medium mb-4">Generated Images ({images.filter(i => i.status === 'success').length})</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {images.map((img, idx) => (
                <div key={idx} className="border rounded-lg overflow-hidden">
                  {img.status === 'success' ? (
                    <>
                      <img 
                        src={img.url} 
                        alt={img.word}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="p-2 text-center font-medium">{img.word}</div>
                    </>
                  ) : img.status === 'error' ? (
                    <div className="p-4 text-center">
                      <div className="text-red-500 text-2xl">❌</div>
                      <div className="font-medium">{img.word}</div>
                      <div className="text-xs text-red-400">{img.error}</div>
                    </div>
                  ) : (
                    <div className="p-4 text-center animate-pulse">
                      <div className="text-2xl">⏳</div>
                      <div>{img.word}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Existing Images */}
        {existingImages.length > 0 && (
          <div className="bg-white p-4 rounded-lg shadow mt-6">
            <h3 className="font-medium mb-2">Already Generated ({existingImages.length}):</h3>
            <div className="flex flex-wrap gap-2">
              {existingImages.map(word => (
                <span key={word} className="bg-green-100 text-green-700 px-2 py-1 rounded text-sm">
                  ✓ {word}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
