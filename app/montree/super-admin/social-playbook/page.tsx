'use client';

// Montree Social Posting Playbook — read-only reference page.
//
// Purpose: give WebClaude / Claude-in-Chrome a stable URL it can read while
// you're logged in, so you don't have to paste the playbook. The full text is
// rendered into the DOM (below) so get_page_text returns everything.
//
// Source of truth is docs/MONTREE_SOCIAL_PLAYBOOK.md; playbook.json here is a
// build-bundled mirror of it (regenerate with the one-liner in that doc's repo
// commit if the copy ever changes).

import { useState } from 'react';
import Link from 'next/link';
import playbook from './playbook.json';

const CONTENT: string = (playbook as { content: string }).content;

export default function SocialPlaybookPage() {
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    try {
      await navigator.clipboard.writeText(CONTENT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard may be blocked; the text is selectable below regardless */
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      <div className="mx-auto max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/montree/super-admin/social-manager"
              className="text-sm text-purple-400 hover:text-purple-300"
            >
              ← Social manager
            </Link>
            <h1 className="mt-2 text-2xl font-bold">Social Posting Playbook</h1>
            <p className="text-sm text-gray-400">
              8 feature videos · daily · 6 platforms. Tell WebClaude:{' '}
              <span className="text-gray-200">
                &ldquo;upload video N — &lt;name&gt; to all the relevant social media sites&rdquo;
              </span>
            </p>
          </div>
          <button
            onClick={copyAll}
            className="shrink-0 rounded-lg border border-purple-500/50 bg-purple-500/10 px-4 py-2 text-sm font-medium text-purple-200 hover:bg-purple-500/20"
          >
            {copied ? 'Copied ✓' : 'Copy all'}
          </button>
        </div>

        <pre
          data-playbook
          className="whitespace-pre-wrap break-words rounded-xl border border-gray-800 bg-gray-900 p-5 text-sm leading-relaxed text-gray-200"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        >
          {CONTENT}
        </pre>
      </div>
    </div>
  );
}
