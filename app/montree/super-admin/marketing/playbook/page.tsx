'use client';

import Link from 'next/link';

export default function PlaybookPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <Link href="/montree/super-admin/marketing" className="text-emerald-400 hover:text-emerald-300 text-sm">
          ← Back to Marketing Hub
        </Link>
        <Link href="/montree/super-admin/marketing/sales-playbook" className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">
          🎯 New Sales Playbook →
        </Link>
      </div>
      <iframe src="/montree-playbook.html" className="flex-1 w-full border-0" />
    </div>
  );
}
