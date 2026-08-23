import { describe, it, expect } from 'vitest';
import { buildFallbackAllAreasParagraph, buildActiveAreaFacts } from '../lib/montree/weekly-admin/monthly-all-areas-builder';
import { buildChildAggregate, transition } from './helpers/period-fixtures';

describe('buildFallbackAllAreasParagraph', () => {
  it('returns a no-activity sentence when there are no active areas', () => {
    const child = buildChildAggregate();
    const facts = buildActiveAreaFacts(child);
    expect(buildFallbackAllAreasParagraph('Amy', facts, 'May')).toBe(
      'Amy had no recorded activity across any area in May.',
    );
  });

  it('names a single top work and appends a next-work clause', () => {
    const child = buildChildAggregate({
      areas: { language: { sessions: 3, minutesEst: 30, works: [{ name: 'Sandpaper Letters', sessions: 3, minutesEst: 30 }] } },
      nextWorks: { language: 'Moveable Alphabet' },
    });
    const facts = buildActiveAreaFacts(child);
    const para = buildFallbackAllAreasParagraph('Amy', facts, 'May');
    expect(para).toBe(
      'In Language, Amy worked with Sandpaper Letters this month. Next, we can look at Moveable Alphabet.',
    );
  });

  it('joins two top works with "and", no session-count suffix', () => {
    const child = buildChildAggregate({
      areas: {
        mathematics: {
          sessions: 2,
          minutesEst: 20,
          works: [
            { name: 'Number Rods', sessions: 1, minutesEst: 10 },
            { name: 'Spindle Box', sessions: 1, minutesEst: 10 },
          ],
        },
      },
    });
    const facts = buildActiveAreaFacts(child);
    expect(buildFallbackAllAreasParagraph('Ben', facts, 'June')).toBe(
      'In Mathematics, Ben worked with Number Rods and Spindle Box this month.',
    );
  });

  it('prefers the mastery sentence over the practicing sentence when both exist', () => {
    const child = buildChildAggregate({
      areas: { sensorial: { sessions: 4, minutesEst: 40, works: [{ name: 'Pink Tower', sessions: 2, minutesEst: 20 }] } },
      transitions: [
        transition({ work_name: 'Pink Tower', area: 'sensorial', to: 'mastered' }),
        transition({ work_name: 'Brown Stair', area: 'sensorial', to: 'practicing' }),
      ],
    });
    const facts = buildActiveAreaFacts(child);
    const para = buildFallbackAllAreasParagraph('Cara', facts, 'July');
    expect(para).toContain('Reached mastery on Pink Tower.');
    expect(para).not.toContain('Currently practicing');
  });

  it('emits a sentence group per active area, in AREA_ORDER', () => {
    const child = buildChildAggregate({
      areas: {
        cultural: { sessions: 1, minutesEst: 10, works: [{ name: 'Land and Water Forms', sessions: 1, minutesEst: 10 }] },
        practical_life: { sessions: 2, minutesEst: 20, works: [{ name: 'Pouring Water', sessions: 2, minutesEst: 20 }] },
      },
    });
    const facts = buildActiveAreaFacts(child);
    const para = buildFallbackAllAreasParagraph('Dev', facts, 'August');
    const plIdx = para.indexOf('Practical Life');
    const cultIdx = para.indexOf('Cultural');
    expect(plIdx).toBeGreaterThanOrEqual(0);
    expect(cultIdx).toBeGreaterThan(plIdx);
  });

  it('describes an area with sessions but no named work', () => {
    const child = buildChildAggregate({
      areas: { language: { sessions: 2, minutesEst: 20, works: [] } },
    });
    const facts = buildActiveAreaFacts(child);
    expect(buildFallbackAllAreasParagraph('Eli', facts, 'May')).toBe(
      'In Language, Eli had 2 sessions recorded in May with no named work.',
    );
  });
});
