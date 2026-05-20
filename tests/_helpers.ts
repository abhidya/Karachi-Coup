import { createActionEvent, reducer } from '../src/game/reducer';
import { createPendingAction, createHostGameState } from '../src/game/rules';
import { createConnectionCard, createDeck, seededShuffle, toPlayerId } from '../src/game/utils';
import type { ConnectionCard, HostGameState, PlayerId, PlayerState, Role } from '../src/game/types';

export function card(role: ConnectionCard['role']) {
  return createConnectionCard(role);
}

export function player(id: string, name: string, rupees: number, hidden: ConnectionCard[]): PlayerState {
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

export function lobbyState(playerCount = 2): HostGameState {
  const state = createHostGameState('ROOM1', 'game-1');
  const playersById: HostGameState['playersById'] = {};
  const turnOrder: PlayerId[] = [];
  for (let index = 1; index <= playerCount; index += 1) {
    const id = toPlayerId(`p${index}`);
    playersById[id] = player(`p${index}`, `Player ${index}`, 0, []);
    turnOrder.push(id);
  }
  return {
    ...state,
    phase: 'LOBBY',
    playersById,
    turnOrder,
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
  };
}

export function turnState(
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
    deck: seededShuffle(createDeck().slice(0, 15 - aliceHidden.length - bobHidden.length), 'ROOM1:game-1'),
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

export function turnState3(
  p1Hidden: ConnectionCard[],
  p2Hidden: ConnectionCard[],
  p3Hidden: ConnectionCard[],
  p1Rupees = 2,
  p2Rupees = 2,
  p3Rupees = 2,
): HostGameState {
  const p1 = player('p1', 'Alice', p1Rupees, p1Hidden);
  const p2 = player('p2', 'Bob', p2Rupees, p2Hidden);
  const p3 = player('p3', 'Casey', p3Rupees, p3Hidden);
  return {
    ...createHostGameState('ROOM1', 'game-1'),
    phase: 'TURN_START',
    playersById: { [p1.id]: p1, [p2.id]: p2, [p3.id]: p3 },
    turnOrder: [p1.id, p2.id, p3.id],
    activePlayerId: p1.id,
    deck: seededShuffle(createDeck().slice(0, 15 - p1Hidden.length - p2Hidden.length - p3Hidden.length), 'ROOM1:game-1'),
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

export function declare(state: HostGameState, actionType: Parameters<typeof createActionEvent>[1], targetId?: PlayerId) {
  return reducer(state, createActionEvent(state.activePlayerId!, actionType, targetId));
}

export function passChallenge(state: HostGameState, playerId: PlayerId) {
  return reducer(state, { type: 'PASS_CHALLENGE', playerId });
}

export function passBlock(state: HostGameState, playerId: PlayerId) {
  return reducer(state, { type: 'PASS_BLOCK', playerId });
}

export function challenge(state: HostGameState, challengerId: PlayerId) {
  return reducer(state, { type: 'CHALLENGE', challengerId });
}

export function block(
  state: HostGameState,
  blockerId: PlayerId,
  blockingRole: Role,
) {
  return reducer(state, {
    type: 'BLOCK',
    block: {
      actionId: state.pendingAction!.actionId,
      blockerId,
      blockingRole: blockingRole as never,
      targetId: state.pendingAction?.targetId ?? null,
      eligibleChallengers: [],
      responses: {},
    },
  });
}

export function burn(state: HostGameState, playerId: PlayerId, connectionId: string) {
  return reducer(state, { type: 'CHOOSE_CONNECTION_TO_BURN', playerId, connectionId });
}

export function jugaadReturn(state: HostGameState, playerId: PlayerId, returnedConnectionIds: [string, string]) {
  return reducer(state, { type: 'JUGAAD_RETURN', playerId, returnedConnectionIds });
}

export function openBlockWindowAfterActionChallenge(state: HostGameState) {
  const afterP2 = passChallenge(state, toPlayerId('p2'));
  return passChallenge(afterP2, toPlayerId('p3'));
}
