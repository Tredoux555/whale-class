# Photo Identification Regression — Triple Audit Handoff
**Date:** Apr 29, 2026  
**Author:** Claude Sonnet (Sessions 72–73)  
**For:** Claude Opus — independent audit  
**Status:** Two fixes implemented and pushed. Requesting full audit before considering this closed.

---

## The Complaint

User (Tredoux) reported after Apr 28 classroom session:
> "I was going through photos taken in my classroom today and the system got almost all of them wrong. Photos that it got correct in the past and wouldn't make a mistake with — all wrong."

He suspected the tier-system testing (Whale Class was temporarily put on "core" AI tier) had corrupted something.

---

## Part 1: What Was Ruled Out

### Tier System (NOT the cause)
The three-tier AI system (free/core/premium) was implemented in Session 57. It controls:
- `resolveReportModel()` — which model handles Weekly Wrap reports
- Whether teacher/parent report prose is generated
- Budget limits per school

**Photo identification is completely separate.** It is hardcoded Haiku via `app/api/montree/photo-identification/process/route.ts` and never calls `resolveReportModel()`. Putting Whale Class on "core" tier has zero effect on photo identification.

No data was lost. Visual memory was not affected. Corrections were not affected.

---

## Part 2: The Pipeline (How Photo ID Works)

Understanding this is essential to auditing the fixes.

### Two-Pass + Optional Pass 2b

```
[PHOTO UPLOADED]
        ↓
[PASS 1 — Haiku + image]
  System: "Describe ONLY what you physically see. Do not name the activity."
  Output: 2-4 sentence visual description (e.g. "The child's hands are tracing 
          individual letter shapes made of sandpaper mounted on wooden boards...")
        ↓
[PASS 2 — Haiku + text only, no image]
  Input: Pass 1 description + VISUAL_ID_GUIDE + correctionsContext + visualMemoryContext
  Tool: tag_photo → { work_name, area, confidence, observation, ... }
  Then: matchToCurriculumV2(work_name, area, curriculum, correctionsMap)
  Output: identification = { workName, haikuWorkName, confidence, matchScore, ... }
  Also: hasVisualMemoryForMatch = visualMemoryWorkNames.has(finalWorkName)
        ↓
[GATE: confidence < 0.85 OR !hasVisualMemoryForMatch?]
  NO → Pass 2b skipped
  YES → Pass 2b fires
        ↓
[PASS 2B — Haiku + image + top candidates]
  Builds up to 5 candidates from visual memory
  Shows photo again with candidates listed
  Tool: tag_photo again
  Override rule: if Pass 2b confidence > Pass 2 confidence → replace identification
        ↓
[GATE A — "trust Haiku?"]
  confidence >= 0.85 AND hasVisualMemoryForMatch
  → haiku_matched (writes work_id, done)
  → haiku_drafted (writes sonnet_draft JSON, teacher must confirm)
```

### Key Constants (process/route.ts)
- `HAIKU_TRUST_CONFIDENCE = 0.85` (raised from 0.75 on Apr 9)
- `PASS2B_CONFIDENCE_THRESHOLD = 0.85`
- `PASS2B_NO_VM_THRESHOLD = 0.75`

### Visual Memory Inclusion Rule (context-loader.ts, relaxed Apr 8)
```typescript
const VALID_SOURCES = ['teacher_setup', 'correction', 'teacher_enrichment', 'teacher_new_work'];
const isTeacherValidated = VALID_SOURCES.includes(m.source) && (m.description_confidence || 0) >= 0.75;
if (!m.is_custom && !isTeacherValidated) continue;
// Then: visualMemoryWorkNames.add(m.work_name) — ALL eligible, not capped
// But: verifiedEntries.slice(0, 20) — only 20 injected into PROMPT
```

Whale Class visual memory state (as of Apr 28):
- 90 total entries
- 65 eligible (teacher_setup=18, teacher_new_work=42, teacher_enrichment=3, is_custom=some)
- 26 onboarding entries (conf=0.8, source='onboarding') — NOT included (not in VALID_SOURCES)
- Top 20 injected into prompt (ordered by description_confidence DESC, updated_at DESC)

