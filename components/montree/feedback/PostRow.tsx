// components/montree/feedback/PostRow.tsx
//
// One line on the notice board: vote pill, title, type chip, status chip, meta.
//
// The whole row is not a link — the vote pill inside it is a button, and
// nesting an interactive control inside an anchor is both invalid and, in
// practice, a vote that navigates away. The TITLE is the link, sized so it is
// comfortably a tap target on its own.

'use client';

import Link from 'next/link';
import type { Lang, Post, Viewer } from '@/lib/montree/feedback/types';
import { makeT, timeAgo } from '@/lib/montree/feedback/strings';
import { typeSupportsStatus, typeSupportsVoting } from '@/lib/montree/feedback/statuses';
import { RoleChip, StatusChip, TypeChip } from './StatusChip';
import { ChatIcon, QuestionIcon } from './icons';
import VotePill from './VotePill';

export default function PostRow({
  board,
  post,
  lang,
  viewer,
  hrefBase,
  onNeedsIdentity,
}: {
  board: string;
  post: Post;
  lang: Lang;
  viewer: Pick<Viewer, 'kind' | 'isAdmin'>;
  hrefBase: string;
  onNeedsIdentity?: () => void;
}) {
  const t = makeT(lang);
  const showsVote = typeSupportsVoting(post.type);
  const needsAnswer = post.type === 'question' && !post.hasOfficialReply && post.commentCount === 0;
  const declined = post.status === 'declined' || post.status === 'wont_fix';

  return (
    <li className={`fb-row${declined ? ' fb-row--declined' : ''}`}>
      {showsVote ? (
        <VotePill
          board={board}
          postId={post.id}
          title={post.title}
          count={post.voteCount}
          voted={!!post.viewerHasVoted}
          lang={lang}
          canVote={viewer.kind !== 'anon'}
          onNeedsIdentity={onNeedsIdentity}
        />
      ) : (
        <div className="fb-plate" aria-hidden="true">
          {post.type === 'question' ? <QuestionIcon size={19} /> : <ChatIcon size={19} />}
        </div>
      )}

      <div className="fb-row-body">
        <Link href={`${hrefBase}/${post.id}`} className="fb-row-title">
          {post.pinned ? <span aria-hidden="true">📌 </span> : null}
          {post.title}
        </Link>
        <div className="fb-row-meta">
          <TypeChip type={post.type} lang={lang} />
          {typeSupportsStatus(post.type) ? <StatusChip status={post.status} lang={lang} /> : null}
          {needsAnswer ? (
            <span className="fb-flag-note">
              <span className="fb-dot" />
              {t('needsAnswer')}
            </span>
          ) : null}
          <span className="fb-meta">
            <RoleChipText role={post.authorRole} lang={lang} /> · {timeAgo(post.lastActivityAt, lang)} ·{' '}
            {post.commentCount} {t('comments')}
          </span>
        </div>
      </div>
    </li>
  );
}

/** The meta line wants the role as plain text, not as a second grey pill. */
function RoleChipText({ role, lang }: { role: string | null; lang: Lang }) {
  const labels: Record<string, Record<Lang, string>> = {
    teacher: { en: 'Teacher', zh: '老师' },
    principal: { en: 'Principal', zh: '园长' },
    homeschool_parent: { en: 'Parent', zh: '家长' },
    parent: { en: 'Parent', zh: '家长' },
    community: { en: 'Guide', zh: '引导员' },
    guest: { en: 'Guest', zh: '访客' },
  };
  return <>{labels[role ?? '']?.[lang] ?? (lang === 'zh' ? '成员' : 'Member')}</>;
}

export { RoleChip };
