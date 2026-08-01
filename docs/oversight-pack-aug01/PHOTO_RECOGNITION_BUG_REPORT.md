# Bug report: new work not recognised after being added to the curriculum

**Investigated by:** Sonnet scout (very thorough sweep of the source snapshot) · 1 Aug 2026
**Symptom:** Photographed a new work → added it to the curriculum → photographed again → not recognised, and not shown as added.

## Root cause (most likely, high confidence)

**The generic "Add Work" modal creates the curriculum row but never seeds visual memory — so the recogniser has nothing to match the second photo against.**

The recognition pipeline (`/api/montree/photo-identification/process`) builds its candidate list fresh on every call — this is *not* a caching bug. It merges three sources: the 329-work static catalog, your classroom's custom works from `montree_classroom_curriculum_works`, and crucially the **visual descriptions** in `montree_visual_memory` / `montree_global_visual_memory`, which are what actually let the vision model recognise a specific material from pixels.

There are three ways to add a work, and they behave differently:

| Path | Creates curriculum row | Seeds visual memory | Result on next photo |
|---|---|---|---|
| "This is…" sheet on the photo (`photo-audit/resolve`, new_custom) | ✅ | ✅ (`enrich-custom-work.ts`, from the photo's own Sonnet draft) | Recognised |
| Legacy photo-insight add-custom-work | ✅ | ✅ | Recognised |
| **"Add Work" modal on the Curriculum tab** (`AddWorkModal.tsx` → `POST /api/montree/curriculum`) | ✅ | ❌ **nothing — zero photo/visual-memory code in the file** | **Not recognised** |

Your described flow — photo, then a *separate* add-to-curriculum step, then photo again — matches the third path. The work genuinely IS in your curriculum table; but the second photo's identification can't match it (no visual anchor, and the "exact-name first-sight" shortcut only works for standard materials like Pink Tower that the model already knows). So the Photo Audit UI reports it as unmatched again — which reads as "not added," even though the row exists.

## Secondary suspect (worth ruling out)

There's an orphaned legacy page (`/teacher/curriculum`, linked only from the admin nav) that writes to a **dead table** (`classroom_curriculum`) that no recognition code ever reads — and that route has **no auth at all** (already flagged CRITICAL in `docs/LEGACY_API_AUDIT.md`). If you happened to use that screen, the work never reached the real curriculum table at all. Different symptom cause, same user experience.

**One-query confirmation:** `select * from montree_visual_memory where classroom_id = '<yours>' and work_name ilike '%<the work>%';` — no row = confirmed cause #1. Also check Railway logs for `[PhotoAuditResolve] new_custom OK` vs nothing around that timestamp.

## Recommended fixes

1. **Primary:** make `AddWorkModal` seed visual memory — require (or strongly prompt for) a reference photo on manual add, and call the same seeding logic `enrich-custom-work.ts` already uses. Alternatively steer all new-work creation through the photo-anchored "This is…" flow, which is the one path proven to work end-to-end.
2. **UX stopgap (ship today):** any custom work with no `montree_visual_memory` row gets a badge in the curriculum UI — "📷 Take a photo of this work so Montree can recognise it" — closing the expectation gap immediately.
3. **Hygiene:** delete or converge the legacy `/api/classroom/[classroomId]/curriculum` route + `/teacher/curriculum` page (orphaned table + unauthenticated, independent P0).
4. Also noted: if the school is on the Haiku-only tier, recognition of novel custom materials on a cold start is inherently weaker (`resolveReportModel()` gating) — compounds the issue but isn't the root cause.