### matchToCurriculumV2 (work-matching.ts)
- Searches `curriculum` array for best match
- Word-level matching: each shared word (>2 chars) = +0.3 score
- Candidates filtered at `score > 0.2`
- If area-constrained best < 0.5 → retry with full curriculum
- Returns `{ bestMatch: CurriculumWork | null, bestScore: number }`
- `finalWorkName = matchResult.bestMatch?.name || validated.work_name`

**Critical:** If `bestMatch` is null (score ≤ 0.2 for all candidates), falls back to raw Haiku output — correct behavior. But if ANY word from Haiku's output appears in a curriculum work name and scores > 0.2, that work is returned as bestMatch — even if it's completely wrong.

---

## Part 3: Root Cause 1 — Custom Works Not In Static Curriculum

### The Bug

`loadAllCurriculumWorks()` reads from 5 static JSON files:
- `lib/curriculum/data/language.json` (43 works)
- `lib/curriculum/data/practical_life.json`
- `lib/curriculum/data/sensorial.json`
- `lib/curriculum/data/mathematics.json`
- `lib/curriculum/data/cultural.json`
- Total: ~329 works

These are the standard Montessori curriculum works. They do NOT contain teacher-created custom works.

Whale Class has **42 custom works** stored in `montree_classroom_curriculum_works` (with `is_custom=true` and `work_key` prefixed `custom_`). These are also in visual memory with `source='teacher_new_work'`.

### What Happened

When Haiku correctly identified a custom work (e.g. "Popsicle Letter Sorting Work" with confidence=0.85+), `matchToCurriculumV2` searched the static 329 and couldn't find it. But instead of returning `bestMatch=null` and falling back to the raw Haiku name, it found weak word-level matches:

- "Popsicle Letter Sorting Work" → "sorting" appears in "Sorting Grains" → score 0.3 > 0.2 → `proposed_name = "Sorting Grains"` ❌
- "Popsicle Letter Sorting Work" → "work" appears in "Clock Work" (cultural area) → score 0.3 > 0.2 → `proposed_name = "Clock Work"` ❌
- "Bingo Phonics Review" → no word matches > 0.2 in static curriculum → falls back to raw name → `proposed_name = "Bingo Phonics Review"` ✓ (correct behavior)

After the match corruption, `proposed_name` is wrong → `hasVisualMemoryForMatch` checks the SET for "Sorting Grains" → not in set → false → Gate A fails → haiku_drafted with wrong name.

### Evidence From Today's Photos
From investigating actual `montree_media` rows for Apr 28:
- Photos tagged `haiku_drafted` with `sonnet_draft.proposed_name='Sorting Grains'` but teacher context clearly "Popsicle Letter Sorting Work"
- Photos tagged `haiku_drafted` with `proposed_name='Clock Work'` for what the teacher knows is a language sorting activity

### The Fix (commit ac8db5e0)
In `process/route.ts`, after `loadAllCurriculumWorks()`, query `montree_classroom_curriculum_works` for `is_custom=true` rows and append them to the curriculum array:

```typescript
const curriculum = [...loadAllCurriculumWorks()];

if (media.classroom_id) {
  const { data: classroomWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('name, work_key, area:montree_classroom_curriculum_areas!area_id(area_key)')
    .eq('classroom_id', media.classroom_id)
    .eq('is_custom', true);

  if (classroomWorks && classroomWorks.length > 0) {
    const existingKeys = new Set(curriculum.map(w => w.work_key));
    for (const cw of classroomWorks) {
      if (!existingKeys.has(cw.work_key)) {
        curriculum.push({
          area_key: (cw.area as { area_key: string } | null)?.area_key || 'unknown',
          work_key: cw.work_key,
          name: cw.name,
          aliases: [],
          sequence: 999999,
          category_name: 'Custom',
          age_range: '3-6',
        });
      }
    }
  }
}
```

**Why this works:** Custom works now get exact name match (score=1.0 — every word matches) instead of garbage word-level matches. `proposed_name` correctly = "Popsicle Letter Sorting Work" → `hasVisualMemoryForMatch` = true (it IS in visual memory set) → Gate A can pass → `haiku_matched`.

### Questions for Opus to Audit on Fix 1

