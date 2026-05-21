import { describe, expect, it } from 'vitest';
import { isTargetedAction, TARGET_ACTIONS } from '../src/ui/actionRouting';

describe('ui action routing', () => {
  it('ui/action config: Kiraya Collection is not targeted', () => {
    expect(isTargetedAction('KIRAYA_COLLECTION')).toBe(false);
  });

  it('ui/action config: Police Wala Raid, Bhai Ka Scene, and Full Beizzati are targeted', () => {
    expect(isTargetedAction('POLICE_WALA_RAID')).toBe(true);
    expect(isTargetedAction('BHAI_KA_SCENE')).toBe(true);
    expect(isTargetedAction('FULL_BEIZZATI')).toBe(true);
    expect(TARGET_ACTIONS).toEqual(['POLICE_WALA_RAID', 'BHAI_KA_SCENE', 'FULL_BEIZZATI']);
  });
});
