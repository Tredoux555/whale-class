// tests/feedback/statuses.test.ts
//
// The status machine is the board's promise about what happens to what you
// wrote. Each test below is a specific broken promise, named.

import { describe, it, expect } from 'vitest';
import {
  allowedTransitions,
  canTransition,
  CHANGELOG_STATUSES,
  defaultStatusFor,
  isChangelogStatus,
  isStatusValidForType,
  statusesForType,
  statusIsStruck,
  statusLabel,
  statusTone,
  STATUSES_BY_TYPE,
  typeLabel,
  typeSupportsStatus,
  typeSupportsVoting,
} from '@/lib/montree/feedback/statuses';
import { POST_STATUSES, POST_TYPES } from '@/lib/montree/feedback/types';

describe('statuses per type', () => {
  it('a Problem ends Fixed or Won’t fix, never Shipped', () => {
    expect(isStatusValidForType('problem', 'fixed')).toBe(true);
    expect(isStatusValidForType('problem', 'wont_fix')).toBe(true);
    expect(isStatusValidForType('problem', 'shipped')).toBe(false);
    expect(isStatusValidForType('problem', 'planned')).toBe(false);
  });

  it('an Idea ends Shipped or Declined, never Fixed', () => {
    expect(isStatusValidForType('idea', 'shipped')).toBe(true);
    expect(isStatusValidForType('idea', 'declined')).toBe(true);
    expect(isStatusValidForType('idea', 'fixed')).toBe(false);
  });

  it('a Question is only ever Open or Answered', () => {
    expect([...statusesForType('question')]).toEqual(['open', 'answered']);
  });

  it('a Discussion shows no status at all', () => {
    expect(typeSupportsStatus('discussion')).toBe(false);
    expect(allowedTransitions('discussion', 'open')).toEqual([]);
  });

  it('every type starts at Open, so a row always has a readable status', () => {
    for (const type of POST_TYPES) {
      expect(defaultStatusFor(type)).toBe('open');
      expect(isStatusValidForType(type, 'open')).toBe(true);
    }
  });

  it('only Problems and Ideas carry votes', () => {
    expect(typeSupportsVoting('problem')).toBe(true);
    expect(typeSupportsVoting('idea')).toBe(true);
    expect(typeSupportsVoting('question')).toBe(false);
    expect(typeSupportsVoting('discussion')).toBe(false);
  });
});

describe('transitions', () => {
  it('moves forward along the pipeline', () => {
    expect(canTransition('problem', 'open', 'confirmed')).toBe(true);
    expect(canTransition('problem', 'confirmed', 'in_progress')).toBe(true);
    expect(canTransition('problem', 'in_progress', 'fixed')).toBe(true);
    expect(canTransition('idea', 'planned', 'shipped')).toBe(true);
  });

  it('allows the honest reversals a real team needs', () => {
    // A "Fixed" that came back.
    expect(canTransition('problem', 'fixed', 'in_progress')).toBe(true);
    // A "Declined" someone reconsidered.
    expect(canTransition('idea', 'declined', 'planned')).toBe(true);
  });

  it('refuses a status that belongs to another type', () => {
    expect(canTransition('problem', 'open', 'shipped')).toBe(false);
    expect(canTransition('idea', 'open', 'fixed')).toBe(false);
    expect(canTransition('question', 'open', 'planned')).toBe(false);
  });

  it('refuses a move to the SAME status', () => {
    // Otherwise every "save" writes a history row and mails every subscriber
    // about nothing.
    for (const type of POST_TYPES) {
      for (const status of STATUSES_BY_TYPE[type]) {
        expect(canTransition(type, status, status)).toBe(false);
      }
    }
  });

  it('never offers a transition it would then refuse', () => {
    // The dropdown and the PATCH gate are built from the same table; this
    // test is what keeps them from drifting apart.
    for (const type of POST_TYPES) {
      for (const from of STATUSES_BY_TYPE[type]) {
        for (const to of allowedTransitions(type, from)) {
          expect(canTransition(type, from, to)).toBe(true);
        }
      }
    }
  });

  it('a Discussion cannot be moved anywhere', () => {
    for (const to of POST_STATUSES) {
      expect(canTransition('discussion', 'open', to)).toBe(false);
    }
  });
});

describe('changelog and presentation', () => {
  it('only Fixed and Shipped reach the changelog', () => {
    expect([...CHANGELOG_STATUSES].sort()).toEqual(['fixed', 'shipped']);
    expect(isChangelogStatus('fixed')).toBe(true);
    expect(isChangelogStatus('shipped')).toBe(true);
    expect(isChangelogStatus('planned')).toBe(false);
    expect(isChangelogStatus('wont_fix')).toBe(false);
  });

  it('gives every status a tone and both labels', () => {
    for (const status of POST_STATUSES) {
      expect(statusTone(status)).toBeTruthy();
      expect(statusLabel(status, 'en')).not.toBe(status);
      expect(statusLabel(status, 'zh')).not.toBe(status);
    }
  });

  it('gives every type both labels', () => {
    for (const type of POST_TYPES) {
      expect(typeLabel(type, 'en')).toBeTruthy();
      expect(typeLabel(type, 'zh')).toBeTruthy();
      expect(typeLabel(type, 'zh')).not.toBe(typeLabel(type, 'en'));
    }
  });

  it('strikes through only the two refusals', () => {
    expect(statusIsStruck('declined')).toBe(true);
    expect(statusIsStruck('wont_fix')).toBe(true);
    expect(statusIsStruck('shipped')).toBe(false);
  });
});