1. **Does `matchToCurriculumV2` actually return score=1.0 for an exact name match?** Review `lib/montree/work-matching.ts`. If the word scoring is `shared_words * 0.3`, a 4-word title like "Popsicle Letter Sorting Work" could score 4 * 0.3 = 1.2, capped to 1.0? Or is the score calculated differently? Confirm it doesn't have issues with exact matches.

2. **The area join query** — `area:montree_classroom_curriculum_areas!area_id(area_key)` — does this reliably return the area_key for all custom works? What if a custom work's area_id is null or points to a deleted area? Confirm the fallback `|| 'unknown'` handles this gracefully.

3. **Non-custom standard works** — The query only fetches `is_custom=true`. Could there be standard works that are in `montree_classroom_curriculum_works` but NOT in the static JSON? (e.g. classroom-added standard works with `is_custom=false`). If so, those would still suffer the same bug. Should the query fetch ALL classroom works, not just custom ones? The `existingKeys` deduplication check prevents duplicates either way.

4. **Performance** — This adds one DB query per photo identification. For a classroom with 42 custom works, this is negligible. But is the query efficient enough? Does `montree_classroom_curriculum_works` have an index on `(classroom_id, is_custom)`?

5. **Edge case: classroom_id is null** — The fix is wrapped in `if (media.classroom_id)`. What happens to photos uploaded without a classroom_id? They process with only the static curriculum (same as before). Is this acceptable?

---

## Part 4: Root Cause 2 — Pass 2b Degrading Standard Works

### The Bug

Pass 2b fires when `confidence < 0.85 OR !hasVisualMemoryForMatch`. For Sandpaper Letters specifically:
- Pass 2 correctly identifies "Sandpaper Letters" with confidence, say, 0.82 (just under threshold)
- Pass 2b fires
- **Bug A**: `buildPass2bCandidates` parsed visual memory context to extract candidate descriptions, but only captured `LOOKS LIKE` — it stripped `KEY MATERIALS` and `DISTINGUISH FROM`
- So Sandpaper Letters candidate A shows: `LOOKS LIKE: A child tracing individual letter shapes with roughened surfaces...`
- Blue Series (Blends) candidate B shows: `LOOKS LIKE: A child working with letter tiles on cards...`
- Both mention letters. Without "sandpaper texture" in KEY MATERIALS, they look confusingly similar to Haiku
- **Bug B**: Override threshold was `validated.confidence > identification.confidence` — any improvement, even 0.01, was enough to override
- Pass 2b picks Blue Series at 0.83 (marginally more confident) → overrides → `proposed_name = "Blue Series (Blends)"` ❌

### Why This Is Intermittent / Became Worse Recently

Two timeline events made this worse:
1. **Apr 8**: Visual memory inclusion filter relaxed — teacher_enrichment added, confidence bar dropped 0.9→0.75. This changed which works appear in the top-20 prompt and in what order, changing the Pass 2b candidate set.
2. **Apr 9**: HAIKU_TRUST_CONFIDENCE raised 0.75→0.85. More photos now fall below the Gate A threshold, meaning more Pass 2b activations. Before this change, a 0.82 confidence photo would have passed Gate A; now it triggers Pass 2b.

The combination: more photos hit Pass 2b, and the candidate descriptions are impoverished.

### Evidence

From the investigation of actual failing photos:
- Photos of Sandpaper Letters processed through Pass 2b (`pass2bFired=true, pass2bImproved=true`)
- `proposed_name` came out as "Blue Series (Blends)" even though visual description clearly described sandpaper texture

### The Fix (commit 91b070de)

**Fix A — Rich candidate descriptions in Pass 2b:**

`extractVisualMemoryEntry()` now captures all three fields:
```typescript
function extractVisualMemoryEntry(context: IdentificationContext, workName: string): string {
  const pattern = new RegExp(`- "${escaped}"[^]*?LOOKS LIKE:\\s*([^\\n]+)(?:\\n\\s+KEY MATERIALS:\\s*([^\\n]+))?(?:\\n\\s+DISTINGUISH FROM:\\s*([^\\n]+))?`, 'i');
  const match = context.visualMemoryContext.match(pattern);
  if (!match) return '';
  const parts = [`LOOKS LIKE: ${match[1].trim()}`];
  if (match[2]) parts.push(`KEY MATERIALS: ${match[2].trim()}`);
  if (match[3]) parts.push(`DISTINGUISH FROM: ${match[3].trim()}`);
  return parts.join(' | ');
}
```

