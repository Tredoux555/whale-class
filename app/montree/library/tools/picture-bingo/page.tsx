// /montree/library/tools/picture-bingo/page.tsx
'use client';

import Link from 'next/link';

export default function PictureBingoPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white">
      <header className="bg-[#0D3330] text-white px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <Link href="/montree/library/tools" className="text-emerald-300 text-sm hover:underline">
            ← Back to Tools
          </Link>
          <h1 className="text-2xl font-bold mt-2">Picture Bingo Generator</h1>
          <p className="text-emerald-200 mt-1">Real photos on front, words on back — duplex print ready</p>
        </div>
      </header>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
          <p className="text-gray-600 mb-2">
            Generates bingo boards using real CVC word photos from your picture library.
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Each board prints as two pages — pictures on front, words on back. Set your printer to duplex (flip on short edge) and the words will line up perfectly behind each picture.
          </p>
          <a
            href="/tools/picture-bingo-generator.html"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-8 py-3 bg-[#0D3330] text-white font-bold rounded-xl hover:bg-[#164440] transition-all hover:scale-[1.02]"
          >
            Open Picture Bingo Generator
          </a>
        </div>
      </div>
    </div>
  );
}
