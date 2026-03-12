// @ts-nocheck
"use client";

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { escapeHtml, sanitizeImageUrl } from '@/lib/sanitize';
import JSZip from 'jszip';
import PhotoBankPicker from '@/components/montree/PhotoBankPicker';

interface FlashCard {
  id: number;
  image: string;
  word: string;
}

const VocabularyFlashcardGenerator = () => {
  const router = useRouter();
  const [cards, setCards] = useState<FlashCard[]>([]);
  const [borderColor, setBorderColor] = useState('#00BCD4');
  const [fontFamily, setFontFamily] = useState('Comic Sans MS');
  const [generating, setGenerating] = useState(false);
  const [dragOverZone, setDragOverZone] = useState(false);
  const [processing, setProcessing] = useState(false);

  // Extract word from filename: "cat.jpg" → "cat", "my-dog.png" → "my dog"
  const wordFromFilename = (filename: string): string => {
    return filename
      .replace(/\.[^/.]+$/, '')    // remove extension
      .replace(/[-_]/g, ' ')       // dashes/underscores → spaces
      .replace(/\d+/g, '')         // remove numbers
      .trim()
      .toLowerCase();
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Process image files — the filename IS the word
  const processImageFiles = async (files: File[]) => {
    setProcessing(true);
    try {
      const imageFiles = files.filter(f => /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(f.name));
      const newCards: FlashCard[] = [];

      for (const file of imageFiles) {
        const word = wordFromFilename(file.name);
        if (!word) continue;
        const imageData = await blobToBase64(file);
        newCards.push({ id: Date.now() + Math.random(), image: imageData, word });
      }

      // Merge: new cards override existing ones with same word
      setCards(prev => {
        const newWords = new Set(newCards.map(c => c.word));
        const kept = prev.filter(c => !newWords.has(c.word));
        return [...kept, ...newCards];
      });
    } catch (err) {
      console.error('Error processing files:', err);
      alert('Error processing files.');
    } finally {
      setProcessing(false);
    }
  };

  // Process ZIP file
  const processZipFile = async (file: File) => {
    setProcessing(true);
    try {
      const zip = await JSZip.loadAsync(file);
      const newCards: FlashCard[] = [];

      const entries: { name: string; file: JSZip.JSZipObject }[] = [];
      zip.forEach((relativePath, zipEntry) => {
        if (!zipEntry.dir && /\.(jpg|jpeg|png|gif|webp|avif)$/i.test(relativePath)) {
          entries.push({ name: relativePath, file: zipEntry });
        }
      });

      for (const { name, file: zipEntry } of entries) {
        const blob = await zipEntry.async('blob');
        const imageData = await blobToBase64(blob);
        const filename = name.split('/').pop() || name;
        const word = wordFromFilename(filename);
        if (!word) continue;
        newCards.push({ id: Date.now() + Math.random(), image: imageData, word });
      }

      setCards(prev => {
        const newWords = new Set(newCards.map(c => c.word));
        const kept = prev.filter(c => !newWords.has(c.word));
        return [...kept, ...newCards];
      });
    } catch (err) {
      console.error('Error processing zip:', err);
      alert('Error processing zip file.');
    } finally {
      setProcessing(false);
    }
  };

  // Read folder entries recursively
  const readFolderEntries = async (entry: FileSystemDirectoryEntry): Promise<File[]> => {
    const files: File[] = [];
    const reader = entry.createReader();

    const readEntries = (): Promise<FileSystemEntry[]> =>
      new Promise((resolve, reject) => reader.readEntries(resolve, reject));
    const getFile = (fe: FileSystemFileEntry): Promise<File> =>
      new Promise((resolve, reject) => fe.file(resolve, reject));

    let entries = await readEntries();
    while (entries.length > 0) {
      for (const e of entries) {
        if (e.isFile) files.push(await getFile(e as FileSystemFileEntry));
        else if (e.isDirectory) files.push(...await readFolderEntries(e as FileSystemDirectoryEntry));
      }
      entries = await readEntries();
    }
    return files;
  };

  // Main drop handler
  const handleZoneDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverZone(false);

    const items = e.dataTransfer.items;
    const files = e.dataTransfer.files;

    // Check for folder
    if (items && items.length > 0) {
      const entry = items[0].webkitGetAsEntry?.();
      if (entry?.isDirectory) {
        setProcessing(true);
        try {
          const folderFiles = await readFolderEntries(entry as FileSystemDirectoryEntry);
          await processImageFiles(folderFiles);
        } catch (err) {
          console.error('Error reading folder:', err);
          alert('Error reading folder.');
          setProcessing(false);
        }
        return;
      }
    }

    // ZIP or image files
    if (files.length > 0) {
      if (files[0].name.endsWith('.zip')) {
        processZipFile(files[0]);
      } else {
        await processImageFiles(Array.from(files));
      }
    }
  }, []);

  // Folder picker
  const handleFolderSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImageFiles(Array.from(files));
    e.target.value = '';
  };

  // Multi-file picker
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    await processImageFiles(Array.from(files));
    e.target.value = '';
  };

  const removeCard = (word: string) => {
    setCards(prev => prev.filter(c => c.word !== word));
  };

  const generatePrintableSheet = async () => {
    if (cards.length === 0) return;
    setGenerating(true);

    try {
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Please allow pop-ups to print');
        setGenerating(false);
        return;
      }

      let html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Vocabulary Flashcards</title>
<style>
  @page { size: A4 landscape; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 100%; height: 100%; }
  body { font-family: system-ui, sans-serif; background: white; }
  .page {
    width: 297mm; height: 210mm; padding: 5mm;
    page-break-after: always; page-break-inside: avoid;
  }
  .page:last-child { page-break-after: auto; }
  .card {
    background: ${borderColor}; border-radius: 10mm; padding: 8mm;
    width: 100%; height: 100%; display: flex; flex-direction: column;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .image-area {
    background: white; border-radius: 8mm; flex: 1;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden; margin-bottom: 8mm;
  }
  .image-area img { width: 100%; height: 100%; object-fit: cover; }
  .label-area {
    background: white; border-radius: 8mm; height: 40mm;
    display: flex; align-items: center; justify-content: center;
    font-family: "${fontFamily}", cursive; font-size: 72pt; font-weight: bold;
  }
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  @media screen { body { padding: 20px; background: #f0f0f0; } .page { background: white; margin: 0 auto 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); } }
</style></head><body>`;

      for (const card of cards) {
        html += `<div class="page"><div class="card"><div class="image-area"><img src="${sanitizeImageUrl(card.image)}" alt="${escapeHtml(card.word)}"></div><div class="label-area">${escapeHtml(card.word)}</div></div></div>`;
      }

      html += `<script>window.onload = function() { setTimeout(() => window.print(), 500); };</script></body></html>`;
      printWindow.document.write(html);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating flashcards:', error);
      alert('Error generating flashcards.');
    }
    setGenerating(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-blue-50">
      {/* Sticky header */}
      <div className="bg-white border-b border-cyan-200 px-6 py-4 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => router.back()} className="text-cyan-600 hover:text-cyan-800">← Back</button>
            <h1 className="text-2xl font-bold text-gray-800">Vocabulary Flashcard Maker</h1>
          </div>
          {cards.length > 0 && (
            <button
              onClick={generatePrintableSheet}
              disabled={generating}
              className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white px-6 py-2 rounded-lg font-medium"
            >
              {generating ? 'Generating...' : `Print ${cards.length} Cards`}
            </button>
          )}
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6">
        {/* Drop zone — always visible */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOverZone(true); }}
          onDragLeave={() => setDragOverZone(false)}
          onDrop={handleZoneDrop}
          className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all ${
            dragOverZone ? 'border-cyan-500 bg-cyan-50 scale-[1.01]' : 'border-gray-300 bg-white hover:border-cyan-300'
          }`}
        >
          {processing ? (
            <div className="flex items-center justify-center gap-3 py-4">
              <div className="animate-spin text-2xl">⏳</div>
              <span className="text-gray-600 font-medium">Processing images...</span>
            </div>
          ) : (
            <>
              <p className="text-4xl mb-3">📂</p>
              <p className="font-bold text-gray-800 text-lg">Drop your image folder here</p>
              <p className="text-gray-500 mt-2">
                The filename becomes the word: <span className="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">cat.jpg</span> → flashcard for <strong>&quot;cat&quot;</strong>
              </p>
              <div className="flex gap-3 justify-center mt-5">
                <label className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg cursor-pointer font-medium text-sm transition-colors">
                  Choose Folder
                  <input
                    type="file"
                    webkitdirectory="true"
                    directory="true"
                    multiple
                    className="hidden"
                    onChange={handleFolderSelect}
                  />
                </label>
                <label className="px-5 py-2.5 bg-white border border-gray-300 hover:border-cyan-400 text-gray-700 rounded-lg cursor-pointer font-medium text-sm transition-colors">
                  Choose Files
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                </label>
              </div>
              <p className="text-xs text-gray-400 mt-3">Also accepts ZIP files</p>
            </>
          )}
        </div>

        {/* Photo Bank Section */}
        <div className="bg-white rounded-2xl border border-cyan-200 shadow-sm p-5 mt-4">
          <h3 className="text-lg font-bold text-gray-800 mb-1">📸 Or pick from the Photo Bank</h3>
          <p className="text-sm text-gray-500 mb-3">Search and click photos to add them as flashcards</p>
          <PhotoBankPicker
            onSelectPhoto={(dataUrl, label) => {
              setCards(prev => {
                const existing = prev.find(c => c.word === label.toLowerCase());
                if (existing) return prev;
                return [...prev, {
                  id: Date.now() + Math.random(),
                  image: dataUrl,
                  word: label.toLowerCase(),
                }];
              });
            }}
            maxHeight={300}
            showCategories={true}
            searchPlaceholder="Search photo bank... (e.g. &quot;cat&quot;, &quot;apple&quot;)"
          />
        </div>

        {/* Cards */}
        {cards.length > 0 && (
          <>
            {/* Card style */}
            <div className="bg-white rounded-xl shadow-sm border border-cyan-200 p-4 mt-6 mb-6">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Border Color</label>
                  <div className="flex gap-2">
                    {['#00BCD4', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#2196F3'].map(color => (
                      <button
                        key={color}
                        onClick={() => setBorderColor(color)}
                        className={`w-8 h-8 rounded-full border-2 transition-transform ${borderColor === color ? 'border-gray-800 scale-110' : 'border-transparent'}`}
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
                    className="border border-gray-300 rounded-lg px-3 py-1.5"
                  >
                    <option value="Comic Sans MS">Comic Sans</option>
                    <option value="Arial">Arial</option>
                    <option value="Georgia">Georgia</option>
                  </select>
                </div>
                <div className="ml-auto text-sm text-gray-500">
                  {cards.length} flashcard{cards.length !== 1 ? 's' : ''} ready
                </div>
              </div>
            </div>

            {/* Preview grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {cards.map((card) => (
                <div key={card.word} className="relative rounded-xl overflow-hidden ring-1 ring-gray-200 shadow-sm bg-white">
                  <div className="aspect-square">
                    <img src={card.image} alt={card.word} className="w-full h-full object-cover" />
                  </div>
                  <div
                    className="py-2 text-center font-bold text-white text-sm"
                    style={{ backgroundColor: borderColor }}
                  >
                    {card.word}
                  </div>
                  <button
                    onClick={() => removeCard(card.word)}
                    className="absolute top-1.5 right-1.5 bg-black/50 hover:bg-red-500 text-white w-6 h-6 rounded-full text-xs flex items-center justify-center transition-colors"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {/* Print button */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={generatePrintableSheet}
                disabled={generating}
                className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-400 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                {generating ? 'Generating...' : `Generate ${cards.length} Flashcards`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default VocabularyFlashcardGenerator;
