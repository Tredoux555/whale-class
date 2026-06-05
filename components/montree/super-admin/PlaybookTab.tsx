'use client';

// Social Posting Playbook tab (super-admin dashboard).
//
// Renders the full playbook text into the DOM so WebClaude / Claude-in-Chrome
// can read it live while you're logged in — no pasting. Source of truth is
// docs/MONTREE_SOCIAL_PLAYBOOK.md; playbook.json is a build-bundled mirror.

import { useState } from 'react';
import playbook from './playbook.json';

const CONTENT: string = (playbook as { content: string }).content;

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
