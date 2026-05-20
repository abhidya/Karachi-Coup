type PeerModule = {
  default: new (id?: string, options?: Record<string, unknown>) => ClientPeerInstance;
};

type ClientPeerInstance = {
  id: string | null;
  on: (event: string, handler: (...args: any[]) => void) => void;
  destroy: () => void;
  connect: (peerId: string, options?: Record<string, unknown>) => ClientConnection;
};

type ClientConnection = {
  peer: string;
  open: boolean;
  on: (event: string, handler: (...args: any[]) => void) => void;
  send: (data: unknown) => void;
  close: () => void;
};

export type ClientNetworkPhase = 'idle' | 'connecting' | 'connected' | 'error' | 'closed';

export type ClientNetworkSnapshot = {
  phase: ClientNetworkPhase;
  roomId: string;
  peerId: string | null;
  connectedTo: string | null;
  lastMessage: string | null;
  error: string | null;
};

export type PeerClientHandle = {
  readonly snapshot: ClientNetworkSnapshot;
  subscribe(listener: (snapshot: ClientNetworkSnapshot) => void): () => void;
  send(data: unknown): void;
  destroy(): void;
};

function initialSnapshot(roomId: string): ClientNetworkSnapshot {
  return {
    phase: 'connecting',
    roomId,
    peerId: null,
    connectedTo: null,
    lastMessage: null,
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

export async function createPeerClient(roomId: string): Promise<PeerClientHandle> {
  if (typeof window === 'undefined') {
    throw new Error('PeerJS client requires a browser environment.');
  }

  const { default: Peer } = (await import('peerjs')) as PeerModule;
  const listeners = new Set<(snapshot: ClientNetworkSnapshot) => void>();
  let snapshot = initialSnapshot(roomId);
  let peer: ClientPeerInstance | null = null;
  let connection: ClientConnection | null = null;

  const emit = () => {
    listeners.forEach((listener) => listener(snapshot));
  };

  try {
    peer = new Peer(undefined, {
      debug: 0,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });
  } catch (error) {
    // Fail-safe for browsers/tests where PeerJS cannot construct a client peer yet
    // (for example, unsupported WebRTC surfaces or blocked runtime permissions).
    snapshot = {
      ...snapshot,
      phase: 'error',
      error: error instanceof Error ? error.message : 'Unable to start client peer.',
      lastMessage: 'client:init:error',
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
      send() {},
      destroy() {},
    };
  }

  peer.on('open', (peerId: string) => {
    snapshot = {
      ...snapshot,
      peerId,
      lastMessage: 'client:open',
    };
    emit();

    connection = peer?.connect(roomId, {
      reliable: true,
    });

    if (!connection) {
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: 'Failed to open PeerJS connection.',
        lastMessage: 'client:connect:error',
      };
      emit();
      return;
    }

    connection.on('open', () => {
      snapshot = {
        ...snapshot,
        phase: 'connected',
        connectedTo: roomId,
        lastMessage: 'client:connected',
        error: null,
      };
      emit();
    });

    connection.on('data', (data: unknown) => {
      snapshot = {
        ...snapshot,
        lastMessage: `client:data:${stringifyEvent(data)}`,
      };
      emit();
    });

    connection.on('close', () => {
      snapshot = {
        ...snapshot,
        phase: 'closed',
        connectedTo: null,
        lastMessage: 'client:close',
      };
      emit();
    });

    connection.on('error', (error: unknown) => {
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Peer client error.',
        lastMessage: 'client:error',
      };
      emit();
    });
  });

  peer.on('error', (error: unknown) => {
    snapshot = {
      ...snapshot,
      phase: 'error',
      error: error instanceof Error ? error.message : 'Peer client error.',
      lastMessage: 'client:error',
    };
    emit();
  });

  const handle = {
    get snapshot() {
      return snapshot;
    },
    subscribe(listener: (snapshot: ClientNetworkSnapshot) => void) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    send(data: unknown) {
      if (connection?.open) {
        connection.send(data);
        snapshot = {
          ...snapshot,
          lastMessage: `client:send:${stringifyEvent(data)}`,
        };
        emit();
      }
    },
    destroy() {
      connection?.close();
      peer?.destroy();
      snapshot = {
        ...snapshot,
        phase: 'closed',
        connectedTo: null,
        lastMessage: 'client:destroy',
      };
      emit();
    },
  } satisfies PeerClientHandle;

  return handle;
}
