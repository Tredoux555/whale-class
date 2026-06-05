'use client';

// Social Posting Playbook tab (super-admin dashboard).
//
// Renders the full playbook text into the DOM so WebClaude / Claude-in-Chrome
// can read it live while you're logged in — no pasting. Source of truth is
// docs/MONTREE_SOCIAL_PLAYBOOK.md; playbook.json is a build-bundled mirror.

import { useState } from 'react';
import playbook from './playbook.json';

const CONTENT: string = (playbook as { content: string }).content;

// The 8 feature videos, in posting order. Hosted in montree-media/social/ and
// served through the Cloudflare-cached media proxy (montree-media is the proxy
// default bucket, so the path alone is the URL). Grab them here on any device.
const VIDEOS: { n: number; key: string; label: string }[] = [
  { n: 1, key: 'guru', label: 'Guru' },
  { n: 2, key: 'astra', label: 'Astra' },
  { n: 3, key: 'voice-onboarding', label: 'Voice onboarding' },
  { n: 4, key: 'curriculum', label: 'Curriculum' },
  { n: 5, key: 'library', label: 'Library (materials)' },
  { n: 6, key: 'communication', label: 'Communication' },
  { n: 7, key: 'appointments', label: 'Appointments' },
  { n: 8, key: 'multilingual', label: 'Multilingual' },
];

const videoUrl = (n: number, key: string) => `/api/montree/media/proxy/social/${n}_${key}.mp4`;

export default function PlaybookTab() {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; text below is still selectable */
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-white">🎬 Social Posting Playbook</h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            8 feature videos · daily · 6 platforms. Tell WebClaude:{' '}
            <span className="text-slate-200">
              &ldquo;upload video N — &lt;name&gt; to all the relevant social media sites&rdquo;
            </span>
            , drop the file into each tab, then say &ldquo;take the next step.&rdquo;
          </p>
        </div>
        <button
          onClick={copyAll}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          style={{
            background: 'rgba(52,211,153,0.15)',
            border: '1px solid rgba(52,211,153,0.35)',
            color: '#34d399',
          }}
        >
          {copied ? 'Copied ✓' : 'Copy all'}
        </button>
      </div>

      {/* Video library — grab any of the 8 in order, on any device. */}
      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">🎞️ Video library (posting order)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {VIDEOS.map(v => {
            const url = videoUrl(v.n, v.key);
            return (
              <div
                key={v.n}
                className="rounded-xl overflow-hidden"
                style={{ background: 'rgba(8,20,12,0.55)', border: '1px solid rgba(52,211,153,0.18)' }}
              >
                <video
                  src={url}
                  controls
                  playsInline
                  preload="metadata"
                  className="w-full bg-black"
                  style={{ aspectRatio: '9 / 16', maxHeight: 260, objectFit: 'contain' }}
                />
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <span className="text-xs text-slate-300 truncate">
                    {v.n}. {v.label}
                  </span>
                  <a
                    href={url}
                    download={`${v.n}_${v.key}.mp4`}
                    className="shrink-0 text-xs font-medium text-emerald-400 hover:text-emerald-300"
                  >
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <pre
        data-playbook
        className="whitespace-pre-wrap break-words rounded-xl p-5 text-sm leading-relaxed text-slate-200"
        style={{
          background: 'rgba(8,20,12,0.55)',
          border: '1px solid rgba(52,211,153,0.18)',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        }}
      >
        {CONTENT}
      </pre>
    </div>
  );
}
