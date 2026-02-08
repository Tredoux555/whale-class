# Session 151: Language Making Guide — Docx Regeneration + API Download Route

**Date:** February 7, 2026
**Commits:** None yet (changes ready to commit)

## Summary

Created a comprehensive Montessori Language Making Guide document covering all 43 Language works from the Montree curriculum. The guide includes detailed making instructions, exact word/object lists, AMS presentation instructions, and a master shopping list. Also built a proper API route to serve the download from the curriculum page (fixing Next.js/Turbopack routing issues with static files).

## Background

Teacher requested a physical-materials guide for making all 43 English/Language Montessori works. User has a printer, laminator, cutter, and corner cutter. Chinese New Year shipping shutdown approaching — needed a complete shopping list.

The first docx was generated but was **corrupt** (XML validation error: `Element 'w:r' not expected, expected 'w:sectPr'`). Word couldn't open it. Additionally, the static download link (`<a href="/guides/...">`) was serving HTML instead of the docx because Next.js/Turbopack routes everything through the app router.

## Changes Made

### 1. Regenerated `Montessori_Language_Making_Guide.docx` (from scratch)

**Previous file was corrupt.** Rebuilt using the `docx` npm package with careful XML structure.

The guide covers all **43 Language works** across 5 categories:

| Category | Works | Examples |
|----------|-------|----------|
| Oral Language Development | 8 | Classified Cards, Sound Games (I Spy), Rhyming |
| Writing Preparation | 7 | Metal Insets, Sandpaper Letters, Moveable Alphabet |
| Reading | 11 | Pink/Blue/Green Series, Puzzle Words, Command Cards |
| Grammar | 11 | Noun–Interjection (with grammar symbols), Grammar Boxes |
| Word Study | 6 | Word Families, Compound Words, Prefixes/Suffixes |

**Each work includes:**
- Description and levels from curriculum data
- Exact materials to make (print specs, laminate sizes)
- Detailed content lists with actual words/objects (e.g., 70+ CVC words for Pink Series, 8+ classified card categories with specific items)
- AMS presentation instructions (Three-Period Lesson format)
- Points of interest and control of error
- Extensions and variations

**Master Shopping List** at the end with estimated budget ($1,075–$1,650).

**File locations:**
- `/Montessori_Language_Making_Guide.docx` (project root)
- `/public/guides/Montessori_Language_Making_Guide.docx` (static assets)

### 2. Created API Route for Guide Download (`NEW`)

Static file serving doesn't work with Next.js/Turbopack — the `/guides/*.docx` path gets routed through the app and serves HTML. Created a proper API route instead.

| File | Change |
|------|--------|
| `app/api/guides/language-making-guide/route.ts` | **NEW** — Serves docx with correct headers |

**How it works:**
1. Reads the `.docx` file from disk (tries project root first, then `public/guides/`)
2. Returns with `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document`
3. Returns with `Content-Disposition: attachment; filename="Montessori_Language_Making_Guide.docx"`
4. Falls back to 404 JSON if file not found

### 3. Updated Curriculum Page Download Button

| File | Change |
|------|--------|
| `app/montree/dashboard/curriculum/page.tsx` | Changed download href from `/guides/Montessori_Language_Making_Guide.docx` to `/api/guides/language-making-guide` |

**Before:** `<a href="/guides/Montessori_Language_Making_Guide.docx" download>`
**After:** `<a href="/api/guides/language-making-guide" download="Montessori_Language_Making_Guide.docx">`

The pink "📄 Language Making Guide" button now triggers a proper file download.

## Files Changed

| File | Change |
|------|--------|
| `Montessori_Language_Making_Guide.docx` | **REGENERATED** — Valid docx, 25KB, all 43 works |
| `public/guides/Montessori_Language_Making_Guide.docx` | **REGENERATED** — Copy of above |
| `app/api/guides/language-making-guide/route.ts` | **NEW** — API route serving docx download |
| `app/montree/dashboard/curriculum/page.tsx` | Updated download button href to API route |

## Curriculum Source

All 43 works come from: `montree/src/lib/curriculum/data/language.json`

**Note from Session 150:** DB only has 18 of 43 language works. Still needs reseed via `/api/montree/admin/reseed-curriculum`.

## Verification

- ✅ Docx validates (PK ZIP header, valid XML)
- ✅ Contains all 5 categories and 43 works
- ✅ Contains actual word lists (CVC words, blend words, sight words)
- ✅ Contains AMS presentation instructions
- ✅ Contains master shopping list
- ✅ API route has correct Content-Type and Content-Disposition headers
- ✅ Curriculum page button points to `/api/guides/language-making-guide`

## Next Steps (Discussed but not started)

- **Montree Home Program**: User wants to build a home curriculum (~60-80 works) from scratch. Previous implementation exists (`docs/MONTREE_HOME_HANDOFF.md`, `app/admin/montree-home/page.tsx`) but has 250 activities and broken API routes. User agreed 250 is too many — needs curation.

---

*Updated: February 7, 2026*
*Session: 151*
*Status: READY TO COMMIT + RESTART DEV SERVER*
