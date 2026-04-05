# Handoff: Haiku Chinese JSON Repair — Apr 6, 2026

## The Problem

When Weekly Wrap generates teacher reports in Chinese (locale=zh), Haiku (claude-haiku-4-5-20251001) produces **malformed JSON**. Every single child's teacher report fails with `SyntaxError: Expected ',' or '}' after property value in JSON at position XXXX`, falling back to a basic template. Parent narratives (also Haiku) work fine because they're plain text, not JSON.

The teacher report generator asks Haiku to return a massive structured JSON object with ~15 fields (developmental_snapshot, sensitive_periods[], area_analyses[], concentration{}, flags[], recommendations[], key_insight, etc). When instructed to write Chinese values, Haiku corrupts the JSON in multiple ways.

## What We Know About the Corruption

From Railway logs (19 children, 3 confirmed failures — Henry, Joey, Ryan):

1. **Markdown code fences** — Haiku wraps output in ` ```json ... ``` ` despite being told not to
2. **Literal newlines inside string values** — Chinese text spans multiple lines within JSON strings (invalid — should be `\n`)
3. **Unescaped ASCII double quotes** — Haiku quotes English terms inside Chinese text using raw `"`, e.g., `"亨利选择了"Sand Tray Writing"这项工作"` — the inner quotes break JSON structure
4. **Empty lines between fields** — Extra blank lines in the JSON (valid whitespace, but indicates Haiku is formatting for human readability not machine parsing)

Root cause: Haiku treats JSON output more like prose when writing Chinese. It formats for readability (newlines, indentation), uses Chinese punctuation habits (quoting with `"`), and doesn't strictly track JSON escaping rules.

## What We Tried (Chronological)

### Attempt 1: Basic JSON extraction (pre-existing)
- `JSON.parse(rawText)` → catch → regex `rawText.match(/\{[\s\S]*\}/)` → `JSON.parse(match)`
- **Result:** Failed. The regex match extracted the JSON block but it still had literal newlines and unescaped quotes inside strings.

### Attempt 2: repairAndParseJSON v1 — State Machine (commit `df69e3be`)
Five-layer repair:
1. Strip markdown fences (`^```json` and trailing ` ``` `)
2. Extract between first `{` and last `}`
3. Try direct `JSON.parse`
4. Fix fullwidth colons (`："` → `:"`) + trailing commas + **string-state-tracking newline fixer** (character-by-character walk tracking `inString` boolean, replacing `\n` with `\\n` when inside quotes)
5. Aggressive: fix Chinese curly quotes (`"` `"` → `\"`) + fullwidth commas before structural chars

- **Result:** FAILED. The string-state-tracking newline fixer gets confused by Haiku's unescaped ASCII `"` inside string values. When it encounters `"Sand Tray Writing"` inside a Chinese string, it thinks the `"` before "Sand" ends the string, then all subsequent tracking is wrong — newlines outside strings get escaped, newlines inside strings don't, and the JSON gets more broken.

### Attempt 3: repairAndParseJSON v2 — Nuclear Newline Removal (commit `27e91b2f`)
Replaced the state machine with a much simpler approach:
1. Strip markdown fences
2. Extract between first `{` and last `}`
3. Try direct `JSON.parse`
4. **Replace ALL literal newlines with spaces**: `text.replace(/\r?\n/g, ' ')`
5. Collapse multiple spaces
6. Try `JSON.parse`
7. Fix fullwidth colons + trailing commas → try again
8. Fix fullwidth commas before structural chars → try again
9. Last resort: `fixUnescapedQuotesInValues()` (placeholder — not fully implemented)

The key insight: In valid JSON, literal newlines are only valid as whitespace between tokens. Inside string values they MUST be escaped as `\n`. So replacing all literal newlines with spaces is always safe — it just makes the JSON one line.

- **Result:** DEPLOYED but UNTESTED. The latest Railway deploy (commit `27e91b2f`) should test this. If the only corruption was literal newlines + markdown fences, this will work. If there are also unescaped ASCII double quotes inside string values, it will still fail.

### Prompt Engineering (both commits)
Also rewrote the system message and prompt:
- **System message**: Changed from Chinese (`'你是一位拥有30年AMI培训经验...'`) to English (`'You are a senior Montessori consultant... Write all JSON string values in Chinese. Keep all JSON keys in English. You MUST return valid JSON — use ASCII quotes, commas, and colons for JSON structure.'`)
- **End-of-prompt rules**: Added explicit JSON formatting rules — `"Use standard ASCII double quotes (") for JSON strings, standard commas (,) between items, standard colons (:) after keys. Do NOT use Chinese fullwidth punctuation in JSON structure."` and `"If your Chinese text contains double quotes, escape them as \". Newlines inside strings must be \n."`

The theory: telling Haiku to "think in English" for structure while writing Chinese values prevents it from using Chinese punctuation patterns in JSON structure.

