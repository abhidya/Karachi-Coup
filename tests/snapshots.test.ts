import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { toPublicGameState, toPrivatePlayerState } from '../src/game/snapshots';
import { card, declare, lobbyState, passChallenge, turnState, turnState3 } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('snapshots', () => {
  it('snapshot: public state includes player names, rupees, hidden Connection counts, revealed Connections, turn marker, and elimination status', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const publicState = toPublicGameState(state);
    expect(publicState.players[0]?.name).toBe('Player 1');
    expect(publicState.players[0]?.rupees).toBe(2);
    expect(publicState.players[0]?.hiddenConnectionCount).toBe(2);
    expect(publicState.players[0]?.isTurn).toBe(true);
  });

  it('snapshot: public state does not include deck', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    expect(Object.keys(toPublicGameState(state))).not.toContain('deck');
  });

  it('snapshot: public state does not include any unrevealed hidden Connection names', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const publicState = toPublicGameState(state);
    expect(publicState.players.every((player) => player.revealedConnections.length === 0)).toBe(true);
  });

  it('snapshot: public state does not show a successfully proven card as burned influence', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    const publicState = toPublicGameState(challenged);
    expect(publicState.players[0]?.revealedConnections).toEqual([]);
  });

  it('public scene: Challenge Window names actor and action', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'KIRAYA_COLLECTION');
    const publicState = toPublicGameState(declared);
    expect(publicState.currentScene).toContain('Alice');
    expect(publicState.currentScene).toContain('Kiraya Collection');
  });

  it('public scene: Block Window names blocker options/action', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const publicState = toPublicGameState(declared);
    expect(publicState.currentScene).toContain('Use Setting');
    expect(publicState.currentScene).toContain('Rishtedaar Help');
  });

  it('public scene: Burn prompt names player who must burn', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    const publicState = toPublicGameState(challenged);
    expect(publicState.currentScene).toContain('Burn');
    expect(publicState.currentScene).toContain('Bob');
  });

  it('snapshot: private state for Player 1 includes only Player 1 hidden Connections', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.playerId).toBe(toPlayerId('p1'));
    expect(privateState.hiddenConnections).toHaveLength(2);
  });

  it('snapshot: private state for Player 1 does not include Player 2 hidden Connections', () => {
    const state = reducer(lobbyState(2), { type: 'START_GAME' });
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.hiddenConnections).not.toContainEqual(state.playersById[toPlayerId('p2')]!.hiddenConnections[0]);
  });

  it('snapshot: private state includes legal actions for the active player', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.availableActions).toContain('CHAI_PAISA');
    expect(privateState.availableActions).toContain('FULL_BEIZZATI');
  });

  it('snapshot: private state shows mandatory Full Beizzati as the only action when active player has 10 or more rupees', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 10, 2);
    const privateState = toPrivatePlayerState(state, toPlayerId('p1'));
    expect(privateState.availableActions).toEqual(['FULL_BEIZZATI']);
  });

  it('snapshot: private state includes Call Bakwaas prompt only for eligible challengers', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challengerState = toPrivatePlayerState(declared, toPlayerId('p2'));
    const claimantState = toPrivatePlayerState(declared, toPlayerId('p1'));
    expect(challengerState.prompt?.type).toBe('CHALLENGE_ACTION');
    expect(claimantState.prompt).toBeNull();
  });

  it('private prompt: Kiraya Collection gives other players Call Bakwaas / Let It Slide', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'KIRAYA_COLLECTION');
    expect(toPrivatePlayerState(declared, toPlayerId('p2')).prompt?.type).toBe('CHALLENGE_ACTION');
    expect(toPrivatePlayerState(declared, toPlayerId('p3')).prompt?.type).toBe('CHALLENGE_ACTION');
    expect(toPrivatePlayerState(declared, toPlayerId('p1')).prompt).toBeNull();
  });

  it('snapshot: private state includes Use Setting prompt only for eligible blocker', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const blockerState = toPrivatePlayerState(declared, toPlayerId('p2'));
    const ineligibleState = toPrivatePlayerState(declared, toPlayerId('p1'));
    expect(blockerState.prompt?.type).toBe('BLOCK_ACTION');
    expect(ineligibleState.prompt).toBeNull();
  });

  it('private prompt: Rishtedaar Help gives eligible blockers Use Setting Malik Saab', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const blockerState = toPrivatePlayerState(openBlock, toPlayerId('p2'));
    const otherState = toPrivatePlayerState(openBlock, toPlayerId('p1'));
    expect(blockerState.prompt?.type).toBe('BLOCK_ACTION');
    expect(blockerState.prompt?.legalBlockRoles).toContain('MALIK_SAAB');
    expect(otherState.prompt).toBeNull();
  });

  it('private prompt: Police Wala Raid gives block prompt only to target', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const targetState = toPrivatePlayerState(openBlock, toPlayerId('p2'));
    const otherState = toPrivatePlayerState(openBlock, toPlayerId('p3'));
    expect(targetState.prompt?.type).toBe('BLOCK_ACTION');
    expect(otherState.prompt).toBeNull();
  });

  it('private prompt: Police Wala Raid gives only target Use Setting Police Wala and Zardaar Chor', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'POLICE_WALA_RAID', toPlayerId('p2'));
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const targetState = toPrivatePlayerState(openBlock, toPlayerId('p2'));
    const otherState = toPrivatePlayerState(openBlock, toPlayerId('p3'));
    expect(targetState.prompt?.type).toBe('BLOCK_ACTION');
    expect(targetState.prompt?.legalBlockRoles).toEqual(['POLICE_WALA', 'ZARDAAR_CHOR']);
    expect(otherState.prompt).toBeNull();
  });

  it('private prompt: Bhai Ka Scene gives Mumma block prompt only to target', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const targetState = toPrivatePlayerState(openBlock, toPlayerId('p2'));
    const otherState = toPrivatePlayerState(openBlock, toPlayerId('p3'));
    expect(targetState.prompt?.type).toBe('BLOCK_ACTION');
    expect(otherState.prompt).toBeNull();
  });

  it('private prompt: Bhai Ka Scene gives only target Use Setting Mumma', () => {
    const declared = declare(turnState3([card('BHAI'), card('MALIK_SAAB')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')], 5, 2, 2), 'BHAI_KA_SCENE', toPlayerId('p2'));
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const targetState = toPrivatePlayerState(openBlock, toPlayerId('p2'));
    const otherState = toPrivatePlayerState(openBlock, toPlayerId('p1'));
    expect(targetState.prompt?.type).toBe('BLOCK_ACTION');
    expect(targetState.prompt?.legalBlockRoles).toEqual(['MUMMA']);
    expect(otherState.prompt).toBeNull();
  });

  it('private prompt: block challenger prompt is sent to living non-blockers', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const blocked = reducer(openBlock, {
      type: 'BLOCK',
      block: {
        actionId: openBlock.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    const challengerState = toPrivatePlayerState(blocked, toPlayerId('p3'));
    expect(challengerState.prompt?.type).toBe('CHALLENGE_BLOCK');
  });

  it('private prompt: block claim gives non-blockers Call Bakwaas / Let It Slide', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const openBlock = passChallenge(passChallenge(declared, toPlayerId('p2')), toPlayerId('p3'));
    const blocked = reducer(openBlock, {
      type: 'BLOCK',
      block: {
        actionId: openBlock.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    expect(toPrivatePlayerState(blocked, toPlayerId('p3')).prompt?.type).toBe('CHALLENGE_BLOCK');
    expect(toPrivatePlayerState(blocked, toPlayerId('p1')).prompt).toBeNull();
  });

  it('private prompt: burn prompt is sent only to burning player', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    const burning = toPrivatePlayerState(challenged, toPlayerId('p2'));
    const notBurning = toPrivatePlayerState(challenged, toPlayerId('p1'));
    expect(burning.prompt?.type).toBe('BURN_CONNECTION');
    expect(notBurning.prompt).toBeNull();
  });

  it('private prompt: burn appears only for burning player', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    expect(toPrivatePlayerState(challenged, toPlayerId('p2')).prompt?.type).toBe('BURN_CONNECTION');
    expect(toPrivatePlayerState(challenged, toPlayerId('p1')).prompt).toBeNull();
  });

  it('private prompt: Jugaad return prompt is sent only to Jugaad player', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const passed = reducer(declared, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p2') });
    const jugaadPlayer = toPrivatePlayerState(passed, toPlayerId('p1'));
    const otherPlayer = toPrivatePlayerState(passed, toPlayerId('p2'));
    expect(jugaadPlayer.prompt?.type).toBe('JUGAAD_RETURN');
    expect(otherPlayer.prompt).toBeNull();
  });

  it('private prompt: Jugaad return appears only for Jugaad player', () => {
    const declared = declare(turnState([card('ZARDAAR_CHOR'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'ZARDAAR_JUGAAD');
    const passed = reducer(declared, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p2') });
    expect(toPrivatePlayerState(passed, toPlayerId('p1')).prompt?.type).toBe('JUGAAD_RETURN');
    expect(toPrivatePlayerState(passed, toPlayerId('p2')).prompt).toBeNull();
  });

  it('snapshot: sequence number increases after accepted reducer events', () => {
    const next = reducer(lobbyState(2), { type: 'START_GAME' });
    expect(next.seq).toBeGreaterThan(0);
  });
});
