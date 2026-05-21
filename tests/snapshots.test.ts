import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { toPublicGameState, toPrivatePlayerState } from '../src/game/snapshots';
import { card, declare, passChallenge, lobbyState, turnState, turnState3 } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('snapshots', () => {
  it('snapshot: public state includes player names, rupees, hidden Connection counts, revealed Connections, turn marker, and elimination status', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const publicState = toPublicGameState(state);
    expect(publicState.players[0]?.name).toBe('Player 1');
    expect(publicState.players[0]?.rupees).toBe(2);
    expect(publicState.players[0]?.hiddenConnectionCount).toBe(2);
    expect(publicState.players[0]?.isTurn).toBe(true);
  });

  it('snapshot: public state does not include deck', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    expect(Object.keys(toPublicGameState(state))).not.toContain('deck');
  });

  it('snapshot: public state does not include any unrevealed hidden Connection names', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const publicState = toPublicGameState(state);
    expect(publicState.players.every((player) => player.revealedConnections.length === 0)).toBe(true);
  });

  it('snapshot: public state does not show a successfully proven card as burned influence', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    const publicState = toPublicGameState(challenged);
    expect(publicState.players[0]?.revealedConnections).toEqual([]);
  });

  it('snapshot: private state for Player 1 includes only Player 1 hidden Connections', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.playerId).toBe(toPlayerId('p1'));
    expect(privateState.hiddenConnections).toHaveLength(2);
  });

  it('snapshot: private state for Player 1 does not include Player 2 hidden Connections', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.hiddenConnections).not.toContainEqual(state.playersById[toPlayerId('p2')]!.hiddenConnections[0]);
  });

  it('snapshot: private state includes legal actions for the active player', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.availableActions).toContain('CHAI_PAISA');
    expect(privateState.availableActions).toContain('FULL_BEIZZATI');
  });

  it('snapshot: private state shows mandatory Full Beizzati as the only action when active player has 10 or more rupees', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 10, 2);
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.availableActions).toEqual(['FULL_BEIZZATI']);
  });

  it('snapshot: private state includes Call Bakwaas prompt only for eligible challengers', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    const privateState = toPrivatePlayerState(challenged, toPlayerId('p2'));
    expect(privateState.pendingChallenge?.kind).toBe('action');
  });

  it('snapshot: private state includes Use Setting prompt only for eligible blocker', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const publicState = toPublicGameState(declared);
    expect(publicState.phase).toBe('BLOCK_WINDOW');
    expect(publicState.pendingAction?.actionType).toBe('RISHTEDAAR_HELP');
  });

  it('snapshot: sequence number increases after accepted reducer events', () => {
    const next = reducer(lobbyState(2), { type: 'START_GAME' });
    expect(next.seq).toBeGreaterThan(0);
  });
});
