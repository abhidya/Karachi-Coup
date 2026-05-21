import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { card, declare, passChallenge, turnState3 } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer response flow', () => {
  it('flow: claimed Kiraya Collection waits for challengers before resolving', () => {
    const state = turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]);
    const declared = declare(state, 'KIRAYA_COLLECTION');
    expect(declared.phase).toBe('CHALLENGE_WINDOW');
    expect(declared.playersById[toPlayerId('p1')]!.rupees).toBe(2);

    const afterOnePass = passChallenge(declared, toPlayerId('p2'));
    expect(afterOnePass.phase).toBe('CHALLENGE_WINDOW');

    const afterAllPass = passChallenge(afterOnePass, toPlayerId('p3'));
    expect(afterAllPass.phase).toBe('TURN_START');
    expect(afterAllPass.playersById[toPlayerId('p1')]!.rupees).toBe(5);
  });

  it('flow: Police Wala Raid waits for challenge window before block window', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    expect(declared.phase).toBe('CHALLENGE_WINDOW');
    const afterPasses = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    expect(afterPasses.phase).toBe('BLOCK_WINDOW');
  });

  it('flow: Police Wala Raid target can block with Police Wala', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const blocked = reducer(openBlock, {
      type: 'BLOCK',
      block: {
        actionId: openBlock.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
    expect(blocked.pendingBlock?.blockingRole).toBe('POLICE_WALA');
  });

  it('flow: Police Wala Raid target can block with Zardaar Chor', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('ZARDAAR_CHOR'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const blocked = reducer(openBlock, {
      type: 'BLOCK',
      block: {
        actionId: openBlock.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'ZARDAAR_CHOR',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
    expect(blocked.pendingBlock?.blockingRole).toBe('ZARDAAR_CHOR');
  });

  it('flow: Bhai Ka Scene target can block with Mumma', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const blocked = reducer(openBlock, {
      type: 'BLOCK',
      block: {
        actionId: openBlock.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MUMMA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
    expect(blocked.pendingBlock?.blockingRole).toBe('MUMMA');
  });

  it('flow: block claim can be challenged before block resolves', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
    expect(blocked.pendingChallenge?.kind).toBe('block');
  });

  it('flow: all eligible players passing block challenge makes block stand', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    const afterFirstPass = reducer(blocked, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p1') });
    const afterSecondPass = reducer(afterFirstPass, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p3') });
    expect(afterSecondPass.phase).toBe('TURN_START');
    expect(afterSecondPass.pendingAction).toBeNull();
  });
});
