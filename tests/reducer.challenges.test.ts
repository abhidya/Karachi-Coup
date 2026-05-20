import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { card, declare, passChallenge, turnState, challenge } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer challenges', () => {
  it('challenge: player may Call Bakwaas on a challengeable claimed action', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.phase).toBe('AWAITING_BURN');
  });

  it('challenge: player cannot Call Bakwaas on Chai Paisa', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const declared = declare(state, 'CHAI_PAISA');
    expect(declared.phase).toBe('TURN_START');
  });

  it('challenge: player cannot Call Bakwaas on Rishtedaar Help because it claims no role', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'RISHTEDAAR_HELP');
    expect(declared.phase).toBe('BLOCK_WINDOW');
  });

  it('challenge: player cannot Call Bakwaas on Full Beizzati', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2), 'FULL_BEIZZATI', toPlayerId('p2'));
    expect(declared.phase).toBe('AWAITING_BURN');
  });

  it('challenge: player cannot challenge their own action claim', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const result = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p1') });
    expect(result.pendingBurn?.playerId).toBe(toPlayerId('p1'));
  });

  it('challenge: successful action proof makes challenger burn one Connection', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p2'));
  });

  it('challenge: successful action proof shuffles the proven Connection back into the deck', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.playersById[toPlayerId('p1')]!.revealedConnections).toEqual([]);
  });

  it('challenge: successful action proof gives the proving player one replacement Connection', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.playersById[toPlayerId('p1')]!.hiddenConnections).toHaveLength(2);
  });

  it('challenge: successful action proof preserves the proving player\'s hidden Connection count', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.playersById[toPlayerId('p1')]!.hiddenConnections).toHaveLength(2);
  });

  it('challenge: successful action proof does not permanently reveal the proven Connection', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.playersById[toPlayerId('p1')]!.revealedConnections).toEqual([]);
  });

  it('challenge: successful action proof continues the original action', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    const burned = reducer(challenged, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: challenged.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.playersById[toPlayerId('p1')]!.rupees).toBe(5);
  });

  it('challenge: failed action proof makes the claimant burn one Connection', () => {
    const declared = declare(turnState([card('BHAI'), card('POLICE_WALA')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p1'));
  });

  it('challenge: failed action proof cancels the claimed action', () => {
    const declared = declare(turnState([card('BHAI'), card('POLICE_WALA')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.phase).toBe('AWAITING_BURN');
  });

  it('challenge: failed Kiraya Collection does not award 3 rupees', () => {
    const declared = declare(turnState([card('BHAI'), card('POLICE_WALA')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.playersById[toPlayerId('p1')]!.rupees).toBe(2);
  });

  it('challenge: failed Police Wala Raid does not steal rupees', () => {
    const declared = declare(turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p1'));
  });

  it('challenge: failed Bhai Ka Scene does not make the target burn', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('POLICE_WALA')], [card('MUMMA'), card('BHAI')], 5, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p1'));
  });

  it('challenge: failed Zardaar Jugaad does not draw or exchange cards', () => {
    const declared = declare(turnState([card('BHAI'), card('POLICE_WALA')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const challenged = challenge(declared, toPlayerId('p2'));
    expect(challenged.phase).toBe('AWAITING_BURN');
  });

  it('challenge: card accounting remains exactly 15 after successful proof and replacement', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    const total = challenged.deck.length + challenged.discardPile.length + Object.values(challenged.playersById).reduce((sum, player) => sum + player.hiddenConnections.length, 0);
    expect(total).toBe(15);
  });

  it('challenge: card accounting remains exactly 15 after failed proof and burn', () => {
    const declared = declare(turnState([card('BHAI'), card('POLICE_WALA')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    const total = challenged.deck.length + challenged.discardPile.length + Object.values(challenged.playersById).reduce((sum, player) => sum + player.hiddenConnections.length, 0);
    expect(total).toBe(15);
  });

  it('challenge: successful block proof does not permanently reveal the proven Connection', () => {
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
    const challenged = challenge(blocked, toPlayerId('p1'));
    expect(challenged.playersById[toPlayerId('p2')]!.revealedConnections).toEqual([]);
  });
});
