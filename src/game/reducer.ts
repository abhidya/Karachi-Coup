import type {
  ActionEvent,
  GameEvent,
  HostGameState,
  PendingAction,
  PendingBurn,
  PendingChallenge,
  PlayerId,
  PlayerState,
} from './types';
import {
  actionCosts,
  actionRequirements,
  applyRupees,
  blockRequirements,
  deckFor,
  discardCards,
  drawCards,
  eliminatePlayer,
  firstAlivePlayerId,
  isPlayerAlive,
  nextLivingPlayerId,
  removeConnectionFromPlayer,
  replacePlayer,
} from './rules';
import { createActionId, createBasePlayer, toPlayerId } from './utils';
import { validateActionEvent } from './validation';

function livingCount(state: HostGameState): number {
  return state.turnOrder.filter((playerId) => isPlayerAlive(state.playersById[playerId])).length;
}

function nextTurnState(state: HostGameState): HostGameState {
  if (livingCount(state) <= 1) {
    return {
      ...state,
      phase: 'GAME_OVER',
      activePlayerId: null,
      winnerId: firstAlivePlayerId(state),
      pendingAction: null,
      pendingChallenge: null,
      pendingBlock: null,
      pendingBurn: null,
      pendingJugaad: null,
    };
  }

  if (!state.activePlayerId) {
    return state;
  }

  const nextId = nextLivingPlayerId(state, state.activePlayerId);
  if (!nextId) {
    return {
      ...state,
      phase: 'GAME_OVER',
      activePlayerId: null,
      winnerId: firstAlivePlayerId(state),
      pendingAction: null,
      pendingChallenge: null,
      pendingBlock: null,
      pendingBurn: null,
      pendingJugaad: null,
    };
  }

  return {
    ...state,
    phase: 'TURN_START',
    activePlayerId: nextId,
    pendingAction: null,
    pendingChallenge: null,
    pendingBlock: null,
    pendingBurn: null,
    pendingJugaad: null,
  };
}

function openChallengeWindow(
  state: HostGameState,
  source: 'action' | 'block',
  claimantId: PlayerId,
  claimedRole: PendingChallenge['claimedRole'],
  actionId: string,
): HostGameState {
  return {
    ...state,
    phase: 'CHALLENGE_WINDOW',
    pendingChallenge: {
      actionId,
      source,
      claimantId,
      challengerId: null,
      claimedRole,
      eligibleChallengers: [],
      responses: {},
    },
  };
}

function setBurn(state: HostGameState, playerId: PlayerId, reason: PendingBurn['reason'], continueTo: PendingBurn['continueTo'], actionId?: string): HostGameState {
  return {
    ...state,
    phase: 'AWAITING_BURN',
    pendingBurn: { playerId, reason, continueTo, actionId },
  };
}

function claimResolved(state: HostGameState, challengerBurned: boolean): HostGameState {
  const pending = state.pendingAction;
  if (!pending) {
    return state;
  }

  if (!challengerBurned) {
    return nextTurnState({ ...state, pendingChallenge: null, pendingBurn: null });
  }

  switch (pending.actionType) {
    case 'KIRAYA_COLLECTION':
      return nextTurnState(applyRupees({ ...state, pendingChallenge: null, pendingBurn: null }, pending.actorId, 3));
    case 'ZARDAAR_JUGAAD': {
      const drawn = drawCards(state, 2);
      return {
        ...drawn.state,
        phase: 'AWAITING_JUGAAD_RETURN',
        pendingAction: pending,
        pendingChallenge: null,
        pendingBurn: null,
        pendingJugaad: { playerId: pending.actorId, drawnCards: drawn.cards },
      };
    }
    case 'BHAI_KA_SCENE':
    case 'POLICE_WALA_RAID':
    case 'RISHTEDAAR_HELP':
      return {
        ...state,
        phase: 'CHALLENGE_WINDOW',
        pendingChallenge: null,
        pendingBurn: null,
        pendingAction: pending,
        pendingBlock: pending.blockable ? state.pendingBlock : null,
      };
    default:
      return nextTurnState({ ...state, pendingChallenge: null, pendingBurn: null });
  }
}

