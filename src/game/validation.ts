import type {
  ActionEvent,
  BlockEvent,
  ClientMessage,
  ClientMessageResult,
  ConnectionCard,
  HostGameState,
  PlayerId,
  ValidationIssue,
} from './types';
import { actionCosts, actionRequirements, blockRequirements, getPlayer, isPlayerAlive } from './rules';

function issue(path: string, message: string): ValidationIssue {
  return { path, message };
}

function isCard(value: unknown): value is ConnectionCard {
  return Boolean(value && typeof value === 'object' && typeof (value as ConnectionCard).id === 'string' && typeof (value as ConnectionCard).role === 'string');
}

function validatePlayerCardSet(cards: readonly ConnectionCard[], path: string, issues: ValidationIssue[]): void {
  if (cards.length > 2) {
    issues.push(issue(path, 'Players can hold at most two hidden connections.'));
  }
  for (const [index, card] of cards.entries()) {
    if (!isCard(card)) {
      issues.push(issue(`${path}[${index}]`, 'Invalid connection card.'));
    }
  }
}

export function validateGameState(state: HostGameState): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (typeof state.roomCode !== 'string' || state.roomCode.length === 0) {
    issues.push(issue('roomCode', 'roomCode must be a non-empty string.'));
  }
  if (typeof state.gameId !== 'string' || state.gameId.length === 0) {
    issues.push(issue('gameId', 'gameId must be a non-empty string.'));
  }
  if (!['LOBBY', 'TURN_START', 'CHALLENGE_WINDOW', 'AWAITING_BURN', 'AWAITING_JUGAAD_RETURN', 'GAME_OVER'].includes(state.phase)) {
    issues.push(issue('phase', 'Invalid phase.'));
  }

  const seen = new Set<string>();
  for (const [playerId, player] of Object.entries(state.playersById)) {
    if (seen.has(playerId)) {
      issues.push(issue(`playersById.${playerId}`, 'Duplicate player id.'));
    }
    seen.add(playerId);
    if (typeof player.name !== 'string' || player.name.length === 0) {
      issues.push(issue(`playersById.${playerId}.name`, 'name must be a non-empty string.'));
    }
    if (!Number.isInteger(player.rupees) || player.rupees < 0) {
      issues.push(issue(`playersById.${playerId}.rupees`, 'rupees must be a non-negative integer.'));
    }
    validatePlayerCardSet(player.hiddenConnections, `playersById.${playerId}.hiddenConnections`, issues);
    validatePlayerCardSet(player.revealedConnections, `playersById.${playerId}.revealedConnections`, issues);
    if (player.eliminated && player.hiddenConnections.length > 0) {
      issues.push(issue(`playersById.${playerId}.eliminated`, 'Eliminated players must have no hidden connections.'));
    }
  }

  if (state.activePlayerId !== null && !state.playersById[state.activePlayerId]) {
    issues.push(issue('activePlayerId', 'Active player must exist.'));
  }
  if (state.activePlayerId !== null && !isPlayerAlive(state.playersById[state.activePlayerId])) {
    issues.push(issue('activePlayerId', 'Active player must be alive.'));
  }
  if (state.winnerId !== null && !state.playersById[state.winnerId]) {
    issues.push(issue('winnerId', 'Winner must exist.'));
  }

  const totalCards = [
    ...state.deck,
    ...state.discardPile,
    ...Object.values(state.playersById).flatMap((player) => [...player.hiddenConnections, ...player.revealedConnections]),
  ];
  if (totalCards.length !== 15) {
    issues.push(issue('cards', 'A complete game state must account for all 15 connection cards.'));
  }

  return issues;
}

export function validateClientMessage(state: HostGameState, playerId: PlayerId, message: ClientMessage): ClientMessageResult {
  const player = getPlayer(state, playerId);
  if (!player) {
    return { ok: false, reason: 'Unknown player.' };
  }
  if (player.eliminated) {
    return { ok: false, reason: 'Eliminated player cannot act.' };
  }

  if (message.type === 'DECLARE_ACTION') {
    if (state.phase !== 'TURN_START') {
      return { ok: false, reason: 'Actions are only legal during TURN_START.' };
    }
    if (state.activePlayerId !== playerId) {
      return { ok: false, reason: 'Only the active player may declare an action.' };
    }
    if (player.rupees >= 10 && message.actionType !== 'FULL_BEIZZATI') {
      return { ok: false, reason: 'Players with 10+ rupees must use Full Beizzati.' };
    }
    const cost = actionCosts[message.actionType];
    if (player.rupees < cost) {
      return { ok: false, reason: 'Not enough rupees for that action.' };
    }
    if (message.actionType !== 'CHAI_PAISA' && message.actionType !== 'RISHTEDAAR_HELP' && !actionRequirements[message.actionType] && message.actionType !== 'FULL_BEIZZATI') {
      return { ok: false, reason: 'Unknown action.' };
    }
    return { ok: true };
  }

  if (message.type === 'CHALLENGE') {
    return { ok: state.phase === 'CHALLENGE_WINDOW', reason: state.phase === 'CHALLENGE_WINDOW' ? undefined : 'No challenge window is open.' };
  }
  if (message.type === 'PASS_CHALLENGE') {
    return { ok: state.phase === 'CHALLENGE_WINDOW', reason: state.phase === 'CHALLENGE_WINDOW' ? undefined : 'No challenge window is open.' };
  }
  if (message.type === 'BLOCK') {
    if (state.phase !== 'CHALLENGE_WINDOW' || !state.pendingAction) {
      return { ok: false, reason: 'Blocks are only legal during challenge windows.' };
    }
    const required = blockRequirements[state.pendingAction.actionType];
    if (required && required !== message.role) {
      return { ok: false, reason: 'Illegal block role.' };
    }
    return { ok: true };
  }
  if (message.type === 'PASS_BLOCK') {
    return { ok: state.phase === 'CHALLENGE_WINDOW' || state.phase === 'AWAITING_BURN', reason: state.phase === 'CHALLENGE_WINDOW' || state.phase === 'AWAITING_BURN' ? undefined : 'No block window is open.' };
  }
  if (message.type === 'CHOOSE_CONNECTION_TO_BURN') {
    return { ok: state.phase === 'AWAITING_BURN', reason: state.phase === 'AWAITING_BURN' ? undefined : 'No burn is pending.' };
  }
  if (message.type === 'JUGAAD_RETURN') {
    return { ok: state.phase === 'AWAITING_JUGAAD_RETURN' && message.connectionIds.length === 2, reason: state.phase === 'AWAITING_JUGAAD_RETURN' ? undefined : 'No jugaad return is pending.' };
  }

  return { ok: false, reason: 'Unsupported message.' };
}

export function validateActionEvent(state: HostGameState, event: ActionEvent | BlockEvent): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (event.type === 'DECLARE_ACTION') {
    const player = getPlayer(state, event.action.actorId);
    if (!player) {
      issues.push(issue('actorId', 'Unknown actor.'));
      return issues;
    }
    if (state.activePlayerId !== event.action.actorId) {
      issues.push(issue('actorId', 'Actor must be the active player.'));
    }
    if (player.rupees < event.action.cost) {
      issues.push(issue('rupees', 'Insufficient rupees.'));
    }
  }
  if (event.type === 'BLOCK') {
    if (!state.pendingAction) {
      issues.push(issue('block', 'No action to block.'));
    }
  }
  return issues;
}