Secondary candidates (Priority 2, from the VM context loop) also now capture KEY MATERIALS and DISTINGUISH FROM via the `flushCurrentWork()` refactor.

**Fix B — Stricter override threshold:**
```typescript
// Before:
if (validated.confidence > identification.confidence) {
// After:
if (validated.confidence >= identification.confidence + 0.05) {
```

**Why +0.05?** Haiku's self-reported confidence scores are not highly precise — the difference between 0.82 and 0.83 is noise. A +0.05 margin means Pass 2b has to be meaningfully more sure to override. It won't prevent Pass 2b from improving a 0.60 identification to 0.85+.

### Questions for Opus to Audit on Fix 2

1. **The regex in `extractVisualMemoryEntry`** — The pattern `[^]*?` is a dotall workaround in JavaScript (`.` doesn't match newlines by default). Does `[^]*?` actually match across multiple lines correctly? Could this regex fail to capture KEY MATERIALS if there are blank lines between LOOKS LIKE and KEY MATERIALS in the context string? Review how `context-loader.ts` formats the entries (around line 156) and verify the regex handles it.

2. **`flushCurrentWork()` refactor** — The Priority 2 parsing loop was refactored to extract KEY MATERIALS and DISTINGUISH FROM. Verify the regex patterns correctly match the indented format from context-loader.ts:
   - Header: `- "WorkName" (area):` (no leading spaces)
   - Content: `  LOOKS LIKE: ...` (2 spaces indent)
   - Content: `  KEY MATERIALS: ...` (2 spaces indent)
   - Content: `  DISTINGUISH FROM: ...` (2 spaces indent)
   The patterns used are:
   - `looksLikeMatch = line.match(/^\s+LOOKS LIKE:\s*(.+)/)`
   - `keyMatsMatch = line.match(/^\s+KEY MATERIALS:\s*(.+)/)`
   - `distinguishMatch = line.match(/^\s+DISTINGUISH FROM:\s*(.+)/)`
   Does `\s+` correctly match 2 spaces? Yes, but double-check the actual indentation in the context string.

3. **The +0.05 threshold** — Is 0.05 the right number? Too high and Pass 2b never improves anything useful. Too low and it still allows marginal overrides. Consider: if Pass 2 gives 0.65 and Pass 2b gives 0.69, should Pass 2b override? At 0.65 both are uncertain. The 0.05 margin would NOT override in this case (0.69 < 0.65 + 0.05 = 0.70). Is that the right call? Alternatively, should the threshold be: "only override if Pass 2b would push to haiku_matched territory (≥0.85)" OR "override only if improvement is ≥0.05"?

4. **Candidate Priority 1** — Pass 2b's first candidate is always Haiku's Pass 2 guess IF it has visual memory. If Sandpaper Letters was the Pass 2 guess and IS in visual memory, it gets candidate A with its full description. So in the Sandpaper Letters case, candidate A is "Sandpaper Letters" with full KEY MATERIALS. Candidate B might be "Blue Series". Would giving Pass 2b the full description for candidate A (Sandpaper Letters) + the +0.05 threshold be sufficient to prevent the swap? Or could Haiku still pick B (with impoverished description from the secondary parsing) over A?

5. **What if visualMemoryContext is empty for the work?** If a work has an entry in `visualMemoryWorkNames` but its description isn't in the 20-entry prompt (e.g. it was cut off by the `slice(0, 20)` cap), `extractVisualMemoryEntry()` returns empty string. The candidate would show empty `looksLike`. Does `buildPass2bCandidates` handle this? It checks `if (vmEntry)` before adding to candidates from the extractVisualMemoryEntry path, so an empty string would cause candidate A to be skipped. Then Pass 2b would run with only Priority 2 candidates (no Haiku's original guess). Is that the correct fallback?

---

## Part 5: Things That Were NOT Changed But Might Need Attention

### HAIKU_TRUST_CONFIDENCE = 0.85 — Is This Still Right?

