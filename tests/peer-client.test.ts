import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createHostGameState } from '../src/game/rules';
import { toPublicGameState, toPrivatePlayerState } from '../src/game/snapshots';
import { toPlayerId } from '../src/game/utils';

const CLIENT_ACTION = 'karachi-coup-client-v1';
const SERVER_ACTION = 'karachi-coup-server-v1';

const trystero = vi.hoisted(() => {
  class FakeAction {
    sent: { data: unknown; options?: { target?: string | string[] | null } }[] = [];
    onMessage: ((data: unknown, context: { peerId: string }) => void | Promise<void>) | null = null;
    onReceiveProgress = null;

    async send(data: unknown, options?: { target?: string | string[] | null }) {
      this.sent.push({ data, options });
    }
  }

  class FakeRoom {
    actions = new Map<string, FakeAction>();
    onPeerJoin: ((peerId: string) => void) | null = null;
    onPeerLeave: ((peerId: string) => void) | null = null;
    onPeerStream = null;
    onPeerTrack = null;

    makeAction(namespace: string) {
      let action = this.actions.get(namespace);
      if (!action) {
        action = new FakeAction();
        this.actions.set(namespace, action);
      }
      return action;
    }

    emitAction(namespace: string, data: unknown, peerId = 'host-peer') {
      void this.actions.get(namespace)?.onMessage?.(data, { peerId });
    }

    peerJoin(peerId: string) {
      this.onPeerJoin?.(peerId);
    }

    peerLeave(peerId: string) {
      this.onPeerLeave?.(peerId);
    }

    async leave() {}
    isPassive() { return false; }
    getPeers() { return {}; }
    addStream() { return []; }
    removeStream() {}
    addTrack() { return []; }
    removeTrack() {}
    replaceTrack() { return []; }
    async ping() { return 1; }
  }

  const rooms: FakeRoom[] = [];
  return {
    rooms,
    joinRoom: vi.fn((_config: unknown, _roomId: string) => {
      const room = new FakeRoom();
      rooms.push(room);
      return room;
    }),
    selfId: 'client-self',
  };
});

vi.mock('trystero', () => ({
  joinRoom: trystero.joinRoom,
  selfId: trystero.selfId,
}));


function installStorage(kind: 'localStorage' | 'sessionStorage') {
  const store = new Map<string, string>();
  Object.defineProperty(window, kind, {
    configurable: true,
    value: {
      get length() {
        return store.size;
      },
      clear() {
        store.clear();
      },
      getItem(key: string) {
        return store.get(key) ?? null;
      },
      key(index: number) {
        return Array.from(store.keys())[index] ?? null;
      },
      removeItem(key: string) {
        store.delete(key);
      },
      setItem(key: string, value: string) {
        store.set(key, value);
      },
    },
  });
}

import { createPeerClient } from '../src/network/peerClient';

function clientMessages(room = trystero.rooms[0]!) {
  return room.makeAction(CLIENT_ACTION).sent;
}

function syncFromHost(room = trystero.rooms[0]!, roomCode = 'ROOMC1', playerId = 'ROOMC1-PLAYER') {
  const state = createHostGameState(roomCode, `game-${roomCode}`);
  const typedPlayerId = toPlayerId(playerId);
  const stateWithPlayer = {
    ...state,
    playersById: {
      ...state.playersById,
      [typedPlayerId]: {
        id: typedPlayerId,
        name: 'Ari',
        rupees: 0,
        hiddenConnections: [],
        revealedConnections: [],
        burnedConnections: [],
        connected: true,
        eliminated: false,
        clientNonce: 'nonce' as never,
      },
    },
    turnOrder: [typedPlayerId],
  };
  room.emitAction(SERVER_ACTION, { type: 'WELCOME', roomCode, playerId: typedPlayerId }, 'host-peer');
  room.emitAction(SERVER_ACTION, { type: 'PUBLIC_STATE', state: toPublicGameState(stateWithPlayer) }, 'host-peer');
  room.emitAction(SERVER_ACTION, { type: 'PRIVATE_STATE', state: toPrivatePlayerState(stateWithPlayer, typedPlayerId) }, 'host-peer');
}

describe('peer client', () => {
  beforeEach(() => {
    trystero.rooms.length = 0;
    installStorage('localStorage');
    installStorage('sessionStorage');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('sends JOIN through the room and targets the host after welcome', async () => {
    const client = await createPeerClient('ROOMC1', { displayName: 'Ari' });
    const room = trystero.rooms[0]!;

    expect(clientMessages(room)[0]?.data).toMatchObject({ type: 'JOIN', roomCode: 'ROOMC1', displayName: 'Ari' });

    room.peerJoin('host-peer');
    expect(clientMessages(room).at(-1)?.data).toMatchObject({ type: 'JOIN', roomCode: 'ROOMC1', displayName: 'Ari' });
    expect(clientMessages(room).at(-1)?.options).toEqual({ target: 'host-peer' });

    syncFromHost(room);
    expect(client.snapshot.phase).toBe('synced');

    client.requestResync();
    expect(clientMessages(room).at(-1)).toMatchObject({ data: { type: 'REQUEST_RESYNC' }, options: { target: 'host-peer' } });
  });

  it('does not create one transport room per resync click while waiting for host', async () => {
    const client = await createPeerClient('ROOMC2', { displayName: 'Ari' });
    const room = trystero.rooms[0]!;

    for (let index = 0; index < 8; index += 1) {
      client.requestResync();
    }

    expect(trystero.rooms).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1_999);
    expect(trystero.rooms).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(1);
    expect(trystero.rooms).toHaveLength(1);
    expect(clientMessages(room).some((message) => (message.data as { type?: string }).type === 'JOIN')).toBe(true);
    client.destroy();
  });

  it('coalesces repeated resync clicks while a resync is pending', async () => {
    const client = await createPeerClient('ROOMC3', { displayName: 'Ari' });
    const room = trystero.rooms[0]!;
    room.peerJoin('host-peer');
    syncFromHost(room, 'ROOMC3', 'ROOMC3-PLAYER');

    const before = clientMessages(room).length;
    for (let index = 0; index < 6; index += 1) {
      client.requestResync();
    }

    const sentAfter = clientMessages(room).slice(before);
    expect(sentAfter).toHaveLength(1);
    expect(sentAfter[0]).toMatchObject({ data: { type: 'REQUEST_RESYNC' }, options: { target: 'host-peer' } });
  });
});
