import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPeerClient } from '../src/network/peerClient';

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
    this.id = id ?? 'client-peer';
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

describe('peer client', () => {
  beforeEach(() => {
    peers.length = 0;
  });

  it('sends only JOIN on initial connection and waits for explicit resyncs', async () => {
    const client = await createPeerClient('ROOMC1', { displayName: 'Ari' });
    const peer = peers[0]!;

    peer.emit('open', 'client-peer');
    const conn = peer.connections[0]!;
    conn.emit('open');

    expect(conn.sent).toHaveLength(1);
    expect(conn.sent[0]).toMatchObject({ type: 'JOIN', roomCode: 'ROOMC1', displayName: 'Ari' });

    client.requestResync();
    expect(conn.sent.at(-1)).toEqual({ type: 'REQUEST_RESYNC' });
  });
});
