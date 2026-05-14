'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const GUIDE_URL = '/whale-reading-framework-guide.html';

export default function ReadingFrameworkGuidePage() {
  const router = useRouter();

  useEffect(() => {
    // Auth gate — same pattern as the admin hub
    fetch('/api/videos').then(res => {
      if (res.status === 401) router.push('/admin/login');
    }).catch(() => router.push('/admin/login'));
  }, [router]);

  const handlePrint = () => {
    const frame = document.getElementById('guide-frame') as HTMLIFrameElement | null;
    if (frame && frame.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } else {
      window.open(GUIDE_URL, '_blank');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100">
      <header className="bg-gradient-to-r from-emerald-700 to-teal-600 text-white shadow-lg shrink-0">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-3xl">📗</div>
            <div>
              <h1 className="text-xl font-bold">Reading Framework — Making Guide</h1>
              <p className="text-emerald-100 text-sm">13 works, 4 shelves, writing first</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition"
              title="Print / save as PDF"
            >
              🖨️ Print
            </button>
            <a
              href={GUIDE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition"
              title="Open in a new tab"
            >
              ↗ Open
            </a>
            <button
              onClick={() => router.push('/admin')}
              className="px-3 py-2 bg-white/15 hover:bg-white/25 rounded-lg text-sm font-medium transition"
            >
              ← Admin
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <iframe
          id="guide-frame"
          src={GUIDE_URL}
          title="Whale Reading Framework Making Guide"
          className="w-full h-full border-0 block"
          style={{ height: 'calc(100vh - 72px)' }}
        />
      </main>
    </div>
  );
}
