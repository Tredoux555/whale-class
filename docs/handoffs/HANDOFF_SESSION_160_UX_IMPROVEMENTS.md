# Handoff — Session 160: UX Improvements (5 Tasks)

> **Status:** ✅ EXECUTED & DEPLOYED — Commit `41b265d`, pushed to main.
> **Session:** 160 | Feb 9, 2026
> **Planned by:** Session 159.5 (planning session)
> **Executed by:** Session 160 (Cowork mode, 3-phase parallel agents, full line-by-line audit)

## Overview

Five UX improvements to Montree, planned and audited across 3 rounds. The splash page copy change is already done (uncommitted). Everything else is ready to execute.

## PERMISSIONS NEEDED

Before starting, Claude needs:
- Permission to edit 10 files and create 1 new file
- Permission to run `git add` and `git commit` when done
- Permission to run `git push` to deploy

## WHAT TO DO

Execute Phase 1 (three parallel agents), then Phase 2 (one agent), then Phase 3 (verification), then commit and push.

---

## Task 1: Splash Page Copy ✅ ALREADY DONE

`app/montree/page.tsx` line 24 changed from "The future of Montessori Classroom Management" to "Observe, record, and share every child's Montessori journey — with expert guidance built in." — uncommitted.

---

## Task 2A + 3: Classroom Email + Parent at Home Card

### Agent A — File 1: `app/montree/try/page.tsx`

**Change 1 — New state (after line 46):**
Line 46 is `const [schoolName, setSchoolName] = useState('');`
Insert: `const [userEmail, setUserEmail] = useState('');`

**Change 2 — Email in fetch body (after line 78):**
Line 78 is `schoolName: schoolName.trim(),`
Insert: `email: userEmail.trim(),`

**Change 3 — Email input div (after line 235):**
Line 235 is `</div>` closing schoolName container. Line 237 is `{error && (`.
Insert between them:
```jsx
<div>
  <label className="block text-sm text-emerald-300/70 mb-2">Email (optional)</label>
  <input
    type="email"
    value={userEmail}
    onChange={(e) => setUserEmail(e.target.value)}
    placeholder="e.g. sarah@school.com"
    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400/50 focus:ring-1 focus:ring-emerald-400/30"
  />
  <p className="text-xs text-slate-500 mt-1">Only used to recover your code if you ever lose it</p>
</div>
```

**Change 4 — Parent at Home card (after line 195):**
Line 195 is `</button>` closing Principal card. Line 196 is `</div>` closing flex container.
Insert between them:
```jsx
<button
  onClick={() => router.push('/home')}
  className="w-full px-6 py-5 bg-gradient-to-r from-orange-500 to-rose-500 text-white font-semibold rounded-2xl shadow-lg shadow-orange-500/30 hover:shadow-xl hover:scale-[1.02] transition-all text-left"
>
  <span className="text-lg block">🏠 Parent at Home</span>
  <span className="text-sm text-orange-100/70 font-normal mt-1 block">I want to teach my child authentic Montessori at home — and learn alongside them</span>
</button>
```
NOTE: Does NOT use `handleRoleSelect` (which only accepts `'teacher' | 'principal'`). Direct `router.push('/home')`.

### Agent A — File 2: `app/api/montree/try/instant/route.ts`

**Change 1 — Line 115:** `const { role, name, schoolName } = await req.json();` → `const { role, name, schoolName, email } = await req.json();`

**Change 2 — Line 137:** `owner_email: \`trial-${code.toLowerCase()}@montree.app\`` → `owner_email: email?.trim() || \`trial-${code.toLowerCase()}@montree.app\``

**Change 3 — After line 200:** Line 200 is `password_hash: codeHash,` (last field in teacher insert). Add: `email: email?.trim() || null,`

**Change 4 — Line 270:** `email: \`trial-${code.toLowerCase()}@montree.app\`` → `email: email?.trim() || \`trial-${code.toLowerCase()}@montree.app\``

---

## Task 2B: Home Email

### Agent B — File 1: `app/home/page.tsx`

