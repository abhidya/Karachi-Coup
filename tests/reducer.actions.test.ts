import { describe, expect, it } from 'vitest';
import { createActionEvent, reducer } from '../src/game/reducer';
import { card, declare, passBlock, passChallenge, turnState, challenge, block, jugaadReturn } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer actions', () => {
  it('action: Chai Paisa immediately gives the active player 1 rupee and advances the turn', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'CHAI_PAISA'));
    expect(next.playersById[toPlayerId('p1')]!.rupees).toBe(3);
    expect(next.phase).toBe('TURN_START');
  });

  it('action: Chai Paisa cannot be challenged or blocked', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const declared = declare(state, 'CHAI_PAISA');
    expect(declared.phase).toBe('TURN_START');
  });

  it('action: Rishtedaar Help opens a Malik Saab block window instead of a challenge window', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const declared = declare(state, 'RISHTEDAAR_HELP');
    expect(declared.phase).toBe('BLOCK_WINDOW');
  });

  it('action: Rishtedaar Help gives the active player 2 rupees when nobody blocks', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const declared = declare(state, 'RISHTEDAAR_HELP');
    const next = passBlock(declared, toPlayerId('p2'));
    expect(next.playersById[toPlayerId('p1')]!.rupees).toBe(4);
  });

  it('action: Kiraya Collection opens a challenge window for the Malik Saab claim', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const declared = declare(state, 'KIRAYA_COLLECTION');
    expect(declared.phase).toBe('CHALLENGE_WINDOW');
  });

  it('action: unchallenged Kiraya Collection gives the active player 3 rupees', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const declared = declare(state, 'KIRAYA_COLLECTION');
    const next = passChallenge(declared, toPlayerId('p2'));
    const burned = reducer(next, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: next.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.playersById[toPlayerId('p1')]!.rupees).toBe(5);
  });

  it('action: Police Wala Raid requires a living target', () => {
    const state = turnState([card('POLICE_WALA'), card('BHAI')], []);
    const declared = declare(state, 'POLICE_WALA_RAID', toPlayerId('p2'));
    expect(declared.phase).toBe('TURN_START');
  });

  it('action: Police Wala Raid steals 2 rupees when the target has at least 2', () => {
    const state = turnState([card('POLICE_WALA'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 2, 4);
    const declared = declare(state, 'POLICE_WALA_RAID', toPlayerId('p2'));
    const next = passChallenge(declared, toPlayerId('p2'));
    const resolved = passBlock(next, toPlayerId('p2'));
    expect(resolved.playersById[toPlayerId('p1')]!.rupees).toBe(4);
    expect(resolved.playersById[toPlayerId('p2')]!.rupees).toBe(2);
  });

  it('action: Police Wala Raid steals only the target\'s available rupees when the target has fewer than 2', () => {
    const state = turnState([card('POLICE_WALA'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 2, 1);
    const declared = declare(state, 'POLICE_WALA_RAID', toPlayerId('p2'));
    const next = passBlock(passChallenge(declared, toPlayerId('p2')), toPlayerId('p2'));
    expect(next.playersById[toPlayerId('p1')]!.rupees).toBe(3);
    expect(next.playersById[toPlayerId('p2')]!.rupees).toBe(0);
  });

  it('action: Bhai Ka Scene requires the active player to have at least 3 rupees', () => {
    const state = turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 2, 2);
    const declared = declare(state, 'BHAI_KA_SCENE', toPlayerId('p2'));
    expect(declared.playersById[toPlayerId('p1')]!.rupees).toBe(2);
  });

  it('action: Bhai Ka Scene deducts 3 rupees when declared', () => {
    const state = turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 5, 2);
    const declared = declare(state, 'BHAI_KA_SCENE', toPlayerId('p2'));
    expect(declared.playersById[toPlayerId('p1')]!.rupees).toBe(2);
  });

  it('action: unblocked Bhai Ka Scene prompts the target to burn one Connection', () => {
    const state = turnState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 5, 2);
    const declared = declare(state, 'BHAI_KA_SCENE', toPlayerId('p2'));
    const next = passChallenge(declared, toPlayerId('p2'));
    const resolved = passBlock(next, toPlayerId('p2'));
    expect(resolved.phase).toBe('AWAITING_BURN');
  });

  it('action: Zardaar Jugaad opens a challenge window for the Zardaar Chor claim', () => {
    const state = turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('BHAI')]);
    const declared = declare(state, 'ZARDAAR_JUGAAD');
    expect(declared.phase).toBe('CHALLENGE_WINDOW');
  });

  it('action: unchallenged Zardaar Jugaad draws 2 temporary Connections and prompts the player to return exactly 2', () => {
    const state = turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('BHAI')]);
    const declared = declare(state, 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    expect(next.phase).toBe('AWAITING_JUGAAD_RETURN');
    expect(next.pendingJugaad?.drawnConnections).toHaveLength(2);
  });

  it('action: Full Beizzati requires the active player to have at least 7 rupees', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 6, 2);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'FULL_BEIZZATI', toPlayerId('p2')));
    expect(next.phase).toBe('TURN_START');
  });

  it('action: Full Beizzati deducts 7 rupees and prompts the target to burn one Connection', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'FULL_BEIZZATI', toPlayerId('p2')));
    expect(next.playersById[toPlayerId('p1')]!.rupees).toBe(0);
    expect(next.phase).toBe('AWAITING_BURN');
  });

  it('action: Full Beizzati cannot be challenged', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'FULL_BEIZZATI', toPlayerId('p2')));
    expect(next.pendingChallenge).toBeNull();
  });

  it('action: Full Beizzati cannot be blocked', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'FULL_BEIZZATI', toPlayerId('p2')));
    expect(next.pendingBlock).toBeNull();
  });

  it('action: player with 10 or more rupees must choose Full Beizzati', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 10, 2);
    const next = declare(state, 'CHAI_PAISA');
    expect(next.phase).toBe('TURN_START');
  });

  it('action: eliminated player cannot declare an action', () => {
    const state = turnState([], [card('MUMMA')]);
    const next = declare(state, 'CHAI_PAISA');
    expect(next.phase).toBe('TURN_START');
  });

  it('action: non-active player cannot declare an action', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, createActionEvent(toPlayerId('p2'), 'CHAI_PAISA'));
    expect(next.activePlayerId).toBe(toPlayerId('p1'));
  });
});
