// /montree/demo/disclaimer/page.tsx
// Disclaimer page - sensitive data warning
// Session 80: Zohan Demo Experience

'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function DisclaimerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const name = searchParams.get('name') || 'Zohan';
  const [agreed, setAgreed] = useState(false);

  const handleContinue = () => {
    if (agreed) {
      router.push(`/montree/demo/tutorial?name=${encodeURIComponent(name)}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      {/* Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-64 h-64 bg-red-500/10 rounded-full blur-3xl" />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg w-full">
        {/* Warning Icon */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/20 rounded-full mb-4">
            <span className="text-5xl">⚠️</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl p-8">
          <h1 className="text-2xl font-bold text-white text-center mb-6">
            Private Preview
          </h1>

          <div className="space-y-4 text-slate-300 leading-relaxed">
            <p>
              <span className="text-white font-semibold">{name}</span>, this demo is for your eyes only.
            </p>
            
            <p>
              This preview contains <span className="text-amber-400 font-medium">sensitive classroom data</span> including:
            </p>

            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Real student names and progress</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Work samples and observations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-amber-400 mt-1">•</span>
                <span>Weekly reports and assessments</span>
              </li>
            </ul>

            <p className="text-slate-400 text-sm pt-2">
              Please do not share this demo, screenshots, or any information from it with anyone else.
            </p>
          </div>

          {/* Agreement Checkbox */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <label className="flex items-start gap-3 cursor-pointer group">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-6 h-6 rounded-lg border-2 transition-all ${
                  agreed 
                    ? 'bg-emerald-500 border-emerald-500' 
                    : 'border-slate-500 group-hover:border-slate-400'
                }`}>
                  {agreed && (
                    <svg className="w-full h-full text-white p-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>
              <span className="text-slate-300 text-sm leading-relaxed">
                I understand this is confidential and agree not to share any information from this demo.
              </span>
            </label>
          </div>

          {/* Continue Button */}
          <button
            onClick={handleContinue}
            disabled={!agreed}
            className={`w-full mt-6 py-4 rounded-2xl font-semibold text-lg transition-all ${
              agreed
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 hover:scale-[1.01] cursor-pointer'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
          >
            {agreed ? "Understood, Let's Continue →" : "Please agree to continue"}
          </button>
        </div>

        {/* Back Link */}
        <div className="text-center mt-6">
          <button
            onClick={() => router.back()}
            className="text-slate-500 hover:text-slate-400 text-sm transition-colors"
          >
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}
