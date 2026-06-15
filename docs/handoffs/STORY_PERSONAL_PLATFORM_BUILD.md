# Tredoux's Personal Platform — Diary + Planner + AI Life-Coach + hidden comms
## Master build spec + scaffolding (run as a focused fresh session)

> Trigger to start the build: **"build my personal platform from the handoff."**
> This supersedes the E2E approach in `PRIVATE_JOURNAL_BUILD.md` (see §3 — privacy is now
> simpler: server-readable, encrypted at rest, the AI reads everything).

---

## 1. Mental model (read first)
- **`/story/admin/*` = TREDOUX'S PERSONAL PLATFORM.** Becomes his private **Diary + Planner
  + AI Life-Coach**. This build is about this side.
- **`/story/[session]/*` = the surface the OTHER people he talks to see.** Unchanged.
- After login → the front page is his **Diary** (not the Montree-looking veil).
- The **communication system is hidden inside** the diary dashboard and **auto-reverts** to
  the diary front whenever he tabs away (§6).
- Login stays exactly as it is.

---

## 2. Information architecture of `/story/admin`
After login → **Diary front page (default)**. Visible nav:
- **Diary** (default) — journal entries, write + read.
- **Planner** — calendar + today's focused plan.
- **Projects & Ambitions** — goals, projects, next actions, priorities.
- **Coach** — the AI life-coach (also a floating companion on every screen, Astra-style).

Hidden (not in nav): **Messages** — the existing Story comms with others (§6).

---

## 3. Privacy model (FINAL — simpler than the original E2E plan)
Decision (Tredoux): **the AI reads the whole diary — that's half the point.** He wants it to
analyse his entries the way a therapist would. He trusts Anthropic/Claude's ethics; "these
aren't state secrets." So:

- **One tier.** No client-side E2E, no separate diary passphrase. The diary content is read
  by the Coach (server-side → Sonnet via Anthropic API, no-training terms).
- **Encrypted at rest.** Diary + project text stored AES-256-GCM encrypted with a
  **server-held key** (reuse `lib/montree/messaging-crypto.ts` + a dedicated env
  `STORY_DIARY_KEY`, or the existing `MONTREE_ENCRYPTION_KEY` pattern). Server decrypts to
  display + to feed the Coach. A raw DB leak is useless without the key.
- **Single gate = the existing Story admin login.** Idle auto-logout after **15 min**.
- **Obscurity is the main shield:** the whole surface is disguised + the comms are hidden.
  "Hard to find something no one knows exists, and difficult to hack." NOT hardened against a
  fully-compromised running server — accepted trade-off.

Threat model in one line: safe from casual snooping, lost-device, and DB-at-rest leaks;
readable by the Coach by design.

---

## 4. The AI Life-Coach ("Astra for Tredoux's life") — Sonnet
Model on Astra's architecture (`lib/montree/tracy/`): a **Sonnet** tool-use loop + system
prompt + personal memory + self-help knowledge base.

