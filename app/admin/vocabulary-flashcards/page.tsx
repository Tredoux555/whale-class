"use client";

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import JSZip from 'jszip';
import { CIRCLE_TIME_CURRICULUM } from '@/lib/circle-time/curriculum-data';

interface FlashCard {
  id: number;
  image: string;
  word: string;
}

const VocabularyFlashcardGenerator = () => {
  const [selectedWeek, setSelectedWeek] = useState<number>(17);
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [borderColor, setBorderColor] = useState('#00BCD4');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [generating, setGenerating] = useState(false);
  const [dragOverWord, setDragOverWord] = useState<string | null>(null);
  const [dragOverZone, setDragOverZone] = useState(false);
  const [processingZip, setProcessingZip] = useState(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);

  const plan = CIRCLE_TIME_CURRICULUM.find(p => p.week === selectedWeek);
  const vocabulary = plan?.vocabulary || [];

  // Match filename to vocabulary word
  const matchFilenameToWord = (filename: string): string | null => {
    const wordFromFile = filename
      .replace(/\.[^/.]+$/, '') // Remove extension
      .replace(/[-_]/g, ' ')    // Replace dashes/underscores with spaces
      .replace(/\d+/g, '')      // Remove numbers
      .trim()
      .toLowerCase();

    return vocabulary.find(v => {
      const vocabLower = v.toLowerCase();
      const fileLower = wordFromFile.toLowerCase();
      return vocabLower === fileLower || 
             vocabLower.includes(fileLower) || 
             fileLower.includes(vocabLower);
    }) || null;
  };

  // Process multiple image files (from folder or file input)
  const processImageFiles = async (files: File[]) => {
    setProcessingZip(true);
    try {
      const newCards: FlashCard[] = [];
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp)$/i.test(f.name));

      for (const file of imageFiles) {
        const imageData = await blobToBase64(file);
        const matchedWord = matchFilenameToWord(file.name);

        if (matchedWord) {
          newCards.push({
            id: Date.now() + Math.random(),
            image: imageData,
            word: matchedWord
          });
        }
      }

      // Merge with existing cards (new ones override)
      setCards(prev => {
        const existingWords = new Set(newCards.map(c => c.word));
        const kept = prev.filter(c => !existingWords.has(c.word));
        return [...kept, ...newCards];
      });

      const matched = newCards.length;
      const total = imageFiles.length;
      if (matched === 0 && total > 0) {
        alert(`No matches found. Make sure image filenames match vocabulary words.\n\nExample: winter.jpg → "winter"`);
      } else if (matched < total) {
        alert(`Matched ${matched} of ${total} images to vocabulary words.`);
      }
    } catch (err) {
      console.error('Error processing files:', err);
      alert('Error processing files.');
    } finally {
      setProcessingZip(false);
    }
  };

  // Process ZIP file - match images to vocabulary words
  const processZipFile = async (file: File) => {
    setProcessingZip(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const newCards: FlashCard[] = [];
      
      // Get all image files from zip
      const imageFiles: { name: string; file: JSZip.JSZipObject }[] = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(jpg|jpeg|png|gif|webp)$/i.test(relativePath)) {
          imageFiles.push({ name: relativePath, file: zipEntry });
        }
      });

      // Process each image
      for (const { name, file: zipEntry } of imageFiles) {
        const blob = await zipEntry.async('blob');
        const imageData = await blobToBase64(blob);
        const filename = name.split('/').pop() || name;
        const matchedWord = matchFilenameToWord(filename);

        if (matchedWord) {
          newCards.push({
            id: Date.now() + Math.random(),
            image: imageData,
            word: matchedWord
          });
        }
      }

      // Merge with existing cards (new ones override)
      setCards(prev => {
        const existingWords = new Set(newCards.map(c => c.word));
        const kept = prev.filter(c => !existingWords.has(c.word));
        return [...kept, ...newCards];
      });

      const matched = newCards.length;
      const total = imageFiles.length;
      if (matched < total) {
        alert(`Matched ${matched} of ${total} images to vocabulary words.\n\nUnmatched files may have different names than the vocabulary words.`);
      }
    } catch (err) {
      console.error('Error processing zip:', err);
      alert('Error processing zip file. Make sure it contains images.');
    } finally {
      setProcessingZip(false);
    }
  };

  // Read all files from a dropped folder
  const readFolderEntries = async (entry: FileSystemDirectoryEntry): Promise<File[]> => {
    const files: File[] = [];
    const reader = entry.createReader();
    
    const readEntries = (): Promise<FileSystemEntry[]> => {
      return new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });
    };

    const getFile = (fileEntry: FileSystemFileEntry): Promise<File> => {
      return new Promise((resolve, reject) => {
        fileEntry.file(resolve, reject);
      });
    };

    let entries = await readEntries();
    while (entries.length > 0) {
      for (const e of entries) {
        if (e.isFile) {
          const file = await getFile(e as FileSystemFileEntry);
          files.push(file);
        } else if (e.isDirectory) {
          const subFiles = await readFolderEntries(e as FileSystemDirectoryEntry);
          files.push(...subFiles);
        }
      }
      entries = await readEntries();
    }
    return files;
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Handle file upload for a specific word
  const handleFileUpload = (word: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setCards(prev => {
        const filtered = prev.filter(c => c.word !== word);
        return [...filtered, { id: Date.now(), image: imageData, word }];
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle drag and drop for individual word
  const handleDrop = useCallback((word: string, e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverWord(null);
    
    const file = e.dataTransfer.files[0];
    if (!file || !file.type.startsWith('image/')) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setCards(prev => {
        const filtered = prev.filter(c => c.word !== word);
        return [...filtered, { id: Date.now(), image: imageData, word }];
      });
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle folder or ZIP drop on the main zone
  const handleZoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverZone(false);
    
    const items = e.dataTransfer.items;
    const files = e.dataTransfer.files;

    // Check if it's a folder drop (using webkitGetAsEntry)
    if (items && items.length > 0) {
      const firstItem = items[0];
      const entry = firstItem.webkitGetAsEntry?.();
      
      if (entry?.isDirectory) {
        // It's a folder!
        setProcessingZip(true);
        try {
          const folderFiles = await readFolderEntries(entry as FileSystemDirectoryEntry);
          await processImageFiles(folderFiles);
        } catch (err) {
          console.error('Error reading folder:', err);
          alert('Error reading folder. Try using the Choose Folder button instead.');
          setProcessingZip(false);
        }
        return;
      }
    }

    // Check for ZIP or multiple files
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.zip')) {
        processZipFile(file);
      } else if (files.length > 1 || file.type.startsWith('image/')) {
        // Multiple files or single image
        const fileArray = Array.from(files);
        await processImageFiles(fileArray);
      }
    }
  }, [vocabulary]);

  // Handle folder selection via input
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImageFiles(Array.from(files));
    e.target.value = '';
  };

  const removeCard = (word: string) => {
    setCards(prev => prev.filter(c => c.word !== word));
  };

  // Handle paste from clipboard
  const handlePaste = useCallback(async (word: string) => {
    try {
      const clipboardItems = await navigator.clipboard.read();
      for (const item of clipboardItems) {
        // Check for image types
        const imageType = item.types.find(type => type.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const reader = new FileReader();
          reader.onload = (event) => {
            const imageData = event.target?.result as string;
            setCards(prev => {
              const filtered = prev.filter(c => c.word !== word);
              return [...filtered, { id: Date.now(), image: imageData, word }];
            });
          };
          reader.readAsDataURL(blob);
          return;
        }
      }
      // No image found in clipboard
      alert('No image found in clipboard. Copy an image first!');
    } catch (err) {
      console.error('Paste error:', err);
      alert('Could not paste. Make sure you copied an image (not just the URL).');
    }
  }, []);

  // Global keyboard listener for paste
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && selectedWord) {
        e.preventDefault();
        handlePaste(selectedWord);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedWord, handlePaste]);

  const getCardForWord = (word: string) => cards.find(c => c.word === word);

  const generatePrintableSheet = async () => {
    const cardsWithImages = cards.filter(c => c.image);
    if (cardsWithImages.length === 0) {
      alert('Please add images to at least one vocabulary word!');
      return;
    }

    setGenerating(true);

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to use the print feature');
        setGenerating(false);
        return;
      }

      const currentBorderColor = borderColor;
      const currentFontFamily = fontFamily;

      let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vocabulary Flashcards - Week ${selectedWeek}</title>
  <style>
    @page { size: A4 landscape; margin: 0.5cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; }
    body { font-family: system-ui, sans-serif; background: white; }
    .page {
      width: 29.7cm;
      height: 21cm;
      padding: 0.5cm;
      display: block;
    }
    .page:nth-child(odd) { page-break-after: always; }
    .page:last-child { page-break-after: auto; }
    .card {
      background: ${currentBorderColor};
      border-radius: 1cm;
      padding: 0.8cm;
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .image-area {
      background: white;
      border-radius: 0.8cm;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-bottom: 0.8cm;
    }
    .image-area img { 
      width: 100%; 
      height: 100%; 
      object-fit: cover;
    }
    .label-area {
      background: white;
      border-radius: 0.8cm;
      height: 4cm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "${currentFontFamily}", cursive;
      font-size: 72pt;
      font-weight: bold;
    }
    @media print {
      html, body { width: 29.7cm; height: 21cm; }
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page { break-after: page; break-inside: avoid; }
    }
    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; margin: 0 auto 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
`;

      for (const card of cardsWithImages) {
        html += `<div class="page"><div class="card"><div class="image-area"><img src="${card.image}" alt="${card.word}"></div><div class="label-area">${card.word.toLowerCase()}</div></div></div>`;
      }

      html += `
  <script>window.onload = function() { setTimeout(() => window.print(), 500); };</script>
</body>
</html>
`;

      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Error generating flashcards. Please try again.');
    }

    setGenerating(false);
  };

  const readyCount = cards.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-blue-50">
      <div className="bg-white border-b border-cyan-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-cyan-600 hover:text-cyan-800">
              ← Back
            </Link>
            <h1 className="text-2xl font-bold text-gray-800">🃏 Vocabulary Flashcard Maker</h1>
          </div>
          {readyCount > 0 && (
            <button
              onClick={generatePrintableSheet}
              disabled={generating}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {generating ? '⏳ Generating...' : `🖨️ Print ${readyCount} Cards`}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Week Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">📅 Select Week</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CIRCLE_TIME_CURRICULUM.slice(0, 20).map((week) => (
              <button
                key={week.week}
                onClick={() => { setSelectedWeek(week.week); setCards([]); }}
                className={`px-3 py-2 rounded-lg whitespace-nowrap transition-all text-sm flex items-center gap-1 ${
                  selectedWeek === week.week ? 'text-white shadow-lg' : 'bg-gray-100 text-gray-700 hover:bg-cyan-100'
                }`}
                style={selectedWeek === week.week ? { backgroundColor: week.color } : {}}
              >
                {week.icon} W{week.week}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Display */}
        {plan && (
          <div className="rounded-xl p-4 mb-6 text-white" style={{ backgroundColor: plan.color }}>
            <div className="flex items-center gap-3">
              <span className="text-4xl">{plan.icon}</span>
              <div>
                <h2 className="text-xl font-bold">Week {plan.week}: {plan.theme}</h2>
                <p className="opacity-90 text-sm">{vocabulary.length} vocabulary words</p>
              </div>
            </div>
          </div>
        )}

        {/* Copyable Word List */}
        <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">📝 Word List (click to copy)</h2>
          <div className="flex flex-wrap gap-2">
            {vocabulary.map((word) => (
              <button
                key={word}
                onClick={() => {
                  navigator.clipboard.writeText(word);
                  const el = document.getElementById(`word-${word}`);
                  if (el) {
                    el.textContent = '✓ copied';
                    setTimeout(() => { el.textContent = word; }, 1000);
                  }
                }}
                className="px-3 py-1 bg-gray-100 hover:bg-cyan-100 rounded-lg text-sm font-medium text-gray-700 transition-all"
              >
                <span id={`word-${word}`}>{word}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">Click a word → paste into Google Images → copy image → click card below → ⌘V</p>
        </div>

        {/* Folder/ZIP Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverZone(true); }}
          onDragLeave={() => setDragOverZone(false)}
          onDrop={handleZoneDrop}
          className={`mb-6 border-2 border-dashed rounded-xl p-6 text-center transition-all ${
            dragOverZone 
              ? 'border-cyan-500 bg-cyan-50' 
              : 'border-gray-300 bg-white hover:border-cyan-300'
          }`}
        >
          {processingZip ? (
            <div className="flex items-center justify-center gap-3">
              <div className="animate-spin text-2xl">⏳</div>
              <span className="text-gray-600">Processing images...</span>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-2">📁</div>
              <p className="font-semibold text-gray-700">Drop a folder with images here</p>
              <p className="text-sm text-gray-500 mt-1">
                Name images like vocabulary words (e.g., winter.jpg → "winter")
              </p>
              <label className="inline-block mt-3 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg cursor-pointer font-medium">
                📂 Choose Folder
                <input
                  type="file"
                  // @ts-expect-error - webkitdirectory is valid but not in React types
                  webkitdirectory="true"
                  directory="true"
                  multiple
                  className="hidden"
                  onChange={handleFolderSelect}
                />
              </label>
              <p className="text-xs text-gray-400 mt-2">
                Also accepts ZIP files or multiple images
              </p>
            </>
          )}
        </div>

        {/* Settings */}
        <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">⚙️ Card Style</h2>
          <div className="flex flex-wrap gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">Border Color</label>
              <div className="flex gap-2">
                {['#00BCD4', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#2196F3'].map(color => (
                  <button
                    key={color}
                    onClick={() => setBorderColor(color)}
                    className={`w-8 h-8 rounded-full border-2 ${borderColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Font</label>
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1"
              >
                <option value="Comic Sans MS">Comic Sans</option>
                <option value="Arial">Arial</option>
                <option value="Georgia">Georgia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vocabulary Grid */}
        <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">📇 Vocabulary Words</h2>
            <span className="text-sm text-gray-500">{readyCount} of {vocabulary.length} ready</span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4">
            Drop a ZIP above to auto-fill, or <strong>click a card → copy image from web → ⌘V to paste</strong>
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {vocabulary.map((word) => {
              const card = getCardForWord(word);
              const isDragOver = dragOverWord === word;
              
              return (
                <div
                  key={word}
                  tabIndex={0}
                  className={`relative rounded-xl overflow-hidden transition-all cursor-pointer ${
                    card ? 'ring-2 ring-green-500' : selectedWord === word ? 'ring-2 ring-blue-500 bg-blue-50' : isDragOver ? 'ring-2 ring-cyan-500 bg-cyan-50' : 'ring-1 ring-gray-200 hover:ring-cyan-300'
                  }`}
                  style={{ aspectRatio: '1' }}
                  onClick={() => setSelectedWord(word)}
                  onFocus={() => setSelectedWord(word)}
                  onDragOver={(e) => { e.preventDefault(); setDragOverWord(word); }}
                  onDragLeave={() => setDragOverWord(null)}
                  onDrop={(e) => handleDrop(word, e)}
                >
                  {card ? (
                    <>
                      <img src={card.image} alt={word} className="w-full h-full object-cover" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCard(word); }}
                        className="absolute top-1 right-1 bg-red-500 text-white w-6 h-6 rounded-full text-sm hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </>
                  ) : (
                    <div className={`w-full h-full flex flex-col items-center justify-center ${selectedWord === word ? 'bg-blue-50' : 'bg-gray-50 hover:bg-cyan-50'}`}>
                      <span className="text-3xl mb-1">{selectedWord === word ? '📋' : '📷'}</span>
                      <span className="text-xs text-gray-500 text-center px-2">
                        {selectedWord === word ? 'Press ⌘V to paste' : 'Click then paste'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        id={`file-${word}`}
                        onChange={(e) => handleFileUpload(word, e)}
                      />
                    </div>
                  )}
                  
                  <div 
                    className="absolute bottom-0 left-0 right-0 py-2 text-center font-bold text-white text-sm lowercase"
                    style={{ backgroundColor: borderColor }}
                  >
                    {word}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        {readyCount > 0 && (
          <div className="mt-6 flex justify-center">
            <button
              onClick={generatePrintableSheet}
              disabled={generating}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg flex items-center gap-2"
            >
              {generating ? <>⏳ Generating...</> : <>🎴 Generate {readyCount} Flashcards</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VocabularyFlashcardGenerator;
