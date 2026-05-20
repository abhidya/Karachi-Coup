import type {
  ActionType,
  ConnectionCard,
  ConnectionCardId,
  GameId,
  HostGameState,
  PendingAction,
  PlayerId,
  PlayerState,
  Role,
} from './types';
import { createDeck, seededShuffle, toGameId, toRoomCode } from './utils';

export const actionCosts: Record<ActionType, number> = {
  CHAI_PAISA: 0,
  RISHTEDAAR_HELP: 0,
  KIRAYA_COLLECTION: 0,
  POLICE_WALA_RAID: 0,
  BHAI_KA_SCENE: 3,
  ZARDAAR_JUGAAD: 0,
  FULL_BEIZZATI: 7,
};

export const actionRequirements: Record<ActionType, Role | null> = {
  CHAI_PAISA: null,
  RISHTEDAAR_HELP: null,
  KIRAYA_COLLECTION: 'MALIK_SAAB',
  POLICE_WALA_RAID: 'POLICE_WALA',
  BHAI_KA_SCENE: 'BHAI',
  ZARDAAR_JUGAAD: 'ZARDAAR_CHOR',
  FULL_BEIZZATI: null,
};

export const blockRequirements: Partial<Record<ActionType, Role>> = {
  RISHTEDAAR_HELP: 'MALIK_SAAB',
  POLICE_WALA_RAID: 'MUMMA',
  BHAI_KA_SCENE: 'MUMMA',
  ZARDAAR_JUGAAD: 'MUMMA',
};

export function createHostGameState(roomId: string, gameId: string): HostGameState {
  const roomCode = toRoomCode(roomId);
  const typedGameId = toGameId(gameId);
  return {
    roomCode,
    roomId,
    gameId: typedGameId,
    phase: 'LOBBY',
    playersById: {},
    turnOrder: [],
    activePlayerId: null,
    deck: [],
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

export function getPlayer(state: HostGameState, playerId: PlayerId): PlayerState | undefined {
  return state.playersById[playerId];
}

export function isPlayerAlive(player: PlayerState | undefined): player is PlayerState {
  return Boolean(player && !player.eliminated && player.hiddenConnections.length > 0);
}

export function activePlayer(state: HostGameState): PlayerState | undefined {
  return state.activePlayerId ? state.playersById[state.activePlayerId] : undefined;
}

export function firstAlivePlayerId(state: HostGameState): PlayerId | null {
  for (const playerId of state.turnOrder) {
    if (isPlayerAlive(state.playersById[playerId])) {
      return playerId;
    }
  }
  return null;
}

export function livingPlayerIds(state: HostGameState): PlayerId[] {
  return state.turnOrder.filter((playerId) => isPlayerAlive(state.playersById[playerId]));
}

export function nextLivingPlayerId(state: HostGameState, currentPlayerId: PlayerId): PlayerId | null {
  if (state.turnOrder.length === 0) {
    return null;
  }
  const startIndex = state.turnOrder.findIndex((playerId) => playerId === currentPlayerId);
  if (startIndex < 0) {
    return null;
  }
  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const candidate = state.turnOrder[(startIndex + offset) % state.turnOrder.length];
    if (candidate && isPlayerAlive(state.playersById[candidate])) {
      return candidate;
    }
  }
  return null;
}

export function applyRupees(state: HostGameState, playerId: PlayerId, delta: number): HostGameState {
  const player = state.playersById[playerId];
  if (!player) {
    return state;
  }
  return {
    ...state,
    playersById: {
      ...state.playersById,
      [playerId]: {
        ...player,
        rupees: Math.max(0, player.rupees + delta),
      },
    },
  };
}

export function replacePlayer(state: HostGameState, nextPlayer: PlayerState): HostGameState {
  return {
    ...state,
    playersById: {
      ...state.playersById,
      [nextPlayer.id]: nextPlayer,
    },
  };
}

export function discardCards(state: HostGameState, cards: readonly ConnectionCard[]): HostGameState {
  if (cards.length === 0) {
    return state;
  }
  return { ...state, discardPile: [...state.discardPile, ...cards] };
}

export function drawCards(state: HostGameState, count: number): { cards: ConnectionCard[]; state: HostGameState } {
  const cards = state.deck.slice(0, count);
  return {
    cards,
    state: { ...state, deck: state.deck.slice(cards.length) },
  };
}

export function removeConnectionFromPlayer(state: HostGameState, playerId: PlayerId, connectionId: ConnectionCardId): HostGameState {
  const player = state.playersById[playerId];
  if (!player) {
    return state;
  }
  const index = player.hiddenConnections.findIndex((card) => card.id === connectionId);
  if (index < 0) {
    return state;
  }
  const removed = player.hiddenConnections[index]!;
  const nextHidden = [...player.hiddenConnections.slice(0, index), ...player.hiddenConnections.slice(index + 1)];
  return replacePlayer(
    discardCards(state, [removed]),
    {
      ...player,
      hiddenConnections: nextHidden,
      revealedConnections: [...player.revealedConnections, removed],
      eliminated: nextHidden.length === 0,
    },
  );
}

export function eliminatePlayer(state: HostGameState, playerId: PlayerId): HostGameState {
  const player = state.playersById[playerId];
  if (!player || player.eliminated) {
    return state;
  }
  return replacePlayer(state, { ...player, eliminated: true });
}

export function createPendingAction(
  actionId: string,
  actorId: PlayerId,
  actionType: ActionType,
  targetId: PlayerId | null,
): PendingAction {
  const claimedRole = actionRequirements[actionType];
  return {
    actionId,
    actorId,
    actionType,
    targetId,
    claimedRole,
    claimRole: claimedRole,
    cost: actionCosts[actionType],
    challengeable: claimedRole !== null || actionType === 'RISHTEDAAR_HELP' || actionType === 'FULL_BEIZZATI',
    blockable: actionType in blockRequirements,
  };
}

export function deckFor(roomId: string, gameId: GameId): ConnectionCard[] {
  return seededShuffle(createDeck(), `${roomId}:${gameId}`);
}

export function actionRequiresForcedBeizzati(rupees: number): boolean {
  return rupees >= 10;
}
