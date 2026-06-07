import type { ActionType, ConnectionCard, ConnectionCardId, GameId, HostGameState, PendingAction, PlayerId, PlayerState, Role } from './types';
import { createDeck, seededShuffle, toGameId, toRoomCode } from './utils';

type ActionConfig = {
  labelKey: ActionType;
  cost: number;
  claimedRole: Role | null;
  needsTarget: boolean;
  challengeable: boolean;
  blockRoles: Role[];
};

export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

export const ACTION_CONFIG: Record<ActionType, ActionConfig> = {
  CHAI_PAISA: { labelKey: 'CHAI_PAISA', cost: 0, claimedRole: null, needsTarget: false, challengeable: false, blockRoles: [] },
  RISHTEDAAR_HELP: { labelKey: 'RISHTEDAAR_HELP', cost: 0, claimedRole: null, needsTarget: false, challengeable: false, blockRoles: ['MALIK_SAAB'] },
  KIRAYA_COLLECTION: { labelKey: 'KIRAYA_COLLECTION', cost: 0, claimedRole: 'MALIK_SAAB', needsTarget: false, challengeable: true, blockRoles: [] },
  POLICE_WALA_RAID: {
    labelKey: 'POLICE_WALA_RAID',
    cost: 0,
    claimedRole: 'POLICE_WALA',
    needsTarget: true,
    challengeable: true,
    blockRoles: ['POLICE_WALA', 'ZARDAAR_CHOR'],
  },
  BHAI_KA_SCENE: { labelKey: 'BHAI_KA_SCENE', cost: 3, claimedRole: 'BHAI', needsTarget: true, challengeable: true, blockRoles: ['MUMMA'] },
  ZARDAAR_JUGAAD: { labelKey: 'ZARDAAR_JUGAAD', cost: 0, claimedRole: 'ZARDAAR_CHOR', needsTarget: false, challengeable: true, blockRoles: [] },
  FULL_BEIZZATI: { labelKey: 'FULL_BEIZZATI', cost: 7, claimedRole: null, needsTarget: true, challengeable: false, blockRoles: [] },
};

export const actionCosts: Record<ActionType, number> = Object.fromEntries(
  Object.entries(ACTION_CONFIG).map(([key, value]) => [key, value.cost]),
) as Record<ActionType, number>;

export const actionRequirements: Record<ActionType, Role | null> = Object.fromEntries(
  Object.entries(ACTION_CONFIG).map(([key, value]) => [key, value.claimedRole]),
) as Record<ActionType, Role | null>;

export const blockRolesByAction: Partial<Record<ActionType, Role[]>> = Object.fromEntries(
  Object.entries(ACTION_CONFIG)
    .filter(([, value]) => value.blockRoles.length > 0)
    .map(([key, value]) => [key, value.blockRoles]),
) as Partial<Record<ActionType, Role[]>>;

export function createHostGameState(roomId: string, gameId: string): HostGameState {
  return {
    roomCode: toRoomCode(roomId),
    roomId,
    gameId: toGameId(gameId),
    seq: 0,
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

export function livingPlayerIds(state: HostGameState): PlayerId[] {
  return state.turnOrder.filter((playerId) => isPlayerAlive(state.playersById[playerId]));
}

export function firstAlivePlayerId(state: HostGameState): PlayerId | null {
  return livingPlayerIds(state)[0] ?? null;
}

export function nextLivingPlayerId(state: HostGameState, currentPlayerId: PlayerId): PlayerId | null {
  if (state.turnOrder.length === 0) return null;
  const startIndex = state.turnOrder.indexOf(currentPlayerId);
  if (startIndex < 0) return null;
  for (let offset = 1; offset <= state.turnOrder.length; offset += 1) {
    const candidate = state.turnOrder[(startIndex + offset) % state.turnOrder.length];
    if (candidate && isPlayerAlive(state.playersById[candidate])) return candidate;
  }
  return null;
}

export function applyRupees(state: HostGameState, playerId: PlayerId, delta: number): HostGameState {
  const player = state.playersById[playerId];
  if (!player) return state;
  return {
    ...state,
    playersById: {
      ...state.playersById,
      [playerId]: { ...player, rupees: Math.max(0, player.rupees + delta) },
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
  if (cards.length === 0) return state;
  return { ...state, discardPile: [...state.discardPile, ...cards] };
}

export function shuffleIntoDeck(state: HostGameState, cards: readonly ConnectionCard[]): HostGameState {
  if (cards.length === 0) return state;
  const shuffled = seededShuffle([...state.deck, ...cards], `${state.roomId}:${state.gameId}:deck`);
  return { ...state, deck: shuffled };
}

export function drawCards(state: HostGameState, count: number): { cards: ConnectionCard[]; state: HostGameState } {
  const cards = state.deck.slice(0, count);
  return { cards, state: { ...state, deck: state.deck.slice(cards.length) } };
}

export function removeConnectionFromPlayer(state: HostGameState, playerId: PlayerId, connectionId: ConnectionCardId): HostGameState {
  const player = state.playersById[playerId];
  if (!player) return state;
  const index = player.hiddenConnections.findIndex((card) => card.id === connectionId);
  if (index < 0) return state;
  const removed = player.hiddenConnections[index]!;
  const nextHidden = [...player.hiddenConnections.slice(0, index), ...player.hiddenConnections.slice(index + 1)];
  return replacePlayer(
    discardCards(state, [removed]),
    {
      ...player,
      hiddenConnections: nextHidden,
      revealedConnections: [...player.revealedConnections, removed.role],
      eliminated: nextHidden.length === 0,
    },
  );
}

export function eliminatePlayer(state: HostGameState, playerId: PlayerId): HostGameState {
  const player = state.playersById[playerId];
  if (!player || player.eliminated) return state;
  return replacePlayer(state, { ...player, eliminated: true });
}

export function createPendingAction(
  actionId: string,
  actorId: PlayerId,
  actionType: ActionType,
  targetId: PlayerId | null,
): PendingAction {
  const config = ACTION_CONFIG[actionType];
  return {
    actionId,
    actorId,
    actionType,
    targetId,
    claimedRole: config.claimedRole,
    cost: config.cost,
    challengeable: config.challengeable,
    blockRoles: [...config.blockRoles],
    needsTarget: config.needsTarget,
  };
}

export function deckFor(roomId: string, gameId: GameId): ConnectionCard[] {
  return seededShuffle(createDeck(), `${roomId}:${gameId}`);
}

export function actionRequiresForcedBeizzati(rupees: number): boolean {
  return rupees >= 10;
}
