import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPeerHost } from '../src/network/peerHost';

const peers: FakePeer[] = [];

class FakeConnection {
  peer: string;
  open = true;
  sent: unknown[] = [];
  handlers = new Map<string, ((...args: any[]) => void)[]>();

  constructor(peer: string) {
    this.peer = peer;
  }

  on(event: string, handler: (...args: any[]) => void) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off() {
    this.handlers.clear();
  }

  send(data: unknown) {
    this.sent.push(data);
  }

  close() {
    this.open = false;
    this.emit('close');
  }

  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

class FakePeer {
  id: string | null = null;
  reconnects = 0;
  handlers = new Map<string, ((...args: any[]) => void)[]>();
  connections: FakeConnection[] = [];

  constructor(id?: string) {
    this.id = id ?? null;
    peers.push(this);
  }

  on(event: string, handler: (...args: any[]) => void) {
    const list = this.handlers.get(event) ?? [];
    list.push(handler);
    this.handlers.set(event, list);
  }

  off() {
    this.handlers.clear();
  }

  connect(peerId: string) {
    const conn = new FakeConnection(peerId);
    this.connections.push(conn);
    return conn;
  }

  reconnect() {
    this.reconnects += 1;
  }

  destroy() {}

  emit(event: string, ...args: unknown[]) {
    for (const handler of this.handlers.get(event) ?? []) {
      handler(...args);
    }
  }
}

vi.mock('peerjs', () => ({ default: FakePeer }));

describe('host player', () => {
  beforeEach(() => {
    peers.length = 0;
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('host player: creating host room can add host as Player 1', async () => {
    const host = await createPeerHost('ROOMH1');
    const peer = peers[0]!;
    peer.emit('open', 'ROOMH1');

    const hostId = host.joinHostPlayer('Host');
    expect(host.snapshot.players[0]?.name).toBe('Host');
    expect(host.snapshot.players[0]?.playerId).toBe(hostId);
  });

  it('host player: host private state is available after start game', async () => {
    const host = await createPeerHost('ROOMH2');
    const peer = peers[0]!;
    peer.emit('open', 'ROOMH2');
    const hostId = host.joinHostPlayer('Host');

    const conn = peer.connect('remote-peer');
    peer.emit('connection', conn);
    conn.emit('data', { type: 'JOIN', roomCode: 'ROOMH2', displayName: 'Guest', clientNonce: 'guest-nonce' });

    host.startGame();

    expect(host.snapshot.privateStates[hostId]?.hiddenConnections).toHaveLength(2);
    expect(host.snapshot.players[0]?.name).toBe('Host');
  });

  it('host player: host local intent is validated and reduced like remote intent', async () => {
    const host = await createPeerHost('ROOMH3');
    const peer = peers[0]!;
    peer.emit('open', 'ROOMH3');
    const hostId = host.joinHostPlayer('Host');

    const conn = peer.connect('remote-peer');
    peer.emit('connection', conn);
    conn.emit('data', { type: 'JOIN', roomCode: 'ROOMH3', displayName: 'Guest', clientNonce: 'guest-nonce' });

    host.startGame();
    const remotePlayerId = host.snapshot.players[1]?.playerId;
    host.sendLocal({ type: 'DECLARE_ACTION', actionType: 'CHAI_PAISA' });

    expect(host.snapshot.players[0]?.rupees).toBe(3);
    expect(host.snapshot.publicState.activePlayerId).toBe(remotePlayerId ?? null);
    expect(host.snapshot.privateStates[hostId]?.isTurn).toBe(false);
  });

  it('host player: stale connection close does not disconnect a rejoined player', async () => {
    const host = await createPeerHost('ROOMH4');
    const peer = peers[0]!;
    peer.emit('open', 'ROOMH4');

    const oldConn = peer.connect('remote-peer-old');
    peer.emit('connection', oldConn);
    oldConn.emit('data', { type: 'JOIN', roomCode: 'ROOMH4', displayName: 'Guest', clientNonce: 'guest-nonce' });
    const playerId = host.snapshot.players[0]?.playerId;

    const newConn = peer.connect('remote-peer-new');
    peer.emit('connection', newConn);
    newConn.emit('data', { type: 'JOIN', roomCode: 'ROOMH4', displayName: 'Guest', clientNonce: 'guest-nonce' });

    oldConn.close();

    expect(host.snapshot.players).toHaveLength(1);
    expect(host.snapshot.players[0]?.playerId).toBe(playerId);
    expect(host.snapshot.players[0]?.connected).toBe(true);
  });

  it('host player: eager resync before join is ignored and later join still syncs', async () => {
    const host = await createPeerHost('ROOMH5');
    const peer = peers[0]!;
    peer.emit('open', 'ROOMH5');

    const conn = peer.connect('remote-peer');
    peer.emit('connection', conn);
    conn.emit('data', { type: 'REQUEST_RESYNC' });
    expect(conn.sent).toHaveLength(0);
    expect(host.snapshot.lastEvent).toContain('host:resync-before-join');

    conn.emit('data', { type: 'JOIN', roomCode: 'ROOMH5', displayName: 'Guest', clientNonce: 'guest-nonce' });

    expect(conn.sent.slice(0, 3).map((message) => (message as { type?: string }).type)).toEqual(['WELCOME', 'PUBLIC_STATE', 'PRIVATE_STATE']);
    expect(host.snapshot.players[0]?.name).toBe('Guest');
  });

  it('host player: signaling disconnects are reconnected with a single scheduled backoff', async () => {
    const host = await createPeerHost('ROOMH6');
    const peer = peers[0]!;
    peer.emit('open', 'ROOMH6');

    for (let index = 0; index < 8; index += 1) {
      peer.emit('disconnected');
    }

    expect(peer.reconnects).toBe(0);

    await vi.advanceTimersByTimeAsync(999);
    expect(peer.reconnects).toBe(0);

    await vi.advanceTimersByTimeAsync(1);
    expect(peer.reconnects).toBe(1);
    host.destroy();
  });

});
