import { describe, expect, it, vi } from 'vitest';
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

  connect(peerId: string) {
    const conn = new FakeConnection(peerId);
    this.connections.push(conn);
    return conn;
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
  it('host player: creating host room can add host as Player 1', async () => {
    peers.length = 0;
    const host = await createPeerHost('ROOMH1');
    const peer = peers[0]!;
    peer.emit('open', 'ROOMH1');

    const hostId = host.joinHostPlayer('Host');
    expect(host.snapshot.players[0]?.name).toBe('Host');
    expect(host.snapshot.players[0]?.playerId).toBe(hostId);
  });

  it('host player: host private state is available after start game', async () => {
    peers.length = 0;
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
    peers.length = 0;
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
    peers.length = 0;
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

});
