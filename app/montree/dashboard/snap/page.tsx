// app/montree/dashboard/snap/page.tsx
//
// Orphaned route -- "Snap & Identify" called the retired photo-recognition
// API (see commit a2f9afe0c). No nav links point here anymore. Teachers now
// tap the work as the photo is taken, so this is a retirement notice that
// redirects them to the routes that replaced it.

'use client';

import Link from 'next/link';

export default function SnapRetiredPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">📸</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Snap &amp; Identify has been retired
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Tap the work when you take a photo -- it goes straight to the
          tracker.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/montree/dashboard/capture"
            className="btn btn-primary btn-lg btn-full"
          >
            Take a photo
          </Link>
          <Link
            href="/montree/dashboard/photo-audit"
            className="btn btn-secondary btn-lg btn-full on-light"
          >
            Photos to tag
          </Link>
        </div>
      </div>
    </div>
  );
}
