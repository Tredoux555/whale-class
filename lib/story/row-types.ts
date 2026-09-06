// lib/story/row-types.ts
//
// Row shapes for the personal-platform (story) tables, shared by the API routes
// that read them.
//
// WHY THESE ARE WRITTEN OUT BY HAND: every one of these routes selects a WIDE
// column list first and retries with a NARROW one when Postgres answers 42703
// ("column does not exist") — the e2e `ciphertext` column only exists once
// migration 265 has been applied. That means the string handed to `.select()`
// is chosen at runtime, and supabase-js types `.select()` by *parsing the string
// literal*: with no literal to parse, every row collapses to
// `GenericStringError` and the route has to cast its way back out field by
// field. Naming the row and passing it as `.select<string, Row>(cols)` keeps the
// types honest with one declaration instead of a cast per property.
//
// `ciphertext` is optional on each of these for exactly that reason: it is
// genuinely absent from the narrow fallback.

/** A row in `story_diary_entries`. */
export interface DiaryEntryRow {
  id: string;
  entry_date: string;
  mood: string | null;
  title_enc: string | null;
  body_enc: string | null;
  cipher_version: number | null;
  created_at: string;
  updated_at: string;
  ciphertext?: string | null;
}

/** A row in `story_projects`. */
export interface ProjectRow {
  id: string;
  title_enc: string | null;
  why_enc: string | null;
  next_action_enc: string | null;
  status: string;
  priority: number | null;
  is_active: boolean | null;
  cipher_version: number | null;
  created_at: string;
  updated_at: string;
  ciphertext?: string | null;
}

/** A row in `story_plan_events`. */
export interface PlanEventRow {
  id: string;
  event_date: string;
  start_time: string | null;
  title_enc: string | null;
  notes_enc: string | null;
  cipher_version: number | null;
  ciphertext?: string | null;
}
