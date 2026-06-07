import type { ActionEvent, GameEvent, HostGameState, PendingAction, PendingChallenge, PlayerId, PlayerState, Role } from './types';
import {
  actionCosts,
  actionRequirements,
  applyRupees,
  blockRolesByAction,
  createHostGameState,
  createPendingAction,
  deckFor,
  drawCards,
  firstAlivePlayerId,
  isPlayerAlive,
  MAX_PLAYERS,
  MIN_PLAYERS,
  nextLivingPlayerId,
  removeConnectionFromPlayer,
  replacePlayer,
  shuffleIntoDeck,
} from './rules';
import { createActionId, createBasePlayer, toPlayerId } from './utils';
import { labels } from './theme';

function logEntry(text: string) {
  return { id: createActionId(), text };
}

function playerName(state: HostGameState, playerId: PlayerId | null | undefined): string {
  if (!playerId) return 'Someone';
  return state.playersById[playerId]?.name ?? 'Someone';
}

function roleName(role: Role | null | undefined): string {
  if (!role) return 'a role';
  return labels.roleTheme[role].label;
}

function bump(state: HostGameState, next: HostGameState, text: string): HostGameState {
  const entries = [text];
  if (state.phase !== 'GAME_OVER' && next.phase === 'GAME_OVER') {
    const winnerId = next.winnerId ?? firstAlivePlayerId(next);
    entries.push(`Winner: ${winnerId ? next.playersById[winnerId]?.name ?? 'Unknown' : 'None'}`);
  } else if (state.activePlayerId !== next.activePlayerId && next.activePlayerId) {
    entries.push(`${next.playersById[next.activePlayerId]?.name ?? 'Player'} turn`);
  }

  return {
    ...next,
    seq: state.seq + 1,
    log: [...state.log, ...entries.map(logEntry)],
  };
}

function clearPrompts(state: HostGameState): HostGameState {
  return {
    ...state,
    pendingChallenge: null,
    pendingBlock: null,
    pendingBurn: null,
    pendingJugaad: null,
  };
}

function livingCount(state: HostGameState): number {
  return state.turnOrder.filter((playerId) => isPlayerAlive(state.playersById[playerId])).length;
}

function gameOverState(state: HostGameState, winnerId: PlayerId | null): HostGameState {
  return {
    ...clearPrompts(state),
    phase: 'GAME_OVER',
    activePlayerId: null,
    winnerId,
  };
}

function advanceTurn(state: HostGameState): HostGameState {
  const alive = livingCount(state);
  if (alive <= 1) {
    const winnerId = firstAlivePlayerId(state);
    return gameOverState(state, winnerId);
  }

  const nextId = state.activePlayerId ? nextLivingPlayerId(state, state.activePlayerId) : firstAlivePlayerId(state);
  if (!nextId) {
    return gameOverState(state, firstAlivePlayerId(state));
  }

  return {
    ...clearPrompts(state),
    phase: 'TURN_START',
    activePlayerId: nextId,
  };
}

function eligibleChallengers(state: HostGameState, excluded: PlayerId[]): PlayerId[] {
  return state.turnOrder.filter((playerId) => isPlayerAlive(state.playersById[playerId]) && !excluded.includes(playerId));
}

function replaceClaimedCardAndDraw(state: HostGameState, claimantId: PlayerId, claimedRole: Role): HostGameState {
  const player = state.playersById[claimantId];
  if (!player) return state;
  const matchIndex = player.hiddenConnections.findIndex((card) => card.role === claimedRole);
  if (matchIndex < 0) return state;

  const provenCard = player.hiddenConnections[matchIndex]!;
  const hiddenConnections = [...player.hiddenConnections.slice(0, matchIndex), ...player.hiddenConnections.slice(matchIndex + 1)];
  const decked = shuffleIntoDeck({ ...state }, [provenCard]);
  const replacement = decked.deck[0];
  const updatedPlayer: PlayerState = {
    ...player,
    hiddenConnections: replacement ? [...hiddenConnections, replacement] : hiddenConnections,
  };

  return replacePlayer(
    {
      ...decked,
      deck: replacement ? decked.deck.slice(1) : decked.deck,
    },
    updatedPlayer,
  );
}

function burnCard(state: HostGameState, playerId: PlayerId, connectionId: string): HostGameState {
  return removeConnectionFromPlayer(state, playerId, connectionId as never);
}

