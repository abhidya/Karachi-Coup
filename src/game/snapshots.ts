import { buildCurrentScene } from './sceneText';
import { ACTION_CONFIG, blockRolesByAction } from './rules';
import { labels } from './theme';
import type {
  ActionType,
  HostGameState,
  PlayerId,
  PlayerPublicState,
  PrivatePlayerState,
  PrivatePrompt,
  PublicGameState,
  Role,
} from './types';

function publicPlayerView(state: HostGameState, playerId: PlayerId): PlayerPublicState {
  const player = state.playersById[playerId]!;
  return {
    id: player.id,
    name: player.name,
    rupees: player.rupees,
    hiddenConnectionCount: player.hiddenConnections.length,
    revealedConnections: [...player.revealedConnections],
    connected: player.connected,
    eliminated: player.eliminated,
    isTurn: state.activePlayerId === playerId,
  };
}

function playerName(state: HostGameState, playerId: PlayerId | null | undefined): string {
  if (!playerId) return 'Someone';
  return state.playersById[playerId]?.name ?? 'Someone';
}

function roleLabel(role: Role | null | undefined): string {
  if (!role) return 'a role';
  return labels.roleTheme[role].label;
}

function buildChallengeActionPrompt(state: HostGameState, playerId: PlayerId): PrivatePrompt {
  const pendingAction = state.pendingAction;
  const pendingChallenge = state.pendingChallenge;
  if (!pendingAction || !pendingChallenge || pendingChallenge.kind !== 'action') {
    return null;
  }
  if (pendingChallenge.claimantId === playerId || !pendingChallenge.eligibleChallengers.includes(playerId)) {
    return null;
  }

  return {
    type: 'CHALLENGE_ACTION',
    actionId: pendingAction.actionId,
    actorId: pendingAction.actorId,
    actionType: pendingAction.actionType,
    claimedRole: pendingChallenge.claimedRole,
    message: `${playerName(state, pendingAction.actorId)} claims ${labels.actionLabels[pendingAction.actionType]} as ${roleLabel(pendingChallenge.claimedRole)}.`,
  };
}

function buildBlockActionPrompt(state: HostGameState, playerId: PlayerId): PrivatePrompt {
  const pendingAction = state.pendingAction;
  if (!pendingAction || state.phase !== 'BLOCK_WINDOW') return null;

  const legalBlockRoles = blockRolesByAction[pendingAction.actionType] ?? [];
  if (legalBlockRoles.length === 0) return null;

  const canBlock =
    pendingAction.actionType === 'RISHTEDAAR_HELP'
      ? playerId !== pendingAction.actorId
      : pendingAction.targetId === playerId;

  if (!canBlock) return null;

  const targetName = pendingAction.targetId ? playerName(state, pendingAction.targetId) : 'the target';
  const roleNames = legalBlockRoles.map((role) => labels.roleTheme[role].label).join(' or ');
  const message =
    pendingAction.actionType === 'RISHTEDAAR_HELP'
      ? `Any non-actor can Use Setting with ${roleNames}.`
      : `${targetName} can Use Setting with ${roleNames}.`;

  return {
    type: 'BLOCK_ACTION',
    actionId: pendingAction.actionId,
    actorId: pendingAction.actorId,
    actionType: pendingAction.actionType,
    targetId: pendingAction.targetId,
    legalBlockRoles,
    message,
  };
}

function buildChallengeBlockPrompt(state: HostGameState, playerId: PlayerId): PrivatePrompt {
  const pendingChallenge = state.pendingChallenge;
  const pendingBlock = state.pendingBlock;
  if (!pendingChallenge || !pendingBlock || pendingChallenge.kind !== 'block') return null;
  if (pendingChallenge.claimantId === playerId || !pendingChallenge.eligibleChallengers.includes(playerId)) {
    return null;
  }

  return {
    type: 'CHALLENGE_BLOCK',
    actionId: pendingBlock.actionId,
    blockerId: pendingBlock.blockerId,
    blockingRole: pendingBlock.blockingRole,
    message: `${playerName(state, pendingBlock.blockerId)} claims ${labels.roleTheme[pendingBlock.blockingRole].label} to block ${labels.actionLabels[pendingActionTypeForBlock(state)]}.`,
  };
}

function pendingActionTypeForBlock(state: HostGameState): ActionType {
  return state.pendingAction?.actionType ?? 'CHAI_PAISA';
}

function buildBurnPrompt(state: HostGameState, playerId: PlayerId): PrivatePrompt {
  const pendingBurn = state.pendingBurn;
  if (!pendingBurn || pendingBurn.playerId !== playerId) return null;
  return {
    type: 'BURN_CONNECTION',
    playerId,
    message: `${playerName(state, playerId)} must Burn one Connection.`,
  };
}

function buildJugaadPrompt(state: HostGameState, playerId: PlayerId): PrivatePrompt {
  const pendingJugaad = state.pendingJugaad;
  if (!pendingJugaad || pendingJugaad.playerId !== playerId) return null;
  return {
    type: 'JUGAAD_RETURN',
    playerId,
    drawnConnections: [...pendingJugaad.drawnConnections],
    message: `${playerName(state, playerId)} must return exactly 2 Connections.`,
  };
}

function buildPrivatePrompt(state: HostGameState, playerId: PlayerId): PrivatePrompt {
  return (
    buildBurnPrompt(state, playerId) ??
    buildJugaadPrompt(state, playerId) ??
    buildChallengeActionPrompt(state, playerId) ??
    buildBlockActionPrompt(state, playerId) ??
    buildChallengeBlockPrompt(state, playerId)
  );
}

function availableActionTypes(rupees: number): ActionType[] {
  if (rupees >= 10) return ['FULL_BEIZZATI'];
  return (Object.keys(ACTION_CONFIG) as ActionType[]).filter((actionType) => ACTION_CONFIG[actionType].cost <= rupees);
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
    currentScene: buildCurrentScene(state),
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
  const forcedBeizzati = player.rupees >= 10;
  const prompt = buildPrivatePrompt(state, playerId);
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
        ? forcedBeizzati
          ? ['FULL_BEIZZATI']
          : availableActionTypes(player.rupees)
        : [],
    prompt,
    pendingAction: state.pendingAction?.actorId === playerId ? state.pendingAction : null,
    pendingChallenge:
      state.pendingChallenge &&
      (state.pendingChallenge.claimantId === playerId ||
        state.pendingChallenge.challengerId === playerId ||
        state.pendingChallenge.eligibleChallengers.includes(playerId))
        ? state.pendingChallenge
        : null,
    pendingBlock:
      state.pendingBlock &&
      (state.pendingBlock.blockerId === playerId ||
        state.pendingBlock.targetId === playerId ||
        state.pendingBlock.eligibleChallengers.includes(playerId))
        ? state.pendingBlock
        : null,
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
  return availableActionTypes(player.rupees);
}
