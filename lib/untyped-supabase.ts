// lib/untyped-supabase.ts
// Sanctioned type-level escape hatch for Supabase queries (tsc debt burn-down).
//
// WHY: We have no generated Database types, and supabase-js >= 2.x collapses
// row types to `never` when the client's generics resolve from the bare
// `ReturnType<typeof createClient>` (thousands of TS2339 "property does not
// exist on type 'never'" errors). Until `supabase gen types` output is wired
// in, the honest type for query results is `any`, not `never`.
//
// GUARANTEE: This module is a PURE TYPE-LEVEL cast. It returns the exact same
// singleton client instance as `getSupabase()` — identical runtime behavior,
// identical retry/timeout fetch wrapper, zero extra connections.
//
// USAGE:
//   import { getUntypedSupabase } from '@/lib/untyped-supabase';
//   const supabase = getUntypedSupabase();          // drop-in for getSupabase()
//
//   // or per-table passthrough:
//   import { db } from '@/lib/untyped-supabase';
//   const { data } = await db('montree_children').select('*');
//
// When real generated types land, delete this file and fix call sites properly.

import { getSupabase } from '@/lib/supabase-client';
import type { UntypedClient } from '@/lib/supabase-client';

/**
 * A Supabase client whose tables/rows are `any` instead of `never`.
 * Note supabase-js still runs its select-string parser types on
 * `.select('...')` even with an `any` schema — for the rare select string the
 * parser chokes on (ParserError / TS2589), use `db()` below, which bypasses
 * the parser entirely.
 */
export type UntypedSupabaseClient = UntypedClient;

/**
 * The shared service-role singleton from lib/supabase-client, cast untyped.
 * Same instance, same calls — type-level only.
 */
export function getUntypedSupabase(): UntypedSupabaseClient {
  return getSupabase() as unknown as UntypedSupabaseClient;
}

/**
 * Convenience passthrough: `db('table')` === `getUntypedSupabase().from('table')`,
 * but typed `any` so supabase-js's select-string parser types never engage.
 * Use this for select strings the parser chokes on (ParserError / TS2589).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function db(table: string): any {
  return getUntypedSupabase().from(table);
}

/**
 * Cast ANY existing Supabase client (e.g. one created directly with
 * `createClient`) to the untyped surface. Identity function at runtime.
 */
export function untyped(client: unknown): UntypedSupabaseClient {
  return client as UntypedSupabaseClient;
}
