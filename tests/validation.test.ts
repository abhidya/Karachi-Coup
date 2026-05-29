import { describe, expect, it } from 'vitest';
import { validateClientMessage } from '../src/game/validation';
import { reducer } from '../src/game/reducer';
import { card, declare, lobbyState, turnState, passChallenge, turnState3, openBlockWindowAfterActionChallenge } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('validation', () => {
  it('validation: rejects client message from unknown connection/player', () => {
    const result = validateClientMessage(lobbyState(2), toPlayerId('ghost'), { type: 'REQUEST_RESYNC' });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects JOIN after game has started unless reconnect flow is used', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'JOIN',
      roomCode: 'ROOM1',
      displayName: 'Alice',
      clientNonce: 'nonce',
    });
    expect(result.ok).toBe(false);
  });

  it('validation: accepts DECLARE_ACTION only from the active player', () => {
    const result = validateClientMessage(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'CHAI_PAISA',
    });
    expect(result.ok).toBe(true);
  });

  it('validation: rejects DECLARE_ACTION from non-active player', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const result = validateClientMessage(state, toPlayerId('p2'), {
      type: 'DECLARE_ACTION',
      actionType: 'CHAI_PAISA',
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects action from eliminated player', () => {
    const state = turnState([], [card('MUMMA')]);
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'CHAI_PAISA',
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects action with illegal target', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'POLICE_WALA_RAID',
      targetId: 'ghost',
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects targeted actions against self', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2);
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'FULL_BEIZZATI',
      targetId: toPlayerId('p1'),
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects target action when target is eliminated', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], []);
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'POLICE_WALA_RAID',
      targetId: toPlayerId('p2'),
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects Bhai Ka Scene when player has fewer than 3 rupees', () => {
    const state = turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 2, 2);
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'BHAI_KA_SCENE',
      targetId: toPlayerId('p2'),
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects Full Beizzati when player has fewer than 7 rupees', () => {
    const state = turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 6, 2);
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'FULL_BEIZZATI',
      targetId: toPlayerId('p2'),
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects non-Full Beizzati action when active player has 10 or more rupees', () => {
    const state = turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 10, 2);
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'DECLARE_ACTION',
      actionType: 'CHAI_PAISA',
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects CHALLENGE when there is no challengeable pending claim', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const result = validateClientMessage(state, toPlayerId('p2'), { type: 'CHALLENGE' });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects CHALLENGE from the claimant', () => {
    const state = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const result = validateClientMessage(state, toPlayerId('p1'), { type: 'CHALLENGE' });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects PASS_CHALLENGE from an ineligible player', () => {
    const state = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const result = validateClientMessage(state, toPlayerId('p1'), { type: 'PASS_CHALLENGE' });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects BLOCK when action is not blockable', () => {
    const state = passChallenge(declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION'), toPlayerId('p2'));
    const result = validateClientMessage(state, toPlayerId('p2'), { type: 'BLOCK', role: 'MALIK_SAAB' });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects BLOCK with an invalid role for the pending action', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'RISHTEDAAR_HELP');
    const result = validateClientMessage(declared, toPlayerId('p2'), { type: 'BLOCK', role: 'BHAI' });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects BLOCK from a player who is not the target when only target can block', () => {
    const declared = declare(turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const afterChallenge = validateClientMessage(declared, toPlayerId('p1'), { type: 'BLOCK', role: 'MUMMA' });
    expect(afterChallenge.ok).toBe(false);
  });

  it('validation: accepts Malik Saab block against Rishtedaar Help', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'RISHTEDAAR_HELP');
    const result = validateClientMessage(declared, toPlayerId('p2'), { type: 'BLOCK', role: 'MALIK_SAAB' });
    expect(result.ok).toBe(true);
  });

  it('validation: rejects Rishtedaar Help block from the actor', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'RISHTEDAAR_HELP');
    const result = validateClientMessage(declared, toPlayerId('p1'), { type: 'BLOCK', role: 'MALIK_SAAB' });
    expect(result.ok).toBe(false);
  });

  it('validation: accepts PASS_BLOCK from the target during an initial targeted block window', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('MALIK_SAAB'), card('BHAI')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const result = validateClientMessage(afterChallenge, toPlayerId('p2'), { type: 'PASS_BLOCK' });
    expect(result.ok).toBe(true);
  });

  it('validation: rejects PASS_BLOCK from non-target during a targeted block window', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('MALIK_SAAB'), card('BHAI')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const result = validateClientMessage(afterChallenge, toPlayerId('p3'), { type: 'PASS_BLOCK' });
    expect(result.ok).toBe(false);
  });

  it('validation: accepts Police Wala block against Police Wala Raid', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('MALIK_SAAB'), card('BHAI')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const result = validateClientMessage(afterChallenge, toPlayerId('p2'), { type: 'BLOCK', role: 'POLICE_WALA' });
    expect(result.ok).toBe(true);
  });

  it('validation: accepts Zardaar Chor block against Police Wala Raid', () => {
    const declared = declare(turnState3([card('POLICE_WALA'), card('BHAI')], [card('ZARDAAR_CHOR'), card('MUMMA')], [card('MALIK_SAAB'), card('BHAI')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const result = validateClientMessage(afterChallenge, toPlayerId('p2'), { type: 'BLOCK', role: 'ZARDAAR_CHOR' });
    expect(result.ok).toBe(true);
  });

  it('validation: accepts Mumma block against Bhai Ka Scene', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('MALIK_SAAB'), card('BHAI')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const afterChallenge = openBlockWindowAfterActionChallenge(declared);
    const result = validateClientMessage(afterChallenge, toPlayerId('p2'), { type: 'BLOCK', role: 'MUMMA' });
    expect(result.ok).toBe(true);
  });

  it('validation: rejects CHOOSE_CONNECTION_TO_BURN when no burn is pending', () => {
    const result = validateClientMessage(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), toPlayerId('p1'), {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      connectionId: 'card-1',
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects CHOOSE_CONNECTION_TO_BURN for a Connection not in sender\'s hidden hand', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2), 'FULL_BEIZZATI', toPlayerId('p2'));
    const result = validateClientMessage(declared, toPlayerId('p2'), {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      connectionId: 'ghost',
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects JUGAAD_RETURN when no Jugaad return is pending', () => {
    const result = validateClientMessage(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), toPlayerId('p1'), {
      type: 'JUGAAD_RETURN',
      returnedConnectionIds: ['a', 'b'],
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects JUGAAD_RETURN from the wrong player', () => {
    const state = passChallenge(declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('BHAI')]), 'ZARDAAR_JUGAAD'), toPlayerId('p2'));
    const result = validateClientMessage(state, toPlayerId('p2'), {
      type: 'JUGAAD_RETURN',
      returnedConnectionIds: ['a', 'b'] as never,
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects JUGAAD_RETURN unless exactly 2 valid returnedConnectionIds are provided', () => {
    const state = passChallenge(declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('BHAI')]), 'ZARDAAR_JUGAAD'), toPlayerId('p2'));
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'JUGAAD_RETURN',
      returnedConnectionIds: ['a', 'b'],
    });
    expect(result.ok).toBe(false);
  });

  it('validation: rejects duplicate JUGAAD_RETURN card ids', () => {
    const state = passChallenge(declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('BHAI')]), 'ZARDAAR_JUGAAD'), toPlayerId('p2'));
    const firstId = state.playersById[toPlayerId('p1')]!.hiddenConnections[0]!.id;
    const result = validateClientMessage(state, toPlayerId('p1'), {
      type: 'JUGAAD_RETURN',
      returnedConnectionIds: [firstId, firstId],
    });
    expect(result.ok).toBe(false);
  });

  it('validation: ignores or rejects any client-sent playerId that does not match the connection-mapped sender', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const result = validateClientMessage(state, toPlayerId('p2'), {
      type: 'DECLARE_ACTION',
      actionType: 'CHAI_PAISA',
    });
    expect(result.ok).toBe(false);
  });
});
