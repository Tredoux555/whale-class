// tests/reports-drafters-chunking.test.ts
//
// audit-fix (Aug 23 2026): the monthly / weekly Sonnet drafters used to send
// the whole classroom in ONE 4000-token forced-tool call. At 19-22 children
// the tool call comes back truncated, no usable tool_use input is produced,
// and the entire classroom silently dropped to deterministic fallback text.
// These tests pin the chunked behaviour: batches of DRAFT_CHUNK_SIZE, one
// call per batch, and a failed batch costing only its own children.

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Keep the real chunk helper, stub only the network call.
vi.mock('@/lib/ai/anthropic', () => ({ anthropic: null, AI_ENABLED: false, AI_MODEL: 'test-model' }));
vi.mock('@/lib/montree/reports/sonnet-tool-drafter', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/montree/reports/sonnet-tool-drafter')>();
  return { ...actual, callSonnetTool: vi.fn() };
});

import {
  callSonnetTool,
  chunkForDrafting,
  DRAFT_CHUNK_SIZE,
} from '../lib/montree/reports/sonnet-tool-drafter';
import { draftMonthlyAllAreasParagraphs, type MonthlyDraftChild } from '../lib/montree/reports/monthly-all-areas-drafter';
import { draftWeeklySummaries } from '../lib/montree/reports/weekly-summary-drafter';
import { buildActiveAreaFacts } from '../lib/montree/reports/period-area-facts';
import { buildChildAggregate } from './helpers/period-fixtures';
import type { ChildAggregate } from '../lib/montree/reports/period-types';

const mockedCall = vi.mocked(callSonnetTool);

/** child ids named in one prompt, in prompt order. */
function idsInPrompt(userText: string): string[] {
  return [...userText.matchAll(/child_id: ([a-z0-9-]+)\)/g)].map((m) => m[1]);
}

function promptOf(callIndex: number): string {
  return (mockedCall.mock.calls[callIndex][0] as { userText: string }).userText;
}

function makeAggregate(name: string): ChildAggregate {
  return buildChildAggregate({
    name,
    areas: {
      language: { sessions: 3, minutesEst: 30, works: [{ name: 'Sandpaper Letters', sessions: 3, minutesEst: 30 }] },
    },
    nextWorks: { language: 'Moveable Alphabet' },
  });
}

function monthlyChildren(n: number): MonthlyDraftChild[] {
  return Array.from({ length: n }, (_, i) => {
    const child = makeAggregate(`Child${i + 1}`);
    return { childId: `kid-${i + 1}`, childName: child.name, facts: buildActiveAreaFacts(child) };
  });
}

function weeklyChildren(n: number): Array<{ childId: string; child: ChildAggregate }> {
  return Array.from({ length: n }, (_, i) => ({ childId: `kid-${i + 1}`, child: makeAggregate(`Child${i + 1}`) }));
}

beforeEach(() => {
  mockedCall.mockReset();
});

describe('chunkForDrafting', () => {
  it('batches at DRAFT_CHUNK_SIZE and preserves order', () => {
    const batches = chunkForDrafting(Array.from({ length: 20 }, (_, i) => i));
    expect(DRAFT_CHUNK_SIZE).toBeLessThanOrEqual(8);
    expect(batches.map((b) => b.length)).toEqual([7, 7, 6]);
    expect(batches.flat()).toEqual(Array.from({ length: 20 }, (_, i) => i));
  });

  it('returns no batches for an empty list and one batch when it fits', () => {
    expect(chunkForDrafting([])).toEqual([]);
    expect(chunkForDrafting([1, 2, 3])).toEqual([[1, 2, 3]]);
  });

  it('never produces a zero-length step', () => {
    expect(chunkForDrafting([1, 2, 3], 0).map((b) => b.length)).toEqual([1, 1, 1]);
  });
});