function resolveAfterSuccessfulActionProof(state: HostGameState): HostGameState {
  const pending = state.pendingAction;
  if (!pending) return state;

  switch (pending.actionType) {
    case 'KIRAYA_COLLECTION':
      return advanceTurn(applyRupees(state, pending.actorId, 3));
    case 'POLICE_WALA_RAID':
    case 'BHAI_KA_SCENE':
      return {
        ...state,
        phase: 'BLOCK_WINDOW',
      };
    case 'ZARDAAR_JUGAAD': {
      const drawn = drawCards(state, 2);
      return {
        ...drawn.state,
        phase: 'AWAITING_JUGAAD_RETURN',
        pendingJugaad: { playerId: pending.actorId, drawnConnections: drawn.cards, drawnCards: drawn.cards },
      };
    }
    default:
      return state;
  }
}

function resolveAfterFailedBlockProof(state: HostGameState): HostGameState {
  const pending = state.pendingAction;
  if (!pending) return state;

  switch (pending.actionType) {
    case 'RISHTEDAAR_HELP':
      return advanceTurn(applyRupees(state, pending.actorId, 2));
    case 'POLICE_WALA_RAID': {
      const targetId = pending.targetId;
      const target = targetId ? state.playersById[targetId] : null;
      const stolen = Math.min(2, target?.rupees ?? 0);
      return advanceTurn(applyRupees(applyRupees(state, pending.actorId, stolen), targetId!, -stolen));
    }
    case 'BHAI_KA_SCENE':
      return {
        ...state,
        phase: 'AWAITING_BURN',
        pendingBurn: { playerId: pending.targetId!, reason: 'assassinate', continueTo: 'turn_end', actionId: pending.actionId },
      };
    default:
      return state;
  }
}

function resolveUnblockedAction(state: HostGameState): HostGameState {
  const pending = state.pendingAction;
  if (!pending) return state;

  switch (pending.actionType) {
    case 'CHAI_PAISA':
      return advanceTurn(applyRupees(state, pending.actorId, 1));
    case 'RISHTEDAAR_HELP':
      return advanceTurn(applyRupees(state, pending.actorId, 2));
    case 'KIRAYA_COLLECTION':
      return advanceTurn(applyRupees(state, pending.actorId, 3));
    case 'POLICE_WALA_RAID': {
      const targetId = pending.targetId;
      const target = targetId ? state.playersById[targetId] : null;
      const stolen = Math.min(2, target?.rupees ?? 0);
      return advanceTurn(applyRupees(applyRupees(state, pending.actorId, stolen), targetId!, -stolen));
    }
    case 'BHAI_KA_SCENE':
      return {
        ...state,
        phase: 'AWAITING_BURN',
        pendingBurn: { playerId: pending.targetId!, reason: 'assassinate', continueTo: 'turn_end', actionId: pending.actionId },
      };
    case 'ZARDAAR_JUGAAD': {
      const drawn = drawCards(state, 2);
      return {
        ...drawn.state,
        phase: 'AWAITING_JUGAAD_RETURN',
        pendingJugaad: { playerId: pending.actorId, drawnConnections: drawn.cards, drawnCards: drawn.cards },
      };
    }
    case 'FULL_BEIZZATI':
      return {
        ...state,
        phase: 'AWAITING_BURN',
        pendingBurn: { playerId: pending.targetId!, reason: 'coup', continueTo: 'turn_end', actionId: pending.actionId },
      };
    default:
      return state;
  }
}

function resolveAfterActionChallenge(state: HostGameState, challengerId: PlayerId): HostGameState {
  const pending = state.pendingAction;
  const challenge = state.pendingChallenge;
  if (!pending || !challenge) return state;

  const claimant = state.playersById[challenge.claimantId];
  if (!claimant) return state;

  const hasRole = Boolean(challenge.claimedRole && claimant.hiddenConnections.some((card) => card.role === challenge.claimedRole));
  if (hasRole) {
    const next = replaceClaimedCardAndDraw(state, challenge.claimantId, challenge.claimedRole);
    return {
      ...next,
      phase: 'AWAITING_BURN',
      pendingChallenge: { ...challenge, challengerId },
      pendingBurn: { playerId: challengerId, reason: 'challenge-loss', continueTo: 'continue_action', actionId: pending.actionId },
    };
  }

  return {
    ...state,
    phase: 'AWAITING_BURN',
    pendingChallenge: { ...challenge, challengerId },
    pendingBurn: { playerId: challenge.claimantId, reason: 'challenge-loss', continueTo: 'turn_end', actionId: pending.actionId },
  };
}

