import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ACTION_TYPES, type PublicGameState } from '../src/game/types';
import { toConnectionCardId, toGameId, toPlayerId, toRoomCode } from '../src/game/utils';
import { actionMetaParts, publicPlayerStatus } from '../src/ui/gameGuidance';
import { GameScreen } from '../src/ui/screens/GameScreen';
import { LobbyScreen } from '../src/ui/screens/LobbyScreen';

const p1 = toPlayerId('p1');
const p2 = toPlayerId('p2');

function publicState(overrides: Partial<PublicGameState> = {}): PublicGameState {
  return {
    roomCode: toRoomCode('ROOM1'),
    gameId: toGameId('game-1'),
    seq: 1,
    phase: 'TURN_START',
    activePlayerId: p1,
    players: [
      { id: p1, name: 'Ari', rupees: 2, hiddenConnectionCount: 2, revealedConnections: [], connected: true, eliminated: false, isTurn: true },
      { id: p2, name: 'Bea', rupees: 2, hiddenConnectionCount: 2, revealedConnections: [], connected: true, eliminated: false, isTurn: false },
    ],
    turnOrder: [p1, p2],
    log: [],
    currentScene: 'Ari is choosing a scene.',
    pendingAction: null,
    pendingChallenge: null,
    pendingBlock: null,
    pendingBurn: null,
    winnerId: null,
    ...overrides,
  };
}

describe('integrated gameplay guidance UI', () => {
  it('describes cost, target, role claim, Bakwaas, and Setting for every action', () => {
    for (const actionType of ACTION_TYPES) {
      const meta = actionMetaParts(actionType).join(' · ');
      expect(meta).toMatch(/Cost \d+₹/);
      expect(meta).toMatch(/target/i);
      expect(meta).toMatch(/claim/i);
      expect(meta).toMatch(/Bakwaas/);
      expect(meta).toMatch(/Setting/);
    }
  });

  it('marks public players with response/waiting statuses from table state', () => {
    const state = publicState({
      phase: 'CHALLENGE_WINDOW',
      pendingChallenge: {
        source: 'action',
        kind: 'action',
        actionId: 'a1',
        claimantId: p1,
        claimedRole: 'MALIK_SAAB',
        challengerId: null,
        eligibleChallengers: [p2],
        responses: {},
      },
    });

    expect(publicPlayerStatus(state.players[0]!, state)).toEqual({ label: 'Claiming', tone: 'warn' });
    expect(publicPlayerStatus(state.players[1]!, state)).toEqual({ label: 'Can challenge', tone: 'warn' });
  });


  it('explains client connection errors instead of showing only waiting for sync', () => {
    const html = renderToStaticMarkup(
      React.createElement(LobbyScreen, {
        roomCode: 'U9VGH',
        roomLink: 'https://abhidya.github.io/Karachi-Coup/#/join?room=U9VGH',
        currentScene: 'Waiting for sync',
        players: [],
        phaseLabel: 'Lobby',
        turnOwnerName: 'Waiting',
        mode: 'client',
        connectionIssue: 'Could not reach the room host. Ask the host to keep their tab open, then retry or create a new room.',
        onStartGame: () => undefined,
        onResetRoom: () => undefined,
        onRequestResync: () => undefined,
        onLeaveRoom: () => undefined,
        onOpenRules: () => undefined,
      }),
    );

    expect(html).toContain('Could not reach the room host');
    expect(html).toContain('Ask the host to keep their tab open');
  });

  it('renders table instruction, next step, action guidance, and response guidance together', () => {
    const state = publicState();
    const html = renderToStaticMarkup(
      React.createElement(GameScreen, {
        currentScene: state.currentScene,
        phaseLabel: 'Turn Start',
        publicState: state,
        tableInstruction: 'It is your turn. Choose one legal scene to declare.',
        waitingContext: 'The table is waiting on your action declaration.',
        nextStep: 'Choose a target when required, then the host opens response windows.',
        actionGuidance: 'Each card shows cost, target, role claim, Bakwaas, and Setting consequences.',
        responseGuidance: 'Response buttons appear here when you are the required responder.',
        publicPlayers: state.players,
        activePlayerName: 'Ari',
        privateState: {
          roomCode: state.roomCode,
          gameId: state.gameId,
          seq: state.seq,
          phase: 'TURN_START',
          playerId: p1,
          hiddenConnections: [{ id: toConnectionCardId('c1'), role: 'MALIK_SAAB' }],
          rupees: 2,
          connected: true,
          eliminated: false,
          isTurn: true,
          availableActions: ['CHAI_PAISA'],
          prompt: null,
          pendingAction: null,
          pendingChallenge: null,
          pendingBlock: null,
          pendingBurn: null,
          pendingJugaad: null,
        },
        prompt: null,
        pendingActionType: null,
        pendingTargetId: '',
        livingOpponents: [state.players[1]!],
        publicLog: [],
        mode: 'host',
        jugaadSelectedIds: [],
        forcedActionType: null,
        onActionClick: () => undefined,
        onChallenge: () => undefined,
        onPassChallenge: () => undefined,
        onPassBlock: () => undefined,
        onChooseBlockRole: () => undefined,
        onChooseBurn: () => undefined,
        onToggleJugaad: () => undefined,
        onSubmitJugaad: () => undefined,
        onSelectTarget: () => undefined,
        onConfirmTarget: () => undefined,
        onCancelTarget: () => undefined,
        onLeaveRoom: () => undefined,
        onOpenRules: () => undefined,
      }),
    );

    expect(html).toContain('It is your turn. Choose one legal scene to declare.');
    expect(html).toContain('Next: Choose a target when required');
    expect(html).toContain('Each card shows cost, target, role claim, Bakwaas, and Setting consequences.');
    expect(html).toContain('Response buttons appear here when you are the required responder.');
  });
});
