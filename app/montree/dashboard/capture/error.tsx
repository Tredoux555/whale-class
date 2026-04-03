// app/montree/dashboard/capture/error.tsx
// Error boundary specifically for the capture page.
// Photos are enqueued to IndexedDB BEFORE analysis starts, so they survive crashes.
'use client';

import { useEffect } from 'react';

export default function CaptureError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Capture Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">📸</div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Camera hiccup
        </h2>
        <p className="text-white/60 text-sm mb-6">
          Your photos are safe — they&apos;re saved locally and will upload automatically.
          Tap below to reopen the camera.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            Reopen Camera
          </button>
          <a
            href="/montree/dashboard"
            className="w-full py-3 bg-white/10 text-white/80 rounded-xl font-medium hover:bg-white/20 transition-colors inline-block"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
