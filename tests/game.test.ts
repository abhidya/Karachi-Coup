import { describe, expect, it } from 'vitest';
import { createActionEvent, createHostGameState, reducer } from '../src/game/reducer';
import { createConnectionCard, createDeck, seededShuffle, toPlayerId } from '../src/game/utils';
import { validateClientMessage } from '../src/game/validation';
import type { ConnectionCard, HostGameState, PlayerId, PlayerState } from '../src/game/types';

function card(role: ConnectionCard['role']) {
  return createConnectionCard(role);
}

function player(id: string, name: string, rupees: number, hidden: ConnectionCard[]): PlayerState {
  const playerId = toPlayerId(id);
  return {
    id: playerId,
    name,
    clientNonce: `nonce-${id}` as PlayerState['clientNonce'],
    rupees,
    hiddenConnections: hidden,
    revealedConnections: [],
    connected: true,
    eliminated: hidden.length === 0,
  };
}

function makeState(
  aliceHidden: ConnectionCard[],
  bobHidden: ConnectionCard[],
  aliceRupees = 2,
  bobRupees = 2,
): HostGameState {
  const alice = player('p1', 'Alice', aliceRupees, aliceHidden);
  const bob = player('p2', 'Bob', bobRupees, bobHidden);
  return {
    ...createHostGameState('ROOM1', 'game-1'),
    phase: 'TURN_START',
    playersById: { [alice.id]: alice, [bob.id]: bob },
    turnOrder: [alice.id, bob.id],
    activePlayerId: alice.id,
    deck: seededShuffle(createDeck(), 'ROOM1:game-1'),
    discardPile: [],
    pendingAction: null,
    pendingChallenge: null,
    pendingBlock: null,
    pendingBurn: null,
    pendingJugaad: null,
    log: [],
    winnerId: null,
  };
}

function declare(state: HostGameState, actionType: Parameters<typeof createActionEvent>[1], targetId?: PlayerId) {
  return reducer(state, createActionEvent(state.activePlayerId!, actionType, targetId));
}

function passChallenge(state: HostGameState, playerId: PlayerId) {
  return reducer(state, { type: 'PASS_CHALLENGE', playerId });
}

function passBlock(state: HostGameState, playerId: PlayerId) {
  return reducer(state, { type: 'PASS_BLOCK', playerId });
}