On Apr 9, this was raised from 0.75 to 0.85 after "Sandpaper Letters was auto-tagged as Metal Insets." But the Sandpaper Letters misidentification we just investigated happened AFTER this raise — and Pass 2b caused it, not weak Gate A filtering.

With Fix 2 (richer Pass 2b context + stricter override), Sandpaper Letters should now correctly exit Pass 2b still as Sandpaper Letters. Gate A would then see: confidence=0.82 AND hasVM=true. With threshold at 0.85, this still FAILS Gate A (0.82 < 0.85) → haiku_drafted.

**Question:** Should HAIKU_TRUST_CONFIDENCE be lowered back toward 0.80? The Apr 9 justification (Metal Insets confusion) was caused by a different mechanism than what we've now fixed. If the Pass 2b fix prevents false overrides, the original 0.75 threshold might be safe again, or something in between like 0.80.

**Opus should reason:** At 0.85, any photo where Haiku is 83% confident (which is pretty confident) goes to haiku_drafted and requires teacher review. Is that appropriate? Or is it creating unnecessary teacher workload for photos that are almost certainly correct?

### `buildPass2bCandidates` — Priority 2 Order

Priority 2 candidates come from parsing `context.visualMemoryContext` in order, which reflects `description_confidence DESC, updated_at DESC` ordering from the DB query. This means the most recently updated, highest-confidence works dominate the candidate list. Is this the right prioritization for Pass 2b candidates? Or should candidates be semantically related to what Haiku guessed in Pass 2?

For example: if Haiku guessed "Sandpaper Letters" (language area), the other 4 candidates might be Moveable Alphabet, Metal Insets, Fabric Matching, Sorting Grains — works from different areas. It might be more useful to fill candidates with other LANGUAGE area works that have visual memory, since the confusion is most likely to be within-area.

### visual memory cap: 20 entries in prompt but ALL in set

```typescript
const capped = verifiedEntries.slice(0, 20);  // 20 in PROMPT
visualMemoryWorkNames.add(m.work_name);         // ALL eligible in SET
```

Whale Class has 65 eligible VM entries but only 20 get injected into the Pass 2 prompt. The other 45 are in `visualMemoryWorkNames` but NOT described in the prompt. This means:

- If Haiku identifies work #35 (not in top 20 prompt entries) with confidence=0.86, `hasVisualMemoryForMatch=true` (it's in the set) → Gate A passes → `haiku_matched`.
- But Pass 2 never SAW a description of that work in the prompt — it matched it from the visual guide or its own knowledge. Is this a valid "trust"?

Conversely: a work at position 21 is in the set but its description wasn't shown. If it gets identified at 0.82, Pass 2b fires and tries to help — but without that work's description in the context, it can't appear as a candidate in Pass 2b either.

**Opus should consider:** Is the set/prompt split coherent? Should `visualMemoryWorkNames` be capped to match the prompt (i.e., only works whose descriptions ARE in the prompt count as "has visual memory for Gate A purposes")?

---

## Part 6: Complete File Change Summary

### Commit ac8db5e0 — process/route.ts

**Before:**
```typescript
const curriculum = loadAllCurriculumWorks();
```

**After:**
```typescript
const curriculum = [...loadAllCurriculumWorks()];

if (media.classroom_id) {
  const { data: classroomWorks } = await supabase
    .from('montree_classroom_curriculum_works')
    .select('name, work_key, area:montree_classroom_curriculum_areas!area_id(area_key)')
    .eq('classroom_id', media.classroom_id)
    .eq('is_custom', true);

  if (classroomWorks && classroomWorks.length > 0) {
    const existingKeys = new Set(curriculum.map(w => w.work_key));
    for (const cw of classroomWorks) {
      if (!existingKeys.has(cw.work_key)) {
        curriculum.push({
          area_key: (cw.area as { area_key: string } | null)?.area_key || 'unknown',
          work_key: cw.work_key,
          name: cw.name,
          aliases: [],
          sequence: 999999,
          category_name: 'Custom',
          age_range: '3-6',
        });
      }
    }
    console.log(`[PhotoIdentification] Loaded ${classroomWorks.length} custom classroom works into curriculum (total: ${curriculum.length})`);
  }
}
```

### Commit 91b070de — two-pass.ts

