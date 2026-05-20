import { useEffect, useRef, useState } from 'react';
import { Button, Field, Panel, Pill, Row, Stack } from './components/Ui';
import { GAME_THEME, labels } from './game/theme';
import type { ActionType, ClientMessage, HostLobbyPlayerView, PublicGameState } from './game/types';
import { createPeerClient, type ClientNetworkSnapshot, type PeerClientHandle } from './network/peerClient';
import { createPeerHost, type HostNetworkSnapshot, type PeerHostHandle } from './network/peerHost';
import { readSessionStorage, sessionStorageKey, writeSessionStorage } from './network/storage';

type RouteName = 'home' | 'host' | 'join' | 'lobby' | 'game';
type ConnectionMode = 'idle' | 'host' | 'client';

type StoredSession = {
  mode: ConnectionMode;
  roomId: string;
  displayName: string;
};

const ALL_ROUTES: RouteName[] = ['home', 'host', 'join', 'lobby', 'game'];
const TARGET_ACTIONS: readonly ActionType[] = ['KIRAYA_COLLECTION', 'POLICE_WALA_RAID', 'BHAI_KA_SCENE', 'FULL_BEIZZATI'];
const BLOCK_ROLES = ['MALIK_SAAB', 'BHAI', 'POLICE_WALA', 'MUMMA', 'ZARDAAR_CHOR'] as const;

function readHashRoute(): { route: RouteName; roomId: string } {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const route = (ALL_ROUTES as readonly string[]).includes(path) ? (path as RouteName) : 'home';
  return { route, roomId: params.get('room') ?? '' };
}

function routeHash(route: RouteName, roomId?: string) {
  const params = new URLSearchParams();
  if (roomId) {
    params.set('room', roomId);
  }
  const suffix = params.toString() ? `?${params.toString()}` : '';
  return `#/${route}${suffix}`;
}

