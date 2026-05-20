import { describe, expect, it } from 'vitest';
import { reducer, createActionEvent } from '../src/game/reducer';
import { card, declare, passChallenge, turnState, turnState3 } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer log and seq', () => {
  it('reducer: accepted action increments seq predictably', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, createActionEvent(toPlayerId('p1'), 'CHAI_PAISA'));
    expect(next.seq).toBe(state.seq + 2);
  });

  it('reducer: passing through challenge and block windows produces readable ordered log entries', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('POLICE_WALA'), card('MUMMA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
    const blocked = reducer(declared, {
      type: 'BLOCK',
      block: {
        actionId: declared.pendingAction!.actionId,
        blockerId: toPlayerId('p2'),
        blockingRole: 'MALIK_SAAB',
        targetId: null,
        eligibleChallengers: [toPlayerId('p1'), toPlayerId('p3')],
        responses: {},
      },
    });
    const afterPass = passChallenge(blocked, toPlayerId('p3'));
    expect(afterPass.log.map((entry) => entry.text)).toContain('Rishtedaar Help');
    expect(afterPass.log.map((entry) => entry.text)).toContain('Use Setting');
    expect(afterPass.log.map((entry) => entry.text)).toContain('Let It Slide');
  });

  it('reducer: Chai Paisa log does not duplicate or hide turn advancement', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, createActionEvent(toPlayerId('p1'), 'CHAI_PAISA'));
    expect(next.log.map((entry) => entry.text).slice(-2)).toEqual(['Chai Paisa', 'Bob turn']);
  });

  it('reducer: Full Beizzati log shows payment, target burn prompt, and final burn result clearly', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2);
    const declared = reducer(state, createActionEvent(toPlayerId('p1'), 'FULL_BEIZZATI', toPlayerId('p2')));
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.log.map((entry) => entry.text).slice(-2)).toContain('Burn Connection');
    expect(burned.log.map((entry) => entry.text)).toContain('Full Beizzati');
  });
});
