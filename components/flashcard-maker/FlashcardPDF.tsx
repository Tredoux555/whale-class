'use client';

import { useState } from 'react';

interface ExtractedFrame {
  timestamp: number;
  imageData: string;
  lyric?: string;
}

interface FlashcardPDFProps {
  frames: ExtractedFrame[];
  songTitle: string;
}

export function FlashcardPDF({ frames, songTitle }: FlashcardPDFProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [cardsPerPage, setCardsPerPage] = useState<1 | 2 | 4>(1);
  const [borderColor, setBorderColor] = useState('#06b6d4'); // cyan-500
  const [showTimestamps, setShowTimestamps] = useState(false);

  const generatePDF = async () => {
    setIsGenerating(true);
    
    try {
      const response = await fetch('/api/admin/flashcard-maker/generate-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames,
          songTitle,
          cardsPerPage,
          borderColor,
          showTimestamps
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate PDF');
      }

      // Download the PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${songTitle.replace(/[^a-z0-9]/gi, '_')}_flashcards.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('PDF generation error:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const borderColors = [
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Red', value: '#ef4444' },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">📄 Generate PDF</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Cards Per Page */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Cards per page
          </label>
          <div className="flex gap-2">
            {[1, 2, 4].map((num) => (
              <button
                key={num}
                onClick={() => setCardsPerPage(num as 1 | 2 | 4)}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all ${
                  cardsPerPage === num
                    ? 'bg-cyan-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {num}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {cardsPerPage === 1 ? 'Full page - best for display' : 
             cardsPerPage === 2 ? 'Half page - good balance' : 
             'Quarter page - saves paper'}
          </p>
        </div>

        {/* Border Color */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Border color
          </label>
          <div className="flex flex-wrap gap-2">
            {borderColors.map((color) => (
              <button
                key={color.value}
                onClick={() => setBorderColor(color.value)}
                className={`w-8 h-8 rounded-full transition-all ${
                  borderColor === color.value 
                    ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
                    : 'hover:scale-105'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              />
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Options
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={showTimestamps}
              onChange={(e) => setShowTimestamps(e.target.checked)}
              className="w-5 h-5 rounded border-gray-300 text-cyan-500 focus:ring-cyan-400"
            />
            <span className="text-sm text-gray-600">Show timestamps on cards</span>
          </label>
        </div>
      </div>

      {/* Preview Card */}
      <div className="mb-6 p-4 bg-gray-50 rounded-xl">
        <p className="text-sm text-gray-500 mb-3">Preview (first card):</p>
        <div className="flex justify-center">
          <div 
            className="bg-white rounded-2xl overflow-hidden shadow-lg max-w-xs"
            style={{ 
              border: `8px solid ${borderColor}`,
              borderRadius: '20px'
            }}
          >
            {frames[0] && (
              <>
                <img
                  src={frames[0].imageData}
                  alt="Preview"
                  className="w-full aspect-video object-cover"
                />
                {frames[0].lyric && (
                  <div className="p-4 text-center">
                    <p className="font-bold text-gray-800 text-lg">
                      {frames[0].lyric}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generatePDF}
        disabled={isGenerating || frames.length === 0}
        className="w-full py-4 px-6 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg text-lg"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Generating PDF...
          </span>
        ) : (
          `📥 Download ${frames.length} Flashcards as PDF`
        )}
      </button>

      <p className="text-center text-sm text-gray-500 mt-3">
        PDF will be formatted for A4 paper, ready to print and laminate
      </p>
    </div>
  );
}



