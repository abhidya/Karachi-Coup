import { createActionEvent, reducer } from '../game/reducer';
import { createBasePlayer, toPlayerId } from '../game/utils';
import { toPublicGameState, toPrivatePlayerState } from '../game/snapshots';
import { validateClientMessage } from '../game/validation';
import type {
  ClientJoinMessage,
  ClientMessage,
  ClientResyncMessage,
  GameEvent,
  HostLobbyPlayerView,
  HostGameState,
  PrivatePlayerState,
  PublicGameState,
  ServerMessage,
  ServerPrivateStateMessage,
  ServerPublicStateMessage,
  ServerWelcomeMessage,
  PlayerId,
} from '../game/types';
import { createHostGameState } from '../game/rules';
import { hostStorageKey, readLocalStorage, writeLocalStorage } from './storage';

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

type JoinedConnection = {
  connection: HostConnection;
  playerId: PlayerId | null;
  generation: number;
};

type PersistedHostState = {
  state: HostGameState;
};

type StoredHostIdentity = {
  clientNonce: string;
  displayName: string;
  playerId: string | null;
};

export type HostNetworkPhase = 'idle' | 'starting' | 'ready' | 'error' | 'closed';

export type HostNetworkSnapshot = {
  phase: HostNetworkPhase;
  roomId: string;
  peerId: string | null;
  peers: string[];
  players: HostLobbyPlayerView[];
  publicState: PublicGameState;
  privateStates: Record<string, PrivatePlayerState>;
  lastEvent: string | null;
  lastMessage?: string | null;
  error: string | null;
  restored: boolean;
};

export type PeerHostHandle = {
  readonly snapshot: HostNetworkSnapshot;
  subscribe(listener: (snapshot: HostNetworkSnapshot) => void): () => void;
  joinHostPlayer(displayName: string): PlayerId;
  sendLocal(data: ClientMessage): void;
  startGame(): void;
  resetRoom(): void;
  broadcast(data: unknown): void;
  send(peerId: string, data: unknown): void;
  destroy(): void;
};

function stringifyEvent(value: unknown) {
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable message]';
  }
}

