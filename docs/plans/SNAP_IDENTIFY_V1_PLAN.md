# Snap & Identify — Plan v2 (Post Audit Round 1)

## Vision
One photo replaces the teacher's entire observation-analysis-planning workflow. Teacher snaps a photo of a child's work → Sonnet identifies the work, writes detailed observation notes, analyses the child's strengths and weaknesses across ALL areas, compares against historical progress, identifies cross-area support needs, updates progression, saves the photo for parent reports, and generates weekly admin narrative content.

This is NOT "identify a work from a photo." This is "do everything a teacher would do after observing a child working, but from a single photo."

---

## Audit Round 1 — Findings

### GAPS FOUND (9 issues)

**1. NORMALIZATION MISSING (CRITICAL)**
The most important Montessori observation concept is NORMALIZATION — the process by which a scattered/deviated child becomes calm, focused, and joyful through concentrated work. The plan's observation section captures concentration and independence but doesn't explicitly ask: "Is this child showing signs of normalization?" This is THE thing AMI teachers look for. The observation should classify the child's state on the normalization spectrum.

**2. SENSITIVE PERIODS NOT INTEGRATED (HIGH)**
Plan mentions "sensitive periods context (from age)" in Step 3 but the tool schema doesn't output anything about sensitive periods. We have `getActiveSensitivePeriods(ageMonths)` — the analysis should tell the teacher if this work ALIGNS with the child's active sensitive periods. E.g., a 2-year-old doing Pouring is perfectly aligned with both Movement and Order sensitive periods at peak.

**3. PREREQUISITES NOT CHECKED (HIGH)**
The curriculum data has `prerequisites` for each work. Cross-area analysis mentions foundation gaps but doesn't leverage the actual prerequisite data from the curriculum JSON. Should check: has this child mastered the stated prerequisites?

**4. CONTROL OF ERROR NOT LEVERAGED (MEDIUM)**
Plan mentions "self-correcting?" observation but doesn't use the curriculum's `control_of_error` field for each work. The system prompt should tell Sonnet WHAT the control of error IS for the identified work, so it can assess whether the child is engaging with it.

**5. WORK CYCLE PHASE MISSING (MEDIUM)**
AMI teachers observe the WORK CYCLE: selection → preparation → work → repetition → restoration (cleanup). A photo captures one moment, but the observation should try to infer which phase the child is in. A child setting up materials vs actively working vs cleaning up tells you very different things.

**6. VARIATIONS/EXTENSIONS NOT USED (MEDIUM)**
Curriculum has `variations` and `extensions` per work. If child appears to have mastered the base exercise, recommendations should include specific variations/extensions from the data — not generic "try the next work."

**7. MENTAL PROFILE NOT INTEGRATED (LOW)**
The `buildChildContext()` function gathers temperament, learning modality, baseline focus, and optimal time. Plan doesn't mention using mental profile data. For a teacher doing 5-10 snaps/day this adds token cost, but the analysis would be richer.

**8. TOKEN BUDGET UNDERESTIMATED (LOW)**
Plan says ~4000 input tokens. But: 329-work catalog ≈ 2000 tokens, full progress history ≈ 1000, child context ≈ 500, system prompt ≈ 1000, observations ≈ 500. Real input: ~5000-6000 tokens. Output ~3000. Total ~8000-9000 tokens per snap. Cost ~$0.03-0.04 per snap. Still acceptable.

**9. IMAGE SOURCE (LOW)**
v0 uses `source: { type: 'url', url: photoUrl }` — requires public URL. Supabase storage URLs are public by default for the `montree-media` bucket. This works, but we should verify the URL is immediately available after upload (no propagation delay). Alternative: send base64, but that doubles token count for the image.

### PLAN STRENGTHS (kept as-is)
- Vision is correct — comprehensive teacher replacement
- Tool_use schema structure is sound
- Parallel DB query approach is efficient
- Cross-area dependency map is valuable
- Edge cases are well thought out
- File change scope is minimal (2 rewrites + i18n)
- No new migrations needed

---

## What the new version must do (v2 — post-audit)

### 1. IDENTIFY — Same as v0 but with richer context
- Match photo to exact curriculum work name (329 works)
- Area + status + confidence level

### 2. DEEP OBSERVATION NOTES (AMI Standard)
Real AMI observation notes — what a trained Montessori guide records:
- **Normalization state**: Is this child normalized (calm, focused, purposeful) or showing deviation (scattered, dependent, resistant)?
- **Work cycle phase**: Selection / preparation / active work / repetition / restoration
- Grip/hand position (pencil grip, pincer grasp, whole-hand)
- Body posture and concentration level
- Repetition count if visible
- Control of error engagement — is the child using the work's built-in self-correction mechanism? (We'll tell Sonnet what it is)
- Independence level (working alone? seeking help?)
- Emotional state (calm focus, frustration, joy, uncertainty)
- **Points of interest** the child appears engaged with (from curriculum data)

