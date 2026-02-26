# DALL-E Image Integration - Segmented Work Plan

## Date: Jan 8, 2026
## Lessons Learned from Previous Glitches
1. Don't try to do everything in one go
2. Save checkpoint files after EVERY phase
3. Test locally before deploying
4. Keep image URLs in a separate mapping file (not embedded in data)

---

## PHASE 1: AUDIT (Save checkpoint after)
- [ ] List images in Supabase storage bucket
- [ ] Count total images available
- [ ] Get sample URLs to verify format
- [ ] Document bucket structure

**Checkpoint File:** Save results to `docs/IMAGE_AUDIT_RESULTS.md`

---

## PHASE 2: URL MAPPING (Save checkpoint after)
- [ ] Create `lib/sound-games/word-images.ts` 
- [ ] Map word -> Supabase URL
- [ ] Only include words that have images
- [ ] Export a simple lookup function

**Checkpoint File:** Update `docs/IMAGE_INTEGRATION_CHECKPOINT.md`

---

## PHASE 3: COMPONENT (Save checkpoint after)
- [ ] Create `components/sound-games/WordImage.tsx`
- [ ] Display image if URL exists
- [ ] Fallback to emoji if no image
- [ ] Handle loading states

**Checkpoint File:** Update `docs/IMAGE_INTEGRATION_CHECKPOINT.md`

---

## PHASE 4: INTEGRATION (Save checkpoint after)
- [ ] Update `app/games/sound-games/beginning/page.tsx`
- [ ] Replace emoji display with WordImage component
- [ ] Keep existing game logic unchanged

**Checkpoint File:** Update `docs/IMAGE_INTEGRATION_CHECKPOINT.md`

---

## PHASE 5: LOCAL TEST
- [ ] Run `npm run dev`
- [ ] Test beginning sounds game
- [ ] Verify images load
- [ ] Verify fallback works

**No deploy until this passes!**

---

## PHASE 6: DEPLOY
- [ ] Commit with clear message
- [ ] Push to main
- [ ] Monitor Railway deploy
- [ ] Test production URL

---

## Current Status: STARTING PHASE 1
