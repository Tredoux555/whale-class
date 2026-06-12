// tests/helpers/fake-supabase.ts
// Minimal in-memory stand-in for the supabase-js query builder, shared by the
// API/lib unit tests. No network, no env vars — each from(<table>) call pops
// the next queued QueryResult for that table (or a benign empty result).
//
// The builder is chainable AND thenable, mirroring how supabase-js is used in
// the codebase:   await db.from(t).select(...).eq(...).maybeSingle()
//                 await db.from(t).insert(...)            (awaited directly)
// Every call is recorded so tests can assert on scoping (eq('school_id', …)).

import type { UntypedClient as SupabaseClient } from '@/lib/supabase-client';

export interface QueryResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number | null;
}

const EMPTY: QueryResult = { data: null, error: null, count: null };

export class FakeQuery {
  /** Every builder call in order: [method, args]. */
  public calls: Array<[string, unknown[]]> = [];

  constructor(private result: QueryResult) {}

  private rec(method: string, args: unknown[]): this {
    this.calls.push([method, args]);
    return this;
  }

  select(...args: unknown[]) { return this.rec('select', args); }
  insert(...args: unknown[]) { return this.rec('insert', args); }
  update(...args: unknown[]) { return this.rec('update', args); }
  upsert(...args: unknown[]) { return this.rec('upsert', args); }
  delete(...args: unknown[]) { return this.rec('delete', args); }
  eq(...args: unknown[]) { return this.rec('eq', args); }
  neq(...args: unknown[]) { return this.rec('neq', args); }
  in(...args: unknown[]) { return this.rec('in', args); }
  is(...args: unknown[]) { return this.rec('is', args); }
  order(...args: unknown[]) { return this.rec('order', args); }
  range(...args: unknown[]) { return this.rec('range', args); }

  single(): Promise<QueryResult> {
    this.calls.push(['single', []]);
    return Promise.resolve(this.result);
  }

  maybeSingle(): Promise<QueryResult> {
    this.calls.push(['maybeSingle', []]);
    return Promise.resolve(this.result);
  }

  // Thenable — lets `await db.from(t).insert(...)` resolve to the result.
  then<T1 = QueryResult, T2 = never>(
    onfulfilled?: ((value: QueryResult) => T1 | PromiseLike<T1>) | null,
    onrejected?: ((reason: unknown) => T2 | PromiseLike<T2>) | null
  ): Promise<T1 | T2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }

  /** First argument passed to the given method (e.g. the insert/upsert row). */
  firstArg(method: string): unknown {
    const hit = this.calls.find(([m]) => m === method);
    return hit ? hit[1][0] : undefined;
  }

  /** True when `method` was called with exactly these args somewhere. */
  hasCall(method: string, ...args: unknown[]): boolean {
    return this.calls.some(
      ([m, a]) => m === method && JSON.stringify(a) === JSON.stringify(args)
    );
  }
}

export class FakeDb {
  /** Every from() call in order, so tests can inspect specific queries. */
  public log: Array<{ table: string; query: FakeQuery }> = [];
  private queues = new Map<string, QueryResult[]>();

  /** Queue result(s) for the next from(<table>) call(s), FIFO per table. */
  queue(table: string, ...results: QueryResult[]): this {
    const q = this.queues.get(table) ?? [];
    q.push(...results);
    this.queues.set(table, q);
    return this;
  }

  from(table: string): FakeQuery {
    const q = this.queues.get(table);
    const result = (q && q.length ? q.shift() : undefined) ?? EMPTY;
    const query = new FakeQuery(result);
    this.log.push({ table, query });
    return query;
  }

  /** Queries issued against a table, in order. */
  queriesFor(table: string): FakeQuery[] {
    return this.log.filter((l) => l.table === table).map((l) => l.query);
  }

  asClient(): SupabaseClient {
    return this as unknown as SupabaseClient;
  }
}
