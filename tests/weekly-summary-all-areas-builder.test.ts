import { describe, it, expect } from 'vitest';
import {
  buildFallbackWeeklySentence,
  buildFallbackChineseLines,
  pickPlanWork,
  buildActiveAreaFacts,
} from '../lib/montree/weekly-admin/weekly-summary-all-areas-builder';
import { buildChildAggregate, transition } from './helpers/period-fixtures';

describe('buildFallbackWeeklySentence', () => {
  it('reports no activity when nothing happened this week', () => {
    const child = buildChildAggregate({ name: 'Amy' });
    expect(buildFallbackWeeklySentence(child)).toBe('Amy had no recorded activity this week.');
  });

  it('names the top area by estimated minutes, with session count', () => {
    const child = buildChildAggregate({
      name: 'Ben',
      areas: { language: { sessions: 4, minutesEst: 88, works: [{ name: 'Sandpaper Letters', sessions: 4, minutesEst: 88 }] } },
    });
    expect(buildFallbackWeeklySentence(child)).toBe('Ben worked most in Language (4 sessions).');
  });

  it('adds a second area with "also" when present, ranked by minutes', () => {
    const child = buildChildAggregate({
      name: 'Cara',
      areas: {
        language: { sessions: 4, minutesEst: 88, works: [] },
        mathematics: { sessions: 1, minutesEst: 10, works: [] },
      },
    });
    expect(buildFallbackWeeklySentence(child)).toBe('Cara worked most in Language (4 sessions), also Mathematics.');
  });

  it('prefers the mastery clause over the practicing clause', () => {
    const child = buildChildAggregate({
      name: 'Dev',
      areas: { sensorial: { sessions: 2, minutesEst: 20, works: [] } },
      transitions: [
        transition({ work_name: 'Pink Tower', area: 'sensorial', to: 'mastered' }),
        transition({ work_name: 'Brown Stair', area: 'sensorial', to: 'practicing' }),
      ],
    });
    const sentence = buildFallbackWeeklySentence(child);
    expect(sentence).toContain('Mastered Pink Tower.');
    expect(sentence).not.toContain('Moved to practicing');
  });

  it('appends a next-week clause from the aggregator recommendation', () => {
    const child = buildChildAggregate({
      name: 'Eli',
      areas: { cultural: { sessions: 1, minutesEst: 10, works: [] } },
      nextWorks: { cultural: 'Puzzle Map: Asia' },
    });
    expect(buildFallbackWeeklySentence(child)).toBe(
      'Eli worked most in Cultural (1 session). Next week, we can look at Puzzle Map: Asia.',
    );
  });
});

describe('buildFallbackChineseLines', () => {
  it('returns an empty string for no active areas', () => {
    expect(buildFallbackChineseLines([])).toBe('');
  });

  it('lists top works with the zh area label, joined by 、', () => {
    const child = buildChildAggregate({
      areas: {
        language: {
          sessions: 2,
          minutesEst: 20,
          works: [
            { name: 'Sandpaper Letters', sessions: 1, minutesEst: 10 },
            { name: 'Moveable Alphabet', sessions: 1, minutesEst: 10 },
          ],
        },
      },
    });
    const facts = buildActiveAreaFacts(child);
    expect(buildFallbackChineseLines(facts)).toBe('语言：Sandpaper Letters、Moveable Alphabet');
  });

  it('falls back to a session count when there is no named work', () => {
    const child = buildChildAggregate({ areas: { mathematics: { sessions: 3, minutesEst: 30, works: [] } } });
    const facts = buildActiveAreaFacts(child);
    expect(buildFallbackChineseLines(facts)).toBe('数学：3 sessions');
  });

  it('joins multiple area lines with a newline in AREA_ORDER', () => {
    const child = buildChildAggregate({
      areas: {
        cultural: { sessions: 1, minutesEst: 10, works: [] },
        practical_life: { sessions: 1, minutesEst: 10, works: [] },
      },
    });
    const facts = buildActiveAreaFacts(child);
    expect(buildFallbackChineseLines(facts)).toBe('日常：1 session\n文化：1 session');
  });
});

describe('pickPlanWork', () => {
  it('returns null when the area has nothing at all', () => {
    const child = buildChildAggregate();
    expect(pickPlanWork('language', child)).toBeNull();
  });

  it('prefers a transition to practicing, marked isPracticing', () => {
    const child = buildChildAggregate({
      transitions: [
        transition({ work_name: 'Metal Insets', area: 'language', to: 'presented' }),
        transition({ work_name: 'Moveable Alphabet', area: 'language', to: 'practicing' }),
      ],
    });
    expect(pickPlanWork('language', child)).toEqual({ workName: 'Moveable Alphabet', isPracticing: true });
  });

  it('falls back to a transition to presented when nothing is practicing', () => {
    const child = buildChildAggregate({
      transitions: [transition({ work_name: 'Metal Insets', area: 'language', to: 'presented' })],
    });
    expect(pickPlanWork('language', child)).toEqual({ workName: 'Metal Insets', isPracticing: false });
  });

  it('falls back to the aggregator next_works recommendation when nothing transitioned', () => {
    const child = buildChildAggregate({ nextWorks: { language: 'Sandpaper Letters' } });
    expect(pickPlanWork('language', child)).toEqual({ workName: 'Sandpaper Letters', isPracticing: false });
  });
});