function resolveBlockOutcome(state: HostGameState, passed: boolean): HostGameState {
  const pending = state.pendingAction;
  if (!pending) {
    return state;
  }
  if (!passed) {
    return claimResolved(state, false);
  }

  switch (pending.actionType) {
    case 'RISHTEDAAR_HELP':
      return nextTurnState(state);
    case 'KIRAYA_COLLECTION':
      return nextTurnState(applyRupees(state, pending.actorId, 3));
    case 'POLICE_WALA_RAID': {
      const targetId = pending.targetId;
      if (!targetId) {
        return nextTurnState(state);
      }
      const target = state.playersById[targetId];
      const stolen = Math.min(2, target?.rupees ?? 0);
      return nextTurnState(applyRupees(applyRupees(state, pending.actorId, stolen), targetId, -stolen));
    }
    case 'BHAI_KA_SCENE':
      return setBurn(state, pending.targetId!, 'assassinate', 'continue_action', pending.actionId);
    case 'ZARDAAR_JUGAAD': {
      const drawn = drawCards(state, 2);
      return {
        ...drawn.state,
        phase: 'AWAITING_JUGAAD_RETURN',
        pendingAction: pending,
        pendingChallenge: null,
        pendingBurn: null,
        pendingJugaad: { playerId: pending.actorId, drawnCards: drawn.cards },
      };
    }
    case 'FULL_BEIZZATI':
      return setBurn(state, pending.targetId!, 'coup', 'turn_end', pending.actionId);
    case 'CHAI_PAISA':
      return nextTurnState(state);
    default:
      return state;
  }
}

function finishBurn(state: HostGameState, playerId: PlayerId, connectionId: string): HostGameState {
  const player = state.playersById[playerId];
  if (!player) {
    return state;
  }

  let nextState = removeConnectionFromPlayer(state, playerId, connectionId as never);
  if (!isPlayerAlive(nextState.playersById[playerId])) {
    nextState = eliminatePlayer(nextState, playerId);
  }

  const pendingChallenge = state.pendingChallenge;
  const pendingAction = state.pendingAction;
  if (!pendingAction) {
    return nextTurnState({ ...nextState, pendingBurn: null, pendingChallenge: null });
  }

  if (pendingChallenge?.source === 'action') {
    const challengerLost = playerId === pendingChallenge.challengerId;
    const accusedLost = playerId === pendingChallenge.claimantId;
    if (accusedLost) {
      return nextTurnState({ ...nextState, pendingBurn: null, pendingChallenge: null });
    }
    if (challengerLost) {
      return claimResolved({ ...nextState, pendingBurn: null, pendingChallenge: null }, true);
    }
  }

  if (pendingChallenge?.source === 'block') {
    const blockerLost = playerId === pendingChallenge.claimantId;
    const challengerLost = playerId === pendingChallenge.challengerId;
    if (blockerLost) {
      return resolveBlockOutcome({ ...nextState, pendingBurn: null, pendingChallenge: null }, true);
    }
    if (challengerLost) {
      return nextTurnState({ ...nextState, pendingBurn: null, pendingChallenge: null });
    }
  }

  return nextTurnState({ ...nextState, pendingBurn: null, pendingChallenge: null });
}

