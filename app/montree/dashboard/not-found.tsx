// app/montree/dashboard/not-found.tsx
// Next.js not-found boundary for all dashboard routes.
// Renders when a route calls notFound() — e.g. the [childId] page when the
// id in the URL is not a real child in this teacher's classroom (a stale
// bookmark, a typo'd path, or a sibling route name typed as a URL).
// Without this, an unknown /montree/dashboard/<x> path fell through into the
// [childId] page, 403-stormed the API, and bounced the teacher to /login.

import Link from 'next/link';

export default function DashboardNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-sm w-full text-center">
        <div className="text-5xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Page not found
        </h2>
        <p className="text-gray-500 text-sm mb-6">
          This page doesn&apos;t exist. The link may be out of date.
        </p>
        <Link
          href="/montree/dashboard"
          className="block w-full py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-colors text-center"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