function safeTrim(value: string | null | undefined, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function connectionKey(roomId: string) {
  return hostStorageKey(roomId);
}

function hostIdentityKey(roomId: string) {
  return `${hostStorageKey(roomId)}:identity`;
}

function loadStoredState(roomId: string): HostGameState | null {
  return readLocalStorage<PersistedHostState>(connectionKey(roomId))?.state ?? null;
}

function persistState(roomId: string, state: HostGameState): void {
  writeLocalStorage<PersistedHostState>(connectionKey(roomId), { state });
}

function loadHostIdentity(roomId: string): StoredHostIdentity | null {
  return readLocalStorage<StoredHostIdentity>(hostIdentityKey(roomId));
}

function persistHostIdentity(roomId: string, identity: StoredHostIdentity): void {
  writeLocalStorage<StoredHostIdentity>(hostIdentityKey(roomId), identity);
}

function makeGameId(roomId: string): string {
  return `game-${roomId.toUpperCase()}`;
}

function makePlayerId(roomId: string, clientNonce: string, existingIds: Set<PlayerId>): PlayerId {
  const basis = `${roomId}-${clientNonce.slice(-8)}`.replace(/[^A-Za-z0-9-]/g, '');
  let suffix = 0;
  let candidate = toPlayerId(basis || `${roomId}-player`);
  while (existingIds.has(candidate)) {
    suffix += 1;
    candidate = toPlayerId(`${basis || `${roomId}-player`}-${suffix}`);
  }
  return candidate;
}

function makeHostNonce(roomId: string): string {
  const existing = loadHostIdentity(roomId);
  if (existing?.clientNonce) return existing.clientNonce;
  const nonce = globalThis.crypto?.randomUUID?.() ?? `host-${roomId}-${Date.now().toString(36)}`;
  persistHostIdentity(roomId, { clientNonce: nonce, displayName: 'Player 1', playerId: null });
  return nonce;
}

function buildPlayerViews(state: HostGameState): HostLobbyPlayerView[] {
  return state.turnOrder.map((playerId) => {
    const player = state.playersById[playerId]!;
    return {
      playerId,
      name: player.name,
      connected: player.connected,
      rupees: player.rupees,
      hiddenConnectionCount: player.hiddenConnections.length,
      eliminated: player.eliminated,
    };
  });
}

function buildPrivateStates(state: HostGameState): Record<string, PrivatePlayerState> {
  const result: Record<string, PrivatePlayerState> = {};
  for (const playerId of state.turnOrder) {
    result[playerId] = toPrivatePlayerState(state, playerId);
  }
  return result;
}

function buildSnapshot(
  phase: HostNetworkPhase,
  roomId: string,
  peerId: string | null,
  joinedPeers: Map<string, JoinedConnection>,
  state: HostGameState,
  lastEvent: string | null,
  error: string | null,
  restored: boolean,
): HostNetworkSnapshot {
  return {
    phase,
    roomId,
    peerId,
    peers: [...joinedPeers.keys()],
    players: buildPlayerViews(state),
    publicState: toPublicGameState(state),
    privateStates: buildPrivateStates(state),
    lastEvent,
    error,
    restored,
  };
}

function isJoinMessage(value: unknown): value is ClientJoinMessage {
  return Boolean(
    value &&
      typeof value === 'object' &&
      (value as ClientJoinMessage).type === 'JOIN' &&
      typeof (value as ClientJoinMessage).roomCode === 'string' &&
      typeof (value as ClientJoinMessage).displayName === 'string' &&
      typeof (value as ClientJoinMessage).clientNonce === 'string',
  );
}

function isResyncMessage(value: unknown): value is ClientResyncMessage {
  return Boolean(value && typeof value === 'object' && (value as ClientResyncMessage).type === 'REQUEST_RESYNC');
}

function isKnownClientMessage(value: unknown): value is ClientMessage {
  return Boolean(value && typeof value === 'object' && typeof (value as ClientMessage).type === 'string');
}

function mapMessageToEvent(
  state: HostGameState,
  message: Exclude<ClientMessage, ClientJoinMessage | ClientResyncMessage>,
  playerId: PlayerId,
): GameEvent | null {
  switch (message.type) {
    case 'DECLARE_ACTION':
      return createActionEvent(playerId, message.actionType, message.targetId ? toPlayerId(message.targetId) : null);
    case 'CHALLENGE':
      return { type: 'CHALLENGE', challengerId: playerId };
    case 'PASS_CHALLENGE':
      return { type: 'PASS_CHALLENGE', playerId };
    case 'BLOCK':
      if (!state.pendingAction) {
        return null;
      }
      return {
        type: 'BLOCK',
        block: {
          actionId: state.pendingAction.actionId,
          blockerId: playerId,
          blockingRole: message.role,
          targetId: state.pendingAction.targetId,
          eligibleChallengers: state.turnOrder.filter((candidate) => candidate !== playerId),
          responses: {},
        },
      };
    case 'PASS_BLOCK':
      return { type: 'PASS_BLOCK', playerId };
    case 'CHOOSE_CONNECTION_TO_BURN':
      return { type: 'CHOOSE_CONNECTION_TO_BURN', playerId, connectionId: message.connectionId as never };
    case 'JUGAAD_RETURN':
      return { type: 'JUGAAD_RETURN', playerId, returnedConnectionIds: message.returnedConnectionIds as never };
    default:
      return null;
  }
}

function sendMessage(connection: HostConnection, message: ServerMessage): void {
  if (connection.open) {
    connection.send(message);
  }
}

function syncConnection(
  connection: HostConnection,
  playerId: PlayerId,
  state: HostGameState,
): void {
  const welcome: ServerWelcomeMessage = { type: 'WELCOME', roomCode: state.roomCode, playerId };
  const publicState: ServerPublicStateMessage = { type: 'PUBLIC_STATE', state: toPublicGameState(state) };
  const privateState: ServerPrivateStateMessage = { type: 'PRIVATE_STATE', state: toPrivatePlayerState(state, playerId) };
  sendMessage(connection, welcome);
  sendMessage(connection, publicState);
  sendMessage(connection, privateState);
}

export async function createPeerHost(roomId: string): Promise<PeerHostHandle> {
  if (typeof window === 'undefined') {
    throw new Error('PeerJS host requires a browser environment.');
  }

  const { default: Peer } = (await import('peerjs')) as PeerModule;
  const listeners = new Set<(snapshot: HostNetworkSnapshot) => void>();
  const connections = new Map<string, JoinedConnection>();
  const activeConnectionGenerations = new Map<PlayerId, number>();
  const storedState = loadStoredState(roomId);
  const storedIdentity = loadHostIdentity(roomId) ?? { clientNonce: makeHostNonce(roomId), displayName: 'Player 1', playerId: null };
  let state = storedState ?? createHostGameState(roomId, makeGameId(roomId));
  let hostPlayerId: PlayerId | null =
    Object.entries(state.playersById).find(([, player]) => player.clientNonce === storedIdentity.clientNonce)?.[0] as PlayerId | null ?? null;
  let peer: HostPeerInstance | null = null;
  let snapshot = buildSnapshot('starting', roomId, null, connections, state, null, null, Boolean(storedState));
  let destroyed = false;
  let nextConnectionGeneration = 1;

  const emit = (nextPhase: HostNetworkPhase = snapshot.phase, lastEvent = snapshot.lastEvent, error = snapshot.error) => {
    persistState(roomId, state);
    snapshot = buildSnapshot(nextPhase, roomId, peer?.id ?? null, connections, state, lastEvent, error, snapshot.restored);
    listeners.forEach((listener) => listener(snapshot));
  };

  const broadcastState = (eventLabel: string) => {
    const publicState = toPublicGameState(state);
    const publicMessage: ServerPublicStateMessage = { type: 'PUBLIC_STATE', state: publicState };
    connections.forEach(({ connection, playerId }) => {
      sendMessage(connection, publicMessage);
      if (playerId && state.playersById[playerId]) {
        sendMessage(connection, { type: 'PRIVATE_STATE', state: toPrivatePlayerState(state, playerId) });
      }
    });
    emit(snapshot.phase === 'ready' ? 'ready' : snapshot.phase, eventLabel, null);
  };

  const setState = (nextState: HostGameState, eventLabel: string) => {
    state = nextState;
    broadcastState(eventLabel);
  };

  const ensureHostPlayer = (displayName: string, suppressBroadcast = false): PlayerId => {
    const normalizedName = safeTrim(displayName, 'Player 1');
    const existing = hostPlayerId
      ? state.playersById[hostPlayerId]
      : Object.entries(state.playersById).find(([, player]) => player.clientNonce === storedIdentity.clientNonce)?.[1];
    if (existing) {
      hostPlayerId = existing.id;
      state = {
        ...state,
        playersById: {
          ...state.playersById,
          [existing.id]: {
            ...existing,
            name: normalizedName,
            clientNonce: storedIdentity.clientNonce as never,
            connected: true,
          },
        },
        turnOrder: state.turnOrder.includes(existing.id) ? state.turnOrder : [existing.id, ...state.turnOrder],
      };
      persistHostIdentity(roomId, { clientNonce: storedIdentity.clientNonce, displayName: normalizedName, playerId: existing.id });
      if (!suppressBroadcast) {
        broadcastState('host:join-self');
      }
      return existing.id;
    }

    const playerId = makePlayerId(roomId, storedIdentity.clientNonce, new Set(Object.keys(state.playersById).map((value) => toPlayerId(value))));
    hostPlayerId = playerId;
    state = {
      ...state,
      playersById: {
        ...state.playersById,
        [playerId]: {
          ...createBasePlayer(playerId, normalizedName),
          clientNonce: storedIdentity.clientNonce as never,
          connected: true,
        },
      },
      turnOrder: [playerId, ...state.turnOrder.filter((existingId) => existingId !== playerId)],
    };
    persistHostIdentity(roomId, { clientNonce: storedIdentity.clientNonce, displayName: normalizedName, playerId });
    if (!suppressBroadcast) {
      broadcastState('host:join-self');
    }
    return playerId;
  };

  const applyLocalMessage = (message: ClientMessage, playerId: PlayerId) => {
    const validation = validateClientMessage(state, playerId, message);
    if (!validation.ok) {
      snapshot = {
        ...snapshot,
        lastEvent: `host:local:error:${message.type}`,
        error: validation.reason ?? 'Message rejected.',
      };
      listeners.forEach((listener) => listener(snapshot));
      return;
    }

    const event = mapMessageToEvent(state, message as Exclude<ClientMessage, ClientJoinMessage | ClientResyncMessage>, playerId);
    if (!event) {
      snapshot = {
        ...snapshot,
        lastEvent: `host:local:unsupported:${message.type}`,
        error: 'Unsupported client message.',
      };
      listeners.forEach((listener) => listener(snapshot));
      return;
    }

    const nextState = reducer(state, event);
    if (nextState !== state) {
      state = nextState;
      broadcastState(`host:local:${message.type}`);
    }
  };

  const joinPlayer = (connection: HostConnection, message: ClientJoinMessage) => {
    const joined = connections.get(connection.peer);
    if (!joined || joined.connection !== connection) {
      sendMessage(connection, { type: 'ERROR', message: 'Connection has been superseded.' });
      return;
    }

    const normalizedRoom = message.roomCode.trim().toUpperCase();
    if (normalizedRoom !== state.roomCode) {
      sendMessage(connection, { type: 'ERROR', message: `Room mismatch: expected ${state.roomCode}.` });
      return;
    }

    const playerName = safeTrim(message.displayName, 'Guest');
    const existingId = Object.entries(state.playersById).find(([, player]) => player.clientNonce === message.clientNonce)?.[0] as
      | PlayerId
      | undefined;
    const playerId: PlayerId =
      existingId ??
      makePlayerId(roomId, message.clientNonce, new Set(Object.keys(state.playersById).map((value) => toPlayerId(value))));
    const previousPlayer = state.playersById[playerId];
    const nextPlayer =
      previousPlayer ?? {
        ...createBasePlayer(playerId, playerName),
        clientNonce: message.clientNonce as never,
      };

    state = {
      ...state,
      playersById: {
        ...state.playersById,
        [playerId]: {
          ...nextPlayer,
          name: playerName,
          clientNonce: message.clientNonce as never,
          connected: true,
        },
      },
      turnOrder: state.turnOrder.includes(playerId) ? state.turnOrder : [...state.turnOrder, playerId],
      log: [
        { id: `${Date.now()}-${playerId}`, text: `${playerName} joined the room.` },
        ...state.log,
      ].slice(0, 12),
    };

    connections.set(connection.peer, { ...joined, playerId });
    activeConnectionGenerations.set(playerId, joined.generation);
    syncConnection(connection, playerId, state);
    broadcastState(`host:join:${playerId}`);
  };

  const handleMessage = (connection: HostConnection, raw: unknown) => {
    const current = connections.get(connection.peer);
    if (!current || current.connection !== connection) {
      sendMessage(connection, { type: 'ERROR', message: 'Connection has been superseded.' });
      return;
    }

    if (isJoinMessage(raw)) {
      joinPlayer(connection, raw);
      return;
    }

    if (isResyncMessage(raw)) {
      if (current.playerId && activeConnectionGenerations.get(current.playerId) === current.generation) {
        syncConnection(connection, current.playerId, state);
      } else if (current.playerId) {
        sendMessage(connection, { type: 'ERROR', message: 'Connection has been superseded.' });
      } else {
        sendMessage(connection, { type: 'ERROR', message: 'Join before requesting a resync.' });
      }
      return;
    }

    if (!isKnownClientMessage(raw)) {
      sendMessage(connection, { type: 'ERROR', message: 'Unsupported client message.' });
      return;
    }

    if (!current.playerId) {
      sendMessage(connection, { type: 'ERROR', message: 'Send JOIN before gameplay messages.' });
      return;
    }
    if (activeConnectionGenerations.get(current.playerId) !== current.generation) {
      sendMessage(connection, { type: 'ERROR', message: 'Connection has been superseded.' });
      return;
    }

    const playerId = current.playerId;
    const validation = validateClientMessage(state, playerId, raw);
    if (!validation.ok) {
      sendMessage(connection, { type: 'ERROR', message: validation.reason ?? 'Message rejected.' });
      return;
    }

    const event = mapMessageToEvent(state, raw as Exclude<ClientMessage, ClientJoinMessage | ClientResyncMessage>, playerId);
    if (!event) {
      sendMessage(connection, { type: 'ERROR', message: 'Unsupported client message.' });
      return;
    }

    const nextState = reducer(state, event);
    if (nextState !== state) {
      state = nextState;
      broadcastState(`host:event:${raw.type}`);
    }
  };

  try {
    peer = new Peer(roomId, {
      debug: 0,
      config: {
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }],
      },
    });
  } catch (error) {
    snapshot = {
      ...snapshot,
      phase: 'error',
      error: error instanceof Error ? error.message : 'Unable to start host peer.',
      lastEvent: 'host:init:error',
    };
    listeners.forEach((listener) => listener(snapshot));
    return {
      get snapshot() {
        return snapshot;
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(snapshot);
        return () => listeners.delete(listener);
      },
      joinHostPlayer() {
        return '' as PlayerId;
      },
      sendLocal() {},
      startGame() {},
      resetRoom() {},
      broadcast() {},
      send() {},
      destroy() {},
    };
  }

  peer.on('open', (peerId: unknown) => {
    if (destroyed) {
      return;
    }

    snapshot = {
      ...snapshot,
      phase: 'ready',
      peerId: typeof peerId === 'string' ? peerId : null,
      lastEvent: 'host:open',
      error: null,
    };
    listeners.forEach((listener) => listener(snapshot));
    broadcastState('host:open');
  });

  peer.on('connection', (connection: unknown) => {
    const typedConnection = connection as HostConnection;
    const generation = nextConnectionGeneration;
    nextConnectionGeneration += 1;
    connections.set(typedConnection.peer, { connection: typedConnection, playerId: null, generation });
    snapshot = {
      ...snapshot,
      lastEvent: `host:connection:${typedConnection.peer}`,
    };
    listeners.forEach((listener) => listener(snapshot));

    typedConnection.on('data', (data: unknown) => {
      handleMessage(typedConnection, data);
    });

    typedConnection.on('close', () => {
      const joined = connections.get(typedConnection.peer);
      if (!joined || joined.connection !== typedConnection) {
        return;
      }

      connections.delete(typedConnection.peer);
      if (joined.playerId && activeConnectionGenerations.get(joined.playerId) === joined.generation) {
        activeConnectionGenerations.delete(joined.playerId);
        const player = state.playersById[joined.playerId];
        if (player) {
          state = {
            ...state,
            playersById: {
              ...state.playersById,
              [joined.playerId]: {
                ...player,
                connected: false,
              },
            },
            log: [
              { id: `${Date.now()}-${joined.playerId}-left`, text: `${player.name} disconnected.` },
              ...state.log,
            ].slice(0, 12),
          };
        }
      }
      broadcastState(`host:close:${typedConnection.peer}`);
    });

    typedConnection.on('error', (error: unknown) => {
      snapshot = {
        ...snapshot,
        phase: 'error',
        error: error instanceof Error ? error.message : 'Peer connection error.',
        lastEvent: `host:error:${typedConnection.peer}`,
      };
      listeners.forEach((listener) => listener(snapshot));
    });
  });

  peer.on('error', (error: unknown) => {
    snapshot = {
      ...snapshot,
      phase: 'error',
      error: error instanceof Error ? error.message : 'Peer host error.',
      lastEvent: 'host:error',
    };
    listeners.forEach((listener) => listener(snapshot));
  });

  return {
    get snapshot() {
      return snapshot;
    },
    subscribe(listener: (snapshot: HostNetworkSnapshot) => void) {
      listeners.add(listener);
      listener(snapshot);
      return () => listeners.delete(listener);
    },
    joinHostPlayer(displayName: string) {
      return ensureHostPlayer(displayName);
    },
    sendLocal(data: ClientMessage) {
      if (!hostPlayerId) {
        snapshot = {
          ...snapshot,
          lastEvent: 'host:local:error:no-host-player',
          error: 'Host player not joined yet.',
        };
        listeners.forEach((listener) => listener(snapshot));
        return;
      }
      applyLocalMessage(data, hostPlayerId);
    },
    startGame() {
      if (snapshot.phase === 'error') {
        return;
      }
      const nextState = reducer(state, { type: 'START_GAME' });
      if (nextState !== state) {
        setState(nextState, 'host:start-game');
      }
    },
    resetRoom() {
      state = createHostGameState(roomId, makeGameId(roomId));
      hostPlayerId = null;
      const identity = loadHostIdentity(roomId);
      if (identity?.clientNonce) {
        hostPlayerId = ensureHostPlayer(identity.displayName || 'Player 1', true);
      }
      broadcastState('host:reset-room');
    },
    broadcast(data: unknown) {
      connections.forEach(({ connection }) => {
        if (connection.open) {
          connection.send(data);
        }
      });
      emit(snapshot.phase, `host:broadcast:${stringifyEvent(data)}`, null);
    },
    send(peerId: string, data: unknown) {
      const joined = connections.get(peerId);
      if (joined?.connection.open) {
        joined.connection.send(data);
        emit(snapshot.phase, `host:send:${peerId}:${stringifyEvent(data)}`, null);
      }
    },
    destroy() {
      destroyed = true;
      connections.forEach(({ connection }) => connection.close());
      connections.clear();
      peer?.destroy();
      snapshot = {
        ...snapshot,
        phase: 'closed',
        lastEvent: 'host:destroy',
      };
      listeners.forEach((listener) => listener(snapshot));
    },
  };
}
