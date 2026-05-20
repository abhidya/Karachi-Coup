import { describe, expect, it } from 'vitest';
import { createDeck, seededShuffle } from '../src/game/utils';
import { reducer } from '../src/game/reducer';
import { toPublicGameState, toPrivatePlayerState } from '../src/game/snapshots';
import { lobbyState } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('setup', () => {
  it('setup: creates a 15-card deck with 3 Malik Saab, 3 Bhai, 3 Police Wala, 3 Zardaar Chor, and 3 Mumma', () => {
    const deck = createDeck();
    expect(deck).toHaveLength(15);
    expect(deck.filter((card) => card.role === 'MALIK_SAAB')).toHaveLength(3);
    expect(deck.filter((card) => card.role === 'BHAI')).toHaveLength(3);
    expect(deck.filter((card) => card.role === 'POLICE_WALA')).toHaveLength(3);
    expect(deck.filter((card) => card.role === 'ZARDAAR_CHOR')).toHaveLength(3);
    expect(deck.filter((card) => card.role === 'MUMMA')).toHaveLength(3);
  });

  it('setup: every Connection card has a unique instance id', () => {
    const ids = createDeck().map((card) => card.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('setup: deterministic shuffle returns the same deck order for the same roomCode and gameId', () => {
    const first = seededShuffle(createDeck(), 'ROOM1:game-1');
    const second = seededShuffle(createDeck(), 'ROOM1:game-1');
    expect(first.map((card) => card.role)).toEqual(second.map((card) => card.role));
  });

  it('setup: deterministic shuffle returns a different likely deck order for a different gameId', () => {
    const first = seededShuffle(createDeck(), 'ROOM1:game-1');
    const second = seededShuffle(createDeck(), 'ROOM1:game-2');
    expect(first.map((card) => card.role)).not.toEqual(second.map((card) => card.role));
  });

  it('setup: starting a 2-player game deals 2 hidden Connections to each player', () => {
    const next = reducer(lobbyState(2), { type: 'START_GAME' });
    expect(next.playersById[toPlayerId('p1')]!.hiddenConnections).toHaveLength(2);
    expect(next.playersById[toPlayerId('p2')]!.hiddenConnections).toHaveLength(2);
  });

  it('setup: starting a 6-player game deals 2 hidden Connections to each player', () => {
    const next = reducer(lobbyState(6), { type: 'START_GAME' });
    for (let index = 1; index <= 6; index += 1) {
      expect(next.playersById[toPlayerId(`p${index}`)]!.hiddenConnections).toHaveLength(2);
    }
  });

  it('setup: each player starts with exactly 2 rupees', () => {
    const next = reducer(lobbyState(2), { type: 'START_GAME' });
    expect(next.playersById[toPlayerId('p1')]!.rupees).toBe(2);
    expect(next.playersById[toPlayerId('p2')]!.rupees).toBe(2);
  });

  it('setup: public state never exposes hidden Connection names after deal', () => {
    const next = reducer(lobbyState(2), { type: 'START_GAME' });
    const publicState = toPublicGameState(next);
    expect(publicState.players.every((player) => player.revealedConnections.length === 0)).toBe(true);
    expect(publicState.players.some((player) => player.hiddenConnectionCount === 2)).toBe(true);
  });

  it('setup: private state exposes only the receiving player\'s hidden Connections', () => {
    const next = reducer(lobbyState(2), { type: 'START_GAME' });
    const privateState = toPrivatePlayerState(next, toPlayerId('p1'));
    expect(privateState.hiddenConnections).toHaveLength(2);
    expect(privateState.hiddenConnections.every((card) => card.role)).toBe(true);
  });
});
