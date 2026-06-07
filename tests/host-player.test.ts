import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

    emitAction(namespace: string, data: unknown, peerId = 'remote-peer') {
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
    selfId: 'host-self',
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

import { createPeerHost } from '../src/network/peerHost';

function serverMessages(room = trystero.rooms[0]!) {
  return room.makeAction(SERVER_ACTION).sent;
}

describe('host player', () => {
  beforeEach(() => {
    trystero.rooms.length = 0;
    installStorage('localStorage');
    installStorage('sessionStorage');
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('host player: creating host room can add host as Player 1', async () => {
    const host = await createPeerHost('ROOMH1');

    const hostId = host.joinHostPlayer('Host');
    expect(host.snapshot.phase).toBe('ready');
    expect(host.snapshot.players[0]?.name).toBe('Host');
    expect(host.snapshot.players[0]?.playerId).toBe(hostId);
  });

  it('host player: host private state is available after start game', async () => {
    const host = await createPeerHost('ROOMH2');
    const room = trystero.rooms[0]!;
    const hostId = host.joinHostPlayer('Host');

    room.emitAction(CLIENT_ACTION, { type: 'JOIN', roomCode: 'ROOMH2', displayName: 'Guest', clientNonce: 'guest-nonce' });

    host.startGame();

    expect(host.snapshot.privateStates[hostId]?.hiddenConnections).toHaveLength(2);
    expect(host.snapshot.players[0]?.name).toBe('Host');
  });

  it('host player: host local intent is validated and reduced like remote intent', async () => {
    const host = await createPeerHost('ROOMH3');
    const room = trystero.rooms[0]!;
    const hostId = host.joinHostPlayer('Host');

    room.emitAction(CLIENT_ACTION, { type: 'JOIN', roomCode: 'ROOMH3', displayName: 'Guest', clientNonce: 'guest-nonce' });

    host.startGame();
    const remotePlayerId = host.snapshot.players[1]?.playerId;
    host.sendLocal({ type: 'DECLARE_ACTION', actionType: 'CHAI_PAISA' });

    expect(host.snapshot.players[0]?.rupees).toBe(3);
    expect(host.snapshot.publicState.activePlayerId).toBe(remotePlayerId ?? null);
    expect(host.snapshot.privateStates[hostId]?.isTurn).toBe(false);
  });

  it('host player: stale peer leave does not disconnect a rejoined player', async () => {
    const host = await createPeerHost('ROOMH4');
    const room = trystero.rooms[0]!;

    room.emitAction(CLIENT_ACTION, { type: 'JOIN', roomCode: 'ROOMH4', displayName: 'Guest', clientNonce: 'guest-nonce' }, 'remote-peer-old');
    const playerId = host.snapshot.players[0]?.playerId;

    room.emitAction(CLIENT_ACTION, { type: 'JOIN', roomCode: 'ROOMH4', displayName: 'Guest', clientNonce: 'guest-nonce' }, 'remote-peer-new');
    room.peerLeave('remote-peer-old');

    expect(host.snapshot.players).toHaveLength(1);
    expect(host.snapshot.players[0]?.playerId).toBe(playerId);
    expect(host.snapshot.players[0]?.connected).toBe(true);
  });

  it('host player: eager resync before join is ignored and later join still syncs', async () => {
    const host = await createPeerHost('ROOMH5');
    const room = trystero.rooms[0]!;

    room.emitAction(CLIENT_ACTION, { type: 'REQUEST_RESYNC' });
    expect(serverMessages(room)).toHaveLength(0);
    expect(host.snapshot.lastEvent).toContain('host:resync-before-join');

    room.emitAction(CLIENT_ACTION, { type: 'JOIN', roomCode: 'ROOMH5', displayName: 'Guest', clientNonce: 'guest-nonce' });

    expect(serverMessages(room).map((message) => (message.data as { type?: string }).type)).toEqual(['WELCOME', 'PUBLIC_STATE', 'PRIVATE_STATE']);
    expect(host.snapshot.players[0]?.name).toBe('Guest');
  });

  it('host player: duplicate join refreshes one player without rebroadcasting the room', async () => {
    const host = await createPeerHost('ROOMH7');
    const room = trystero.rooms[0]!;
    const join = { type: 'JOIN', roomCode: 'ROOMH7', displayName: 'Guest', clientNonce: 'guest-nonce' };

    room.emitAction(CLIENT_ACTION, join);
    expect(serverMessages(room).map((message) => (message.data as { type?: string }).type)).toEqual(['WELCOME', 'PUBLIC_STATE', 'PRIVATE_STATE']);

    room.emitAction(CLIENT_ACTION, join);
    expect(host.snapshot.players).toHaveLength(1);
    expect(host.snapshot.players[0]?.name).toBe('Guest');
    expect(serverMessages(room).map((message) => (message.data as { type?: string }).type)).toEqual([
      'WELCOME',
      'PUBLIC_STATE',
      'PRIVATE_STATE',
      'WELCOME',
      'PUBLIC_STATE',
      'PRIVATE_STATE',
    ]);
  });

  it('host player: peer leave marks the active player disconnected once', async () => {
    const host = await createPeerHost('ROOMH6');
    const room = trystero.rooms[0]!;

    room.emitAction(CLIENT_ACTION, { type: 'JOIN', roomCode: 'ROOMH6', displayName: 'Guest', clientNonce: 'guest-nonce' }, 'remote-peer');
    expect(host.snapshot.players[0]?.connected).toBe(true);

    room.peerLeave('remote-peer');
    room.peerLeave('remote-peer');

    expect(host.snapshot.players).toHaveLength(1);
    expect(host.snapshot.players[0]?.connected).toBe(false);
  });
});
