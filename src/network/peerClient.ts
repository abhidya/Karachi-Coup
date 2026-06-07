import type {
  ClientJoinMessage,
  ClientMessage,
  ClientResyncMessage,
  PrivatePlayerState,
  PublicGameState,
  ServerErrorMessage,
  ServerMessage,
  ServerPrivateStateMessage,
  ServerPublicStateMessage,
  ServerWelcomeMessage,
  RoomCode,
  PlayerId,
} from '../game/types';
import { clientStorageKey, readLocalStorage, writeLocalStorage, writeSessionStorage, sessionStorageKey } from './storage';
import { peerOptions } from './peerOptions';
import { recordNetworkStage } from './diagnostics';

type PeerModule = {
  default: new (id?: string, options?: Record<string, unknown>) => ClientPeerInstance;
};

type ClientPeerInstance = {
  id: string | null;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event?: string, handler?: (...args: any[]) => void) => void;
  destroy: () => void;
  reconnect: () => void;
  connect: (peerId: string, options?: Record<string, unknown>) => ClientConnection;
};

type ClientConnection = {
  peer: string;
  open: boolean;
  on: (event: string, handler: (...args: any[]) => void) => void;
  off?: (event?: string, handler?: (...args: any[]) => void) => void;
  send: (data: unknown) => void;
  close: () => void;
};

type StoredClientIdentity = {
  roomId: string;
  displayName: string;
  clientNonce: string;
  playerId: string | null;
};

export type ClientNetworkPhase = 'idle' | 'connecting' | 'joined' | 'synced' | 'error' | 'closed';

export type ClientNetworkSnapshot = {
  phase: ClientNetworkPhase;
  roomId: string;
  peerId: string | null;
  connectedTo: string | null;
  playerId: PlayerId | null;
  displayName: string;
  clientNonce: string;
  publicState: PublicGameState | null;
  privateState: PrivatePlayerState | null;
  lastMessage: string | null;
  lastEvent?: string | null;
  error: string | null;
  restored: boolean;
};

export type PeerClientHandle = {
  readonly snapshot: ClientNetworkSnapshot;
  subscribe(listener: (snapshot: ClientNetworkSnapshot) => void): () => void;
  send(data: ClientMessage): void;
  requestResync(): void;
  destroy(): void;
};

type ClientOptions = {
  displayName?: string;
};

