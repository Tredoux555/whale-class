// app/montree/dashboard/error.tsx
// Next.js Error Boundary for all dashboard pages.
// Catches rendering crashes (e.g. during photo classification) and shows
// a friendly recovery screen instead of the default Next.js error page.
'use client';

import { useEffect } from 'react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Dashboard Error Boundary]', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">😵</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          Don&apos;t worry — your photos are safe. Try again or go back to the dashboard.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/montree/dashboard"
            className="w-full py-3 bg-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-300 transition-colors inline-block"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
