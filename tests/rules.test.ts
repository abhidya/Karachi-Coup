import { describe, expect, it } from 'vitest';
import { ACTION_CONFIG, actionCosts, actionRequirements, blockRolesByAction } from '../src/game/rules';
import { ACTION_TYPES, ROLES } from '../src/game/types';

describe('rules', () => {
  it('rules: Chai Paisa has no role claim, no target, no cost, cannot be challenged, and cannot be blocked', () => {
    const config = ACTION_CONFIG.CHAI_PAISA;
    expect(config.claimedRole).toBeNull();
    expect(config.needsTarget).toBe(false);
    expect(config.cost).toBe(0);
    expect(config.challengeable).toBe(false);
    expect(config.blockRoles).toEqual([]);
    expect(actionCosts.CHAI_PAISA).toBe(0);
  });

  it('rules: Rishtedaar Help has no role claim, no target, no cost, cannot be challenged, and can be blocked only by Malik Saab', () => {
    const config = ACTION_CONFIG.RISHTEDAAR_HELP;
    expect(config.claimedRole).toBeNull();
    expect(config.needsTarget).toBe(false);
    expect(config.cost).toBe(0);
    expect(config.challengeable).toBe(false);
    expect(blockRolesByAction.RISHTEDAAR_HELP).toEqual(['MALIK_SAAB']);
  });

  it('rules: Kiraya Collection claims Malik Saab, has no target, can be challenged, and cannot be blocked', () => {
    const config = ACTION_CONFIG.KIRAYA_COLLECTION;
    expect(config.claimedRole).toBe('MALIK_SAAB');
    expect(config.needsTarget).toBe(false);
    expect(config.challengeable).toBe(true);
    expect(config.blockRoles).toEqual([]);
  });

  it('rules: Police Wala Raid claims Police Wala, requires a target, can be challenged, and can be blocked by Police Wala or Zardaar Chor', () => {
    const config = ACTION_CONFIG.POLICE_WALA_RAID;
    expect(config.claimedRole).toBe('POLICE_WALA');
    expect(config.needsTarget).toBe(true);
    expect(config.challengeable).toBe(true);
    expect(config.blockRoles).toEqual(['POLICE_WALA', 'ZARDAAR_CHOR']);
  });

  it('rules: Bhai Ka Scene claims Bhai, costs 3 rupees, requires a target, can be challenged, and can be blocked only by Mumma', () => {
    const config = ACTION_CONFIG.BHAI_KA_SCENE;
    expect(config.claimedRole).toBe('BHAI');
    expect(config.cost).toBe(3);
    expect(config.needsTarget).toBe(true);
    expect(config.challengeable).toBe(true);
    expect(config.blockRoles).toEqual(['MUMMA']);
  });

  it('rules: Zardaar Jugaad claims Zardaar Chor, can be challenged, and cannot be blocked', () => {
    const config = ACTION_CONFIG.ZARDAAR_JUGAAD;
    expect(config.claimedRole).toBe('ZARDAAR_CHOR');
    expect(config.challengeable).toBe(true);
    expect(config.blockRoles).toEqual([]);
  });

  it('rules: Full Beizzati costs 7 rupees, requires a target, cannot be challenged, and cannot be blocked', () => {
    const config = ACTION_CONFIG.FULL_BEIZZATI;
    expect(config.cost).toBe(7);
    expect(config.needsTarget).toBe(true);
    expect(config.challengeable).toBe(false);
    expect(config.blockRoles).toEqual([]);
  });

  it('rules: every action type has exactly one action config entry', () => {
    expect(Object.keys(ACTION_CONFIG).sort()).toEqual([...ACTION_TYPES].sort());
  });

  it('rules: every configured claimed role exists in the role enum', () => {
    for (const config of Object.values(ACTION_CONFIG)) {
      if (config.claimedRole) {
        expect(ROLES).toContain(config.claimedRole);
      }
    }
  });

  it('rules: every configured block role exists in the role enum', () => {
    for (const roles of Object.values(blockRolesByAction)) {
      for (const role of roles ?? []) {
        expect(ROLES).toContain(role);
      }
    }
  });
});
