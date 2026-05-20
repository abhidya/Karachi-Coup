import { labels } from './theme';
import type { ActionType, HostGameState, PlayerId, PlayerPublicState, PrivatePlayerState, PublicGameState } from './types';

function publicPlayerView(state: HostGameState, playerId: PlayerId): PlayerPublicState {
  const player = state.playersById[playerId]!;
  return { id: player.id, name: player.name, rupees: player.rupees, hiddenConnectionCount: player.hiddenConnections.length, revealedConnections: [...player.revealedConnections], connected: player.connected, eliminated: player.eliminated, isTurn: state.activePlayerId === playerId };
}

export function toPublicGameState(state: HostGameState): PublicGameState {
  return {
    roomCode: state.roomCode,
    gameId: state.gameId,
    seq: state.seq,
    phase: state.phase,
    activePlayerId: state.activePlayerId,
    players: state.turnOrder.map((playerId) => publicPlayerView(state, playerId)),
    turnOrder: [...state.turnOrder],
    log: [...state.log],
    currentScene: labels.phaseLabels[state.phase],
    pendingAction: state.pendingAction,
    pendingChallenge: state.pendingChallenge,
    pendingBlock: state.pendingBlock,
    pendingBurn: state.pendingBurn,
    winnerId: state.winnerId,
  };
}

export function toPrivatePlayerState(state: HostGameState, playerId: PlayerId): PrivatePlayerState {
  const player = state.playersById[playerId];
  if (!player) throw new Error(`Unknown player: ${playerId}`);
  return {
    roomCode: state.roomCode,
    gameId: state.gameId,
    seq: state.seq,
    phase: state.phase,
    playerId,
    hiddenConnections: [...player.hiddenConnections],
    rupees: player.rupees,
    connected: player.connected,
    eliminated: player.eliminated,
    isTurn: state.activePlayerId === playerId,
    availableActions:
      state.phase === 'TURN_START' && state.activePlayerId === playerId && !player.eliminated
        ? ['CHAI_PAISA', 'RISHTEDAAR_HELP', 'KIRAYA_COLLECTION', 'POLICE_WALA_RAID', 'BHAI_KA_SCENE', 'ZARDAAR_JUGAAD', 'FULL_BEIZZATI']
        : [],
    pendingAction: state.pendingAction?.actorId === playerId ? state.pendingAction : null,
    pendingChallenge: state.pendingChallenge?.claimantId === playerId || state.pendingChallenge?.challengerId === playerId ? state.pendingChallenge : null,
    pendingBlock: state.pendingBlock?.blockerId === playerId ? state.pendingBlock : null,
    pendingBurn: state.pendingBurn?.playerId === playerId ? state.pendingBurn : null,
    pendingJugaad: state.pendingJugaad?.playerId === playerId ? state.pendingJugaad : null,
  };
}

export function summarizePublicState(state: HostGameState): string {
  const current = state.activePlayerId ? state.playersById[state.activePlayerId]?.name ?? 'Unknown' : 'None';
  const scene = state.pendingAction ? labels.actionLabels[state.pendingAction.actionType] : 'Waiting';
  return `${scene} · ${current}`;
}

export function publicActionButtons(state: HostGameState, playerId: PlayerId): ActionType[] {
  const player = state.playersById[playerId];
  if (!player || player.eliminated || state.activePlayerId !== playerId || state.phase !== 'TURN_START') return [];
  return ['CHAI_PAISA', 'RISHTEDAAR_HELP', 'KIRAYA_COLLECTION', 'POLICE_WALA_RAID', 'BHAI_KA_SCENE', 'ZARDAAR_JUGAAD', 'FULL_BEIZZATI'];
}
