'use client';

import Link from 'next/link';

export function ConclusionView({ viewerName }: { viewerName: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-emerald-900 to-teal-900 flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <div className="text-6xl mb-6">🏆</div>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
          There we have it, {viewerName}.
        </h1>

        <div className="text-xl text-emerald-300 mb-8 space-y-1">
          <p className="font-bold text-2xl text-white">30% effort → 150% output.</p>
        </div>

        <div className="text-left bg-white/10 backdrop-blur-sm rounded-2xl p-6 mb-8 space-y-3">
          <p className="flex items-center gap-3 text-white">
            <span className="text-emerald-400">✓</span>
            <span>Teachers freed from busy work</span>
          </p>
          <p className="flex items-center gap-3 text-white">
            <span className="text-emerald-400">✓</span>
            <span>Records more accurate than ever</span>
          </p>
          <p className="flex items-center gap-3 text-white">
            <span className="text-emerald-400">✓</span>
            <span>Parents see real proof of learning</span>
          </p>
          <p className="flex items-center gap-3 text-white">
            <span className="text-emerald-400">✓</span>
            <span>Questions answered before they're asked</span>
          </p>
          <p className="flex items-center gap-3 text-white">
            <span className="text-emerald-400">✓</span>
            <span>Everyone happier.</span>
          </p>
        </div>

        <p className="text-emerald-300 text-lg mb-8 italic">
          What more could you ask for?<br />
          Tell me and I'll make it happen.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/montree/demo/setup"
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-2xl font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
          >
            🏫 Set Up My School Now
          </Link>
          <a
            href="https://wa.me/8613811111111"
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-4 bg-white/10 border-2 border-white/30 text-white rounded-2xl font-semibold text-lg hover:bg-white/20 transition-all"
          >
            💬 Message Tredoux
          </a>
        </div>
      </div>
    </div>
  );
}
