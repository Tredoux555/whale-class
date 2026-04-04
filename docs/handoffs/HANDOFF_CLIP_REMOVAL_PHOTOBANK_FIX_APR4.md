# Handoff: CLIP/SigLIP Permanent Removal + Photo-Bank Upload Fix

**Date:** April 4, 2026
**Commits:** `83fe0f99` (main removal, prior session), `f7f01770` (audit cleanup, prior session), `2117c993` (this session — final cleanup + photo-bank fix)
**Deploy:** ✅ PUSHED. Railway auto-deploying. No migrations needed.

---

## Summary

Two changes shipped:

1. **CLIP/SigLIP classifier permanently removed** — The zero-shot visual classifier was producing noise-level similarity scores (0.0004–0.0143) across all 329 Montessori works, unable to discriminate between any of them. All code, dependencies, and i18n keys removed. The production photo identification system is now exclusively the **Haiku two-pass pipeline** (Pass 1: describe image, Pass 2: match to curriculum, ~$0.006/photo).

2. **Photo-bank upload fixed** — Teachers uploading reference photos at `/montree/library/photo-bank` got "Network error" on every upload. Root cause: POST endpoint required `verifySuperAdminPassword` auth (added during Apr 2 health check audit), but the frontend sends no super-admin headers — it's a teacher-facing page. Changed to `verifySchoolRequest` (httpOnly cookie auth that teachers already have).

---

## CLIP Removal — Full File Inventory

### Files Modified (this session — commit `2117c993`)

| File | What Changed |
|------|-------------|
| `app/api/montree/guru/photo-enrich/route.ts` | Removed `clip_confidence` from AMBER zone condition, `context_snapshot`, and response JSON. Changed `classification_method` from `'clip_enriched'` → `'haiku_enriched'` |
| `app/api/montree/guru/photo-insight/route.ts` | Updated CLIP comment to "permanently disabled Apr 4, 2026" |
| `app/montree/dashboard/photo-audit/page.tsx` | Replaced deleted i18n keys `t('audit.clipResult')` → `t('audit.rerunResult')`, `t('audit.clipNoMatch')` → `t('audit.rerunNoMatch')` |
| `lib/montree/i18n/en.ts` | Removed 7 dead CLIP keys |
| `lib/montree/i18n/zh.ts` | Removed matching 7 Chinese CLIP keys |
| `package.json` | Removed `@xenova/transformers` dependency |
| `next.config.ts` | Removed `'@xenova/transformers'` from `serverExternalPackages` |

### Files Modified (prior session — commits `83fe0f99` + `f7f01770`)

| File | What Changed |
|------|-------------|
| `lib/montree/classifier/clip-classifier.ts` | Overwritten to ~48 line stub. Preserves `VisualMemory` and `ClassifyResult` interfaces (still imported elsewhere). All functions return null/false/empty. |
| `lib/montree/classifier/classify-orchestrator.ts` | Overwritten to 56-line stub. Always returns `full_two_pass`. |
| `lib/montree/classifier/index.ts` | Removed dead CLIP function exports, kept type exports + work-signatures/classroom-embeddings/glossary |
| `app/montree/dashboard/photo-audit/page.tsx` | Removed CLIP test button, progress tracking, batch testing UI (~200 lines) |

### 7 Deleted i18n Keys

```
audit.clipTestBtn       → "🧪 Test CLIP" / "🧪 测试CLIP"
audit.clipTestProgress  → "Testing {current}/{total}..." / "测试中 {current}/{total}..."
audit.clipTestComplete  → "CLIP: {result}" / "CLIP: {result}"
audit.clipTestNone      → "CLIP: No match" / "CLIP: 无匹配"
audit.clipTestCancelled → "CLIP test cancelled" / "CLIP测试已取消"
audit.clipResult        → "AI now thinks:" / "AI现在认为："  (replaced by audit.rerunResult)
audit.clipNoMatch       → "No work identified" / "未识别到工作" (replaced by audit.rerunNoMatch)
```

---

## Photo-Bank Upload Fix

### Root Cause

During the Apr 2 health check (commit `6211ed1d`), `verifySuperAdminPassword()` was added to `POST /api/montree/photo-bank` as an auth guard. But the photo-bank page at `/montree/library/photo-bank` is used by teachers — it sends no super-admin password header, only the httpOnly `montree-auth` cookie.

### Fix

```typescript
// Before (broken):
const { verifySuperAdminPassword } = await import('@/lib/verify-super-admin');
const authError = await verifySuperAdminPassword(request);
if (authError) return authError;

// After (working):
const { verifySchoolRequest } = await import('@/lib/montree/verify-request');
const auth = await verifySchoolRequest(request);
if (auth instanceof NextResponse) return auth;
```

### Files Modified

| File | What Changed |
|------|-------------|
| `app/api/montree/photo-bank/route.ts` | POST auth: `verifySuperAdminPassword` → `verifySchoolRequest`. Removed duplicate `NextResponse` import. |

---

## 3-Cycle Audit Results

| Cycle | Result | Finding |
|-------|--------|---------|
| 1 | **1 CRITICAL fixed** | Deleted i18n keys `t('audit.clipResult')` / `t('audit.clipNoMatch')` still referenced in photo-audit page → replaced with existing `t('audit.rerunResult')` / `t('audit.rerunNoMatch')` |
| 2 | **CLEAN** | All cross-file wiring verified |
| 3 | **1 LOW fixed** | Stale `'@xenova/transformers'` in `next.config.ts` `serverExternalPackages` → removed |

---

## Production Photo Architecture (Post-Cleanup)

```
Photo taken → Haiku Pass 1 (describe image, ~$0.003)
           → Haiku Pass 2 (match to curriculum, ~$0.003)
           → GREEN (≥0.85): auto-update progress
           → AMBER (0.5-0.84): teacher confirmation
           → RED (<0.5): untagged, teacher manual tag
```

No CLIP/SigLIP anywhere in the pipeline. The classifier stub files remain only because `VisualMemory` and `ClassifyResult` type interfaces are imported by other modules — the functions themselves are all no-ops.

---

## Known Issues (Not Fixed This Session)

- **Guru not connecting**: User needs to verify `ANTHROPIC_API_KEY` on Railway dashboard. Not a code issue.
- **Photo-bank image loading errors** (`net::ERR_NETWORK_CHANGED`): Separate VPN/network issue affecting image GET requests. The GET endpoint is public — this is a client network problem, not an auth issue.