## What To Test Tomorrow

1. **Open Railway logs** for the latest deploy (`27e91b2f`) and check if teacher reports for Henry, Joey, Ryan parse correctly now.

2. **Regenerate the Weekly Wrap** — go to the Weekly Wrap page, click Generate/Regenerate. Watch the Railway logs for `[TeacherReport]` entries. If you see `[TeacherReport] ALL JSON repair failed`, it's still broken.

3. **Check the UI** — if teacher reports parse correctly, the Teacher Summary tab should show real AI-generated analysis instead of the template fallback (which is very generic — just lists work names and says "concentration is developing").

## If It's Still Failing Tomorrow — Options

### Option A: Switch to Sonnet for Chinese teacher reports (RECOMMENDED — quickest)
Change one line in `lib/montree/reports/teacher-report-generator.ts`:
```typescript
// Line 6: Change HAIKU_MODEL to AI_MODEL
import { anthropic, AI_ENABLED, AI_MODEL } from '@/lib/ai/anthropic';
// Line ~517: Change HAIKU_MODEL to AI_MODEL
model: AI_MODEL,  // was HAIKU_MODEL
```
Cost: ~$1.70/run (19 children) vs ~$0.10/run with Haiku. Sonnet handles JSON + Chinese perfectly — it was only switched to Haiku to save money during testing. This is the fastest path to production quality.

### Option B: Use `tool_use` for structured output
Instead of asking Haiku to output raw JSON, use the Anthropic API's `tool_use` feature which forces structured output via a JSON schema. This is how Smart Capture's describe endpoint works and it never has JSON issues.

Change the API call from:
```typescript
const response = await anthropic.messages.create({
  model: HAIKU_MODEL,
  max_tokens: 8192,
  system: systemMessage,
  messages: [{ role: 'user', content: prompt }],
});
```
To:
```typescript
const response = await anthropic.messages.create({
  model: HAIKU_MODEL,
  max_tokens: 8192,
  system: systemMessage,
  messages: [{ role: 'user', content: prompt }],
  tools: [{
    name: 'teacher_report',
    description: 'Generate a weekly teacher report',
    input_schema: {
      type: 'object',
      properties: {
        developmental_snapshot: { type: 'string' },
        sensitive_periods: { type: 'array', items: { ... } },
        // ... full schema
      },
      required: ['developmental_snapshot', 'key_insight', ...]
    }
  }],
  tool_choice: { type: 'tool', name: 'teacher_report' }
});
// Extract from tool use block:
const toolBlock = response.content.find(b => b.type === 'tool_use');
const report = toolBlock.input; // Already parsed JSON!
```
This guarantees valid JSON because the API handles serialization. More work to set up but fundamentally solves the problem for any model.

### Option C: Hybrid — Haiku for English, Sonnet for Chinese
```typescript
const model = input.locale === 'zh' ? AI_MODEL : HAIKU_MODEL;
```
Costs more only when Chinese is selected. English reports continue on cheap Haiku.

### Option D: Install `jsonrepair` npm package
```bash
npm install jsonrepair
```
Then:
```typescript
import { jsonrepair } from 'jsonrepair';
const repaired = jsonrepair(rawText);
const report = JSON.parse(repaired);
```
This library handles all the edge cases (unescaped quotes, trailing commas, missing commas, etc). It's battle-tested. But it's an external dependency.

## Other Remaining Issues (Not JSON Related)

1. **Teacher summary shows English work names** — Screenshot shows "感官: Constructive Triangles - Rectangular Box · 语言: Chalk Board Writing" — area labels are Chinese but work names are English. Fix: the review API (`app/api/montree/reports/weekly-wrap/review/route.ts`) needs to pipe `name_zh` into the works list for the teacher summary section.

2. **"999 days" red flags** — Children with no baseline data show "No work in 999 days" in practical_life, sensorial, etc. The 999 is a fallback value when there's no progress record. Fix: guard in the teacher report prompt or data prep to show "No recorded work yet" instead.

3. **Teacher report format** — Still renders as structured sections (Developmental Snapshot, Area Analysis, Concentration, Flags, Recommendations, Key Insight). Teacher wants narrative prose like the parent report. Consider adding a `teacher_narrative` field or redesigning the prompt.

## Key Files

| File | Purpose |
|------|---------|
| `lib/montree/reports/teacher-report-generator.ts` | The generator — prompt, API call, JSON repair, fallback |
| `lib/montree/reports/narrative-generator.ts` | Parent narrative (Haiku, plain text — works fine) |
| `app/api/montree/reports/weekly-wrap/route.ts` | Main generation route (streams progress) |
| `app/api/montree/reports/weekly-wrap/review/route.ts` | Review data API (resolveArea, cleanWorkName, Chinese names) |
| `lib/ai/anthropic.ts` | AI_MODEL vs HAIKU_MODEL constants |