describe('Karachi Coup core', () => {
  it('deck has 15 cards', () => {
    expect(createDeck()).toHaveLength(15);
  });

  it('deals two connections and two rupees to each player', () => {
    const state = {
      ...createHostGameState('ROOM1', 'game-1'),
      phase: 'LOBBY' as const,
      playersById: {
        [toPlayerId('p1')]: player('p1', 'Alice', 0, []),
        [toPlayerId('p2')]: player('p2', 'Bob', 0, []),
      },
      turnOrder: [toPlayerId('p1'), toPlayerId('p2')],
      activePlayerId: null,
      deck: seededShuffle(createDeck(), 'ROOM1:game-1'),
      discardPile: [],
      pendingAction: null,
      pendingChallenge: null,
      pendingBlock: null,
      pendingBurn: null,
      pendingJugaad: null,
      log: [],
      winnerId: null,
    } satisfies HostGameState;
    const next = reducer(state, { type: 'START_GAME' });
    expect(next.playersById[toPlayerId('p1')]!.hiddenConnections).toHaveLength(2);
    expect(next.playersById[toPlayerId('p2')]!.hiddenConnections).toHaveLength(2);
    expect(next.playersById[toPlayerId('p1')]!.rupees).toBe(2);
    expect(next.playersById[toPlayerId('p2')]!.rupees).toBe(2);
  });

  it('Chai Paisa adds 1 rupee', () => {
    const state = makeState([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')]);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'CHAI_PAISA'));
    expect(next.playersById[state.activePlayerId!]!.rupees).toBe(3);
    expect(next.phase).toBe('TURN_START');
  });

  it('Rishtedaar Help adds 2 if not blocked', () => {
    const state = makeState([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')]);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'RISHTEDAAR_HELP'));
    const result = passBlock(declared, toPlayerId('p2'));
    expect(result.playersById[toPlayerId('p1')]!.rupees).toBe(4);
    expect(result.phase).toBe('TURN_START');
  });

  it('Malik Saab blocks Rishtedaar Help', () => {
    const state = makeState([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')]);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'RISHTEDAAR_HELP'));
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
    expect(blocked.pendingChallenge?.source).toBe('block');
  });

  it('Kiraya Collection adds 3', () => {
    const state = makeState([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')]);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'KIRAYA_COLLECTION'));
    const passed = passChallenge(declared, toPlayerId('p2'));
    expect(passed.playersById[toPlayerId('p1')]!.rupees).toBe(5);
    expect(passed.phase).toBe('TURN_START');
  });

  it('successful challenge makes challenger burn', () => {
    const state = makeState([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')]);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'KIRAYA_COLLECTION'));
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p2'));
    const burner = reducer(challenged, { type: 'CHOOSE_CONNECTION_TO_BURN', playerId: toPlayerId('p2'), connectionId: challenged.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id });
    expect(burner.playersById[toPlayerId('p2')]!.hiddenConnections).toHaveLength(1);
    expect(burner.playersById[toPlayerId('p1')]!.rupees).toBe(5);
  });

  it('failed challenge makes actor burn', () => {
    const state = makeState([card('BHAI'), card('POLICE_WALA')], [card('POLICE_WALA'), card('MUMMA')]);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'KIRAYA_COLLECTION'));
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    expect(challenged.pendingBurn?.playerId).toBe(toPlayerId('p1'));
  });

  it('Police Wala Raid steals up to 2 and handles target with less than 2 rupees', () => {
    const state = makeState([card('POLICE_WALA')], [card('MUMMA')], 2, 1);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'POLICE_WALA_RAID', toPlayerId('p2')));
    const afterChallenge = reducer(declared, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p2') });
    const afterBlockWindow = passBlock(afterChallenge, toPlayerId('p2'));
    expect(afterBlockWindow.playersById[toPlayerId('p1')]!.rupees).toBe(3);
    expect(afterBlockWindow.playersById[toPlayerId('p2')]!.rupees).toBe(0);
  });

  it('Bhai Ka Scene costs 3', () => {
    const state = makeState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 5, 2);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'BHAI_KA_SCENE', toPlayerId('p2')));
    expect(declared.playersById[toPlayerId('p1')]!.rupees).toBe(2);
  });

  it('Bhai Ka Scene makes target burn if not blocked', () => {
    const state = makeState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 5, 2);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'BHAI_KA_SCENE', toPlayerId('p2')));
    const afterChallenge = reducer(declared, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p2') });
    const result = reducer(afterChallenge, { type: 'PASS_BLOCK', playerId: toPlayerId('p2') });
    expect(result.phase).toBe('AWAITING_BURN');
    expect(result.pendingBurn?.playerId).toBe(toPlayerId('p2'));
  });

  it('Mumma blocks Bhai Ka Scene', () => {
    const state = makeState([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], 5, 2);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'BHAI_KA_SCENE', toPlayerId('p2')));
    const afterChallenge = reducer(declared, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p2') });
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
    expect(blocked.phase).toBe('CHALLENGE_WINDOW');
    expect(blocked.pendingChallenge?.source).toBe('block');
  });

  it('Zardaar Jugaad draws 2 and returns exactly 2', () => {
    const state = makeState([card('ZARDAAR_CHOR'), card('MALIK_SAAB')], [card('MUMMA'), card('BHAI')]);
    const nextDeck = seededShuffle([card('MALIK_SAAB'), card('BHAI'), card('POLICE_WALA'), card('ZARDAAR_CHOR')], 'room');
    const nextState = { ...state, deck: nextDeck };
    const declared = reducer(nextState, createActionEvent(nextState.activePlayerId!, 'ZARDAAR_JUGAAD'));
    const afterChallenge = reducer(declared, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p2') });
    expect(afterChallenge.phase).toBe('AWAITING_JUGAAD_RETURN');
    expect(afterChallenge.pendingJugaad?.drawnCards).toHaveLength(2);
    const all = [...afterChallenge.playersById[toPlayerId('p1')]!.hiddenConnections, ...afterChallenge.pendingJugaad!.drawnCards];
    const returned = reducer(afterChallenge, { type: 'JUGAAD_RETURN', playerId: toPlayerId('p1'), connectionIds: [all[0]!.id, all[1]!.id] });
    expect(returned.phase).toBe('TURN_START');
  });

  it('Full Beizzati costs 7', () => {
    const state = makeState([card('MALIK_SAAB')], [card('MUMMA')], 7, 2);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'FULL_BEIZZATI', toPlayerId('p2')));
    expect(next.playersById[toPlayerId('p1')]!.rupees).toBe(0);
  });

  it('player with 10+ rupees must Full Beizzati', () => {
    const state = makeState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 10, 2);
    const result = validateClientMessage(state, toPlayerId('p1'), { type: 'DECLARE_ACTION', actionType: 'CHAI_PAISA' });
    expect(result.ok).toBe(false);
  });

  it('eliminated player cannot act', () => {
    const state = makeState([], [card('MUMMA')]);
    const result = validateClientMessage(state, toPlayerId('p1'), { type: 'DECLARE_ACTION', actionType: 'CHAI_PAISA' });
    expect(result.ok).toBe(false);
  });

  it('last alive player wins', () => {
    const state = makeState([card('MALIK_SAAB')], [card('MUMMA')], 7, 2);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'FULL_BEIZZATI', toPlayerId('p2')));
    expect(next.phase).toBe('AWAITING_BURN');
    const burned = reducer(next, { type: 'CHOOSE_CONNECTION_TO_BURN', playerId: toPlayerId('p2'), connectionId: next.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id });
    expect(burned.playersById[toPlayerId('p2')]?.eliminated).toBe(true);
    expect(burned.phase).toBe('GAME_OVER');
  });
});
