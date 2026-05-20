type PeerModule = {
  default: new (id?: string, options?: Record<string, unknown>) => HostPeerInstance;
};

type HostPeerInstance = {
  id: string | null;
  on: (event: string, handler: (...args: any[]) => void) => void;
  destroy: () => void;
};

type HostConnection = {
  peer: string;
  open: boolean;
  on: (event: string, handler: (...args: any[]) => void) => void;
  send: (data: unknown) => void;
  close: () => void;
};

export type HostNetworkPhase = 'idle' | 'starting' | 'ready' | 'error' | 'closed';

export type HostNetworkSnapshot = {
  phase: HostNetworkPhase;
  roomId: string;
  peerId: string | null;
  peers: string[];
  lastEvent: string | null;
  error: string | null;
};

export type PeerHostHandle = {
  readonly snapshot: HostNetworkSnapshot;
  subscribe(listener: (snapshot: HostNetworkSnapshot) => void): () => void;
  broadcast(data: unknown): void;
  send(peerId: string, data: unknown): void;
  destroy(): void;
};

function loadSnapshot(roomId: string): HostNetworkSnapshot {
  return {
    phase: 'starting',
    roomId,
    peerId: null,
    peers: [],
    lastEvent: null,
    error: null,
  };
}

function stringifyEvent(value: unknown) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable message]';
  }
}

export async function createPeerHost(roomId: string): Promise<PeerHostHandle> {
  if (typeof window === 'undefined') {
    throw new Error('PeerJS host requires a browser environment.');
  }

  const { default: Peer } = (await import('peerjs')) as PeerModule;
  const listeners = new Set<(snapshot: HostNetworkSnapshot) => void>();
  const connections = new Map<string, HostConnection>();
  let snapshot = loadSnapshot(roomId);
  let peer: HostPeerInstance | null = null;

  const emit = () => {
    const next: HostNetworkSnapshot = {
      ...snapshot,
      peers: Array.from(connections.keys()),
    };
    snapshot = next;
    listeners.forEach((listener) => listener(next));
  };

  try {
    peer = new Peer(roomId, {
      debug: 0,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });
  } catch (error) {
    // Fail-safe for browsers/tests where PeerJS cannot construct a host peer yet
    // (for example, unsupported WebRTC surfaces or blocked runtime permissions).
    snapshot = {
      ...snapshot,
      phase: 'error',
      error: error instanceof Error ? error.message : 'Unable to start host peer.',
      lastEvent: 'host:init:error',
    };
    emit();
    return {
      get snapshot() {
        return snapshot;
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(snapshot);
        return () => listeners.delete(listener);
      },
      broadcast() {},
      send() {},
      destroy() {},
    };
  }

  peer.on('open', (peerId: string) => {
    snapshot = {
      ...snapshot,
      phase: 'ready',
      peerId,
      lastEvent: 'host:open',
      error: null,
    };
    emit();
  });

  peer.on('connection', (connection: HostConnection) => {
    connections.set(connection.peer, connection);
    snapshot = {
      ...snapshot,
      lastEvent: `host:connection:${connection.peer}`,
    };
    emit();

    connection.on('data', (data: unknown) => {
      snapshot = {
        ...snapshot,
        lastEvent: `host:data:${connection.peer}:${stringifyEvent(data)}`,
      };
      emit();
    });

    connection.on('close', () => {
      connections.delete(connection.peer);
      snapshot = {
        ...snapshot,
        lastEvent: `host:close:${connection.peer}`,
      };
      emit();
    });

    connection.on('error', (error: unknown) => {
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Peer connection error.',
        lastEvent: `host:error:${connection.peer}`,
      };
      emit();
    });
  });

  peer.on('error', (error: unknown) => {
    snapshot = {
      ...snapshot,
      phase: 'error',
      error: error instanceof Error ? error.message : 'Peer host error.',
      lastEvent: 'host:error',
    };
    emit();
  });

  const handle = {
    get snapshot() {
      return snapshot;
    },
    subscribe(listener: (snapshot: HostNetworkSnapshot) => void) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    broadcast(data: unknown) {
      connections.forEach((connection) => {
        if (connection.open) {
          connection.send(data);
        }
      });
      snapshot = {
        ...snapshot,
        lastEvent: `host:broadcast:${stringifyEvent(data)}`,
      };
      emit();
    },
    send(peerId: string, data: unknown) {
      const connection = connections.get(peerId);
      if (connection?.open) {
        connection.send(data);
        snapshot = {
          ...snapshot,
          lastEvent: `host:send:${peerId}:${stringifyEvent(data)}`,
        };
        emit();
      }
    },
    destroy() {
      connections.forEach((connection) => connection.close());
      connections.clear();
      peer?.destroy();
      snapshot = {
        ...snapshot,
        phase: 'closed',
        lastEvent: 'host:destroy',
      };
      emit();
    },
  } satisfies PeerHostHandle;

  return handle;
}
