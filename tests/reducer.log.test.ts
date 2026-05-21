import { describe, expect, it } from 'vitest';
import { createActionEvent, reducer } from '../src/game/reducer';
import { card, challenge, declare, passChallenge, turnState, turnState3, burn } from './_helpers';
import { toPlayerId } from '../src/game/utils';

function logTexts(state: ReturnType<typeof reducer>) {
  return state.log.map((entry) => entry.text);
}

describe('reducer logs and seq', () => {
  it('reducer: accepted Chai Paisa increments seq once and logs Chai Paisa', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'CHAI_PAISA'));

    expect(next.seq).toBe(1);
    expect(logTexts(next)).toContain('Chai Paisa');
  });

  it('reducer: turn advancement after Chai Paisa is visible in state and not lost', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, createActionEvent(state.activePlayerId!, 'CHAI_PAISA'));

    expect(next.activePlayerId).toBe(toPlayerId('p2'));
    expect(logTexts(next)).toEqual(expect.arrayContaining(['Chai Paisa', 'Bob turn']));
  });

  it('reducer: Kiraya Collection pass logs action resolution clearly', () => {
    const state = turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]);
    const declared = declare(state, 'KIRAYA_COLLECTION');
    const afterFirstPass = passChallenge(declared, toPlayerId('p2'));
    const resolved = passChallenge(afterFirstPass, toPlayerId('p3'));

    expect(logTexts(resolved)).toEqual(expect.arrayContaining(['Let It Slide', 'Kiraya Collection', 'Bob turn']));
  });

  it('reducer: burn flow logs Burn Connection and then advances turn', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2);
    const declared = reducer(state, createActionEvent(state.activePlayerId!, 'FULL_BEIZZATI', toPlayerId('p2')));
    const burned = burn(declared, toPlayerId('p2'), declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id);

    expect(logTexts(burned)).toEqual(expect.arrayContaining(['Full Beizzati', 'Burn Connection', 'Bob turn']));
  });

  it('reducer: nested transition helpers do not drop previous log entries', () => {
    const state = turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]);
    const declared = declare(state, 'KIRAYA_COLLECTION');
    const challenged = challenge(declared, toPlayerId('p2'));
    const burned = burn(challenged, toPlayerId('p2'), challenged.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id);

    expect(logTexts(burned)).toEqual(expect.arrayContaining(['Call Bakwaas', 'Burn Connection']));
  });
});