### 3. SENSITIVE PERIOD ALIGNMENT
Check the child's age against active sensitive periods and note whether this work channels an active period. E.g., "This work aligns with [child]'s peak Order sensitive period (18-30 months)" or "Consider: [child] is in peak Language period but this work is in Mathematics — are there language works being offered too?"

### 4. HISTORICAL COMPARISON — "Where is this child?"
Query the child's FULL progress history and compare:
- How long have they been on this work? (presented_at → now)
- How many works mastered in this area vs others?
- Is this area ahead/behind their overall progression?
- What was their last mastered work in this area? How long ago?
- Pattern: Are they stuck? Accelerating? Regressing?
- **Prerequisite check**: Has the child mastered the stated prerequisites for this work? If not, flag it.

### 5. CROSS-AREA ANALYSIS — "What supports this?"
Montessori areas are interconnected. If a child struggles:
- Do they have enough Sensorial foundation? (grading, ordering)
- Is their Practical Life strong enough? (concentration, sequencing)
- Does Language lag suggest attention/processing issues?
- **Use actual prerequisite data** from curriculum JSON, not just hardcoded area dependencies
- Identify which areas SUPPORT the observed work and whether the child has adequate foundation.

### 6. STRENGTHS & WEAKNESSES SUMMARY
Per-area breakdown:
- Total mastered/practicing/presented per area
- Relative strength (which areas are ahead)
- Relative weakness (which areas need attention)
- Specific works that should be next in weak areas

### 7. NEXT STEPS RECOMMENDATIONS
Specific, not generic:
- What's the next logical work in this area's curriculum sequence?
- Should we stay on this work longer? (based on observation)
- **If near mastery, suggest specific variations/extensions** from curriculum data
- Are there prerequisite works in other areas to address first?
- Should we consider presentations in weaker areas?

### 8. WEEKLY ADMIN NARRATIVE
Generate a copy-paste paragraph for the child's weekly admin report:
- What was observed
- Progress made
- Areas of focus
- Written in the style the weekly-admin system already uses
- Bilingual (EN/ZH based on school locale)

### 9. SAVE EVERYTHING
- Photo → montree_media (with work name in caption, tagged 'snap-identify')
- Progress → montree_child_progress (upsert with presentation/mastery protection)
- Observation → montree_behavioral_observations (detailed AMI-style notes)
- Interaction → montree_guru_interactions (full context snapshot)
- Weekly narrative snippet → child settings (guru_snap_narratives array, appended)

---

## Architecture

### API Route: `/api/montree/guru/snap-identify/route.ts` (REWRITE)

**Input:** FormData with `file` (image) + `child_id`

**Step 1 — Upload & Save Photo** (same as v0)
Upload to Supabase storage → save to montree_media → get public URL.

**Step 2 — Gather Deep Child Context** (EXPANDED)
Parallel queries (7 queries):
1. `montree_children` → name, age, date_of_birth, classroom_id
2. `montree_child_progress` → ALL records with timestamps (presented_at, mastered_at, updated_at, notes)
3. `montree_child_focus_works` → current shelf
4. `montree_behavioral_observations` → last 10 observations (for pattern comparison)
5. `montree_guru_interactions` → last 5 snap_identify results (for tracking trajectory)
6. School settings → locale (via classroom → school join)
7. `montree_child_mental_profiles` → temperament + learning modality (optional — only if exists)

**Step 3 — Build Analysis Context** (SERVER-SIDE, before Sonnet call)
Compute these on the server to reduce what Sonnet needs to figure out:
- Per-area counts: `{ mastered, practicing, presented, not_started }` for each of 5 areas
- Per-area timeline: when was last mastery? last presentation?
- Total mastered across all areas
- Area strength ranking (by mastered count relative to total works in area)
- Cross-area dependency map (hardcoded Montessori knowledge):
  - Mathematics depends on: Sensorial (grading), Practical Life (sequence)
  - Language depends on: Sensorial (auditory discrimination), Practical Life (fine motor)
  - Cultural depends on: Language (vocabulary), Sensorial (observation)
- Active sensitive periods (from `getActiveSensitivePeriods(ageMonths)`)
- Recent observations summary (patterns in last 10)
- Curriculum metadata for likely works (load ALL works, include prerequisites, control_of_error, variations, extensions)

**Step 4 — Sonnet Vision Call** (EXPANDED tool schema)

