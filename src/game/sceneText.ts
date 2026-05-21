import { labels } from './theme';
import type { HostGameState, PlayerId } from './types';

function playerName(state: HostGameState, playerId: PlayerId | null | undefined): string {
  if (!playerId) return 'Someone';
  return state.playersById[playerId]?.name ?? 'Someone';
}

function roleLabel(role: string | null | undefined): string {
  if (!role) return 'a role';
  return labels.roleTheme[role as keyof typeof labels.roleTheme]?.label ?? role;
}

export function buildCurrentScene(state: HostGameState): string {
  if (state.phase === 'GAME_OVER') {
    return state.winnerId ? `${playerName(state, state.winnerId)} wins.` : 'Game over.';
  }

  if (state.pendingBurn) {
    return `${playerName(state, state.pendingBurn.playerId)} must Burn one Connection.`;
  }

  if (state.pendingJugaad) {
    return `${playerName(state, state.pendingJugaad.playerId)} is resolving ${labels.actionLabels.ZARDAAR_JUGAAD}.`;
  }

  if (state.pendingChallenge?.kind === 'block' && state.pendingBlock) {
    return `${playerName(state, state.pendingChallenge.claimantId)} claims ${roleLabel(state.pendingChallenge.claimedRole)} to block ${labels.actionLabels[state.pendingAction?.actionType ?? 'CHAI_PAISA']}.`;
  }

  if (state.pendingChallenge?.kind === 'action' && state.pendingAction) {
    const actor = playerName(state, state.pendingAction.actorId);
    return `${actor} claims ${labels.actionLabels[state.pendingAction.actionType]} as ${roleLabel(state.pendingChallenge.claimedRole)}.`;
  }

  if (state.phase === 'BLOCK_WINDOW' && state.pendingAction) {
    const actor = playerName(state, state.pendingAction.actorId);
    const action = labels.actionLabels[state.pendingAction.actionType];
    if (state.pendingAction.actionType === 'RISHTEDAAR_HELP') {
      return `${actor} can Use Setting against ${action}.`;
    }
    if (state.pendingAction.targetId) {
      return `${playerName(state, state.pendingAction.targetId)} can Use Setting against ${action}.`;
    }
    return `Use Setting against ${action}.`;
  }

  if (state.phase === 'CHALLENGE_WINDOW' && state.pendingAction) {
    return `${playerName(state, state.pendingAction.actorId)} claims ${labels.actionLabels[state.pendingAction.actionType]}${state.pendingAction.claimedRole ? ` as ${roleLabel(state.pendingAction.claimedRole)}` : ''}.`;
  }

  if (state.phase === 'TURN_START' && state.activePlayerId) {
    return `${playerName(state, state.activePlayerId)} is choosing a scene.`;
  }

  if (state.phase === 'LOBBY') {
    return 'Waiting for players.';
  }

  return labels.phaseLabels[state.phase] ?? 'Waiting.';
}