function resolveAfterBlockChallenge(state: HostGameState, challengerId: PlayerId): HostGameState {
  const challenge = state.pendingChallenge;
  const pending = state.pendingAction;
  if (!challenge || !pending) return state;

  const blocker = state.playersById[challenge.claimantId];
  if (!blocker) return state;

  const hasRole = Boolean(challenge.claimedRole && blocker.hiddenConnections.some((card) => card.role === challenge.claimedRole));
  if (hasRole) {
    const next = replaceClaimedCardAndDraw(state, challenge.claimantId, challenge.claimedRole);
    return {
      ...next,
      phase: 'AWAITING_BURN',
      pendingChallenge: { ...challenge, challengerId },
      pendingBurn: { playerId: challengerId, reason: 'challenge-loss', continueTo: 'turn_end', actionId: pending.actionId },
    };
  }

  return {
    ...state,
    phase: 'AWAITING_BURN',
    pendingChallenge: { ...challenge, challengerId },
    pendingBurn: { playerId: challenge.claimantId, reason: 'challenge-loss', continueTo: 'continue_block', actionId: pending.actionId },
  };
}

function resolveBlockStand(state: HostGameState): HostGameState {
  return advanceTurn({ ...state, pendingAction: null, pendingBlock: null, pendingChallenge: null });
}

function resolveJugaadReturn(state: HostGameState, playerId: PlayerId, returnedConnectionIds: [string, string]): HostGameState {
  const pending = state.pendingJugaad;
  const player = state.playersById[playerId];
  if (!pending || !player || pending.playerId !== playerId) return state;

  const combined = [...player.hiddenConnections, ...pending.drawnConnections];
  const selected = new Set(returnedConnectionIds);
  if (selected.size !== 2) return state;
  if (![...selected].every((id) => combined.some((card) => card.id === id))) return state;

  const returned = combined.filter((card) => selected.has(card.id));
  const kept = combined.filter((card) => !selected.has(card.id));
  const nextPlayer: PlayerState = { ...player, hiddenConnections: kept };

  const decked = shuffleIntoDeck({ ...state, pendingJugaad: null }, returned);
  return advanceTurn(replacePlayer(decked, nextPlayer));
}

function declareAction(state: HostGameState, action: PendingAction): HostGameState {
  const actor = state.playersById[action.actorId];
  if (!actor || !isPlayerAlive(actor) || state.activePlayerId !== action.actorId || state.phase !== 'TURN_START') return state;
  if (actor.rupees >= 10 && action.actionType !== 'FULL_BEIZZATI') return state;
  if (actor.rupees < action.cost) return state;
  if (action.needsTarget) {
    const target = action.targetId ? state.playersById[action.targetId] : null;
    if (!target || !isPlayerAlive(target)) return state;
  }

  switch (action.actionType) {
    case 'CHAI_PAISA':
      return bump(state, advanceTurn(applyRupees(state, action.actorId, 1)), `${playerName(state, action.actorId)} takes Chai Paisa.`);
    case 'RISHTEDAAR_HELP':
      return bump(
        state,
        {
          ...state,
          phase: 'BLOCK_WINDOW',
          pendingAction: action,
        },
        `${playerName(state, action.actorId)} claims Rishtedaar Help.`,
      );
    case 'KIRAYA_COLLECTION':
    case 'POLICE_WALA_RAID':
    case 'BHAI_KA_SCENE':
    case 'ZARDAAR_JUGAAD':
      return bump(
        state,
        {
          ...applyRupees(state, action.actorId, action.actionType === 'BHAI_KA_SCENE' ? -actionCosts.BHAI_KA_SCENE : 0),
          phase: 'CHALLENGE_WINDOW',
          pendingAction: action,
          pendingChallenge: {
            source: 'action',
            kind: 'action',
            actionId: action.actionId,
            claimantId: action.actorId,
            claimedRole: action.claimedRole ?? actionRequirements[action.actionType]!,
            challengerId: null,
            eligibleChallengers: eligibleChallengers(state, [action.actorId]),
            responses: {},
          },
        },
        `${playerName(state, action.actorId)} claims ${labels.actionLabels[action.actionType]}${action.claimedRole ? ` as ${roleName(action.claimedRole)}` : ''}.`,
      );
    case 'FULL_BEIZZATI':
      return bump(
        state,
        {
          ...applyRupees(state, action.actorId, -actionCosts.FULL_BEIZZATI),
          phase: 'AWAITING_BURN',
          pendingAction: action,
          pendingBurn: { playerId: action.targetId!, reason: 'full-beizzati', continueTo: 'turn_end', actionId: action.actionId },
        },
        `${playerName(state, action.actorId)} plays Full Beizzati on ${playerName(state, action.targetId)}.`,
      );
    default:
      return state;
  }
}