function makeClientNonce(roomId: string): string {
  const existing = readLocalStorage<StoredClientIdentity>(clientStorageKey(roomId));
  if (existing?.clientNonce) {
    return existing.clientNonce;
  }

  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `nonce-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function loadIdentity(roomId: string, displayName: string): StoredClientIdentity {
  const stored = readLocalStorage<StoredClientIdentity>(clientStorageKey(roomId));
  if (stored) {
    return {
      roomId,
      displayName: stored.displayName || displayName,
      clientNonce: stored.clientNonce,
      playerId: stored.playerId ?? null,
    };
  }

  return {
    roomId,
    displayName,
    clientNonce: makeClientNonce(roomId),
    playerId: null,
  };
}

function persistIdentity(identity: StoredClientIdentity): void {
  writeLocalStorage<StoredClientIdentity>(clientStorageKey(identity.roomId), identity);
  writeSessionStorage(sessionStorageKey(), {
    mode: 'client',
    roomId: identity.roomId,
    displayName: identity.displayName,
  });
}

const HOST_UNREACHABLE_MESSAGE = 'Could not reach the room host. Ask the host to keep their tab open, then retry or create a new room.';
const HOST_SYNC_TIMEOUT_MS = 12_000;
const RECONNECT_INITIAL_DELAY_MS = 1_000;
const RECONNECT_MAX_DELAY_MS = 30_000;

function reconnectDelay(attempt: number): number {
  return Math.min(RECONNECT_MAX_DELAY_MS, RECONNECT_INITIAL_DELAY_MS * 2 ** attempt);
}

function isReconnectablePeerError(error: any): boolean {
  if (!error || typeof error !== 'object') return false;
  return ['network', 'server-error', 'socket-error', 'socket-closed'].includes(error.type);
}

function peerErrorMessage(error: any, fallback: string): string {
  if (error && typeof error === 'object') {
    const type = error.type;
    const rawMessage = error.message;
    if (type === 'peer-unavailable') {
      return 'Could not find the host. Make sure the host has the lobby open and has a working internet connection.';
    }
    if (type === 'network') {
      return 'Lost connection to the PeerJS signaling server. Retrying...';
    }
    if (type === 'webrtc') {
      return 'WebRTC connection failed. This can happen due to firewall, NAT, or browser network restrictions.';
    }
    if (rawMessage) {
      return rawMessage;
    }
  }
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  if (!message.trim()) {
    return fallback;
  }

  if (/could not connect to peer/i.test(message)) {
    return HOST_UNREACHABLE_MESSAGE;
  }

  return message;
}

function isServerMessage(value: unknown): value is ServerMessage {
  return Boolean(value && typeof value === 'object' && typeof (value as ServerMessage).type === 'string');
}

function isWelcomeMessage(value: unknown): value is ServerWelcomeMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as ServerWelcomeMessage).type === 'WELCOME' &&
      typeof (value as ServerWelcomeMessage).roomCode === 'string' &&
      typeof (value as ServerWelcomeMessage).playerId === 'string',
  );
}

function isPublicMessage(value: unknown): value is ServerPublicStateMessage {
  return Boolean(value && typeof value === 'object' && (value as ServerPublicStateMessage).type === 'PUBLIC_STATE');
}

function isPrivateMessage(value: unknown): value is ServerPrivateStateMessage {
  return Boolean(value && typeof value === 'object' && (value as ServerPrivateStateMessage).type === 'PRIVATE_STATE');
}

function isErrorMessage(value: unknown): value is ServerErrorMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as ServerErrorMessage).type === 'ERROR' &&
      typeof (value as ServerErrorMessage).message === 'string',
  );
}

export async function createPeerClient(roomId: string, options: ClientOptions = {}): Promise<PeerClientHandle> {
  if (typeof window === 'undefined') {
    throw new Error('PeerJS client requires a browser environment.');
  }

  const displayName = options.displayName?.trim() || 'Player';
  const identity = loadIdentity(roomId, displayName);
  persistIdentity(identity);

  const { default: Peer } = (await import('peerjs')) as PeerModule;
  const listeners = new Set<(snapshot: ClientNetworkSnapshot) => void>();
  let peer: ClientPeerInstance | null = null;
  let connection: ClientConnection | null = null;
  let snapshot: ClientNetworkSnapshot = {
    phase: 'connecting',
    roomId,
    peerId: null,
    connectedTo: null,
    playerId: identity.playerId as PlayerId | null,
    displayName: identity.displayName,
    clientNonce: identity.clientNonce,
    publicState: null,
    privateState: null,
    lastMessage: null,
    error: null,
    restored: Boolean(identity.playerId),
  };
  let destroyed = false;
  let syncTimeout: number | null = null;
  let reconnectTimeout: number | null = null;
  let reconnectAttempts = 0;
  let connectingPeer = false;

  const clearSyncTimeout = () => {
    if (syncTimeout) {
      window.clearTimeout(syncTimeout);
      syncTimeout = null;
    }
  };

  const clearReconnectTimeout = () => {
    if (reconnectTimeout) {
      window.clearTimeout(reconnectTimeout);
      reconnectTimeout = null;
    }
  };

  const markHostUnreachable = () => {
    if (destroyed || snapshot.phase === 'synced') {
      return;
    }

    snapshot = {
      ...snapshot,
      phase: 'error',
      error: HOST_UNREACHABLE_MESSAGE,
      lastMessage: 'client:host-timeout',
    };
    emit();
  };

  const startSyncTimeout = () => {
    clearSyncTimeout();
    syncTimeout = window.setTimeout(markHostUnreachable, HOST_SYNC_TIMEOUT_MS);
  };

  const emit = () => {
    listeners.forEach((listener) => listener(snapshot));
  };

  const sendJoin = () => {
    if (!connection?.open) {
      return;
    }

    const joinMessage: ClientJoinMessage = {
      type: 'JOIN',
      roomCode: roomId.toUpperCase() as RoomCode,
      displayName: snapshot.displayName,
      clientNonce: snapshot.clientNonce,
    };
    recordNetworkStage('client:sending-join', { roomCode: joinMessage.roomCode, displayName: joinMessage.displayName });
    try {
      connection.send(joinMessage);
      startSyncTimeout();
    } catch (err) {
      console.error('[Client] Failed to send JOIN message:', err);
      recordNetworkStage('client:send-join-error', { error: String(err) });
    }
  };

  const applyServerMessage = (message: unknown) => {
    if (!isServerMessage(message)) {
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: 'Received an unrecognized server payload.',
        lastMessage: 'server:invalid',
      };
      emit();
      return;
    }

    if (isWelcomeMessage(message)) {
      clearSyncTimeout();
      recordNetworkStage('client:welcome-received', { roomId: message.roomCode, playerId: message.playerId });
      snapshot = {
        ...snapshot,
        phase: 'joined',
        connectedTo: message.roomCode,
        playerId: message.playerId as PlayerId,
        error: null,
        lastMessage: 'server:welcome',
      };
      identity.playerId = message.playerId;
      persistIdentity(identity);
      emit();
      return;
    }

    if (isPublicMessage(message)) {
      clearSyncTimeout();
      recordNetworkStage('client:public-state-received', { phase: message.state.phase });
      snapshot = {
        ...snapshot,
        phase: snapshot.playerId ? 'synced' : 'joined',
        publicState: message.state,
        error: null,
        lastMessage: `server:public:${message.state.phase}`,
      };
      emit();
      return;
    }

    if (isPrivateMessage(message)) {
      clearSyncTimeout();
      recordNetworkStage('client:private-state-received', { phase: message.state.phase });
      snapshot = {
        ...snapshot,
        phase: 'synced',
        privateState: message.state,
        error: null,
        lastMessage: `server:private:${message.state.phase}`,
      };
      emit();
      return;
    }

    if (isErrorMessage(message)) {
      clearSyncTimeout();
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: message.message,
        lastMessage: 'server:error',
      };
      emit();
      return;
    }

    snapshot = {
      ...snapshot,
      phase: 'error',
      error: 'Unsupported server message.',
      lastMessage: 'server:unsupported',
    };
    emit();
  };

  const hostPeerId = `karachi-coup-room-${roomId.toUpperCase()}`;

  const scheduleReconnect = (reason: string) => {
    if (destroyed || reconnectTimeout || connectingPeer) return;

    const delayMs = reconnectDelay(reconnectAttempts);
    recordNetworkStage('client:reconnect-scheduled', { reason, delayMs });
    snapshot = {
      ...snapshot,
      phase: snapshot.phase === 'synced' || snapshot.phase === 'joined' ? snapshot.phase : 'connecting',
      error: snapshot.error ?? 'Connection is offline. Retrying shortly.',
      lastMessage: `client:reconnect-scheduled:${reason}`,
    };
    emit();

    reconnectTimeout = window.setTimeout(() => {
      reconnectTimeout = null;
      reconnectAttempts += 1;
      connectToPeer();
    }, delayMs);
  };

  const connectToPeer = () => {
    if (destroyed || connectingPeer) return;

    connectingPeer = true;
    clearSyncTimeout();
    clearReconnectTimeout();
    if (connection) {
      try { connection.off?.(); } catch {}
      try { connection.close(); } catch {}
      connection = null;
    }
    if (peer) {
      try { peer.off?.(); } catch {}
      try { peer.destroy(); } catch {}
      peer = null;
    }

    try {
      recordNetworkStage('client:init-start', { hostPeerId });
      peer = new Peer(undefined, peerOptions);
    } catch (error) {
      connectingPeer = false;
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Unable to start client peer.',
        lastMessage: 'client:init:error',
      };
      emit();
      return;
    }

    peer.on('open', (peerId: unknown) => {
      const typedPeerId = typeof peerId === 'string' ? peerId : null;
      if (destroyed) {
        return;
      }

      connectingPeer = false;
      reconnectAttempts = 0;
      clearReconnectTimeout();
      recordNetworkStage('client:open', { peerId: typedPeerId });

      snapshot = {
        ...snapshot,
        phase: 'connecting',
        peerId: typedPeerId,
        lastMessage: 'client:open',
        error: null,
      };
      emit();

      recordNetworkStage('client:connecting-start', { hostPeerId });
      connection = peer ? peer.connect(hostPeerId, {
        reliable: true,
      }) : null;

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
        reconnectAttempts = 0;
        clearReconnectTimeout();
        recordNetworkStage('client:connected', { hostPeerId });
        snapshot = {
          ...snapshot,
          phase: 'connecting',
          connectedTo: roomId,
          lastMessage: 'client:connected',
          error: null,
        };
        emit();
        sendJoin();
      });

      connection.on('data', (data: unknown) => {
        applyServerMessage(data);
      });

      connection.on('close', () => {
        clearSyncTimeout();
        recordNetworkStage('client:connection-closed');
        snapshot = {
          ...snapshot,
          phase: 'closed',
          connectedTo: null,
          lastMessage: 'client:close',
        };
        emit();
      });

      connection.on('error', (error: unknown) => {
        clearSyncTimeout();
        const errMsg = peerErrorMessage(error, HOST_UNREACHABLE_MESSAGE);
        recordNetworkStage('client:error', { context: 'connection', error: errMsg });
        snapshot = {
          ...snapshot,
          phase: 'error',
          error: errMsg,
          lastMessage: 'client:error',
        };
        emit();
      });
    });

    peer.on('disconnected', () => {
      connectingPeer = false;
      scheduleReconnect('peer-disconnected');
    });

    peer.on('error', (error: unknown) => {
      connectingPeer = false;
      clearSyncTimeout();
      const errMsg = peerErrorMessage(error, HOST_UNREACHABLE_MESSAGE);
      recordNetworkStage('client:error', { context: 'peer', error: errMsg });
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: errMsg,
        lastMessage: 'client:error',
      };
      emit();
      if (isReconnectablePeerError(error)) {
        scheduleReconnect('peer-error');
      }
    });
  };

  // Trigger initial connection
  connectToPeer();

  return {
    get snapshot() {
      return snapshot;
    },
    subscribe(listener: (snapshot: ClientNetworkSnapshot) => void) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    send(data: ClientMessage) {
      if (connection?.open) {
        try {
          connection.send(data);
          snapshot = {
            ...snapshot,
            lastMessage: `client:send:${data.type}`,
          };
          emit();
        } catch (err) {
          console.error('[Client] Failed to send message:', err);
          recordNetworkStage('client:send-error', { messageType: data.type, error: String(err) });
        }
      }
    },
    requestResync() {
      if (connection?.open) {
        const message: ClientResyncMessage = { type: 'REQUEST_RESYNC' };
        try {
          connection.send(message);
          startSyncTimeout();
          snapshot = {
            ...snapshot,
            lastMessage: 'client:resync',
          };
          emit();
        } catch (err) {
          console.error('[Client] Failed to send resync message:', err);
          recordNetworkStage('client:send-resync-error', { error: String(err) });
        }
      } else {
        scheduleReconnect('manual-resync');
      }
    },
    destroy() {
      destroyed = true;
      clearSyncTimeout();
      clearReconnectTimeout();
      try { connection?.off?.(); } catch {}
      try { connection?.close(); } catch {}
      try { peer?.off?.(); } catch {}
      try { peer?.destroy(); } catch {}
      snapshot = {
        ...snapshot,
        phase: 'closed',
        lastMessage: 'client:destroy',
      };
      emit();
    },
  };
}
