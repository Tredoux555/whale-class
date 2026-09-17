// components/montree/feedback/VotePill.tsx
//
// "Me too". One per identity, toggled optimistically.
//
// Optimistic because a vote is the cheapest possible interaction and a 400ms
// wait on a phone makes it feel broken; reverted on failure, because a number
// that silently lied would be worse than a slow one. An anon viewer still sees
// the pill and still gets a useful answer when they press it — the parent
// component opens the compose/identity path rather than the button pretending
// to be disabled.

'use client';

import { useState } from 'react';
import type { Lang } from '@/lib/montree/feedback/types';
import { makeT } from '@/lib/montree/feedback/strings';
import { CaretUp } from './icons';
import { toggleVote } from './api';

export default function VotePill({
  board,
  postId,
  title,
  count,
  voted,
  lang,
  size = 'small',
  canVote,
  onNeedsIdentity,
}: {
  board: string;
  postId: string;
  title: string;
  count: number;
  voted: boolean;
  lang: Lang;
  size?: 'small' | 'large';
  canVote: boolean;
  onNeedsIdentity?: () => void;
}) {
  const t = makeT(lang);
  const [state, setState] = useState({ count, voted });
  const [busy, setBusy] = useState(false);

  async function press() {
    if (busy) return;
    if (!canVote) {
      onNeedsIdentity?.();
      return;
    }
    const previous = state;
    setState({ count: state.count + (state.voted ? -1 : 1), voted: !state.voted });
    setBusy(true);
    try {
      const result = await toggleVote(board, postId);
      setState({ count: result.count, voted: result.voted });
    } catch {
      setState(previous);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`fb-vote${size === 'large' ? ' fb-vote--large' : ''}`}
      aria-pressed={state.voted}
      aria-label={`${t('meToo')} — ${title} (${state.count})`}
      onClick={press}
    >
      <CaretUp size={size === 'large' ? 15 : 13} />
      <span className="fb-vote-count">{state.count}</span>
      {size === 'large' ? <span className="fb-vote-label">{t('meToo')}</span> : null}
    </button>
  );
}