Three changes:
1. `extractVisualMemoryEntry()` — now returns LOOKS LIKE + KEY MATERIALS + DISTINGUISH FROM joined by " | "
2. Priority 2 loop in `buildPass2bCandidates()` — refactored to a `flushCurrentWork()` closure that captures all three VM fields
3. Pass 2b override condition — changed from `> identification.confidence` to `>= identification.confidence + 0.05`

---

## Part 7: What Opus Should Verify

### Priority 1 — Correctness
1. Re-read `lib/montree/work-matching.ts` in full. Does `matchToCurriculumV2` return score=1.0 for exact matches, and score > 0.2 for single-word matches? Confirm the fix actually produces higher scores for custom works.
2. Verify the regex in `extractVisualMemoryEntry()` correctly captures KEY MATERIALS and DISTINGUISH FROM across the actual format written by `context-loader.ts` line 156. Cross-check context-loader's exact format string.
3. Verify the Priority 2 parsing loop (`flushCurrentWork`) correctly handles: works with no KEY MATERIALS, works with no DISTINGUISH FROM, the last entry in the loop (flush after loop ends), and the `candidates.length >= 5` break condition.

### Priority 2 — Edge Cases
4. What happens if `classroomWorks` contains a work whose `work_key` is already in the static curriculum (i.e. `is_custom=true` but shares a key with a standard work)? The `existingKeys` check prevents duplicates — confirm this is correct.
5. What if Pass 2 returns a work_name that exactly matches a custom work name, but `matchToCurriculumV2` has BOTH the custom work (score=1.0) AND a static work with a partial word match? Which wins? (It should be the custom work at score=1.0.)

### Priority 3 — Architecture
6. **The deeper question on visualMemoryWorkNames vs prompt cap**: Should Gate A's trust (`hasVisualMemoryForMatch`) only be granted for works whose descriptions are actually IN the Pass 2 prompt? If Haiku identified work #35 (in the set but not in the 20-entry prompt), Haiku did NOT have that work's visual description available during matching. The trust is based on VM existing but Haiku never saw it. Is that logically consistent?
7. **HAIKU_TRUST_CONFIDENCE reassessment**: Given the two fixes, is 0.85 still the right threshold? With Pass 2b now more reliable (richer context, stricter override), should the trust bar be lowered slightly so fewer photos fall to haiku_drafted status?
8. **Should ALL classroom works (not just is_custom=true) be loaded into the curriculum?** Standard works that a teacher has added to their classroom syllabus but that might have slightly different names in `montree_classroom_curriculum_works` vs the static JSON could also cause word-match mismatches. Consider whether the query should be `ALL` classroom works with deduplication, not just custom ones.

---

## Files to Read for Audit

```
lib/montree/photo-identification/two-pass.ts          — Main changes (commit 91b070de)
app/api/montree/photo-identification/process/route.ts  — Main changes (commit ac8db5e0)
lib/montree/work-matching.ts                           — matchToCurriculumV2 implementation
lib/montree/photo-identification/context-loader.ts     — VM format, inclusion rules, set vs prompt cap
lib/montree/curriculum-loader.ts                       — CurriculumWork interface, loadAllCurriculumWorks()
```

---

## Summary of Conclusions

| Issue | Affected Works | Fix | Commit |
|-------|---------------|-----|--------|
| Custom works not in static curriculum → garbage word-match | All 42 teacher_new_work entries (Popsicle Letter Sorting, etc.) | Load is_custom works from DB into curriculum array | ac8db5e0 |
| Pass 2b stripping KEY MATERIALS → similar-work confusion | Standard works with similar-named curriculum neighbors (Sandpaper Letters, etc.) | Extract all 3 VM fields for candidates | 91b070de |
| Pass 2b overriding on trivial confidence margin | Any work where Pass 2b fires | Require +0.05 margin to override | 91b070de |

**Open questions for Opus to resolve:**
- Is the VM set/prompt cap split logically consistent for Gate A trust?
- Should HAIKU_TRUST_CONFIDENCE be reassessed post-fix?
- Should the curriculum extension query include ALL classroom works, not just custom?
- Is the +0.05 Pass 2b margin the right value, or should the condition be "only override if reaching ≥0.85"?
