'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700">
        <Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300 text-sm">
          ← Back to Marketing Hub
        </Link>
      </div>
      <iframe src="/montree-landing.html" className="flex-1 w-full border-0" />
    </div>
  );
}