**Change 1 — After line 16:** Line 16 is `const [parentName, setParentName] = useState('');`. Insert: `const [parentEmail, setParentEmail] = useState('');`

**Change 2 — After line 160:** Line 160 is `</div>` closing name container. Line 162 is `<button` (Start Free).
Insert email input div (same pattern as Task 2A but with `parentEmail`/`setParentEmail`).

**Change 3 — Line 39:** `body: JSON.stringify({ name: parentName.trim() }),` → `body: JSON.stringify({ name: parentName.trim(), email: parentEmail.trim() }),`

### Agent B — File 2: `app/home/register/page.tsx`

**Change 1 — After line 16:** Insert: `const [parentEmail, setParentEmail] = useState('');`

**Change 2 — After line 143:** Line 143 is `</div>` closing name container. Line 145 is `<button`. Insert email input div.

**Change 3 — Line 31:** `body: JSON.stringify({ name: parentName.trim() }),` → `body: JSON.stringify({ name: parentName.trim(), email: parentEmail.trim() }),`

### Agent B — File 3: `app/api/home/auth/try/route.ts`

**Change 1 — After line 31:** Line 31 is `let familyName = 'My Family';`. Insert: `let familyEmail = '';`

**Change 2 — After line 36:** Line 36 is `}` closing name if-block (inside try, before line 37 `} catch {`). Insert: `if (body?.email && body.email.trim()) { familyEmail = body.email.trim(); }`

**Change 3 — Line 52:** `email: \`home-${code.toLowerCase()}@montree.app\`` → `email: familyEmail || \`home-${code.toLowerCase()}@montree.app\``

---

## Task 4: Demo Button Improvement

### Agent C — File 1: `components/montree/child/FocusWorksSection.tsx`

**Change 1 — Interface (after line 25):** Line 25 is `onOpenQuickGuide: (workName: string) => void;`. Insert: `onOpenDemo: (workName: string) => void;`

**Change 2 — Destructured props (after line 50):** Line 50 is `onOpenQuickGuide,`. Insert: `onOpenDemo,`

**Change 3 — Demo button handler (line 128):** Replace `onClick={() => window.open(\`https://www.youtube.com/results?search_query=${encodeURIComponent(work.work_name + ' Montessori presentation')}\`, '_blank')}` with `onClick={() => onOpenDemo(work.work_name)}`

### Agent C — File 2: `app/montree/dashboard/[childId]/page.tsx`

**Change 1 — After line 101:** Line 101 is `};` closing `openQuickGuide`. Insert:
```typescript
const openDemo = async (workName: string) => {
  try {
    const classroomId = session?.classroom?.id;
    const url = classroomId
      ? `/api/montree/works/guide?name=${encodeURIComponent(workName)}&classroom_id=${classroomId}`
      : `/api/montree/works/guide?name=${encodeURIComponent(workName)}`;
    const res = await fetch(url);
    const data = await res.json();
    const searchTerm = data.video_search_term || workName + ' Montessori presentation';
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchTerm)}`, '_blank');
  } catch {
    window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(workName + ' Montessori presentation')}`, '_blank');
  }
};
```

**Change 2 — After line 513:** Line 513 is `getAreaConfig={getAreaConfig}`. Insert: `onOpenDemo={openDemo}`

---

## Task 5: Full Details Modal

### Agent D — File 1: `components/montree/curriculum/types.ts`

**Change 1 — Lines 38-43:** Extend `QuickGuideData` interface. After line 42 (`error?: boolean;`), before line 43 (`}`), insert:
```typescript
presentation_steps?: Array<{step: number; title: string; description: string; tip: string}>;
direct_aims?: string[];
indirect_aims?: string[];
parent_description?: string;
control_of_error?: string;
why_it_matters?: string;
```

### Agent D — File 2: `components/montree/child/FullDetailsModal.tsx` (NEW FILE)

