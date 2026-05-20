import { describe, expect, it } from 'vitest';
import { reducer } from '../src/game/reducer';
import { card, turnState } from './_helpers';
import { toPlayerId } from '../src/game/utils';

describe('reducer elimination', () => {
  it('burn: player chooses one hidden Connection to burn', () => {
    const state = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    expect(state.phase).toBe('AWAITING_BURN');
  });

  it('burn: burned Connection becomes public and revealed', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.playersById[toPlayerId('p2')]!.revealedConnections.length).toBe(1);
  });

  it('burn: burned Connection no longer counts as hidden influence', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.playersById[toPlayerId('p2')]!.hiddenConnections).toHaveLength(1);
  });

  it('burn: player with one remaining hidden Connection stays alive after burning one of two', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.playersById[toPlayerId('p2')]!.eliminated).toBe(false);
  });

  it('burn: player with zero hidden Connections is eliminated', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.playersById[toPlayerId('p2')]!.eliminated).toBe(true);
  });

  it('burn: eliminated player is skipped in turn order', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.phase).toBe('GAME_OVER');
  });

  it('winner: game continues when more than one player has hidden Connections', () => {
    const state = turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA'), card('POLICE_WALA')]);
    expect(state.phase).toBe('TURN_START');
  });

  it('winner: last player with at least one hidden Connection wins', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.phase).toBe('GAME_OVER');
  });

  it('winner: game enters GAME_OVER when only one player remains alive', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.phase).toBe('GAME_OVER');
  });

  it('winner: final public state includes winnerId', () => {
    const declared = reducer(turnState([card('MALIK_SAAB'), card('BHAI')], [card('MUMMA')], 7, 2), {
      type: 'DECLARE_ACTION',
      action: { actionId: 'a', actorId: toPlayerId('p1'), actionType: 'FULL_BEIZZATI', targetId: toPlayerId('p2'), claimedRole: null, cost: 7, challengeable: false, blockRoles: [], needsTarget: true },
    });
    const burned = reducer(declared, {
      type: 'CHOOSE_CONNECTION_TO_BURN',
      playerId: toPlayerId('p2'),
      connectionId: declared.playersById[toPlayerId('p2')]!.hiddenConnections[0]!.id,
    });
    expect(burned.winnerId).toBe(toPlayerId('p1'));
  });
});
