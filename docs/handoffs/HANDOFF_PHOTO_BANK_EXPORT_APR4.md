# Handoff: Photo Bank "Export to Tool" Feature — Apr 4, 2026

## Summary

Teachers can now select photos in the Picture Bank (`/montree/library/photo-bank`) and export them directly into 4 generator tools. This eliminates the manual download→re-upload workflow that teachers were doing to get Photo Bank images into their printable materials.

## How It Works

1. Teacher goes to Picture Bank, searches for words (e.g., "cat", "dog")
2. Clicks individual photos to toggle selection — selected photos show **green border + white checkmark**
3. A **floating bottom bar** appears showing selection count + "Export to" dropdown
4. Teacher picks a target tool from the dropdown
5. Selected photos are serialized to `sessionStorage` (key: `photoBankExport`)
6. Browser navigates to the target tool
7. Target tool reads `sessionStorage` on mount, removes it, and loads the photos

## sessionStorage Format

```json
{
  "photos": [
    {
      "id": "uuid",
      "label": "cat",
      "public_url": "https://dmfncjjtsoxrnvcdnvjq.supabase.co/storage/v1/object/public/...",
      "filename": "cat-01.jpg"
    }
  ]
}
```

**Design decision:** Public URLs stored (not data URLs) to avoid sessionStorage's ~5MB limit. Each receiving tool converts public_url → blob → data URL on mount via `fetch → blob → FileReader.readAsDataURL`.

## 4 Export Targets

| Tool | Route | Integration Type |
|------|-------|-----------------|
| 🃏 Three-Part Cards | `/montree/library/tools/card-generator` | Full — photos load as card originals with dimensions |
| 📸 Vocabulary Flashcards | `/montree/library/tools/vocabulary-flashcards` | Full — photos load as flashcards, deduplicates by word |
| 🖼️ Picture Bingo | `/tools/picture-bingo-generator.html` | Full — switches to bank mode, photos appear in bank grid |
| 📚 Phonics Fast | `/montree/library/tools/phonics-fast` | Banner only — photos auto-resolve via existing `resolvePhotoBankImages()` API |

## Files Modified (6)

### 1. `components/montree/PhotoBankPicker.tsx`
- **New props:** `onRawSelect?: (photo: PhotoBankPhoto) => void` and `selectedIds?: Set<string>`
- **Type export:** `export type { PhotoBankPhoto }` for importing in page components
- `onRawSelect` short-circuits the data URL conversion — returns raw photo object directly
- Green border (`2px solid #10b981`) + white checkmark overlay on selected photos in BOTH multi-word and single-word grid views

### 2. `app/montree/library/photo-bank/page.tsx`
- **New state:** `selectedPhotos: Map<string, SelectedPhoto>`, `selectedIds: Set<string>` (derived via useMemo)
- **`handleRawSelect`:** Toggle callback — adds/removes photos from selection Map
- **`handleExport`:** Serializes to sessionStorage with try-catch for quota exceeded, navigates via `router.push` (Next.js) or `window.location.href` (static HTML)
- **Floating export bar:** Appears when `selectedPhotos.size > 0`, shows count + Clear button + dropdown with 4 targets
- **`EXPORT_TARGETS` constant:** Defines all 4 tools with key, label, and href

### 3. `components/card-generator/CardGenerator.tsx`
- **New useEffect:** Reads `photoBankExport` from sessionStorage on mount
- Converts each photo: `fetch(public_url)` → `blob` → `FileReader.readAsDataURL` → `new Image()` for dimensions
- Creates `Card` objects: `{ id, originalImage, croppedImage, label, width, height }`
- Per-photo error handling — one failure doesn't block others

### 4. `app/montree/library/tools/vocabulary-flashcards/page.tsx`
- **New useEffect:** Reads `photoBankExport` from sessionStorage on mount
- Uses existing `blobToBase64` helper for conversion
- Extracts word from `photo.label` or sanitized filename
- Deduplicates: filters out existing cards with same word before merging
- Creates `FlashCard` objects: `{ id, image, word }`

### 5. `public/tools/picture-bingo-generator.html`
- **New function:** `importFromPhotoBankExport()` — ES5-compatible syntax (no arrow functions, const/let, or template literals)
- Called from `DOMContentLoaded` event handler
- Switches to bank mode (`switchMode('bank')`)
- Duplicate detection: skips photos already in `bankItems` by label+URL match
- Creates `bankItem` objects: `{ word, imgData, _bankLabel, _bankUrl }`
- Calls `renderBankItems()` after all photos loaded

### 6. `app/montree/library/tools/phonics-fast/page.tsx`
- **New useEffect:** Reads `photoBankExport` from sessionStorage on mount
- Does NOT fetch photos — Phonics Fast already resolves images via `resolvePhotoBankImages()` API
- Shows dismissible **emerald confirmation banner**: "N photos from the Picture Bank will automatically appear in your phonics materials below."
- Banner state: `exportBanner: number` (0 = hidden)

## Audit Methodology: 3x3x3

- **Cycle 1 (Build):** All 6 files modified and tested for data flow consistency
- **Cycle 2 (Audit × 3 agents):** Data flow agent, type safety agent, edge cases agent — all ran in parallel. Found 1 real bug: missing try-catch on `sessionStorage.setItem` in handleExport → FIXED
- **Cycle 3 (Verification × 3 agents):** Data flow verification, UI/UX verification, error handling verification — all ran in parallel. All 3 agents reported **CLEAN**

## Key Design Decisions

1. **sessionStorage over URL params:** Avoids URL length limits, supports large photo sets, auto-cleans on tab close
2. **Public URLs over data URLs in storage:** sessionStorage has ~5MB limit; public URLs are ~100 bytes each vs ~100KB for data URLs
3. **Per-tool conversion:** Each receiving tool handles its own fetch→blob→dataURL conversion because each tool has different object shapes
4. **Phonics Fast banner-only:** Already has `resolvePhotoBankImages()` which queries the Photo Bank API — exported photos are already available via this mechanism, so only a notification is needed
5. **ES5 syntax for Picture Bingo:** Static HTML page, no build step, must be compatible with older browsers

## Error Handling

- `sessionStorage.setItem` wrapped in try-catch (quota exceeded protection)
- `sessionStorage.removeItem` called BEFORE async operations (prevents double-import on page reload)
- Per-photo fetch failures caught individually (one bad URL doesn't block other photos)
- Outer try-catch on all sessionStorage read operations

## Deploy

✅ PUSHED — commit `12e521d1`. Railway auto-deploying. No migrations needed.
