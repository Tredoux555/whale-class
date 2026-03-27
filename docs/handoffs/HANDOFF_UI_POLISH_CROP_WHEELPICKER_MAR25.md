# Handoff: UI Polish — PhotoCropModal Fix + WorkWheelPicker Overhaul (Mar 25, 2026)

## Summary

Two UI fixes deployed: PhotoCropModal image visibility bug and a complete WorkWheelPicker visual/functional overhaul. All changes pushed and deployed via Railway.

---

## Fix 1 — PhotoCropModal Image Not Showing (CRITICAL)

**Problem:** Crop modal opened but displayed no image — just header, aspect ratio buttons, and action buttons with empty space in between.

**Root cause:** CSS flex layout chicken-and-egg cycle. The image container used `flex-1 min-h-0` inside a `max-h-[90vh]` flex column. ResizeObserver measured container dimensions, but the conditional render guard (`imgLoaded && imgW > 0 && contW > 0`) blocked rendering when container had 0 dimensions — and the container stayed at 0 because nothing was rendered inside it.

**Fix:** Single line change on line 719 of `PhotoCropModal.tsx`:
- `min-h-0` → `min-h-[300px]`
- This breaks the cycle by giving the container a minimum height regardless of content.

**Commit:** `f334c9a9`

---

## Fix 2 — WorkWheelPicker Complete Overhaul (4 functional fixes + visual polish)

### Functional Fixes

1. **"Add Work" button broken on photo-audit page (CRITICAL)**
   - Button required `onAddExtra` prop (`disabled={!selectedWork || !onAddExtra}`), but photo-audit only passes `onSelectWork`
   - Fix: Primary button now checks `onAddExtra` first, falls back to `onSelectWork`. Label adapts: "Add Work" when `onAddExtra` present, "Select" otherwise.

2. **Position picker missing search bar**
   - "Insert after position..." modal had no way to search — teachers had to scroll through 100+ works
   - Fix: Added searchable list with same search UX as main picker

3. **Messy sequence numbers removed**
   - `#177` numbers in front of work names were cluttering the UI
   - Fix: Removed all sequence number display

4. **"Add custom work" link disappeared**
   - Was accidentally wrapped in `{onAddExtra && (...)}` conditional during a prior edit
   - Fix: Link always visible regardless of which props are passed

### Visual Polish (Complete Rewrite)

Full aesthetic overhaul of the WorkWheelPicker component:

- **Backdrop:** `bg-black/90` (was `bg-black/60`) — deeper, more focused
- **Item height:** `h-[64px]` (was `h-[80px]`) — more compact, more items visible
- **Icons:** SVG icons replacing emoji (✕, search, chevron)
- **Status indicators:** Small colored dots (2.5px) with glow effects instead of large 40px circles with text
  - Mastered: emerald dot + glow
  - Practicing: blue dot + glow
  - Presented: amber dot + glow
- **Selection highlight:** Area-colored gradient using `areaConfig.color` with border
- **Primary button:** Area-colored (was always emerald) — matches the selected area
- **Status label:** Pill on selected item showing "Mastered", "Practicing", or "Presented"
- **Search input:** `bg-white/8` with subtle borders — refined look
- **Typography:** Cleaner weight hierarchy, truncation on long names

### Key Architecture

```typescript
// Adaptive button behavior
onClick={() => {
  if (!selectedWork) return;
  if (onAddExtra) { onAddExtra(selectedWork); onClose(); }
  else { onSelectWork(selectedWork, selectedWork.status || 'not_started'); onClose(); }
}}

// Area-colored selection highlight
style={{
  background: `linear-gradient(135deg, ${areaConfig.color}18, ${areaConfig.color}08)`,
  border: `1.5px solid ${areaConfig.color}40`,
}}

// Status color mapping
const STATUS_COLORS: Record<string, string> = {
  mastered: '#10b981',
  completed: '#10b981',
  practicing: '#3b82f6',
  presented: '#f59e0b',
};
```

---

## Fix 3 — Curriculum Nav Icon Added to Dashboard Header

**Problem:** Curriculum page (`/montree/dashboard/curriculum`) existed with full edit capabilities (✏️ pencil to rename/edit any work) but had NO icon in the header nav bar. Teachers couldn't discover it without knowing the URL.

**Fix:** Added 📚 icon to DashboardHeader nav, positioned after 🧠 Guru and before 📋 Classroom Overview. Teacher-only (hidden for homeschool parents via `!isHome` gate). Uses existing `t('nav.curriculum')` i18n key for title tooltip.

**Commit:** `12209d22`

---

## Fix 4 — Cross-Area Work Search in Photo Audit Area Picker

**Problem:** When correcting a photo tag on the Photo Audit page, teachers had to first pick an area (Practical Life, Sensorial, etc.) and THEN search for the work within that area. For works like "Chalk Board Writing" where the teacher may not remember which area it belongs to, this required trial-and-error across 5 areas.

**Fix:** Added `AreaPickerWithSearch` component to the area chooser dialog. A search input at the top lets teachers type any work name and instantly see matching results across ALL areas. Each result shows the work name + area label + area color dot. Selecting a result auto-sets the correct area and immediately applies the correction — no need to manually pick an area first.

