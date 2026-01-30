// /montree/demo/zohan/page.tsx
// Welcome page for Zohan's personalized demo
// Session 80 - Montree Demo Experience

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ZohanWelcomePage() {
  const router = useRouter();
  const [showDisclaimer, setShowDisclaimer] = useState(false);

  const handlePreviewDemo = () => {
    setShowDisclaimer(true);
  };

  const handleContinue = () => {
    router.push('/montree/demo/zohan/tutorial');
  };

  const handleSetupSchool = () => {
    router.push('/montree/demo/zohan/setup');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-emerald-500/5 rounded-full blur-3xl" />
      </div>

      {/* Main content */}
      <div className="relative z-10 text-center max-w-xl">
        {/* Logo */}
        <div className="inline-flex items-center justify-center w-28 h-28 bg-gradient-to-br from-emerald-400 to-cyan-500 rounded-3xl shadow-2xl shadow-emerald-500/30 mb-8">
          <span className="text-6xl">🌳</span>
        </div>

        {/* Welcome text */}
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Welcome Zohan
        </h1>
        <p className="text-xl md:text-2xl text-emerald-300/90 mb-12 leading-relaxed">
          Welcome to the future of<br />
          <span className="font-semibold text-white">Montessori Classroom Management</span>
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={handleSetupSchool}
            className="px-8 py-4 bg-white/10 backdrop-blur-sm border border-white/20 text-white font-semibold rounded-2xl hover:bg-white/20 transition-all flex items-center justify-center gap-3 group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">🏫</span>
            <span>Set Up Your School</span>
          </button>

          <button
            onClick={handlePreviewDemo}
            className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-2xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-3 group"
          >
            <span className="text-2xl group-hover:scale-110 transition-transform">👀</span>
            <span>Preview Demo</span>
          </button>
        </div>

        {/* Subtle tagline */}
        <p className="mt-16 text-slate-500 text-sm">
          30% effort → 150% output
        </p>
      </div>

      {/* Disclaimer Modal */}
      {showDisclaimer && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🔐</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold">For Your Eyes Only</h2>
                  <p className="text-amber-100 text-sm">Confidential Preview</p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 leading-relaxed mb-6">
                <span className="font-semibold">Zohan</span>, this demo contains{' '}
                <span className="font-semibold text-amber-600">sensitive classroom data</span>{' '}
                from a real Montessori environment.
              </p>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
                <p className="text-amber-800 text-sm flex items-start gap-2">
                  <span className="text-lg mt-0.5">⚠️</span>
                  <span>
                    This is <strong>not to be shared</strong> with anyone. 
                    The photos and data you'll see belong to real children and their families.
                  </span>
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDisclaimer(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 text-gray-600 font-medium rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Go Back
                </button>
                <button
                  onClick={handleContinue}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-emerald-600 hover:to-cyan-600 transition-all shadow-md"
                >
                  I Understand →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