function passChallenge(state: HostGameState, playerId: PlayerId): HostGameState {
  const challenge = state.pendingChallenge;
  const pending = state.pendingAction;
  if (!challenge || !pending || !challenge.eligibleChallengers.includes(playerId)) return state;

  const responses: PendingChallenge['responses'] = { ...challenge.responses, [playerId]: 'passed' };
  const allPassed = challenge.eligibleChallengers.every((id) => responses[id] === 'passed');
  const nextChallenge = { ...challenge, responses };

  if (!allPassed) {
    return bump(state, { ...state, pendingChallenge: nextChallenge }, `${playerName(state, playerId)} lets it slide.`);
  }

  if (challenge.kind === 'action') {
    if (pending.actionType === 'KIRAYA_COLLECTION') {
      return bump(state, advanceTurn({ ...applyRupees(state, pending.actorId, 3), pendingChallenge: null }), 'Kiraya Collection');
    }
    if (pending.actionType === 'ZARDAAR_JUGAAD') {
      const drawn = drawCards(state, 2);
      return bump(
        state,
        {
          ...drawn.state,
          phase: 'AWAITING_JUGAAD_RETURN',
          pendingChallenge: null,
          pendingAction: pending,
          pendingJugaad: { playerId: pending.actorId, drawnConnections: drawn.cards, drawnCards: drawn.cards },
        },
        `${playerName(state, playerId)} lets it slide. ${playerName(state, pending.actorId)} resolves Zardaar Jugaad.`,
      );
    }
    return bump(state, { ...state, phase: 'BLOCK_WINDOW', pendingChallenge: null }, `${playerName(state, playerId)} lets it slide.`);
  }

  return bump(state, resolveBlockStand({ ...state, pendingChallenge: null }), `${playerName(state, playerId)} lets it slide.`);
}

function passBlock(state: HostGameState, _playerId: PlayerId): HostGameState {
  if (state.phase !== 'BLOCK_WINDOW') return state;
  const pending = state.pendingAction;
  if (!pending) return state;
  return bump(state, resolveUnblockedAction({ ...state, pendingChallenge: null, pendingBlock: null }), `${playerName(state, _playerId)} lets it slide.`);
}

function blockAction(state: HostGameState, block: { actionId: string; blockerId: PlayerId; blockingRole: Role; targetId: PlayerId | null }): HostGameState {
  const pending = state.pendingAction;
  if (!pending || state.phase !== 'BLOCK_WINDOW') return state;
  const roles = blockRolesByAction[pending.actionType] ?? [];
  if (!roles.includes(block.blockingRole)) return state;

  const challengers = eligibleChallengers(state, [pending.actorId, block.blockerId]);
  return bump(
    state,
    {
      ...state,
      phase: 'CHALLENGE_WINDOW',
      pendingBlock: {
        actionId: block.actionId,
        blockerId: block.blockerId,
        blockingRole: block.blockingRole,
        targetId: block.targetId,
        eligibleChallengers: challengers,
        responses: {},
      },
      pendingChallenge: {
        source: 'block',
        kind: 'block',
        actionId: block.actionId,
        claimantId: block.blockerId,
        claimedRole: block.blockingRole,
        challengerId: null,
        eligibleChallengers: challengers,
        responses: {},
      },
    },
    `${playerName(state, block.blockerId)} uses Setting: ${roleName(block.blockingRole)}.`,
  );
}