describe('draftMonthlyAllAreasParagraphs — chunking', () => {
  it('splits a 20-child classroom into batches and merges every paragraph', async () => {
    mockedCall.mockImplementation(async (opts) => ({
      children: idsInPrompt((opts as { userText: string }).userText).map((id) => ({
        child_id: id,
        paragraph: `AI paragraph for ${id}`,
      })),
    }) as never);

    const out = await draftMonthlyAllAreasParagraphs('May 2026', 'Whale Class', monthlyChildren(20));

    expect(mockedCall).toHaveBeenCalledTimes(3);
    expect(idsInPrompt(promptOf(0))).toHaveLength(7);
    expect(idsInPrompt(promptOf(1))).toHaveLength(7);
    expect(idsInPrompt(promptOf(2))).toHaveLength(6);
    // No child appears in two prompts.
    const allIds = [0, 1, 2].flatMap((i) => idsInPrompt(promptOf(i)));
    expect(new Set(allIds).size).toBe(20);
    for (let i = 1; i <= 20; i++) expect(out[`kid-${i}`]).toBe(`AI paragraph for kid-${i}`);
  });

  it('keeps only the failed batch on deterministic fallback', async () => {
    mockedCall.mockImplementation(async (opts) => {
      const ids = idsInPrompt((opts as { userText: string }).userText);
      if (ids.includes('kid-8')) return null; // whole second batch fails after its retry
      return { children: ids.map((id) => ({ child_id: id, paragraph: `AI paragraph for ${id}` })) } as never;
    });

    const out = await draftMonthlyAllAreasParagraphs('May 2026', 'Whale Class', monthlyChildren(20));

    expect(mockedCall).toHaveBeenCalledTimes(3);
    expect(out['kid-1']).toBe('AI paragraph for kid-1');
    expect(out['kid-20']).toBe('AI paragraph for kid-20');
    for (let i = 8; i <= 14; i++) {
      expect(out[`kid-${i}`]).not.toContain('AI paragraph');
      // deterministic fallback text, grounded in the child's own facts
      expect(out[`kid-${i}`]).toContain(`Child${i}`);
      expect(out[`kid-${i}`]).toContain('Sandpaper Letters');
    }
  });

  it('ignores rows for child_ids that were not in that batch', async () => {
    mockedCall.mockImplementation(async (opts) => {
      const ids = idsInPrompt((opts as { userText: string }).userText);
      // Every batch also names a child that belongs to a DIFFERENT batch.
      const outsider = ids.includes('kid-20') ? 'kid-1' : 'kid-20';
      return {
        children: [
          ...ids.map((id) => ({ child_id: id, paragraph: `AI paragraph for ${id}` })),
          { child_id: outsider, paragraph: 'LEAKED across batches' },
          { child_id: 'not-a-child', paragraph: 'hallucinated' },
        ],
      } as never;
    });

    const out = await draftMonthlyAllAreasParagraphs('May 2026', 'Whale Class', monthlyChildren(20));

    expect(Object.values(out).some((p) => p.includes('LEAKED'))).toBe(false);
    expect(out['kid-1']).toBe('AI paragraph for kid-1');
    expect(out['kid-20']).toBe('AI paragraph for kid-20');
    expect(out['not-a-child']).toBeUndefined();
    expect(Object.keys(out)).toHaveLength(20);
  });

  it('makes no call when nobody has facts', async () => {
    const empty = [{ childId: 'kid-1', childName: 'Amy', facts: [] }];
    const out = await draftMonthlyAllAreasParagraphs('May 2026', 'Whale Class', empty);
    expect(mockedCall).not.toHaveBeenCalled();
    expect(out['kid-1']).toContain('Amy');
  });
});

describe('draftWeeklySummaries — chunking', () => {
  it('splits a 15-child classroom into batches and merges every summary', async () => {
    mockedCall.mockImplementation(async (opts) => ({
      children: idsInPrompt((opts as { userText: string }).userText).map((id) => ({
        child_id: id,
        english_sentence: `AI sentence for ${id}`,
        area_lines: [{ area: 'language', chinese: '认读字母' }],
      })),
    }) as never);

    const out = await draftWeeklySummaries('Week of 4 May', 'Whale Class', weeklyChildren(15));

    expect(mockedCall).toHaveBeenCalledTimes(3);
    expect(idsInPrompt(promptOf(0))).toHaveLength(7);
    expect(idsInPrompt(promptOf(2))).toHaveLength(1);
    for (let i = 1; i <= 15; i++) {
      expect(out[`kid-${i}`].english).toBe(`AI sentence for kid-${i}`);
      expect(out[`kid-${i}`].chinese).toBe('语言：认读字母');
    }
  });

  it('keeps only the failed batch on deterministic fallback', async () => {
    mockedCall.mockImplementation(async (opts) => {
      const ids = idsInPrompt((opts as { userText: string }).userText);
      if (ids.includes('kid-1')) return null; // first batch fails after its retry
      return {
        children: ids.map((id) => ({
          child_id: id,
          english_sentence: `AI sentence for ${id}`,
          area_lines: [{ area: 'language', chinese: '认读字母' }],
        })),
      } as never;
    });

    const out = await draftWeeklySummaries('Week of 4 May', 'Whale Class', weeklyChildren(15));

    expect(mockedCall).toHaveBeenCalledTimes(3);
    for (let i = 1; i <= 7; i++) {
      expect(out[`kid-${i}`].english).not.toContain('AI sentence');
      expect(out[`kid-${i}`].english.length).toBeGreaterThan(0);
      expect(out[`kid-${i}`].chinese.length).toBeGreaterThan(0);
    }
    expect(out['kid-8'].english).toBe('AI sentence for kid-8');
    expect(out['kid-15'].english).toBe('AI sentence for kid-15');
  });

  it('ignores rows for child_ids that were not in that batch', async () => {
    mockedCall.mockImplementation(async (opts) => {
      const ids = idsInPrompt((opts as { userText: string }).userText);
      // Every batch also names a child that belongs to a DIFFERENT batch.
      const outsider = ids.includes('kid-15') ? 'kid-1' : 'kid-15';
      return {
        children: [
          ...ids.map((id) => ({
            child_id: id,
            english_sentence: `AI sentence for ${id}`,
            area_lines: [{ area: 'language', chinese: '认读字母' }],
          })),
          { child_id: outsider, english_sentence: 'LEAKED across batches', area_lines: [] },
          { child_id: 'not-a-child', english_sentence: 'hallucinated', area_lines: [] },
        ],
      } as never;
    });

    const out = await draftWeeklySummaries('Week of 4 May', 'Whale Class', weeklyChildren(15));

    expect(Object.values(out).some((r) => r.english.includes('LEAKED'))).toBe(false);
    expect(out['kid-1'].english).toBe('AI sentence for kid-1');
    expect(out['kid-15'].english).toBe('AI sentence for kid-15');
    expect(out['not-a-child']).toBeUndefined();
    expect(Object.keys(out)).toHaveLength(15);
  });
});
