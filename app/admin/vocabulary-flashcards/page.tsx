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
        
        // Extract word from filename (remove path, extension, numbers)
        const filename = name.split('/').pop() || name;
        const wordFromFile = filename
          .replace(/\.[^/.]+$/, '') // Remove extension
          .replace(/[-_]/g, ' ')    // Replace dashes/underscores with spaces
          .replace(/\d+/g, '')      // Remove numbers
          .trim()
          .toLowerCase();

        // Find matching vocabulary word
        const matchedWord = vocabulary.find(v => {
          const vocabLower = v.toLowerCase();
          const fileLower = wordFromFile.toLowerCase();
          return vocabLower === fileLower || 
                 vocabLower.includes(fileLower) || 
                 fileLower.includes(vocabLower);
        });

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

  // Handle ZIP drop on the main zone
  const handleZoneDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverZone(false);
    
    const file = e.dataTransfer.files[0];
    if (!file) return;

    if (file.name.endsWith('.zip')) {
      processZipFile(file);
    } else if (file.type.startsWith('image/')) {
      // Single image dropped on zone - ignore, they should drop on specific word
      alert('Drop images on specific vocabulary words, or drop a ZIP file here to auto-match all.');
    }
  }, [vocabulary]);

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
      const CARD_WIDTH_CM = 9;
      const CARD_HEIGHT_CM = 9;
      const MARGIN_CM = 1.5;
      const GAP_CM = 0.5;
      const BORDER_RADIUS_CM = 0.5;
      const PADDING_CM = 0.4;

      let html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Vocabulary Flashcards - Week ${selectedWeek}</title>
  <style>
    @page { size: A4; margin: ${MARGIN_CM}cm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: system-ui, sans-serif; background: white; }
    .page {
      page-break-after: always;
      display: grid;
      grid-template-columns: repeat(2, ${CARD_WIDTH_CM}cm);
      grid-template-rows: repeat(3, ${CARD_HEIGHT_CM}cm);
      gap: ${GAP_CM}cm;
      justify-content: center;
      padding-top: 0.5cm;
    }
    .page:last-child { page-break-after: auto; }
    .card {
      background: ${currentBorderColor};
      border-radius: ${BORDER_RADIUS_CM}cm;
      padding: ${PADDING_CM}cm;
      display: flex;
      flex-direction: column;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .image-area {
      background: white;
      border-radius: ${BORDER_RADIUS_CM - 0.1}cm;
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      margin-bottom: ${PADDING_CM}cm;
    }
    .image-area img { max-width: 100%; max-height: 100%; object-fit: contain; }
    .label-area {
      background: white;
      border-radius: ${BORDER_RADIUS_CM - 0.1}cm;
      height: 1.8cm;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: "${currentFontFamily}", cursive;
      font-size: 22pt;
      font-weight: bold;
      text-transform: capitalize;
    }
    .page-title {
      grid-column: span 2;
      text-align: center;
      font-size: 10pt;
      color: #999;
      height: 0.8cm;
    }
    @media print {
      * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
      .page-title { display: none; }
    }
    @media screen {
      body { padding: 20px; background: #f0f0f0; }
      .page { background: white; margin: 0 auto 20px; padding: 1cm; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    }
  </style>
</head>
<body>
`;

      for (let i = 0; i < cardsWithImages.length; i += 6) {
        const pageCards = cardsWithImages.slice(i, i + 6);
        const pageNum = Math.floor(i / 6) + 1;
        
        html += `
          <div class="page">
            <div class="page-title">Week ${selectedWeek}: ${plan?.theme || ''} - Page ${pageNum}</div>
            ${pageCards.map(card => `
              <div class="card">
                <div class="image-area">
                  <img src="${card.image}" alt="${card.word}">
                </div>
                <div class="label-area">${card.word}</div>
              </div>
            `).join('')}
          </div>
        `;
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

        {/* ZIP Drop Zone */}
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
              <span className="text-gray-600">Processing ZIP file...</span>
            </div>
          ) : (
            <>
              <div className="text-4xl mb-2">📦</div>
              <p className="font-semibold text-gray-700">Drop ZIP file here</p>
              <p className="text-sm text-gray-500 mt-1">
                Images named like vocabulary words will auto-match (e.g., winter.jpg → "winter")
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Ask Claude: "Get me pictures for Week {selectedWeek} vocabulary"
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
                    className="absolute bottom-0 left-0 right-0 py-2 text-center font-bold text-white text-sm capitalize"
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
