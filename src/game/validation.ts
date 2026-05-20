import type {
  ActionEvent,
  BlockEvent,
  ClientMessage,
  ClientMessageResult,
  ConnectionCard,
  HostGameState,
  PlayerId,
  PendingAction,
  PendingBlock,
  PendingBurn,
  PendingChallenge,
  PendingJugaad,
  Role,
  ValidationIssue,
} from './types';
import { ACTION_CONFIG, actionCosts, blockRolesByAction, getPlayer, isPlayerAlive } from './rules';

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

function validatePlayerRevealedRoles(roles: readonly unknown[], path: string, issues: ValidationIssue[]): void {
  for (const [index, role] of roles.entries()) {
    if (typeof role !== 'string' || !(['MALIK_SAAB', 'BHAI', 'POLICE_WALA', 'MUMMA', 'ZARDAAR_CHOR'] as readonly Role[]).includes(role as Role)) {
      issues.push(issue(`${path}[${index}]`, 'Invalid revealed connection role.'));
    }
  }
}

function validatePendingAction(action: PendingAction, path: string, issues: ValidationIssue[]): void {
  if (typeof action.actionId !== 'string' || action.actionId.length === 0) {
    issues.push(issue(`${path}.actionId`, 'actionId must be a non-empty string.'));
  }
  if (!Number.isFinite(action.cost) || action.cost < 0) {
    issues.push(issue(`${path}.cost`, 'cost must be a non-negative number.'));
  }
  if (!Array.isArray(action.blockRoles)) {
    issues.push(issue(`${path}.blockRoles`, 'blockRoles must be an array.'));
  }
  for (const [index, role] of action.blockRoles.entries()) {
    if (typeof role !== 'string') {
      issues.push(issue(`${path}.blockRoles[${index}]`, 'Invalid block role.'));
    }
  }
}

function validatePendingChallenge(challenge: PendingChallenge, path: string, issues: ValidationIssue[]): void {
  if (typeof challenge.actionId !== 'string' || challenge.actionId.length === 0) {
    issues.push(issue(`${path}.actionId`, 'actionId must be a non-empty string.'));
  }
  if (typeof challenge.claimedRole !== 'string') {
    issues.push(issue(`${path}.claimedRole`, 'claimedRole must be present.'));
  }
}

function validatePendingBlock(block: PendingBlock, path: string, issues: ValidationIssue[]): void {
  if (typeof block.actionId !== 'string' || block.actionId.length === 0) {
    issues.push(issue(`${path}.actionId`, 'actionId must be a non-empty string.'));
  }
  if (typeof block.blockingRole !== 'string') {
    issues.push(issue(`${path}.blockingRole`, 'blockingRole must be present.'));
  }
}

function validatePendingBurn(burn: PendingBurn, path: string, issues: ValidationIssue[]): void {
  if (typeof burn.playerId !== 'string') {
    issues.push(issue(`${path}.playerId`, 'playerId must be present.'));
  }
}

function validatePendingJugaad(jugaad: PendingJugaad, path: string, issues: ValidationIssue[]): void {
  if (!Array.isArray(jugaad.drawnConnections) || jugaad.drawnConnections.length !== 2) {
    issues.push(issue(`${path}.drawnConnections`, 'drawnConnections must contain exactly two cards.'));
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
  if (!Number.isInteger(state.seq) || state.seq < 0) {
    issues.push(issue('seq', 'seq must be a non-negative integer.'));
  }
  if (!['LOBBY', 'DEALING', 'TURN_START', 'ACTION_DECLARED', 'CHALLENGE_WINDOW', 'BLOCK_WINDOW', 'AWAITING_BURN', 'AWAITING_JUGAAD_RETURN', 'RESOLVE_ACTION', 'TURN_END', 'GAME_OVER'].includes(state.phase)) {
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
    validatePlayerRevealedRoles(player.revealedConnections, `playersById.${playerId}.revealedConnections`, issues);
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
  if (state.pendingAction) {
    validatePendingAction(state.pendingAction, 'pendingAction', issues);
  }
  if (state.pendingChallenge) {
    validatePendingChallenge(state.pendingChallenge, 'pendingChallenge', issues);
  }
  if (state.pendingBlock) {
    validatePendingBlock(state.pendingBlock, 'pendingBlock', issues);
  }
  if (state.pendingBurn) {
    validatePendingBurn(state.pendingBurn, 'pendingBurn', issues);
  }
  if (state.pendingJugaad) {
    validatePendingJugaad(state.pendingJugaad, 'pendingJugaad', issues);
  }

  const totalCards = state.deck.length + state.discardPile.length + Object.values(state.playersById).reduce((sum, player) => sum + player.hiddenConnections.length, 0);
  if (totalCards !== 15) {
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
    const config = ACTION_CONFIG[message.actionType];
    const cost = actionCosts[message.actionType];
    if (player.rupees < cost) {
      return { ok: false, reason: 'Not enough rupees for that action.' };
    }
    if (config.needsTarget && !message.targetId) {
      return { ok: false, reason: 'That action needs a target.' };
    }
    if (!config.needsTarget && message.targetId !== undefined && message.targetId !== null) {
      return { ok: false, reason: 'That action does not take a target.' };
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
    if (state.phase !== 'BLOCK_WINDOW' || !state.pendingAction) {
      return { ok: false, reason: 'Blocks are only legal during block windows.' };
    }
    const required = blockRolesByAction[state.pendingAction.actionType] ?? [];
    if (required.length > 0 && !required.includes(message.role)) {
      return { ok: false, reason: 'Illegal block role.' };
    }
    return { ok: true };
  }
  if (message.type === 'PASS_BLOCK') {
    return { ok: state.phase === 'BLOCK_WINDOW', reason: state.phase === 'BLOCK_WINDOW' ? undefined : 'No block window is open.' };
  }
  if (message.type === 'CHOOSE_CONNECTION_TO_BURN') {
    return { ok: state.phase === 'AWAITING_BURN', reason: state.phase === 'AWAITING_BURN' ? undefined : 'No burn is pending.' };
  }
  if (message.type === 'JUGAAD_RETURN') {
    return {
      ok: state.phase === 'AWAITING_JUGAAD_RETURN' && message.returnedConnectionIds.length === 2,
      reason: state.phase === 'AWAITING_JUGAAD_RETURN' ? undefined : 'No jugaad return is pending.',
    };
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
