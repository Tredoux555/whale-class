// tests/menu-config.test.ts
//
// The Tracker became a CORE screen on 2026-09-06 (Tredoux: "the tracker is
// THE core screen"). Two things had to be true for that to reach teachers:
// the seeded default shows it, and a menu config SAVED BEFORE the item
// existed does not silently hide it.

import { describe, expect, it } from 'vitest';
import { MINIMAL_DEFAULT_MENU, sanitizeMenuConfig } from '@/lib/montree/menu/config';

const visible = (cfg: { items: { id: string; visible: boolean }[] } | null, id: string) =>
  cfg?.items.find((i) => i.id === id)?.visible;

describe('menu config — tracker is core', () => {
  it('is visible in the seeded default for a new teacher', () => {
    expect(visible(MINIMAL_DEFAULT_MENU, 'tracker')).toBe(true);
  });

  it('arrives visible for a teacher whose saved config predates it', () => {
    const saved = { v: 1, items: [{ id: 'photo_audit', visible: true }, { id: 'notes', visible: true }] };
    expect(visible(sanitizeMenuConfig(saved), 'tracker')).toBe(true);
  });

  it('still respects a teacher who explicitly hid it', () => {
    const saved = { v: 1, items: [{ id: 'tracker', visible: false }, { id: 'notes', visible: true }] };
    expect(visible(sanitizeMenuConfig(saved), 'tracker')).toBe(false);
  });

  it('does not turn non-core registry items on when they are missing', () => {
    const saved = { v: 1, items: [{ id: 'notes', visible: true }] };
    expect(visible(sanitizeMenuConfig(saved), 'library')).toBe(false);
    expect(visible(sanitizeMenuConfig(saved), 'calendar')).toBe(false);
  });

  it('drops unknown ids and rejects junk', () => {
    expect(visible(sanitizeMenuConfig({ v: 1, items: [{ id: 'nope' }] }), 'tracker')).toBeUndefined();
    expect(sanitizeMenuConfig({ items: 'x' })).toBeNull();
  });
});
