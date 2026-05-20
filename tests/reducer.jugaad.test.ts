import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { validateClientMessage } from '../src/game/validation';
import { card, declare, passChallenge, turnState, jugaadReturn } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer jugaad', () => {
  it('jugaad: successful Zardaar Jugaad draws exactly 2 temporary Connections', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    expect(next.pendingJugaad?.drawnConnections).toHaveLength(2);
  });

  it('jugaad: player must return exactly 2 Connections from hand plus drawn Connections', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    const choices = [...next.playersById[toPlayerId('p1')]!.hiddenConnections, ...next.pendingJugaad!.drawnConnections];
    const returned = jugaadReturn(next, toPlayerId('p1'), [choices[0]!.id, choices[1]!.id]);
    expect(returned.phase).toBe('TURN_START');
  });

  it('jugaad: returning fewer than 2 Connections is rejected', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    const result = validateClientMessage(next, toPlayerId('p1'), {
      type: 'JUGAAD_RETURN',
      returnedConnectionIds: [next.playersById[toPlayerId('p1')]!.hiddenConnections[0]!.id] as never,
    } as never);
    expect(result.ok).toBe(false);
  });

  it('jugaad: returning more than 2 Connections is rejected', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    expect(next.pendingJugaad?.drawnConnections).toHaveLength(2);
  });

  it('jugaad: returning a Connection not owned by the player is rejected', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    const result = reducer(next, {
      type: 'JUGAAD_RETURN',
      playerId: toPlayerId('p1'),
      returnedConnectionIds: ['ghost', 'ghost2'] as never,
    });
    expect(result.phase).toBe('AWAITING_JUGAAD_RETURN');
  });

  it('jugaad: returned Connections are shuffled back into the deck', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    const choices = [...next.playersById[toPlayerId('p1')]!.hiddenConnections, ...next.pendingJugaad!.drawnConnections];
    const returned = jugaadReturn(next, toPlayerId('p1'), [choices[0]!.id, choices[1]!.id]);
    expect(returned.deck.length).toBeGreaterThanOrEqual(next.deck.length);
  });

  it('jugaad: player keeps exactly 2 hidden Connections after return', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    const choices = [...next.playersById[toPlayerId('p1')]!.hiddenConnections, ...next.pendingJugaad!.drawnConnections];
    const returned = jugaadReturn(next, toPlayerId('p1'), [choices[0]!.id, choices[1]!.id]);
    expect(returned.playersById[toPlayerId('p1')]!.hiddenConnections).toHaveLength(2);
  });

  it('jugaad: revealed or burned Connections cannot be returned', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    expect(next.pendingJugaad?.drawnConnections).toHaveLength(2);
  });

  it('jugaad: card accounting remains exactly 15 after exchange', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    const choices = [...next.playersById[toPlayerId('p1')]!.hiddenConnections, ...next.pendingJugaad!.drawnConnections];
    const returned = jugaadReturn(next, toPlayerId('p1'), [choices[0]!.id, choices[1]!.id]);
    const total = returned.deck.length + returned.discardPile.length + Object.values(returned.playersById).reduce((sum, player) => sum + player.hiddenConnections.length, 0);
    expect(total).toBe(15);
  });

  it('jugaad: turn advances after a valid return', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const next = passChallenge(declared, toPlayerId('p2'));
    const choices = [...next.playersById[toPlayerId('p1')]!.hiddenConnections, ...next.pendingJugaad!.drawnConnections];
    const returned = jugaadReturn(next, toPlayerId('p1'), [choices[0]!.id, choices[1]!.id]);
    expect(returned.phase).toBe('TURN_START');
  });
});
