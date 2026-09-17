# The feedback board

A reusable board where people report problems, propose ideas, ask questions and
talk to each other; others vote and comment; the team answers, sets a status and
closes the loop.

First mount is the **public product board** at `/montree/library/feedback`
(reachable on both montree.xyz and teacherpotato.xyz — `/montree/library/*` was
already whitelisted in `middleware.ts`, and no middleware change was made).

Everything is board-scoped from day one, so a second board is a row, not a
migration.

---

## Where the code lives

| Path | What it is |
| --- | --- |
| `lib/montree/feedback/` | All the logic. `types`, `statuses`, `dedup`, `strings` and `validate` are **pure** and safe on the client; `keys`, `identity`, `repo`, `data`, `board`, `server` and `notify` are **server only**. |
| `app/api/montree/feedback/v2/` | The routes. Every one resolves a board first and re-checks permissions server-side. |
| `components/montree/feedback/` | The UI, board-agnostic, with its own `feedback.css` scoped under `.fb-root`. |
| `app/montree/library/feedback/` | The public mount: list, post, changelog, admin. |
| `migrations/359_feedback_board.sql` | The schema. Run by hand in the Supabase SQL editor. |
| `tests/feedback/` | Vitest. `npx vitest run tests/feedback` |
| `tsconfig.feedback.json` | Scoped type-check. `npx tsc --noEmit -p tsconfig.feedback.json` |

The older `montree_feedback` table (migration 114, the unmounted FeedbackButton
mailbox) is untouched and unrelated. This module is "v2" and shares nothing with
it but a word.

---

## Mounting a board somewhere else

A board is named by a string: `public`, or `school:<school uuid>`.

### 1. A page

```tsx
import { getPageContext, clientViewer } from '@/lib/montree/feedback/server';
import { db } from '@/lib/montree/feedback/data';
import FeedbackBoard from '@/components/montree/feedback/FeedbackBoard';
import Shell from '@/components/montree/feedback/Shell';
import '@/components/montree/feedback/feedback.css';

export default async function SchoolFeedbackPage({ params }) {
  const { schoolId } = await params;
  const ctx = await getPageContext(`school:${schoolId}`);
  if (!ctx.board) return <BoardNotReady lang={ctx.lang} />;

  const initial = await db.listPosts(ctx.board.id, { sort: 'trending' }, ctx.viewer.key);

  return (
    <Shell lang={ctx.lang} viewer={clientViewer(ctx.viewer)} hrefBase="/montree/dashboard/feedback" current="board">
      <FeedbackBoard
        board={ctx.board.ref}
        boardName={ctx.board.name}
        lang={ctx.lang}
        viewer={clientViewer(ctx.viewer)}
        initial={initial}
        hrefBase="/montree/dashboard/feedback"
      />
    </Shell>
  );
}
```

`hrefBase` is where a post's page lives. That is the only routing the components
know about.

### 2. Nothing else

The API routes are shared. The client sends `?board=school:<id>` on every call,
and `resolveBoardContext()` verifies it:

- **public** — anyone reads; anyone with an identity writes.
- **school:&lt;id&gt;** — the caller must hold a Montree session for **that** school.
  A valid session for another school is a 403, not a fallback. The board row is
  created the first time someone opens it.

### 3. If the host product wants its own storage or mailer

`lib/montree/feedback/data.ts` is the single door to the database, and
`setMailer()` in `notify.ts` swaps the mailer. Nothing else reaches out.

---

## Environment

| Variable | Required | What it does |
| --- | --- | --- |
| `FEEDBACK_TOKEN_SECRET` | no (falls back to `MONTREE_JWT_SECRET`) | HMAC key for guest token and email hashing. Its own variable so a JWT-secret leak does not also expose every guest key. **Fails closed** — with neither set, guest identity throws rather than hashing with a constant. |
| `FEEDBACK_ADMIN_USER_IDS` | no | Comma-separated `montree_teachers.id` list. These people administer the **public** board. Empty means nobody does. |
| `RESEND_API_KEY` | no | Turns notifications on. Without it the board logs instead of sending, and nothing else changes. |
| `RESEND_FROM_EMAIL` | no | Envelope sender. Shared with the rest of the app. |
| `FEEDBACK_MAILER=none` | no | Mount the board with no email at all. |
| `CRON_SECRET` | no | Guards `/api/montree/cron/feedback-outbox`. |
| `NEXT_PUBLIC_SITE_URL` | no | Base for links inside notification emails. Defaults to `https://montree.xyz`. |
| `FEEDBACK_FAKE_REPO=1` | dev only | Serves an in-memory board so the UI can be built against a database without migration 359. Ignored in production. |
| `FEEDBACK_FAKE_ADMIN=1` | dev only | With the fake repo only, and never in production: pretends the viewer is an admin so the queue can be looked at. |