function applyDeclaredAction(state: HostGameState, action: ActionEvent): HostGameState {
  const actor = state.playersById[action.action.actorId];
  if (!actor || !isPlayerAlive(actor) || state.activePlayerId !== action.action.actorId) {
    return state;
  }

  switch (action.action.actionType) {
    case 'CHAI_PAISA':
      return nextTurnState(applyRupees(state, action.action.actorId, 1));
    case 'RISHTEDAAR_HELP':
      return openChallengeWindow(
        {
          ...applyRupees(state, action.action.actorId, 2),
          pendingAction: action.action,
        },
        'action',
        action.action.actorId,
        action.action.claimedRole,
        action.action.actionId,
      );
    case 'KIRAYA_COLLECTION':
      return openChallengeWindow({ ...state, pendingAction: action.action }, 'action', action.action.actorId, 'MALIK_SAAB', action.action.actionId);
    case 'BHAI_KA_SCENE':
      return openChallengeWindow(
        {
          ...applyRupees(state, action.action.actorId, -actionCosts.BHAI_KA_SCENE),
          pendingAction: action.action,
        },
        'action',
        action.action.actorId,
        'BHAI',
        action.action.actionId,
      );
    case 'POLICE_WALA_RAID':
      return openChallengeWindow({ ...state, pendingAction: action.action }, 'action', action.action.actorId, 'POLICE_WALA', action.action.actionId);
    case 'ZARDAAR_JUGAAD':
      return openChallengeWindow({ ...state, pendingAction: action.action }, 'action', action.action.actorId, 'ZARDAAR_CHOR', action.action.actionId);
    case 'FULL_BEIZZATI':
      return setBurn(
        {
          ...applyRupees(state, action.action.actorId, -actionCosts.FULL_BEIZZATI),
          pendingAction: action.action,
        },
        action.action.targetId!,
        'full-beizzati',
        'turn_end',
        action.action.actionId,
      );
    default:
      return state;
  }
}

export function createActionEvent(actorId: PlayerId, actionType: PendingAction['actionType'], targetId: PlayerId | null = null): ActionEvent {
  const claimedRole = actionRequirements[actionType];
  return {
    type: 'DECLARE_ACTION',
    action: {
      actionId: createActionId(),
      actorId,
      actionType,
      targetId,
      claimedRole,
      claimRole: claimedRole,
      cost: actionCosts[actionType],
      challengeable: claimedRole !== null || actionType === 'RISHTEDAAR_HELP' || actionType === 'FULL_BEIZZATI',
      blockable: actionType in blockRequirements,
    },
  };
}

