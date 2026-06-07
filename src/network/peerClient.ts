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
import { recordNetworkStage } from './diagnostics';
import { joinRoom, selfId, type MessageAction, type Room } from 'trystero';

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
const JOIN_RETRY_MS = 2_000;
const TRYSTERO_APP_ID = 'io.github.abhidya.karachi-coup.v1';
const CLIENT_ACTION = 'karachi-coup-client-v1';
const SERVER_ACTION = 'karachi-coup-server-v1';

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
    throw new Error('Trystero client requires a browser environment.');
  }

  const displayName = options.displayName?.trim() || 'Player';
  const identity = loadIdentity(roomId, displayName);
  persistIdentity(identity);

  const listeners = new Set<(snapshot: ClientNetworkSnapshot) => void>();
  let room: Room | null = null;
  let clientAction: MessageAction<any> | null = null;
  let hostPeerId: string | null = null;
  let snapshot: ClientNetworkSnapshot = {
    phase: 'connecting',
    roomId,
    peerId: selfId ?? null,
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
  let joinRetryTimeout: number | null = null;

  const emit = () => {
    listeners.forEach((listener) => listener(snapshot));
  };

  const clearSyncTimeout = () => {
    if (syncTimeout) {
      window.clearTimeout(syncTimeout);
      syncTimeout = null;
    }
  };

  const clearJoinRetry = () => {
    if (joinRetryTimeout) {
      window.clearTimeout(joinRetryTimeout);
      joinRetryTimeout = null;
    }
  };

  const markHostUnreachable = () => {
    if (destroyed || snapshot.phase === 'synced') {
      return;
    }

    snapshot = {
      ...snapshot,
      phase: 'connecting',
      error: HOST_UNREACHABLE_MESSAGE,
      lastMessage: 'client:host-timeout',
    };
    emit();
  };

  const startSyncTimeout = () => {
    clearSyncTimeout();
    syncTimeout = window.setTimeout(markHostUnreachable, HOST_SYNC_TIMEOUT_MS);
  };

  const scheduleJoinRetry = () => {
    if (destroyed || joinRetryTimeout || snapshot.phase === 'synced') {
      return;
    }

    joinRetryTimeout = window.setTimeout(() => {
      joinRetryTimeout = null;
      sendJoin(hostPeerId ?? undefined);
      scheduleJoinRetry();
    }, JOIN_RETRY_MS);
  };

  const sendClientMessage = (message: ClientMessage, target?: string) => {
    if (!clientAction) {
      return;
    }

    void clientAction.send(message, target ? { target } : undefined).catch((error) => {
      const errMsg = error instanceof Error ? error.message : 'Failed to send client message.';
      recordNetworkStage('client:send-error', { messageType: message.type, error: errMsg });
      snapshot = {
        ...snapshot,
        phase: snapshot.phase === 'synced' || snapshot.phase === 'joined' ? snapshot.phase : 'connecting',
        error: errMsg,
        lastMessage: 'client:send-error',
      };
      emit();
    });
  };

  const sendJoin = (target?: string) => {
    const joinMessage: ClientJoinMessage = {
      type: 'JOIN',
      roomCode: roomId.toUpperCase() as RoomCode,
      displayName: snapshot.displayName,
      clientNonce: snapshot.clientNonce,
    };
    recordNetworkStage('client:sending-join', { roomCode: joinMessage.roomCode, displayName: joinMessage.displayName });
    sendClientMessage(joinMessage, target);
    startSyncTimeout();
  };

  const applyServerMessage = (message: unknown, sourcePeerId: string) => {
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
      clearJoinRetry();
      hostPeerId = sourcePeerId;
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

    if (hostPeerId && sourcePeerId !== hostPeerId) {
      recordNetworkStage('client:ignored-non-host-message', { peer: sourcePeerId, hostPeerId });
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

  try {
    recordNetworkStage('client:init-start', { roomId, transport: 'trystero' });
    room = joinRoom(
      { appId: TRYSTERO_APP_ID },
      roomId.toUpperCase(),
      {
        onJoinError(details) {
          const message = details.error || 'Unable to join Trystero room.';
          recordNetworkStage('client:error', { context: 'join', error: message });
          snapshot = {
            ...snapshot,
            phase: 'error',
            error: message,
            lastMessage: 'client:join-error',
          };
          emit();
        },
      },
    );
    clientAction = room.makeAction(CLIENT_ACTION) as MessageAction<any>;
    const serverAction = room.makeAction(SERVER_ACTION) as MessageAction<any>;
    serverAction.onMessage = (data, context) => {
      if (!destroyed) {
        applyServerMessage(data, context.peerId);
      }
    };

    room.onPeerJoin = (peerId) => {
      if (destroyed) {
        return;
      }
      recordNetworkStage('client:peer-join', { peer: peerId });
      snapshot = {
        ...snapshot,
        phase: snapshot.phase === 'synced' || snapshot.phase === 'joined' ? snapshot.phase : 'connecting',
        peerId: selfId ?? snapshot.peerId,
        lastMessage: `client:peer-join:${peerId}`,
        error: null,
      };
      emit();
      sendJoin(peerId);
    };

    room.onPeerLeave = (peerId) => {
      if (destroyed) {
        return;
      }
      recordNetworkStage('client:peer-leave', { peer: peerId });
      if (hostPeerId === peerId) {
        hostPeerId = null;
        snapshot = {
          ...snapshot,
          phase: 'connecting',
          connectedTo: null,
          error: 'Host disconnected. Waiting for the host to return...',
          lastMessage: 'client:host-left',
        };
        emit();
        sendJoin();
        scheduleJoinRetry();
      }
    };

    recordNetworkStage('client:open', { peerId: selfId, transport: 'trystero' });
    snapshot = {
      ...snapshot,
      phase: 'connecting',
      peerId: selfId ?? snapshot.peerId,
      connectedTo: roomId,
      lastMessage: 'client:open',
      error: null,
    };
    emit();
    sendJoin();
    scheduleJoinRetry();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to start Trystero client room.';
    recordNetworkStage('client:error', { context: 'init', error: message });
    snapshot = {
      ...snapshot,
      phase: 'error',
      error: message,
      lastMessage: 'client:init:error',
    };
    emit();
  }

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
      if (!hostPeerId) {
        sendJoin();
        scheduleJoinRetry();
        return;
      }

      sendClientMessage(data, hostPeerId);
      snapshot = {
        ...snapshot,
        lastMessage: `client:send:${data.type}`,
      };
      emit();
    },
    requestResync() {
      const message: ClientResyncMessage = { type: 'REQUEST_RESYNC' };
      sendClientMessage(message, hostPeerId ?? undefined);
      startSyncTimeout();
      scheduleJoinRetry();
      snapshot = {
        ...snapshot,
        lastMessage: 'client:resync',
      };
      emit();
    },
    destroy() {
      destroyed = true;
      clearSyncTimeout();
      clearJoinRetry();
      void room?.leave().catch((error) => {
        const message = error instanceof Error ? error.message : 'Failed to leave Trystero room.';
        recordNetworkStage('client:leave-error', { error: message });
      });
      snapshot = {
        ...snapshot,
        phase: 'closed',
        lastMessage: 'client:destroy',
      };
      emit();
    },
  };
}
