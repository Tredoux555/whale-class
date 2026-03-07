# Handoff: Per-School Guru Personality Settings

**Date:** Mar 8, 2026
**Status:** DESIGNED — ready to build
**Estimated effort:** ~1-2 hours

---

## Context

The Guru is currently **centralized** — every school shares the same system prompt, psychology knowledge, tool definitions, and conversational logic. The only per-school variation comes from child data (pulled from DB) and conversation history.

The user asked: "Can I give the Guru the ability to edit itself?"

**Decision:** No self-editing (too risky — LLM prompt drift over time). Instead, build **per-school human-controlled configuration** that the Guru reads but never writes to. Principals/lead teachers set preferences through a settings UI, and the Guru adapts its tone and recommendations accordingly.

---

## Architecture

### What Already Exists (No Migration Needed)

`montree_schools.settings` is already a JSONB column. Currently stores `location` (used for ESL detection). We add a `guru_personality` key to this same column.

### Schema Design

```json
{
  "guru_personality": {
    "tone": "warm_nurturing",
    "philosophy": "We follow strict AMI principles. No eclectic mixing.",
    "focus_areas": ["practical_life", "language"],
    "communication_style": "formal",
    "materials_note": "We don't have metal insets or geometric solids yet.",
    "age_range_focus": "3-6",
    "language_preference": "Respond in English but reference Chinese terms for works",
    "custom_instructions": "Always recommend home activities alongside classroom work. Our parents are very involved."
  }
}
```

**Key fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `tone` | enum string | `warm_nurturing` / `professional_direct` / `analytical` / `balanced` (default) |
| `philosophy` | free text (max 500 chars) | School's Montessori philosophy — injected verbatim into prompt |
| `focus_areas` | string[] | Which areas the school emphasizes (affects recommendation weighting) |
| `communication_style` | enum string | `formal` / `casual` / `balanced` |
| `materials_note` | free text (max 500 chars) | What materials the school has/lacks — Guru won't recommend unavailable materials |
| `age_range_focus` | string | `0-3` / `3-6` / `6-9` / `mixed` |
| `language_preference` | free text (max 200 chars) | Bilingual guidance preferences |
| `custom_instructions` | free text (max 1000 chars) | Anything else — principal's direct instructions to the Guru |

---

## Implementation Plan

### 1. API Route — `app/api/montree/guru/settings/route.ts` (NEW)

- **GET** — Returns current `guru_personality` from `montree_schools.settings`
- **PUT** — Updates `guru_personality` in `montree_schools.settings` JSONB
- Auth: `verifySchoolRequest()` — only teachers/principals of that school
- Validation: field length limits, enum validation for tone/communication_style

### 2. Settings UI — `app/montree/admin/guru-settings/page.tsx` (NEW)

- Simple form with labeled fields
- Tone selector (4 radio buttons with descriptions)
- Communication style selector (3 radio buttons)
- Focus areas (5 checkboxes, one per Montessori area)
- Age range dropdown
- Free text fields for philosophy, materials note, language preference, custom instructions
- Character counters on text fields
- Save button → PUT to API
- Accessible from admin panel (add link to admin/page.tsx)

### 3. Context Builder Integration — `lib/montree/guru/context-builder.ts` (MODIFY)

School data is already fetched at lines 361-371 for ESL detection. Extend to also extract `guru_personality`:

```typescript
// After existing school fetch (line 371):
const guruPersonality = (schoolSettings.guru_personality as Record<string, unknown>) || null;

// Add to ChildContext interface:
schoolGuruPersonality?: Record<string, unknown> | null;
```

### 4. Prompt Injection — `lib/montree/guru/conversational-prompt.ts` (MODIFY)

Add new function `buildSchoolPersonalitySection(settings)` that returns a prompt section like:

```
SCHOOL-SPECIFIC PERSONALITY:
This school's principal has configured the following preferences for you:
- Tone: Warm and nurturing
- Philosophy: "We follow strict AMI principles..."
- Focus areas: Practical Life, Language
- Materials available: "We don't have metal insets yet"
- Communication: Formal
- Special instructions: "Always recommend home activities..."

Adapt your responses to match these preferences. The school's philosophy statement takes priority over general advice.
```

Inject this section into the system prompt in `buildConversationalPrompt()` — after the base persona but before tool instructions.

### 5. Route Wiring — `app/api/montree/guru/route.ts` (MODIFY)

Pass `childContext.schoolGuruPersonality` to `buildConversationalPrompt()` as a new parameter.

---

## Integration Points (Exact Locations)

| File | Line(s) | What to do |
|------|---------|------------|
| `context-builder.ts` | 361-371 | Extract `guru_personality` from school settings (already fetched) |
| `context-builder.ts` | 66-69 | Add `schoolGuruPersonality` to `ChildContext` interface |
| `conversational-prompt.ts` | ~107 | Add `schoolGuruPersonality` param to `buildConversationalPrompt()` |
| `conversational-prompt.ts` | new function | `buildSchoolPersonalitySection()` |
| `route.ts` | ~344 | Pass personality to prompt builder |
| `admin/page.tsx` | nav section | Add link to Guru Settings page |

---

## Safety Considerations

- **No self-editing:** Guru reads settings but NEVER writes to them. Only humans edit via the UI.
- **Character limits:** All free text fields capped (500/200/1000 chars) to prevent prompt injection bloat.
- **Sanitization:** Strip any prompt-injection-looking content from free text before injecting into system prompt (e.g., "IGNORE ALL PREVIOUS INSTRUCTIONS").
- **Defaults:** If no settings configured, Guru behaves exactly as it does today (backward compatible).
- **Token budget:** Max ~300 tokens added to system prompt from school settings. Negligible impact on the existing ~13,000 token budget.

---

## Future Enhancement: Guru Suggestions (Human-in-the-Loop)

After building the base system, a future upgrade could let the Guru **propose** settings changes after conversations:

> "Based on our recent conversations, it seems your school emphasizes hands-on practical life activities. Would you like me to adjust my recommendations to focus more on this area?"

Principal approves/rejects via the settings page. This gives you self-improvement without self-editing.

---

## Files to Create

1. `app/api/montree/guru/settings/route.ts` — GET/PUT API
2. `app/montree/admin/guru-settings/page.tsx` — Settings UI

## Files to Modify

3. `lib/montree/guru/context-builder.ts` — Extract personality from school settings
4. `lib/montree/guru/conversational-prompt.ts` — New personality section builder + param
5. `app/api/montree/guru/route.ts` — Pass personality to prompt builder
6. `app/montree/admin/page.tsx` — Add nav link
7. `lib/montree/i18n/en.ts` + `zh.ts` — ~20 new keys for settings UI
