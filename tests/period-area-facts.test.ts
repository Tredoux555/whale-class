import { describe, it, expect } from 'vitest';
import { buildActiveAreaFacts } from '../lib/montree/reports/period-area-facts';
import { buildChildAggregate, transition } from './helpers/period-fixtures';

describe('buildActiveAreaFacts', () => {
  it('skips areas with zero sessions and zero transitions', () => {
    const child = buildChildAggregate({
      areas: { language: { sessions: 3, minutesEst: 30, works: [{ name: 'Sandpaper Letters', sessions: 3, minutesEst: 30 }] } },
    });
    const facts = buildActiveAreaFacts(child);
    expect(facts.map((f) => f.area)).toEqual(['language']);
  });

  it('includes an area with zero sessions but a status transition (progress-fallback case)', () => {
    const child = buildChildAggregate({
      transitions: [transition({ work_name: 'Pink Tower', area: 'sensorial', to: 'practicing' })],
    });
    const facts = buildActiveAreaFacts(child);
    expect(facts.map((f) => f.area)).toEqual(['sensorial']);
    expect(facts[0].sessions).toBe(0);
    expect(facts[0].practicingWorks).toEqual(['Pink Tower']);
  });

  it('returns areas in AREA_ORDER regardless of insertion order', () => {
    const child = buildChildAggregate({
      areas: {
        cultural: { sessions: 1, minutesEst: 10, works: [{ name: 'Land and Water Forms', sessions: 1, minutesEst: 10 }] },
        practical_life: { sessions: 2, minutesEst: 20, works: [{ name: 'Pouring Water', sessions: 2, minutesEst: 20 }] },
      },
    });
    const facts = buildActiveAreaFacts(child);
    expect(facts.map((f) => f.area)).toEqual(['practical_life', 'cultural']);
  });

  it('filters malformed work names shorter than 4 characters', () => {
    const child = buildChildAggregate({
      areas: {
        mathematics: {
          sessions: 2,
          minutesEst: 20,
          works: [
            { name: 'seq', sessions: 1, minutesEst: 10 },
            { name: 'Spindle Box', sessions: 1, minutesEst: 10 },
          ],
        },
      },
    });
    const facts = buildActiveAreaFacts(child);
    expect(facts[0].topWorks).toEqual(['Spindle Box']);
  });

  it('dedupes work names case-insensitively and caps topWorks at 3', () => {
    const child = buildChildAggregate({
      areas: {
        sensorial: {
          sessions: 5,
          minutesEst: 50,
          works: [
            { name: 'Pink Tower', sessions: 3, minutesEst: 30 },
            { name: 'pink tower', sessions: 1, minutesEst: 10 },
            { name: 'Brown Stair', sessions: 1, minutesEst: 5 },
            { name: 'Color Tablets', sessions: 1, minutesEst: 5 },
            { name: 'Sound Cylinders', sessions: 1, minutesEst: 5 },
          ],
        },
      },
    });
    const facts = buildActiveAreaFacts(child);
    expect(facts[0].topWorks).toEqual(['Pink Tower', 'Brown Stair', 'Color Tablets']);
  });

  it('splits transitions into mastered / practicing / presented by area, deduped', () => {
    const child = buildChildAggregate({
      areas: { language: { sessions: 4, minutesEst: 40, works: [] } },
      transitions: [
        transition({ work_name: 'Sandpaper Letters', area: 'language', to: 'mastered' }),
        transition({ work_name: 'Sandpaper Letters', area: 'language', to: 'mastered' }),
        transition({ work_name: 'Moveable Alphabet', area: 'language', to: 'practicing' }),
        transition({ work_name: 'Metal Insets', area: 'language', to: 'presented' }),
        transition({ work_name: 'Pink Tower', area: 'sensorial', to: 'mastered' }),
      ],
    });
    const facts = buildActiveAreaFacts(child);
    const lang = facts.find((f) => f.area === 'language')!;
    expect(lang.masteredWorks).toEqual(['Sandpaper Letters']);
    expect(lang.practicingWorks).toEqual(['Moveable Alphabet']);
    expect(lang.presentedWorks).toEqual(['Metal Insets']);
  });

  it('carries the aggregator next_works recommendation through unchanged', () => {
    const child = buildChildAggregate({
      areas: { cultural: { sessions: 1, minutesEst: 10, works: [] } },
      nextWorks: { cultural: 'Puzzle Map: Asia' },
    });
    const facts = buildActiveAreaFacts(child);
    expect(facts[0].nextWork).toBe('Puzzle Map: Asia');
  });
});
