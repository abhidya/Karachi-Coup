import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { card, declare, turnState, turnState3 } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer log', () => {
  it('reducer: accepted Chai Paisa increments seq once and logs Chai Paisa', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, { type: 'DECLARE_ACTION', action: { actionId: 'action-1', actorId: toPlayerId('p1'), actionType: 'CHAI_PAISA', targetId: null, claimedRole: null, cost: 0, challengeable: false, blockRoles: [], needsTarget: false } });
    expect(next.seq).toBe(state.seq + 1);
    expect(next.log.at(-2)?.text ?? next.log.at(-1)?.text).toContain('takes Chai Paisa');
  });

  it('reducer: turn advancement after Chai Paisa is visible in state and not lost', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    const next = reducer(state, { type: 'DECLARE_ACTION', action: { actionId: 'action-1', actorId: toPlayerId('p1'), actionType: 'CHAI_PAISA', targetId: null, claimedRole: null, cost: 0, challengeable: false, blockRoles: [], needsTarget: false } });
    expect(next.activePlayerId).toBe(toPlayerId('p2'));
    expect(next.log.some((entry) => entry.text.includes('turn'))).toBe(true);
  });

  it('reducer: Kiraya Collection pass logs action resolution clearly', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'KIRAYA_COLLECTION');
    const afterFirstPass = reducer(declared, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p2') });
    const afterAllPass = reducer(afterFirstPass, { type: 'PASS_CHALLENGE', playerId: toPlayerId('p3') });
    expect(afterAllPass.log.some((entry) => entry.text.includes('Alice claims Kiraya Collection as Malik Saab.'))).toBe(true);
    expect(afterAllPass.log.some((entry) => entry.text.includes('Bob lets it slide.'))).toBe(true);
  });

  it('reducer: burn flow logs Burn Connection and then advances turn', () => {
    const declared = declare(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]), 'KIRAYA_COLLECTION');
    const challenged = reducer(declared, { type: 'CHALLENGE', challengerId: toPlayerId('p2') });
    const burned = reducer(challenged, { type: 'CHOOSE_CONNECTION_TO_BURN', playerId: toPlayerId('p2'), connectionId: challenged.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id as never });
    expect(burned.log.some((entry) => entry.text.includes('Bob calls bakwaas.'))).toBe(true);
    expect(burned.log.some((entry) => entry.text.includes('Alice proves Malik Saab. Bob burns a Connection.'))).toBe(true);
  });

  it('reducer: nested transition helpers do not drop previous log entries', () => {
    const declared = declare(turnState3([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], [card('ZARDAAR_CHOR'), card('MALIK_SAAB')]), 'RISHTEDAAR_HELP');
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
    expect(blocked.log.some((entry) => entry.text.includes('Alice claims Rishtedaar Help.'))).toBe(true);
    expect(blocked.log.some((entry) => entry.text.includes('Bob uses Setting: Malik Saab.'))).toBe(true);
  });
});