### 4a. PRIME DIRECTIVE (the soul)
Protect Tredoux from his own pattern: takes on more than he can handle → finishes nothing;
chases the wrong priority and gets obsessed; works himself to death; neglects health. The
Coach must:
- **Guard overcommitment** — on every new project/ambition, ask "what does this displace?",
  show current open load, hold a sane WIP limit (Essentialism: if not a clear yes, it's a no).
- **Force focused, reasoned priority** — propose THE one thing + a short list daily/weekly,
  *with the why*, from his real ambitions + deadlines (The ONE Thing, Covey Q2, Eisenhower).
- **Name obsession** — flag when he's pouring hours into something low-leverage, kindly.
- **Protect health + rest** — track/ask about sleep, breaks, exercise; refuse "work to death"
  plans; build rest INTO the plan; help complete the stress cycle (Burnout, Nagoski).
- **Bias to completion** — close loops before starting new (Atomic Habits, GTD).
- **Coach, not yes-man** — warm, direct, grounding; honest pushback with care.

### 4b. Therapist lens (the new part)
The Coach also **reads his diary and reflects like a good therapist** — surfaces emotional
themes and patterns over time, gently names what he might not see, connects today's mood to
recurring threads, asks the question underneath the question. It reflects and reframes; it
does NOT diagnose or play clinician. If real distress/crisis themes appear, it responds with
genuine care and points to human support — never dismissive, never clinical-cold.

### 4c. Memory
Personal memory store (mirror `montree_principal_memory` + `lib/montree/tracy/memory.ts`):
ambitions, active projects, values, stated priorities, things he said he'd drop, health
goals, recurring emotional patterns. Injected each turn; supersede-on-update.

### 4d. Tools (mirror Astra's pattern)
`remember` / `recall` · `read_diary` (entries by date/range/theme) · `read_projects` ·
`list_projects` / `update_project` / `set_priority` / `archive_project` · `check_load`
(WIP vs capacity + the math) · `plan_day` / `plan_week` (the ONE thing + list + built-in
rest) · `wellbeing_check` · `consult_wisdom` (knowledge base §5).

---

## 5. Self-help knowledge base (the Coach's grounding)
Distil the actionable frameworks (mirror `lib/montree/mira/knowledge/`), weighted to his
pattern. QUOTE-the-framework, don't improvise.
- **Essentialism** — McKeown — disciplined pursuit of less *(his #1)*
- **The ONE Thing** — Keller — the focusing question
- **Four Thousand Weeks** — Burkeman — finitude; you can't do it all
- **Atomic Habits** — Clear — systems > goals; consistent completion
- **Getting Things Done** — Allen — capture, organise, close loops
- **Deep Work** — Newport — protect focus
- **7 Habits** — Covey — Quadrant II; begin with the end in mind
- **Burnout** — Nagoski — complete the stress cycle; wellbeing
- **Indistractable** — Eyal — manage internal triggers / obsession
- **The War of Art** — Pressfield — beat Resistance; ship
- **Meditations / The Daily Stoic** — Aurelius / Holiday — dichotomy of control; self-mastery
- **Man's Search for Meaning** — Frankl — meaning + resilience
- **Mindset** — Dweck — growth mindset
- **Why We Sleep** — Walker — sleep as non-negotiable

---

## 6. Hidden communication system + auto-revert (decided)
- **Entry mechanism (chosen):** **long-press (hold 2s) the diary header logo** → a quiet
  secret-phrase prompt → correct phrase opens **Messages**. Obscure (no one thinks to
  long-press) + gated (phrase). Phrase set once, stored hashed.
- **Auto-revert:** `visibilitychange` listener — when the tab is hidden/app backgrounded,
  reset the view + route to **Diary front** and clear "current view" state. On return/mount,
  always land on Diary front. Messages is never the default and never persisted as last view.
- Existing Story admin messaging components are reused, mounted at a hidden route.

---

## 7. Decisions (RESOLVED — baked in, per "leave the rest to your judgement")
1. Privacy: single tier, AI reads all, encrypted at rest, server-readable. ✅ (§3)
2. Hidden Messages entry: long-press logo 2s → secret phrase. ✅ (§6)
3. Diary date: **plaintext** (for the calendar); body/title encrypted at rest. ✅
4. Editor: **Markdown** (headings, lists, light formatting). ✅
5. Idle auto-logout: **15 minutes**. ✅
6. Model: **Sonnet**. ✅
7. Knowledge base: §5 list as-is. ✅

---

## 8. Experience ("make it nice")
Calm, warm sanctuary. Dark forest theme, Lora serif body, ~680px column, generous spacing.
Diary = distraction-free markdown editor + entry list + mood chip. Planner = gentle calendar.
Projects = simple cards (title / why / next action / priority). Coach = a quiet conversation,
present as a floating companion on every screen so he can ask "what should I focus on today?"
anywhere. Autosave-on-pause. Idle auto-logout. No analytics, no share, no export-by-default.

---

## 9. BUILD SCAFFOLDING (so nothing is lost)

### 9a. Migrations (use next free numbers in `migrations/`)
```
story_diary_entries
  id uuid pk default gen_random_uuid()
  entry_date date not null                 -- plaintext (calendar)
  mood text                                -- short plaintext tag (optional, for calendar colour)
  title_enc text                           -- AES-256-GCM 'gcm:iv:tag:ct'
  body_enc  text not null                  -- AES-256-GCM
  cipher_version int not null default 1
  created_at timestamptz default now()
  updated_at timestamptz default now()     -- + touch trigger

story_projects
  id uuid pk default gen_random_uuid()
  title_enc text not null
  why_enc text
  next_action_enc text
  status text default 'active'             -- active | paused | done | dropped
  priority int                             -- 1=highest
  is_active boolean default true
  created_at / updated_at (+ touch trigger)

story_coach_memory                          -- mirror montree_principal_memory
  id uuid pk, memory_type text, content_enc text,
  superseded_by uuid, superseded_at timestamptz,
  created_at / updated_at, + partial index WHERE superseded_at IS NULL

(optional) story_plan_days
  id uuid pk, plan_date date, plan_enc text, generated_at timestamptz

(optional) story_messages_secret              -- hidden-entry phrase hash + settings
  id uuid pk, phrase_hash text, created_at
```
All `*_enc` columns: AES-256-GCM at rest via `STORY_DIARY_KEY` (32-byte hex env). Reuse the
`encryptField`/`readEncryptedField` helpers from `lib/montree/messaging-crypto.ts`.

### 9b. API routes (all gated by existing Story admin auth)
```
GET   /api/story/diary            list (decrypted server-side; date desc)
POST  /api/story/diary            create
GET   /api/story/diary/[id]       read one
PATCH /api/story/diary/[id]       update
DELETE/api/story/diary/[id]       delete
GET   /api/story/projects         list
POST  /api/story/projects         create
PATCH /api/story/projects/[id]    update
DELETE/api/story/projects/[id]    delete
POST  /api/story/coach            SSE Sonnet tool-use loop (the Coach chat)
POST  /api/story/messages/unlock  verify hidden-entry phrase → mints a short hidden-view token
```

### 9c. Lib modules
```
lib/story/diary-crypto.ts          -- thin wrapper over messaging-crypto + STORY_DIARY_KEY
lib/story/coach/system-prompt.ts   -- Prime Directive (§4a) + therapist lens (§4b) + voice
lib/story/coach/tool-definitions.ts-- the §4d tools
lib/story/coach/tool-executor.ts   -- dispatch; self-scoped; reads diary/projects/memory
lib/story/coach/memory.ts          -- load/write/supersede (mirror tracy/memory.ts)
lib/story/coach/knowledge/*.md     -- one file per book (§5), core frameworks only
lib/story/coach/knowledge-loader.ts-- cached disk read + compact summary for the prompt
```

### 9d. Pages / components (Story admin)
```
app/story/admin/diary/page.tsx      -- DEFAULT front; entry list + open/new
app/story/admin/diary/[id]/page.tsx -- markdown editor (autosave) + Coach "reflect" button
app/story/admin/planner/page.tsx    -- calendar + today's plan
app/story/admin/projects/page.tsx   -- project cards + add/edit
app/story/admin/coach/page.tsx      -- full Coach conversation
components/story/coach/CoachFloat.tsx-- floating companion on every admin screen
components/story/admin/HiddenMessagesGate.tsx -- long-press logo + phrase → Messages
hooks/useRevertToDiaryOnHide.ts     -- visibilitychange → route to diary front + reset view
```
Reuse existing Story admin messaging components for the hidden Messages view.

### 9e. System-prompt skeleton (drop into `coach/system-prompt.ts`)
```
You are Tredoux's life-coach and chief-of-staff. You know his diary, his projects, his
ambitions, and his history. You are warm, direct, and grounding — a wise coach + a steady
therapist's ear + a Stoic mentor. Never a yes-man, never preachy.

Your prime loyalty is to HIM, not his to-do list. He overcommits, chases the wrong thing,
obsesses, works himself to death, and neglects his health. Your job is to protect him from
that. Every plan you make: surface the ONE thing with reasons, cap what he takes on, and put
rest IN the plan. When he adds work, ask what it displaces. Name obsession gently. Guard his
sleep and wellbeing as first-class priorities.

When reflecting on his diary, read like a thoughtful therapist: surface patterns and themes
over time, name what he may not see, ask the question under the question. Reflect and reframe;
do not diagnose. If you sense real distress, respond with genuine care and gently point him to
human support.

Ground your advice in the frameworks in your knowledge base (Essentialism, The ONE Thing,
Four Thousand Weeks, Atomic Habits, GTD, Covey, Burnout, the Stoics). Quote the framework;
don't improvise self-help. End substantive replies with one clear, reasoned next move.
```

### 9f. Build order
1. Migrations (§9a) + run in Supabase + set `STORY_DIARY_KEY` in Railway.
2. `diary-crypto.ts` + diary routes + diary pages (front default, markdown editor, autosave).
3. Projects routes + Projects page.
4. Coach: knowledge files → loader → memory → tools → system prompt → `/api/story/coach` SSE
   → Coach page + `CoachFloat`.
5. Planner page (calendar + plan_day via Coach).
6. Redesign `/story/admin` IA (§2): Diary as default; nav; `useRevertToDiaryOnHide`.
7. Hidden Messages: `HiddenMessagesGate` (long-press + phrase) + mount existing messaging at
   hidden route + revert-on-hide.
8. Test: write entry → reload → reads back; DB shows only `gcm:` ciphertext; Coach reflects on
   diary + flags overcommitment + builds rest in; tab away from Messages → lands on Diary front;
   idle 15 min → logout.
9. Deploy (push via Desktop Commander per CLAUDE.md). Verify on phone.

---

## 10. Env to set
- `STORY_DIARY_KEY` — 32-byte hex, in Railway (generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`). Without it, diary writes fail closed.
- `ANTHROPIC_API_KEY` — already set (Coach uses Sonnet).