export function reducer(state: HostGameState, event: GameEvent): HostGameState {
  if (event.type === 'START_GAME') {
    const shuffledDeck = deckFor(state.roomCode, state.gameId);
    const playersEntries = Object.entries(state.playersById);
    let deckIndex = 0;

    const playersById = Object.fromEntries(
      playersEntries.map(([playerId, player]) => {
        const drawn = shuffledDeck.slice(deckIndex, deckIndex + 2);
        deckIndex += 2;
        const nextPlayer: PlayerState = {
          ...createBasePlayer(toPlayerId(playerId), player.name),
          clientNonce: player.clientNonce,
          rupees: 2,
          hiddenConnections: drawn,
          revealedConnections: [],
          connected: player.connected,
          eliminated: drawn.length === 0,
        };
        return [playerId, nextPlayer];
      }),
    ) as HostGameState['playersById'];

    return {
      ...state,
      phase: 'TURN_START',
      playersById,
      deck: shuffledDeck.slice(deckIndex),
      discardPile: [],
      activePlayerId: state.turnOrder[0] ?? null,
      pendingAction: null,
      pendingChallenge: null,
      pendingBlock: null,
      pendingBurn: null,
      pendingJugaad: null,
      winnerId: null,
    };
  }

  if (event.type === 'DECLARE_ACTION') {
    if (validateActionEvent(state, event).length > 0) {
      return state;
    }
    return applyDeclaredAction(state, event);
  }

  if (state.phase === 'GAME_OVER') {
    return state;
  }

  switch (event.type) {
    case 'CHALLENGE': {
      if (state.phase !== 'CHALLENGE_WINDOW' || !state.pendingAction) {
        return state;
      }
      const challengerId = event.challengerId;
      const claimedRole = state.pendingChallenge?.claimedRole ?? state.pendingAction.claimedRole;
      const accusedId = state.pendingChallenge?.source === 'block' ? state.pendingBlock?.blockerId ?? null : state.pendingAction.actorId;
      if (!accusedId || !claimedRole) {
        return state;
      }
      const accused = state.playersById[accusedId];
      const success = Boolean(accused?.hiddenConnections.some((card) => card.role === claimedRole));
      return {
        ...state,
        pendingChallenge: {
          actionId: state.pendingAction.actionId,
          source: state.pendingChallenge?.source ?? 'action',
          claimantId: accusedId,
          challengerId,
          claimedRole,
          eligibleChallengers: state.turnOrder.filter((id) => id !== accusedId),
          responses: {},
        },
        pendingBurn: {
          playerId: success ? challengerId : accusedId,
          reason: 'challenge-loss',
          continueTo: 'continue_action',
          actionId: state.pendingAction.actionId,
        },
        phase: 'AWAITING_BURN',
      };
    }
    case 'PASS_CHALLENGE': {
      if (state.phase !== 'CHALLENGE_WINDOW' || !state.pendingAction) {
        return state;
      }
      switch (state.pendingAction.actionType) {
        case 'KIRAYA_COLLECTION':
          return nextTurnState(applyRupees(state, state.pendingAction.actorId, 3));
        case 'ZARDAAR_JUGAAD': {
          const drawn = drawCards(state, 2);
          return {
            ...drawn.state,
            phase: 'AWAITING_JUGAAD_RETURN',
            pendingAction: state.pendingAction,
            pendingChallenge: null,
            pendingBurn: null,
            pendingJugaad: { playerId: state.pendingAction.actorId, drawnCards: drawn.cards },
          };
        }
        case 'RISHTEDAAR_HELP':
        case 'BHAI_KA_SCENE':
        case 'POLICE_WALA_RAID':
        default:
          return state;
      }
    }
    case 'BLOCK': {
      const block = event.block;
      if (state.phase !== 'CHALLENGE_WINDOW' || !state.pendingAction) {
        return state;
      }
      const required = blockRequirements[state.pendingAction.actionType];
      if (required && required !== block.blockingRole) {
        return state;
      }
      return {
        ...state,
        pendingBlock: block,
        pendingChallenge: {
          actionId: block.actionId,
          source: 'block',
          claimantId: block.blockerId,
          challengerId: null,
          claimedRole: block.blockingRole,
          eligibleChallengers: block.eligibleChallengers,
          responses: block.responses,
        },
        phase: 'CHALLENGE_WINDOW',
      };
    }
    case 'PASS_BLOCK': {
      if (state.phase !== 'CHALLENGE_WINDOW' || !state.pendingAction) {
        return state;
      }
      return resolveBlockOutcome(state, true);
    }
    case 'CHOOSE_CONNECTION_TO_BURN': {
      if (state.phase !== 'AWAITING_BURN' || !state.pendingBurn) {
        return state;
      }
      return finishBurn(state, event.playerId, event.connectionId);
    }
    case 'JUGAAD_RETURN': {
      if (state.phase !== 'AWAITING_JUGAAD_RETURN' || !state.pendingJugaad) {
        return state;
      }
      const actor = state.playersById[event.playerId];
      if (!actor) {
        return state;
      }
      const keepIds = new Set(event.connectionIds);
      const combined = [...actor.hiddenConnections, ...state.pendingJugaad.drawnCards];
      const kept = combined.filter((card) => keepIds.has(card.id));
      if (kept.length !== 2) {
        return state;
      }
      const returned = combined.filter((card) => !keepIds.has(card.id));
      const updatedActor: PlayerState = {
        ...actor,
        hiddenConnections: kept,
        revealedConnections: actor.revealedConnections,
      };
      const nextState = discardCards(replacePlayer({ ...state, pendingJugaad: null }, updatedActor), returned);
      return nextTurnState({ ...nextState, phase: 'TURN_START' });
    }
    default:
      return state;
  }
}

export { createHostGameState } from './rules';