Create scrollable modal component:
- Props: `{ isOpen, onClose, workName, guideData: QuickGuideData | null, loading: boolean }`
- Import `QuickGuideData` from `@/components/montree/curriculum/types`
- Sections: Header (emerald gradient) → Quick Guide (yellow card) → Step-by-step Presentation (numbered cards with step title, description, teacher tip from `presentation_steps`) → Direct Aims → Materials → Control of Error → Why It Matters
- If `presentation_steps` is null/empty: show "Detailed presentation steps coming soon."
- Style consistent with QuickGuideModal (same overlay, same max-w-lg, same rounded-3xl)

### Agent C — File 3: `components/montree/child/QuickGuideModal.tsx`

**Change 1 — After line 11:** Line 11 is `loading: boolean;`. Insert: `onOpenFullDetails?: () => void;`

**Change 2 — After line 19:** Line 19 is `loading,`. Insert: `onOpenFullDetails,`

**Change 3 — Lines 94-97:** Replace:
```
onClick={() => {
  onClose();
  router.push('/montree/dashboard/curriculum');
}}
```
With: `onClick={() => onOpenFullDetails?.()}`

**Change 4 — Remove unused router:** Delete line 3 (`import { useRouter } from 'next/navigation';`) and line 21 (`const router = useRouter();`). After replacing the Full Details handler, nothing uses router.

### Agent C — File 4: `app/montree/dashboard/[childId]/page.tsx`

**Change 1 — Import (after line 17):** Line 17 is `import QuickGuideModal`. Insert: `import FullDetailsModal from '@/components/montree/child/FullDetailsModal';`

**Change 2 — State (after line 79):** Line 79 is `const [quickGuideLoading, setQuickGuideLoading] = useState(false);`. Insert: `const [fullDetailsOpen, setFullDetailsOpen] = useState(false);`

**Change 3 — QuickGuideModal prop (after line 569):** Line 569 is `loading={quickGuideLoading}`. Insert: `onOpenFullDetails={() => { setQuickGuideOpen(false); setFullDetailsOpen(true); }}`

**Change 4 — Render FullDetailsModal (after line 570):** Line 570 is `/>` closing QuickGuideModal. Insert:
```jsx
<FullDetailsModal
  isOpen={fullDetailsOpen}
  onClose={() => setFullDetailsOpen(false)}
  workName={quickGuideWork}
  guideData={quickGuideData}
  loading={quickGuideLoading}
/>
```

---

## Execution Order

| Phase | Agent | Tasks | Files (exclusive) |
|-------|-------|-------|-------------------|
| 1 (parallel) | A | 2A + 3 | `try/page.tsx`, `try/instant/route.ts` |
| 1 (parallel) | B | 2B | `home/page.tsx`, `home/register/page.tsx`, `home/auth/try/route.ts` |
| 1 (parallel) | D | 5 (type + component) | `types.ts`, `FullDetailsModal.tsx` (NEW) |
| 2 | C | 4 + 5 wiring | `FocusWorksSection.tsx`, `QuickGuideModal.tsx`, `[childId]/page.tsx` |
| 3 | E | Verification | All 11 files |

## Files Changed (11 total)

| # | File | Status | Agent |
|---|------|--------|-------|
| 1 | `app/montree/page.tsx` | Already done | — |
| 2 | `app/montree/try/page.tsx` | Modify | A |
| 3 | `app/api/montree/try/instant/route.ts` | Modify | A |
| 4 | `app/home/page.tsx` | Modify | B |
| 5 | `app/home/register/page.tsx` | Modify | B |
| 6 | `app/api/home/auth/try/route.ts` | Modify | B |
| 7 | `components/montree/curriculum/types.ts` | Modify | D |
| 8 | `components/montree/child/FullDetailsModal.tsx` | NEW | D |
| 9 | `components/montree/child/FocusWorksSection.tsx` | Modify | C |
| 10 | `components/montree/child/QuickGuideModal.tsx` | Modify | C |
| 11 | `app/montree/dashboard/[childId]/page.tsx` | Modify | C |

## Summary

- Zero migrations
- Zero new API routes
- 10 modified files + 1 new component
- All line numbers triple-audited against source
- Splash page copy already changed (uncommitted)
