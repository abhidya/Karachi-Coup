import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { card, declare, passBlock, passChallenge, challenge, turnState, turnState3, openBlockWindowAfterActionChallenge } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer blocks', () => {
  it('block: Rishtedaar Help can be blocked by Malik Saab', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'RISHTEDAAR_HELP');
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
  });

  it('block: Rishtedaar Help cannot be blocked by Police Wala', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'RISHTEDAAR_HELP');
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('BLOCK_WINDOW');
  });

  it('block: Rishtedaar Help cannot be blocked by Zardaar Chor', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('ZARDAAR_CHOR'), card('POLICE_WALA')]), 'RISHTEDAAR_HELP');
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'ZARDAAR_CHOR',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('BLOCK_WINDOW');
  });

  it('block: Police Wala Raid can be blocked by the target with Police Wala', () => {
    const declared = declare(turnState([card('POLICE_WALA'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
  });

  it('block: Police Wala Raid can be blocked by the target with Zardaar Chor', () => {
    const declared = declare(turnState([card('POLICE_WALA'), card('BHAI')], [card('ZARDAAR_CHOR'), card('MUMMA')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'ZARDAAR_CHOR',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
  });

  it('block: Police Wala Raid cannot be blocked with Mumma', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('ZARDAAR_CHOR'), card('MUMMA')], [card('MALIK_SAAB'), card('BHAI')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MUMMA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('BLOCK_WINDOW');
  });

  it('block: Bhai Ka Scene can be blocked by the target with Mumma', () => {
    const declared = declare(turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 5, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MUMMA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
  });

  it('block: Bhai Ka Scene cannot be blocked by Malik Saab', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('BLOCK_WINDOW');
  });

  it('block: Zardaar Jugaad cannot be blocked', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    expect(declared.pendingAction?.blockRoles).toEqual([]);
  });

  it('block: Kiraya Collection cannot be blocked', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    expect(declared.pendingAction?.blockRoles).toEqual([]);
  });

  it('block: Full Beizzati cannot be blocked', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2), 'FULL_BEIZZATI', toPlayerId('p2'));
    expect(declared.pendingAction?.blockRoles).toEqual([]);
  });

  it('block: unchallenged Malik Saab block cancels Rishtedaar Help', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    const passed = passChallenge(blocked, toPlayerId('p3'));
    expect(passed.phase).toBe('TURN_START');
  });

  it('block: unchallenged Police Wala block cancels Police Wala Raid', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    const passed = passChallenge(blocked, toPlayerId('p3'));
    expect(passed.phase).toBe('TURN_START');
  });

  it('block: unchallenged Zardaar Chor block cancels Police Wala Raid', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('ZARDAAR_CHOR'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'ZARDAAR_CHOR',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    const passed = passChallenge(blocked, toPlayerId('p3'));
    expect(passed.phase).toBe('TURN_START');
  });

  it('block: unchallenged Mumma block cancels Bhai Ka Scene', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MUMMA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p1')],
        responses: {},
      },
    });
    const passed = passChallenge(blocked, toPlayerId('p3'));
    expect(passed.phase).toBe('TURN_START');
  });

  it('block challenge: challenger can Call Bakwaas on a claimed block role', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p3')],
        responses: {},
      },
    });
    const challenged = challenge(blocked, toPlayerId('p3'));
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p3'));
  });

  it('block challenge: successful block proof makes challenger burn one Connection', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p3')],
        responses: {},
      },
    });
    const challenged = challenge(blocked, toPlayerId('p3'));
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p3'));
  });

  it('block challenge: successful block proof shuffles the proven block Connection back and draws a replacement', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p3')],
        responses: {},
      },
    });
    const challenged = challenge(blocked, toPlayerId('p3'));
    expect(challenged.playersById[toPlayerId('p2')]!.hiddenConnections).toHaveLength(2);
  });

  it('block challenge: successful block proof preserves the block and cancels the original action', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'POLICE_WALA',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p3')],
        responses: {},
      },
    });
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
  });

  it('block challenge: failed block proof makes blocker burn one Connection', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'ZARDAAR_CHOR',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p3')],
        responses: {},
      },
    });
    const challenged = challenge(blocked, toPlayerId('p3'));
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p2'));
  });

  it('block challenge: failed block proof removes the block and lets the original action resolve', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const blocked = reducer(afterChallenge, {
      type: 'BLOCK',
      block: {
        actionId: afterChallenge.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'ZARDAAR_CHOR',
        targetId: toPlayerId('p2'),
        eligibleChallengers: [toPlayerId('p3')],
        responses: {},
      },
    });
    const challenged = challenge(blocked, toPlayerId('p3'));
    const burned = reducer(challenged, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: challenged.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.phase).not.toBe('CHALLENGE_WINDOW');
  });
});
