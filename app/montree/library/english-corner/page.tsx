// /montree/library/english-corner/page.tsx
// English Corner Master Plan - embedded in library
'use client';

import { useRef } from 'react';
import Link from 'next/link';

export default function EnglishCornerPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-[#0D3330] text-white px-4 py-4 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <Link href="/montree/library" className="text-emerald-300 text-sm hover:underline">
              ← Back to Library
            </Link>
            <h1 className="text-xl font-bold mt-1">Montessori English Corner — AMI Master Plan</h1>
          </div>
          <a
            href="/tools/english-corner-master-plan.html"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-medium hover:bg-emerald-600 transition-colors"
          >
            Open Full Page ↗
          </a>
        </div>
      </header>

      {/* Embedded plan */}
      <div className="flex-1">
        <iframe
          ref={iframeRef}
          src="/tools/english-corner-master-plan.html"
          className="w-full h-full min-h-[calc(100vh-80px)] border-0"
          title="English Corner Master Plan"
        />
      </div>
    </div>
  );
}
