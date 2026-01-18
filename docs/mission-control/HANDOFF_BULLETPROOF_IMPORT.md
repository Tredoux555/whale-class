# BULLETPROOF IMPORT SYSTEM - Complete Handoff

**Date:** January 18, 2026  
**Session:** 50  
**Phase:** 7 - Bulletproof Import System  
**Research Basis:** Enterprise document AI best practices (Google Document AI, Azure, Hyperscience patterns)

---

## 🎯 THE PROBLEM WE SOLVED

The old system asked AI to both **extract** AND **match** work names to the curriculum database. This caused:
- Silent failures when AI couldn't find matches
- AI "hallucinating" matches that didn't exist
- Inconsistent results (same input → different output)
- Teacher frustration when data was incomplete

**Root cause:** LLMs are bad at matching against fixed vocabularies. They hallucinate entities, especially for domain-specific terms like Montessori curriculum items.

---

## 🏗️ THE SOLUTION ARCHITECTURE

Based on enterprise document AI research, we implemented a **3-layer system**:

### Layer 1: Synonym Table (Pre-normalization)
```
Table: montree_work_synonyms
```
- Maps raw text variations to canonical work_ids
- School-specific overrides supported
- Learns from teacher corrections automatically
- Pre-seeded with ~50 common variations

### Layer 2: Fuzzy Matcher (Deterministic Algorithm)
```
File: lib/montree/fuzzy-matcher.ts
```
- SoftTFIDF algorithm (TF-IDF token matching + Jaro-Winkler character similarity)
- 85-91% F1 accuracy according to CMU research
- Number matching ("Box 1" vs "Box 2")
- Abbreviation detection ("RB" → "Review Box")
- Chinese name matching

### Layer 3: Confidence Scoring + Human Review
```
Thresholds:
- ≥95%: Auto-accept (green)
- 70-94%: Suggest top matches (yellow)
- <70%: Manual selection required (red)
```

---

## 📁 FILES CREATED

| File | Purpose |
|------|---------|
| `migrations/montree_synonyms_and_import.sql` | Database tables + seed data |
| `lib/montree/fuzzy-matcher.ts` | Deterministic matching algorithm |
| `app/api/montree/classroom/bootstrap/preview/route.ts` | AI extraction + fuzzy matching |
| `app/api/montree/synonyms/learn/route.ts` | Learning from corrections |
| `app/montree/admin/students/page.tsx` | New UI with confidence colors |

---

## 🚀 TO DEPLOY

### Step 1: Run Migration
```sql
-- In Supabase SQL Editor, run:
-- migrations/montree_synonyms_and_import.sql
```

This creates:
- `montree_work_synonyms` - Alias table
- `montree_import_logs` - Audit trail
- ~50 pre-seeded synonyms

### Step 2: Test Import
1. Go to `/montree/admin/students`
2. Delete existing children if needed
3. Upload your .docx file
4. Observe confidence percentages and color coding
5. Click suggestions to resolve yellow/red items
6. Import

### Step 3: Verify Learning
1. Re-upload the same document
2. Items you manually selected should now auto-match
3. Check `montree_work_synonyms` table for new entries

---

## 🔄 THE IMPORT FLOW

```
Document Upload
      ↓
AI EXTRACTION (Claude)
- Parses document structure
- Extracts children names + raw work text
- Does NOT match to curriculum
      ↓
SYNONYM LOOKUP (Database)
- Checks montree_work_synonyms for exact match
- School-specific first, then global
      ↓
FUZZY MATCHING (Algorithm)
- SoftTFIDF scoring
- Returns confidence 0-100%
      ↓
CONFIDENCE ROUTING
- ≥95%: Auto-accept
- 70-94%: Show suggestions
- <70%: Manual selection
      ↓
TEACHER REVIEW (UI)
- Exception-first view
- Click to select correct work
- Skip if no match needed
      ↓
LEARNING (Async)
- Corrections saved to synonyms table
- Next import will auto-match
      ↓
DATABASE WRITE
- Children + assignments created
- Import log updated
```

---

## 📊 EXPECTED RESULTS

| Import # | Auto-Match Rate | Why |
|----------|-----------------|-----|
| 1st | 70-80% | Fuzzy matching + seed synonyms |
| 2nd | 85-90% | Learned school vocabulary |
| 3rd+ | 95%+ | Most variations captured |

---

## 🎨 UI FEATURES

### Confidence Color Coding
- 🟢 **Green (≥95%)**: Auto-accepted, just shows checkmark
- 🟡 **Yellow (70-94%)**: Shows top 3 suggestions, teacher picks
- 🔴 **Red (<70%)**: No good match, manual selection required

### Exception-First Design
- Default view shows only items needing attention
- Toggle to see all children
- Progress bar shows overall auto-match rate

### Learning Feedback
- When teacher clicks a suggestion, it's saved as a synonym
- Small "learned" badge shows when synonym was used
- Future imports benefit immediately

---

## 🛡️ NEVER-FAIL GUARANTEES

1. **Every import creates an audit log** - Nothing is lost
2. **No silent discards** - Every unmatched item is surfaced
3. **Teacher must explicitly act** - Can't accidentally skip
4. **Corrections are captured** - System improves over time

---

## 🧪 TEST CASES

### Test 1: Basic Import
- Upload document with known children
- Verify all 5 areas shown per child
- Check confidence percentages are displayed

### Test 2: Synonym Learning
1. Import with "colour boxes 2la" (should match via seed synonym)
2. Import with "cb2" (should suggest color box 2)
3. Select correct match
4. Re-import → should auto-match

### Test 3: Missing Work
- Document has "Review Box 1" which doesn't exist in curriculum
- Should show as red (manual)
- Teacher can skip or select closest match

### Test 4: Chinese Names
- Works with Chinese names should match via `chineseName` field
- Confidence score includes Chinese matching component

---

## 🔧 TROUBLESHOOTING

### "No synonyms table" error
Run the migration: `migrations/montree_synonyms_and_import.sql`

### Low auto-match rate
1. Check if synonyms were seeded
2. Add more synonyms via Supabase
3. Import → correct → re-import cycle improves rates

### AI extraction wrong
- Check document format
- Ensure clear structure (tables or lists)
- AI extracts raw text, doesn't interpret

---

## 📈 MONITORING

Check these in Supabase:

```sql
-- Synonym usage
SELECT raw_text, work_id, usage_count, last_used_at 
FROM montree_work_synonyms 
ORDER BY usage_count DESC LIMIT 20;

-- Import success rates
SELECT status, COUNT(*), 
       AVG(works_auto_matched::float / NULLIF(total_works, 0) * 100) as auto_rate
FROM montree_import_logs 
GROUP BY status;
```

---

## ✅ DONE

The bulletproof import system is complete. It follows enterprise best practices:
- AI for extraction, algorithms for matching
- Confidence scoring with human-in-the-loop
- Learning from corrections
- Never-fail audit trail

**Next:** Run migration and test with real documents.