function chooseBurn(state: HostGameState, playerId: PlayerId, connectionId: string): HostGameState {
  const pendingBurn = state.pendingBurn;
  if (!pendingBurn || pendingBurn.playerId !== playerId) return state;
  const player = state.playersById[playerId];
  if (!player || !player.hiddenConnections.some((card) => card.id === (connectionId as never))) return state;
  const burnedCard = player.hiddenConnections.find((card) => card.id === (connectionId as never));
  if (!burnedCard) return state;
  const burned = burnCard(state, playerId, connectionId);
  const cleared: HostGameState = { ...burned, pendingBurn: null, pendingChallenge: null };
  const proofMessage =
    pendingBurn.reason === 'challenge-loss' && state.pendingChallenge && pendingBurn.playerId !== state.pendingChallenge.claimantId
      ? `${playerName(state, state.pendingChallenge.claimantId)} proves ${roleName(state.pendingChallenge.claimedRole)}.`
      : '';
  const burnMessage = proofMessage ? `${proofMessage} ${playerName(state, playerId)} burns a Connection.` : `${playerName(state, playerId)} burns a Connection.`;

  if (pendingBurn.continueTo === 'continue_action') {
    return bump(state, resolveAfterSuccessfulActionProof(cleared), burnMessage);
  }
  if (pendingBurn.continueTo === 'continue_block') {
    return bump(state, resolveAfterFailedBlockProof(cleared), burnMessage);
  }
  if (pendingBurn.continueTo === 'turn_end') {
    return bump(state, advanceTurn({ ...cleared, pendingAction: null, pendingBlock: null }), burnMessage);
  }
  return bump(state, gameOverState(cleared, firstAlivePlayerId(cleared)), burnMessage);
}

function requestResync(state: HostGameState): HostGameState {
  return state;
}

export function createActionEvent(actorId: PlayerId, actionType: PendingAction['actionType'], targetId: PlayerId | null = null): ActionEvent {
  return {
    type: 'DECLARE_ACTION',
    action: createPendingAction(createActionId(), actorId, actionType, targetId),
  };
}

export function reducer(state: HostGameState, event: GameEvent): HostGameState {
  switch (event.type) {
    case 'START_GAME':
      if (state.phase !== 'LOBBY') return state;
      if (state.turnOrder.length < MIN_PLAYERS || state.turnOrder.length > MAX_PLAYERS) return state;
      const shuffled = deckFor(state.roomCode, state.gameId);
      let index = 0;
      const playersById: HostGameState['playersById'] = {};
      for (const playerId of state.turnOrder) {
        const player = state.playersById[playerId];
        if (!player) continue;
        const hiddenConnections = shuffled.slice(index, index + 2);
        index += 2;
        playersById[playerId] = {
          ...createBasePlayer(toPlayerId(playerId), player.name),
          clientNonce: player.clientNonce,
          rupees: 2,
          hiddenConnections,
          revealedConnections: [],
          connected: player.connected,
          eliminated: hiddenConnections.length === 0,
        };
      }
      return bump(state, {
        ...state,
        phase: 'TURN_START',
        playersById,
        deck: shuffled.slice(index),
        discardPile: [],
        activePlayerId: state.turnOrder[0] ?? null,
        pendingAction: null,
        pendingChallenge: null,
        pendingBlock: null,
        pendingBurn: null,
        pendingJugaad: null,
        winnerId: null,
      }, 'Game started');
    case 'RESET_GAME':
      return createHostGameState(state.roomId, state.gameId);
    case 'DECLARE_ACTION':
      return declareAction(state, event.action);
    case 'CHALLENGE':
      if (state.pendingChallenge?.kind === 'block') {
        return bump(state, resolveAfterBlockChallenge(state, event.challengerId), `${playerName(state, event.challengerId)} calls bakwaas.`);
      }
      if (state.pendingChallenge?.kind === 'action') {
        return bump(state, resolveAfterActionChallenge(state, event.challengerId), `${playerName(state, event.challengerId)} calls bakwaas.`);
      }
      return state;
    case 'PASS_CHALLENGE':
      return passChallenge(state, event.playerId);
    case 'BLOCK':
      return blockAction(state, event.block);
    case 'PASS_BLOCK':
      return passBlock(state, event.playerId);
    case 'CHOOSE_CONNECTION_TO_BURN':
      return chooseBurn(state, event.playerId, event.connectionId);
    case 'JUGAAD_RETURN':
      {
        const next = resolveJugaadReturn(state, event.playerId, event.returnedConnectionIds);
        return next === state ? state : bump(state, next, `${playerName(state, event.playerId)} resolves Zardaar Jugaad.`);
      }
    case 'REQUEST_RESYNC':
      return requestResync(state);
    default:
      return state;
  }
}

export { createHostGameState } from './rules';
