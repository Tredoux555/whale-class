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

## Files Modified (3)

1. `components/montree/media/PhotoCropModal.tsx` — 1 edit (min-h-0 → min-h-[300px])
2. `components/montree/WorkWheelPicker.tsx` — Complete rewrite (~330 lines). Functional fixes + visual polish.
3. `lib/montree/i18n/en.ts` + `zh.ts` — Added `common.select` key

## Commits

- `f334c9a9` — PhotoCropModal image fix
- `53b2415c` — i18n select key
- `bc357a6f` — WorkWheelPicker functional fixes (adaptive button, search, remove sequences)
- `4641ec2b` — WorkWheelPicker visual polish overhaul

## Deploy

✅ All commits pushed to main. Railway auto-deploying.