---

## The admin model

Deliberately small, and written down in one place (`identity.ts`):

- **Public board.** An admin is a super-admin token on the request
  (`x-super-admin-token`), **or** a signed-in Montree user whose id is in
  `FEEDBACK_ADMIN_USER_IDS`. A principal is *not* automatically an admin of the
  public board; neither is a teacher.
- **School board.** An admin is a **principal of that school**. The public
  allow-list does not carry over — being trusted with the product board must not
  hand anyone a school's private one.

Admin is computed from cookies and headers only. Nothing in a request body can
reach it, and every route re-checks it (see `tests/feedback/route-auth.test.ts`).

---

## The migration

`migrations/359_feedback_board.sql`. Paste it into the Supabase SQL editor and
run it. It is idempotent and transactional, so a re-run is a no-op.

It creates ten `montree_fb_*` tables, their indexes (including a trigram index
on post titles for duplicate detection, guarded by
`CREATE EXTENSION IF NOT EXISTS pg_trgm`), two SQL functions
(`montree_fb_recount_post`, `montree_fb_merge_posts`), RLS **enabled with no
policies** on every table (deny-all to the anon key; the app uses the
service-role client), and it seeds the public board plus seven starter tags.

Until it is run, every page renders a calm "the board is not set up yet" state
rather than an error, and the API answers `503 board_not_ready`.

---

## Notifications

The repo already sends mail with Resend, so this module does too — but through
its own small `Mailer` interface rather than `lib/montree/email.ts`, whose
senders are all school-audience templates.

**A request never waits on a mailer.** `notifySubscribers()` writes one
`montree_fb_outbox` row per recipient (a fast insert) and then fires a delivery
attempt without awaiting it. If that attempt never finishes — container
recycled, Resend down, twenty subscribers outliving the response — the rows are
still there and `/api/montree/cron/feedback-outbox` drains them. `sent_at` is
the latch, so nothing is sent twice.

Point a scheduler at it every few minutes:

```
POST https://montree.xyz/api/montree/cron/feedback-outbox
x-cron-secret: <CRON_SECRET>
```

People are subscribed by posting, voting or commenting. They hear about an
official reply, a status change and an accepted answer — never about an ordinary
comment, and never about their own action.

---

## Language

`en` and `zh`, in `strings.ts`, with a `fb_lang` **cookie** and an optional
`?lang=` on the URL. Not localStorage: the WeChat WKWebView clears web storage
between sessions, so a toggle stored there forgets itself every time a parent
comes back from a chat. The cookie also means the server renders the right
language on the first paint.

---

## Look

`components/montree/feedback/feedback.css`, entirely scoped under `.fb-root`,
with its own custom properties (`--fb-ground`, `--fb-ink`, `--fb-accent`, the
status tones). Not Tailwind classes and not the `--dpl-*` shelf tokens: a host
app imports one stylesheet, wraps the board in `.fb-root`, and gets the board.

Mobile-first: 44px targets, the compose sheet becomes a bottom sheet under
640px, a sticky Write button replaces the header one, nothing depends on hover,
and `prefers-reduced-motion` is respected.

---

## Checks

```
npx vitest run tests/feedback
npx tsc --noEmit -p tsconfig.feedback.json
npx eslint lib/montree/feedback components/montree/feedback \
           app/api/montree/feedback/v2 app/montree/library/feedback tests/feedback
```

To look at it without a database:

```
FEEDBACK_FAKE_REPO=1 FEEDBACK_FAKE_ADMIN=1 npx next dev -p 3005
```