function generateRoomId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(5);
  const generator = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (generator) {
    generator(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(bytes, (value) => alphabet[value % alphabet.length]).join('');
}

function formatRoomLink(roomId: string) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/lobby?room=${roomId}`;
}

function normalizeRoomCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

function phaseTone(value: string | null | undefined) {
  if (!value) return 'neutral';
  if (value.includes('error')) return 'danger';
  if (value.includes('synced') || value.includes('ready') || value.includes('connected') || value === 'joined') return 'success';
  if (value.includes('challenge') || value.includes('burn') || value.includes('game')) return 'warn';
  return 'neutral';
}

function statusTone(value: string | null | undefined) {
  if (!value) return 'neutral';
  if (value.includes('error')) return 'danger';
  if (value.includes('connected') || value.includes('ready') || value.includes('synced')) return 'success';
  return 'neutral';
}

function joinNames(members: HostLobbyPlayerView[]) {
  return members.length ? members.map((member) => member.name).join(' · ') : 'No players yet';
}

function snapshotActivity(snapshot: HostNetworkSnapshot | ClientNetworkSnapshot | null) {
  if (!snapshot) {
    return 'idle';
  }

  if ('lastMessage' in snapshot) {
    return snapshot.lastMessage ?? 'idle';
  }

  return snapshot.lastEvent ?? 'idle';
}

function useHashRoute() {
  const [routeState, setRouteState] = useState(readHashRoute);

  useEffect(() => {
    const onHashChange = () => setRouteState(readHashRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (route: RouteName, roomId?: string) => {
    window.location.hash = routeHash(route, roomId);
  };

  return { ...routeState, navigate };
}

function usePeerHost(roomId: string | null, enabled: boolean, onSnapshot: (snapshot: HostNetworkSnapshot) => void) {
  const handleRef = useRef<PeerHostHandle | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) {
      return undefined;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void createPeerHost(roomId)
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }

        handleRef.current = handle;
        unsubscribe = handle.subscribe(onSnapshot);
        onSnapshot(handle.snapshot);
      })
      .catch((error: unknown) => {
        onSnapshot({
          phase: 'error',
          roomId,
          peerId: null,
          peers: [],
          players: [],
          publicState: {
            roomCode: roomId as never,
            gameId: roomId as never,
            seq: 0,
            phase: 'LOBBY',
            activePlayerId: null,
            players: [],
            turnOrder: [],
            log: [],
            currentScene: 'Starting up',
            pendingAction: null,
            pendingChallenge: null,
            pendingBlock: null,
            pendingBurn: null,
            winnerId: null,
          },
          privateStates: {},
          lastEvent: 'host:bootstrap:error',
          error: error instanceof Error ? error.message : 'Unable to start host session.',
          restored: false,
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [enabled, onSnapshot, roomId]);

  return handleRef;
}

function usePeerClient(
  roomId: string | null,
  enabled: boolean,
  displayName: string,
  onSnapshot: (snapshot: ClientNetworkSnapshot) => void,
) {
  const handleRef = useRef<PeerClientHandle | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) {
      return undefined;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void createPeerClient(roomId, { displayName })
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }

        handleRef.current = handle;
        unsubscribe = handle.subscribe(onSnapshot);
        onSnapshot(handle.snapshot);
      })
      .catch((error: unknown) => {
        onSnapshot({
          phase: 'error',
          roomId,
          peerId: null,
          connectedTo: null,
          playerId: null,
          displayName,
          clientNonce: '',
          publicState: null,
          privateState: null,
          lastMessage: 'client:bootstrap:error',
          error: error instanceof Error ? error.message : 'Unable to start client session.',
          restored: false,
        });
      });

    return () => {
      cancelled = true;
      unsubscribe?.();
      handleRef.current?.destroy();
      handleRef.current = null;
    };
  }, [displayName, enabled, onSnapshot, roomId]);

  return handleRef;
}

function CopyButton({ value, label = 'Copy link' }: { value: string; label?: string }) {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      window.prompt('Copy this link', value);
    }
  };

  return (
    <Button variant="secondary" onClick={copy} disabled={!value}>
      {label}
    </Button>
  );
}

function SnapshotPill({ value }: { value: string | null | undefined }) {
  return <Pill tone={phaseTone(value)}>{value ?? 'idle'}</Pill>;
}

function actionLabel(actionType: ActionType) {
  return labels.actionLabels[actionType];
}

function gamePhaseLabel(phase: PublicGameState['phase']) {
  return labels.phaseLabels[phase];
}

function isTargetedAction(actionType: ActionType) {
  return TARGET_ACTIONS.includes(actionType);
}

export function App() {
  const { route, roomId: routeRoomId, navigate } = useHashRoute();
  const [mode, setMode] = useState<ConnectionMode>('idle');
  const [displayName, setDisplayName] = useState('Player');
  const [roomId, setRoomId] = useState(routeRoomId);
  const [joinCode, setJoinCode] = useState(routeRoomId);
  const [hostSnapshot, setHostSnapshot] = useState<HostNetworkSnapshot | null>(null);
  const [clientSnapshot, setClientSnapshot] = useState<ClientNetworkSnapshot | null>(null);

  const hostHandleRef = usePeerHost(roomId || null, mode === 'host', setHostSnapshot);
  const clientHandleRef = usePeerClient(roomId || null, mode === 'client', displayName, setClientSnapshot);

  useEffect(() => {
    if (routeRoomId) {
      setRoomId(routeRoomId);
      setJoinCode(routeRoomId);
    }
  }, [routeRoomId]);

  useEffect(() => {
    if (route !== 'home') {
      return;
    }

    const stored = readSessionStorage<StoredSession>(sessionStorageKey());
    if (!stored || stored.mode === 'idle') {
      return;
    }

    setDisplayName(stored.displayName);
    setRoomId(stored.roomId);
    setJoinCode(stored.roomId);
    setMode(stored.mode);
    navigate('lobby', stored.roomId);
  }, [navigate, route]);

  const activeSnapshot = mode === 'host' ? hostSnapshot : clientSnapshot;
  const publicState = activeSnapshot?.publicState ?? hostSnapshot?.publicState ?? clientSnapshot?.publicState ?? null;
  const privateState = clientSnapshot?.privateState ?? null;
  const hostPlayers: HostLobbyPlayerView[] = hostSnapshot?.players ?? publicState?.players?.map((player) => ({
    playerId: player.id,
    name: player.name,
    connected: player.connected,
    rupees: player.rupees,
    hiddenConnectionCount: player.hiddenConnectionCount,
    eliminated: player.eliminated,
  })) ?? [];
  const roomLink = roomId ? formatRoomLink(roomId) : '';
  const isGamePhase = publicState?.phase && publicState.phase !== 'LOBBY';
  const turnOwner = publicState?.players.find((player) => player.isTurn);
  const opponentId = publicState?.players.find((player) => player.id !== privateState?.playerId && !player.eliminated)?.id ?? null;

  useEffect(() => {
    if (mode === 'host' && hostSnapshot?.peerId && (route === 'host' || route === 'home')) {
      navigate('lobby', roomId);
    }
  }, [hostSnapshot?.peerId, mode, navigate, roomId, route]);

  useEffect(() => {
    if (mode === 'client' && clientSnapshot?.connectedTo && (route === 'join' || route === 'home')) {
      navigate('lobby', roomId);
    }
  }, [clientSnapshot?.connectedTo, mode, navigate, roomId, route]);

  useEffect(() => {
    if (isGamePhase && route !== 'game') {
      navigate('game', roomId);
    }
  }, [isGamePhase, navigate, route, roomId]);

  const createRoom = () => {
    const nextRoomId = generateRoomId();
    setRoomId(nextRoomId);
    setJoinCode(nextRoomId);
    setMode('host');
    writeSessionStorage<StoredSession>(sessionStorageKey(), {
      mode: 'host',
      roomId: nextRoomId,
      displayName,
    });
    navigate('lobby', nextRoomId);
  };

  const joinRoom = () => {
    const nextRoomId = normalizeRoomCode(joinCode);
    if (!nextRoomId) {
      return;
    }

    setRoomId(nextRoomId);
    setMode('client');
    writeSessionStorage<StoredSession>(sessionStorageKey(), {
      mode: 'client',
      roomId: nextRoomId,
      displayName,
    });
    navigate('lobby', nextRoomId);
  };

  const leaveRoom = () => {
    hostHandleRef.current?.destroy();
    clientHandleRef.current?.destroy();
    setMode('idle');
    setRoomId('');
    setJoinCode('');
    writeSessionStorage<StoredSession>(sessionStorageKey(), {
      mode: 'idle',
      roomId: '',
      displayName,
    });
    navigate('home');
  };

  const startGame = () => hostHandleRef.current?.startGame();
  const resetRoom = () => hostHandleRef.current?.resetRoom();
  const requestResync = () => clientHandleRef.current?.requestResync();

  const sendClientMessage = (message: ClientMessage) => {
    clientHandleRef.current?.send(message);
  };

  const declareAction = (actionType: ActionType) => {
    const targetId = isTargetedAction(actionType) ? opponentId : null;
    sendClientMessage({ type: 'DECLARE_ACTION', actionType, targetId });
  };

  const challenge = () => sendClientMessage({ type: 'CHALLENGE' });
  const passChallenge = () => sendClientMessage({ type: 'PASS_CHALLENGE' });
  const passBlock = () => sendClientMessage({ type: 'PASS_BLOCK' });
  const chooseBurn = (connectionId: string) =>
    sendClientMessage({ type: 'CHOOSE_CONNECTION_TO_BURN', connectionId });
  const chooseBlockRole = (role: (typeof BLOCK_ROLES)[number]) => sendClientMessage({ type: 'BLOCK', role });

  const publicSummary = publicState ? `${gamePhaseLabel(publicState.phase)} · ${publicState.currentScene}` : 'Waiting for room sync';

  return (
    <main className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="app-shell__inner">
        <header className="app-header">
          <div className="app-header__hero">
            <p className="eyebrow">{GAME_THEME.title}</p>
            <h1>Host, join, and play from real PeerJS rooms.</h1>
            <p className="lede">
              JOIN identity, resync, and public/private snapshots are wired into the live room flow so host and
              players see the same state after refreshes and reconnects.
            </p>
          </div>
          <div className="app-header__meta">
            <SnapshotPill value={activeSnapshot?.phase ?? mode} />
            <Pill tone={statusTone(publicState?.phase ?? null)}>{publicSummary}</Pill>
            <Pill tone={statusTone(snapshotActivity(activeSnapshot))}>{snapshotActivity(activeSnapshot)}</Pill>
          </div>
        </header>

        <nav className="screen-switcher">
          <Row gap="sm">
            <Button variant={route === 'home' ? 'primary' : 'secondary'} onClick={() => navigate('home')}>
              Home
            </Button>
            <Button variant={route === 'host' ? 'primary' : 'secondary'} onClick={() => navigate('host')}>
              Host room
            </Button>
            <Button variant={route === 'join' ? 'primary' : 'secondary'} onClick={() => navigate('join')}>
              Join room
            </Button>
            <Button variant={route === 'lobby' ? 'primary' : 'secondary'} onClick={() => navigate('lobby', roomId || undefined)}>
              Lobby
            </Button>
            <Button variant={route === 'game' ? 'primary' : 'secondary'} onClick={() => navigate('game', roomId || undefined)}>
              Game
            </Button>
          </Row>
        </nav>

        {route === 'home' ? (
          <Stack gap="lg">
            <section className="hero-grid">
              <Panel eyebrow="Start here" title="Choose a room path" footer={<Pill tone="neutral">PeerJS live</Pill>}>
                <Stack gap="lg">
                  <p>
                    Create a room as host, join with a room code, then let the room snapshots drive the lobby and game
                    screens.
                  </p>
                  <Row>
                    <Button onClick={() => navigate('host')}>Host a room</Button>
                    <Button variant="secondary" onClick={() => navigate('join')}>
                      Join a room
                    </Button>
                    <Button variant="ghost" onClick={leaveRoom} disabled={mode === 'idle'}>
                      Leave current room
                    </Button>
                  </Row>
                </Stack>
              </Panel>

              <Panel eyebrow="Session" title="Restore or start over">
                <Stack gap="sm">
                  <p>
                    Mode: <strong>{mode}</strong>
                  </p>
                  <p>
                    Room: <strong>{roomId || '—'}</strong>
                  </p>
                  <p>
                    Name: <strong>{displayName}</strong>
                  </p>
                  <p>
                    Network: <strong>{snapshotActivity(activeSnapshot)}</strong>
                  </p>
                </Stack>
              </Panel>
            </section>

            <Panel eyebrow="Rules" title="What is wired">
              <ul className="bullet-list">
                <li>Host and player identities are persisted with room-specific storage.</li>
                <li>JOIN messages assign stable room identities using client nonces.</li>
                <li>Host broadcasts public state and per-player private state after every change.</li>
                <li>Reconnects can request a resync without losing the room snapshot.</li>
              </ul>
            </Panel>
          </Stack>
        ) : null}

        {route === 'host' ? (
          <Stack gap="lg">
            <section className="hero-grid">
              <Panel eyebrow="Host room" title="Create a public room">
                <Stack gap="lg">
                  <Field
                    label="Your name"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Host name"
                  />
                  <Row>
                    <Button onClick={createRoom}>Create room</Button>
                    <Button variant="secondary" onClick={() => navigate('join')}>
                      Join instead
                    </Button>
                  </Row>
                </Stack>
              </Panel>

              <Panel eyebrow="Room link" title="Invite players">
                <Stack gap="sm">
                  <p>
                    Room code: <strong>{roomId || 'Waiting for create room'}</strong>
                  </p>
                  <p className="mono">#{roomLink ? roomLink.split('#/').at(-1) : 'Create a room first'}</p>
                  <Row>
                    <CopyButton value={roomLink} />
                    <Button variant="ghost" onClick={resetRoom} disabled={mode !== 'host'}>
                      Reset room
                    </Button>
                  </Row>
                </Stack>
              </Panel>
            </section>

            <Panel eyebrow="Networking" title="Host snapshot">
              <Stack gap="sm">
                <p>Peer id: {hostSnapshot?.peerId ?? 'Not opened yet'}</p>
                <p>Peers: {hostSnapshot?.peers.length ? hostSnapshot.peers.join(', ') : 'None connected'}</p>
                <p>Restored: {hostSnapshot?.restored ? 'Yes' : 'No'}</p>
                <p>Last event: {snapshotActivity(activeSnapshot)}</p>
                {hostSnapshot?.error ? <p className="error-text">{hostSnapshot.error}</p> : null}
                <Row>
                  <Button onClick={startGame} disabled={mode !== 'host' || !roomId}>
                    Start game
                  </Button>
                  <Button variant="secondary" onClick={resetRoom} disabled={mode !== 'host'}>
                    Rebuild lobby
                  </Button>
                  <Button variant="ghost" onClick={leaveRoom}>
                    Leave room
                  </Button>
                </Row>
              </Stack>
            </Panel>
          </Stack>
        ) : null}

        {route === 'join' ? (
          <Stack gap="lg">
            <section className="hero-grid">
              <Panel eyebrow="Join room" title="Enter a room code">
                <Stack gap="lg">
                  <Field
                    label="Room code"
                    value={joinCode}
                    onChange={(value) => setJoinCode(normalizeRoomCode(value))}
                    placeholder="AB12C"
                    inputMode="text"
                  />
                  <Field
                    label="Your name"
                    value={displayName}
                    onChange={setDisplayName}
                    placeholder="Player name"
                  />
                  <Row>
                    <Button onClick={joinRoom}>Join room</Button>
                    <Button variant="secondary" onClick={() => navigate('host')}>
                      Host instead
                    </Button>
                  </Row>
                </Stack>
              </Panel>

              <Panel eyebrow="Connection" title="Client snapshot">
                <Stack gap="sm">
                  <p>Target room: {joinCode || 'Waiting for code'}</p>
                  <p>Peer id: {clientSnapshot?.peerId ?? 'Not opened yet'}</p>
                  <p>Connected to: {clientSnapshot?.connectedTo ?? 'Not connected'}</p>
                  <p>Player id: {clientSnapshot?.playerId ?? 'Unassigned'}</p>
                  <p>Last message: {snapshotActivity(activeSnapshot)}</p>
                  {clientSnapshot?.error ? <p className="error-text">{clientSnapshot.error}</p> : null}
                  <Row>
                    <Button variant="secondary" onClick={requestResync} disabled={mode !== 'client'}>
                      Request resync
                    </Button>
                    <Button variant="ghost" onClick={leaveRoom}>
                      Leave room
                    </Button>
                  </Row>
                </Stack>
              </Panel>
            </section>
          </Stack>
        ) : null}

        {route === 'lobby' || route === 'game' ? (
          <Stack gap="lg">
            <section className="hero-grid">
              <Panel eyebrow="Room" title="Live snapshot">
                <Stack gap="sm">
                  <Row>
                    <Pill tone={phaseTone(publicState?.phase)}>{gamePhaseLabel(publicState?.phase ?? 'LOBBY')}</Pill>
                    <Pill tone="neutral">Room {roomId || '—'}</Pill>
                    <Pill tone="neutral">Turn {turnOwner?.name ?? 'Waiting'}</Pill>
                  </Row>
                  <p>
                    Scene: <strong>{publicState?.currentScene ?? 'Waiting for sync'}</strong>
                  </p>
                  <p>
                    Room link: <strong>{roomLink || 'Create or join a room first'}</strong>
                  </p>
                  <p>Roster: {joinNames(hostPlayers)}</p>
                  <Row>
                    {mode === 'host' ? (
                      <>
                        <Button onClick={startGame} disabled={!roomId}>
                          Start game
                        </Button>
                        <Button variant="secondary" onClick={resetRoom}>
                          Rebuild lobby
                        </Button>
                      </>
                    ) : null}
                    {mode === 'client' ? (
                      <>
                        <Button onClick={requestResync}>Request resync</Button>
                        <Button variant="secondary" onClick={leaveRoom}>
                          Leave room
                        </Button>
                      </>
                    ) : null}
                  </Row>
                </Stack>
              </Panel>

              <Panel eyebrow="Players" title="Table roster">
                <ul className="player-list">
                  {publicState?.players.map((player) => (
                    <li key={player.id} className={player.isTurn ? 'player-list__row player-list__row--active' : 'player-list__row'}>
                      <div>
                        <strong>{player.name}</strong>
                        <small>{player.id}</small>
                      </div>
                      <div className="player-list__meta">
                        <Pill tone={player.eliminated ? 'danger' : player.isTurn ? 'success' : 'neutral'}>
                          {player.eliminated ? 'Out' : player.isTurn ? 'Turn' : 'Ready'}
                        </Pill>
                        <span>{player.rupees}₹</span>
                        <span>{player.hiddenConnectionCount} cards</span>
                      </div>
                    </li>
                  )) ?? <li>No players yet</li>}
                </ul>
              </Panel>
            </section>

            <section className="hero-grid">
              <Panel eyebrow="Log" title="Recent events">
                <ul className="event-list">
                  {publicState?.log.map((entry) => (
                    <li key={entry.id}>{entry.text}</li>
                  )) ?? <li>Waiting for room sync.</li>}
                </ul>
              </Panel>

              <Panel eyebrow="Private" title="Your snapshot">
                {privateState ? (
                  <Stack gap="sm">
                    <Row>
                      <Pill tone={statusTone(privateState.phase)}>{privateState.phase}</Pill>
                      <Pill tone="neutral">{privateState.rupees}₹</Pill>
                      <Pill tone="neutral">{privateState.hiddenConnections.length} hidden</Pill>
                    </Row>
                    <p>
                      Player: <strong>{privateState.playerId}</strong>
                    </p>
                    <p>
                      Elimination: <strong>{privateState.eliminated ? 'Eliminated' : 'Alive'}</strong>
                    </p>
                    <p>
                      Actions:{' '}
                      <strong>{privateState.availableActions.length ? privateState.availableActions.map(actionLabel).join(', ') : 'None'}</strong>
                    </p>
                    {privateState.pendingBurn ? (
                      <Stack gap="sm">
                        <p>Choose a connection to burn:</p>
                        <Row>
                          {privateState.hiddenConnections.map((card) => (
                            <Button key={card.id} onClick={() => chooseBurn(card.id)} variant="danger">
                              Burn {card.role}
                            </Button>
                          ))}
                        </Row>
                      </Stack>
                    ) : null}
                    {privateState.pendingJugaad ? (
                      <p className="muted">Zardaar Jugaad return is pending for {privateState.pendingJugaad.playerId}.</p>
                    ) : null}
                  </Stack>
                ) : (
                  <p className="muted">Join a room to see your private snapshot.</p>
                )}
              </Panel>
            </section>

            <section className="hero-grid">
              <Panel eyebrow="Actions" title="Game controls">
                <Stack gap="sm">
                  <Row>
                    {privateState?.availableActions.map((actionType) => (
                      <Button key={actionType} onClick={() => declareAction(actionType)} disabled={mode !== 'client'}>
                        {actionLabel(actionType)}
                      </Button>
                    )) ?? null}
                  </Row>
                  <Row>
                    <Button onClick={challenge} disabled={mode !== 'client'}>
                      Challenge
                    </Button>
                    <Button variant="secondary" onClick={passChallenge} disabled={mode !== 'client'}>
                      Pass challenge
                    </Button>
                    <Button variant="ghost" onClick={passBlock} disabled={mode !== 'client'}>
                      Pass block
                    </Button>
                    <Button variant="ghost" onClick={requestResync}>
                      Resync
                    </Button>
                  </Row>
                  <Row>
                    {BLOCK_ROLES.map((role) => (
                      <Button key={role} variant="secondary" onClick={() => chooseBlockRole(role)} disabled={mode !== 'client'}>
                        Block as {role}
                      </Button>
                    ))}
                  </Row>
                </Stack>
              </Panel>

              <Panel eyebrow="Host view" title="Public / private routing">
                <Stack gap="sm">
                  <p>
                    Public snapshot: <strong>{publicState?.currentScene ?? 'Waiting'}</strong>
                  </p>
                  <p>
                    Private snapshot: <strong>{privateState?.phase ?? 'Unassigned'}</strong>
                  </p>
                  <p>
                    Routing: <strong>{mode === 'host' ? 'Host broadcast' : mode === 'client' ? 'Player inbox' : 'Idle'}</strong>
                  </p>
                  <p>
                    Persistence: <strong>{hostSnapshot?.restored || clientSnapshot?.restored ? 'Restored' : 'Fresh'}</strong>
                  </p>
                </Stack>
              </Panel>
            </section>
          </Stack>
        ) : null}

        {route === 'home' ? null : (
          <footer className="screen-footer">
            <Button variant="ghost" onClick={leaveRoom} disabled={mode === 'idle'}>
              Leave room
            </Button>
            <Pill tone="neutral">{mode}</Pill>
          </footer>
        )}
      </div>
    </main>
  );
}
