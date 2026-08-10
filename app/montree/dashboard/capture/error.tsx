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
            className="btn btn-primary btn-lg btn-full"
          >
            Reopen Camera
          </button>
          <a
            href="/montree/dashboard"
            className="btn btn-secondary btn-lg btn-full"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