System prompt includes:
- Compact curriculum catalog (names + areas only — for identification)
- Pre-computed analysis context (area counts, strength ranking, sensitive periods)
- Control of error for the top 5 likely works (based on current shelf)
- Prerequisites for the identified work (injected after identification... actually we can't do this in a single call)

**KEY ARCHITECTURE DECISION**: Single Sonnet call vs two calls?
- **Option A**: Single call with ALL context upfront. Pro: faster, cheaper. Con: Sonnet gets the curriculum catalog + child context in one massive prompt. ~6000 input tokens.
- **Option B**: Two calls — first identifies the work (fast, small prompt), second does deep analysis with work-specific data (prerequisites, control_of_error, variations). Pro: second call has laser-focused context. Con: 2x latency, 2x API calls.
- **DECISION**: Single call. We can include the full context compactly. 6000 input tokens is fine for Sonnet. Two calls would double latency from ~5s to ~10s. The teacher is waiting.

Single tool_use call with rich output schema:

```typescript
{
  // Identification
  work_name: string,          // EXACT name from catalog
  area: string,               // practical_life | sensorial | mathematics | language | cultural
  status: string,             // presented | practicing | mastered
  confidence: string,         // high | medium | low

  // Deep observation (AMI standard)
  observation: {
    normalization: string,      // "normalized" | "normalizing" | "deviated" — THE key Montessori indicator
    work_cycle_phase: string,   // "preparation" | "active_work" | "repetition" | "restoration" | "unclear"
    technique_notes: string,    // Grip, posture, hand position, method
    concentration_level: string, // "deep" | "moderate" | "surface" | "distracted"
    independence_level: string,  // "independent" | "minimal_help" | "guided" | "dependent"
    emotional_state: string,     // "calm_focus" | "engaged" | "frustrated" | "joyful" | "uncertain"
    repetition_noted: boolean,   // Visible repetition?
    self_correcting: boolean,    // Engaging with control of error?
    control_of_error_notes: string, // What specific self-correction was observed (or "not visible")
    detailed_notes: string,      // Full AMI-style observation paragraph (3-5 sentences)
  },

  // Sensitive period alignment
  sensitive_period_alignment: string, // "Aligns with peak Order period" or "No specific alignment"

  // Historical analysis (Sonnet interprets pre-computed data)
  analysis: {
    time_on_work: string,        // "2 weeks since presented" or "first observation"
    area_progress_summary: string, // "3 of 12 Practical Life works mastered..."
    relative_strength: string,     // "Sensorial is strongest (8 mastered), Language weakest (1)"
    trajectory: string,            // "accelerating" | "steady" | "plateau" | "first_observation"
    prerequisite_status: string,   // "All prerequisites mastered" or "Missing: Brown Stair, Pink Tower"
    comparison_to_past: string,    // Comparison to recent observations
  },

  // Cross-area support
  cross_area: {
    supporting_areas: string[],     // Areas that support this work
    foundation_gaps: string[],      // "Sensorial grading not yet mastered — consider Brown Stair"
    recommended_support_works: Array<{ work_name: string, area: string, reason: string }>,
  },

  // Next steps
  next_steps: {
    stay_or_advance: string,        // "stay" | "advance" | "revisit_prerequisites" | "try_variation"
    reason: string,                  // Why this recommendation
    next_work_in_area: string,       // The specific next work in curriculum sequence
    suggested_variations: string[],  // If near mastery — from curriculum data
    priority_actions: string[],      // Top 3 things teacher should do
  },

  // Weekly admin content
  weekly_narrative: string,          // Copy-paste paragraph for weekly report
  weekly_narrative_zh: string,       // Chinese version (if school locale is zh)
}
```

**Step 5 — Write to DB** (same pattern, richer data)
- Progress upsert with mastery/presentation protection
- Observation with full detailed_notes (prefixed with [Snap Identify])
- Media caption update with work name
- Guru interaction log with full context_snapshot
- Append weekly_narrative to child settings `guru_snap_narratives` array (JSONB append via RPC or read-modify-write)

**Step 6 — Return rich response to UI**

### UI Page: `/montree/dashboard/snap/page.tsx` (REWRITE)

**Flow unchanged:** Select child → Camera → Analyze → Results

**Results page redesigned** with expandable sections:
1. **Photo + Work ID card** (identified work, area badge, status, confidence)
2. **Observation Notes** (expandable — detailed AMI notes including normalization state + work cycle phase)
3. **Sensitive Period** (if aligned — one-line callout with emoji)
4. **Strengths & Weaknesses** (per-area progress bars + relative ranking)
5. **Cross-Area Analysis** (which areas support/gap, recommended works)
6. **Next Steps** (stay/advance/variation, next work, priority actions)
7. **Weekly Admin** (copy-paste narrative with copy button, toggle EN/ZH)
8. **Action buttons** (Snap another same child, Change child, View full progress)

### Token Budget (revised)
- System prompt + instructions: ~1500 tokens
- Curriculum catalog (329 works, names only): ~2000 tokens
- Pre-computed analysis context: ~1000 tokens
- Child progress + observations: ~1000 tokens
- Image: Sonnet vision handles natively (not counted as text tokens)
- **Total input: ~5500 tokens**
- Output (rich schema): ~3000 tokens
- **Total: ~8500 tokens ≈ $0.03-0.04 per snap**
- Teacher doing 5-10/day = $0.15-0.40/day (acceptable)

### Files to modify
1. `app/api/montree/guru/snap-identify/route.ts` — FULL REWRITE
2. `app/montree/dashboard/snap/page.tsx` — FULL REWRITE (richer results UI)
3. `lib/montree/i18n/en.ts` — Add ~20 more keys for new sections
4. `lib/montree/i18n/zh.ts` — Matching Chinese keys

### Files unchanged
- `components/montree/DashboardHeader.tsx` — Already wired (📸 icon)
- `lib/montree/curriculum-loader.ts` — Used as-is (loadAllCurriculumWorks, findCurriculumWorkByName)
- `lib/montree/guru/knowledge/sensitive-periods.ts` — Used as-is (getActiveSensitivePeriods)
- No new migrations needed — uses existing tables
- No new dependencies

---

## Edge Cases
1. Photo is not a Montessori work → confidence "low", generic observation notes (still useful — teacher can correct)
2. Work not in 329 catalog → closest match + note, or flag as custom work
3. Child has zero progress history → "first_observation" trajectory, skip comparisons, encourage baseline data
4. Multiple works visible → identify primary, note secondary in observation
5. Photo is blurry/unclear → return error with retry prompt
6. Child in the photo (face visible) → observe behavior but don't store facial data
7. School locale not set → default to English, skip zh narrative
8. No date_of_birth → use stored `age` field (integer years), estimate months as 6, note sensitive period data is approximate
9. Mental profile doesn't exist → skip temperament context, no error
10. Prerequisites not in DB (custom work) → skip prerequisite check
11. Supabase URL not immediately accessible → Consider adding 500ms delay before Sonnet call, or use base64 fallback

---

## Audit Round 2 — Findings (Architecture + Token Optimization)

### Issues found (5, all addressed below)

**1. TOKEN OPTIMIZATION — COMPACT CATALOG (HIGH)**
Sending 329 work names with descriptions = ~2000 tokens. Solution: ultra-compact format — just area abbreviation + work names, no descriptions.
Format: `PL: Pouring, Spooning, Buttoning... | S: Pink Tower, Brown Stair...`
Estimated: ~800 tokens. Saves 1200 tokens per call.

**2. CURRICULUM METADATA TIMING (MEDIUM)**
Can't include prerequisites/control_of_error for the identified work before identification happens. Solution: include metadata only for the child's current focus works (likely matches) + top 5 works in each area the child has been working in. Covers most identifications. ~500 tokens for ~10-15 works' metadata.

**3. BILINGUAL CONDITIONAL (LOW)**
Skip `weekly_narrative_zh` entirely when school locale is EN. Saves ~200 output tokens for English-only schools.

**4. JSONB APPEND STRATEGY (LOW)**
Use read-modify-write for `guru_snap_narratives` array. Race conditions negligible (one teacher per child). No RPC needed.

**5. TIMEOUT UX (MEDIUM)**
Sonnet vision call will take 8-15 seconds. UI should show progress phases even for a single API call: "Uploading photo..." (during FormData POST) → "Analyzing..." (waiting for response). The API itself doesn't need streaming — one JSON response is fine.

### Final Token Budget (optimized)
- System prompt + AMI instructions: ~1200 tokens
- Compact curriculum catalog: ~800 tokens
- Pre-computed analysis context (area counts, strength ranking, sensitive periods): ~800 tokens
- Child progress + focus works + recent observations: ~800 tokens
- Curriculum metadata for ~15 likely works: ~500 tokens
- **Total input: ~4100 tokens**
- Output (rich schema): ~2500-3000 tokens
- Image: billed separately by Anthropic (~1600 tokens equivalent for a photo)
- **Total billed: ~8000-9000 tokens ≈ $0.03-0.04 per snap**

---

## 3×3 System Progress
- [x] Plan Round 1 — Written
- [x] Audit Round 1 — 9 gaps found, all addressed in v2
- [x] Plan Round 2 — v2 document complete
- [x] Audit Round 2 — 5 issues found, all minor/addressed
- [x] Plan Round 3 — Final lock (incorporating R2 findings)
- [x] Audit Round 3 — Final sign-off
- [x] Build Round 1 — API route full rewrite (~450 lines)
- [x] Build Audit 1 — 7 issues found: CRITICAL broken parallel query, HIGH race condition, HIGH unsanitized ext, MEDIUM no rate limit, MEDIUM classroom_id null, LOW module cache. All fixed.
- [x] Build Round 2 — Fixed all 7 audit findings + UI page full rewrite with expandable sections
- [ ] Build Audit 2
- [ ] Build Round 3
- [ ] Build Audit 3