**Architecture:**
- `AreaPickerWithSearch` is a sibling component in `photo-audit/page.tsx` (not extracted to a separate file — only used here)
- Cross-area search flattens `curriculum` (`Record<string, any[]>`) into a single list, filtered by query (min 2 chars, max 15 results)
- `handleWorkSelected` modified with `areaOverride` parameter to bypass stale `pickerArea` state:
  ```typescript
  const handleWorkSelected = async (work: any, _status?: string, areaOverride?: string) => {
    const effectiveArea = areaOverride || pickerArea;
    // ... uses effectiveArea for correction POST + state update
  ```
- `onSelectWork` callback passes area directly: `handleWorkSelected(work, undefined, areaKey)`
- Area buttons still visible below search results as fallback for browsing
- Auto-focus on search input when dialog opens (`requestAnimationFrame` + `inputRef`)

**i18n:** Added `audit.searchWorks` key in both EN ("Search works across all areas...") and ZH ("搜索所有区域的工作...")

**Commit:** `5776ac32`

---

## Fix 5 — WorkWheelPicker Empty State Add Form + Photo-Audit onWorkAdded

**Problem:** When correcting a photo to "Special Events" area (which has 0 works initially), the WorkWheelPicker showed "No works available" with a "+ Add First Work" button — but clicking it did nothing. No console output, no form appeared.

**Root cause:** The empty state (`works.length === 0`) returned early from the component before the `showAddForm` conditional JSX could render. `setShowAddForm(true)` updated state, but the re-render still hit the early return — never reaching the form JSX.

**Fix (2 changes):**
1. **WorkWheelPicker.tsx** — Embedded the add form directly inside the empty state's conditional render. When `showAddForm` is true, the input + buttons appear inline. When false, the original "No works available" + button shows.
2. **photo-audit/page.tsx** — Extracted curriculum fetch into `fetchCurriculum` callback. Passed `onWorkAdded={fetchCurriculum}` to WorkWheelPicker so curriculum refreshes after creating a custom work (e.g., a Special Event). Teacher can then select the new work to tag the photo.

**Commit:** `bd1ea26b`

---

## Files Modified (6)

1. `components/montree/media/PhotoCropModal.tsx` — 1 edit (min-h-0 → min-h-[300px])
2. `components/montree/WorkWheelPicker.tsx` — Complete rewrite (~330 lines). Functional fixes + visual polish + empty state add form fix.
3. `lib/montree/i18n/en.ts` + `zh.ts` — Added `common.select` + `audit.searchWorks` keys
4. `components/montree/DashboardHeader.tsx` — Added 📚 curriculum nav link
5. `app/montree/dashboard/photo-audit/page.tsx` — New `AreaPickerWithSearch` component + `handleWorkSelected` areaOverride param + `fetchCurriculum` callback + `onWorkAdded` wiring

## Commits

- `f334c9a9` — PhotoCropModal image fix
- `53b2415c` — i18n select key
- `bc357a6f` — WorkWheelPicker functional fixes (adaptive button, search, remove sequences)
- `4641ec2b` — WorkWheelPicker visual polish overhaul
- `12209d22` — Curriculum 📚 icon in header nav
- `5776ac32` — Cross-area work search in photo-audit area picker
- `bd1ea26b` — WorkWheelPicker empty state add form + photo-audit onWorkAdded wiring

## Deploy

✅ All commits pushed to main. Railway auto-deploying.

---

## Next Session Considerations

1. **Nav bar getting crowded** — Header now has 8+ icons (中文, 📸, 🧠, 📚, 📋, 🖼️, 🔍, 📖, inbox, AI budget, logout). On narrow mobile screens these overflow with `overflow-x-auto`. May want to consider a hamburger menu or grouping lesser-used icons behind a "more" dropdown.

2. **Curriculum page UX for bulk edits** — Teacher asked about editing "CVC same ending sound /a/" → "/at/". The EditWorkModal works for one-at-a-time edits but there's no bulk rename/edit capability. If teachers frequently need to edit multiple works, a spreadsheet-style inline edit view would be faster.

3. **Photo Audit → Curriculum flow** — Teacher's primary workflow is Photo Audit (tag photos) → occasionally needs to edit work names. Currently requires navigating away to curriculum page. Could add an "edit work" option directly in the photo-audit "Fix" flow or in the WorkWheelPicker itself.

4. **End-to-end smoke test needed** — Multiple UI components were rewritten this session. Worth a manual pass through: crop modal (open, crop, save), WorkWheelPicker on photo-audit (select work, add custom work), WorkWheelPicker on gallery (add extra work with position picker), curriculum page (edit a work name), photo-audit cross-area search (type a work name, verify correct area auto-selected).

5. **Cross-area search could be reused** — The `AreaPickerWithSearch` pattern (search across all areas, auto-select area on pick) could be valuable in other places: gallery "add extra work" flow, WorkWheelPicker itself, or anywhere teachers need to find a work without knowing its area.
