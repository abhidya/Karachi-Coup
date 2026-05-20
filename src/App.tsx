import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Field, Panel, Pill, Row, Stack } from './components/Ui';
import { createPeerClient, type ClientNetworkSnapshot, type PeerClientHandle } from './network/peerClient';
import { createPeerHost, type HostNetworkSnapshot, type PeerHostHandle } from './network/peerHost';

type RouteName = 'home' | 'host' | 'join' | 'lobby' | 'game' | 'burn' | 'return' | 'game-over';
type Role = 'host' | 'player';
type LobbyMember = { id: string; name: string; role: Role | 'spectator' };

type SessionState = {
  roomId: string;
  role: Role | null;
  playerName: string;
  members: LobbyMember[];
  turn: string;
  score: number;
  log: string[];
};

const DEFAULT_SESSION: SessionState = {
  roomId: '',
  role: null,
  playerName: 'Player',
  members: [],
  turn: 'Waiting for players',
  score: 0,
  log: ['Ready to start a room.'],
};

function readHashRoute(): { route: RouteName; roomId: string } {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const route = (['home', 'host', 'join', 'lobby', 'game', 'burn', 'return', 'game-over'] as const).includes(
    path as RouteName,
  )
    ? (path as RouteName)
    : 'home';

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
  // Compatibility fail-safe: use Web Crypto when available, but keep the shell usable in
  // constrained browsers and test harnesses that do not expose a full crypto surface.
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
      })
      .catch((error: unknown) => {
        // Fail-safe snapshot: surface the bootstrap error in UI state instead of throwing
        // during render, so the shell can still load and show a recoverable error message.
        onSnapshot({
          phase: 'error',
          roomId,
          peerId: null,
          peers: [],
          lastEvent: 'host:bootstrap:error',
          error: error instanceof Error ? error.message : 'Unable to start host session.',
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

function usePeerClient(roomId: string | null, enabled: boolean, onSnapshot: (snapshot: ClientNetworkSnapshot) => void) {
  const handleRef = useRef<PeerClientHandle | null>(null);

  useEffect(() => {
    if (!enabled || !roomId) {
      return undefined;
    }

    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    void createPeerClient(roomId)
      .then((handle) => {
        if (cancelled) {
          handle.destroy();
          return;
        }

        handleRef.current = handle;
        unsubscribe = handle.subscribe(onSnapshot);
      })
      .catch((error: unknown) => {
        // Fail-safe snapshot: surface the bootstrap error in UI state instead of throwing
        // during render, so the shell can still load and show a recoverable error message.
        onSnapshot({
          phase: 'error',
          roomId,
          peerId: null,
          connectedTo: null,
          lastMessage: 'client:bootstrap:error',
          error: error instanceof Error ? error.message : 'Unable to start client session.',
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

function statusTone(value: string | null | undefined) {
  if (!value) return 'neutral';
  if (value.includes('error')) return 'danger';
  if (value.includes('connected') || value.includes('ready')) return 'success';
  if (value.includes('burn') || value.includes('game-over')) return 'warn';
  return 'neutral';
}

function phaseTone(phase: string | null | undefined) {
  if (!phase) return 'neutral';
  if (phase === 'error') return 'danger';
  if (phase === 'ready' || phase === 'connected') return 'success';
  if (phase === 'starting' || phase === 'connecting') return 'warn';
  return 'neutral';
}

function joinNames(members: LobbyMember[]) {
  return members.length ? members.map((member) => member.name).join(' · ') : 'No players yet';
}

export function App() {
  const { route, roomId: routeRoomId, navigate } = useHashRoute();
  const [roomId, setRoomId] = useState(routeRoomId);
  const [joinCode, setJoinCode] = useState(routeRoomId);
  const [playerName, setPlayerName] = useState(DEFAULT_SESSION.playerName);
  const [session, setSession] = useState<SessionState>(DEFAULT_SESSION);
  const [hostSnapshot, setHostSnapshot] = useState<HostNetworkSnapshot | null>(null);
  const [clientSnapshot, setClientSnapshot] = useState<ClientNetworkSnapshot | null>(null);

  const isHostScreen = session.role === 'host' && !!session.roomId;
  const isClientScreen = session.role === 'player' && !!session.roomId;

  const hostHandleRef = usePeerHost(roomId || null, isHostScreen, setHostSnapshot);
  const clientHandleRef = usePeerClient(roomId || null, isClientScreen, setClientSnapshot);

  useEffect(() => {
    if (routeRoomId) {
      setRoomId(routeRoomId);
      setJoinCode(routeRoomId);
      setSession((current) => ({
        ...current,
        roomId: routeRoomId,
      }));
    }
  }, [routeRoomId]);

  useEffect(() => {
    if (hostSnapshot?.peerId) {
      setRoomId(hostSnapshot.peerId);
    }
  }, [hostSnapshot?.peerId]);

  useEffect(() => {
    if (hostSnapshot?.phase === 'ready') {
      setSession((current) => ({
        ...current,
        members: current.members.some((member) => member.role === 'host') ? current.members : [
          { id: hostSnapshot.peerId ?? current.roomId, name: 'You (Host)', role: 'host' },
          ...current.members,
        ],
        log: [`Room ready: ${hostSnapshot.peerId ?? current.roomId}`, ...current.log].slice(0, 6),
        turn: 'Lobby open',
      }));
    }
  }, [hostSnapshot?.peerId, hostSnapshot?.phase]);

  useEffect(() => {
    if (clientSnapshot?.phase === 'connected') {
      setSession((current) => ({
        ...current,
        log: [`Connected to room ${clientSnapshot.connectedTo ?? current.roomId}`, ...current.log].slice(0, 6),
        turn: 'Connected',
      }));
    }
  }, [clientSnapshot?.connectedTo, clientSnapshot?.phase]);

  const roomLink = useMemo(() => (session.roomId ? formatRoomLink(session.roomId) : ''), [session.roomId]);

  const createRoom = () => {
    const nextRoomId = generateRoomId();
    setRoomId(nextRoomId);
    setJoinCode(nextRoomId);
    setSession({
      roomId: nextRoomId,
      role: 'host',
      playerName,
      members: [{ id: 'host', name: `${playerName} (Host)`, role: 'host' }],
      turn: 'Lobby open',
      score: 0,
      log: [`Created room ${nextRoomId}`, 'Waiting for players.'],
    });
    navigate('lobby', nextRoomId);
  };

  const joinRoom = () => {
    const nextRoomId = joinCode.trim().toUpperCase();
    if (!nextRoomId) return;
    setRoomId(nextRoomId);
    setSession({
      roomId: nextRoomId,
      role: 'player',
      playerName,
      members: [{ id: 'self', name: playerName, role: 'player' }],
      turn: 'Joining room',
      score: 0,
      log: [`Joining room ${nextRoomId}`],
    });
    navigate('lobby', nextRoomId);
  };

  const go = (nextRoute: RouteName) => navigate(nextRoute, session.roomId || roomId || undefined);

  const sendHostPing = () => {
    hostHandleRef.current?.broadcast({
      type: 'shell:ping',
      roomId: session.roomId,
      turn: session.turn,
      timestamp: Date.now(),
    });
    setSession((current) => ({
      ...current,
      log: [`Pinged room at ${new Date().toLocaleTimeString()}`, ...current.log].slice(0, 6),
    }));
  };

  const sendClientReady = () => {
    clientHandleRef.current?.send({
      type: 'player:ready',
      roomId: session.roomId,
      playerName: session.playerName,
      timestamp: Date.now(),
    });
    setSession((current) => ({
      ...current,
      log: [`Ready signal sent at ${new Date().toLocaleTimeString()}`, ...current.log].slice(0, 6),
    }));
  };

  const addLobbyMember = (label: string, role: LobbyMember['role'] = 'spectator') => {
    setSession((current) => ({
      ...current,
      members: [
        ...current.members,
        { id: `${role}-${current.members.length + 1}`, name: label, role },
      ],
      log: [`Added ${label}`, ...current.log].slice(0, 6),
    }));
  };

  const removeLobbyMember = () => {
    setSession((current) => ({
      ...current,
      members: current.members.length > 1 ? current.members.slice(0, -1) : current.members,
      log: ['Removed last player', ...current.log].slice(0, 6),
    }));
  };

  const markOutcome = (message: string, nextRoute: RouteName = 'game-over') => {
    setSession((current) => ({
      ...current,
      score: current.score + 1,
      log: [message, ...current.log].slice(0, 6),
    }));
    go(nextRoute);
  };

  return (
    <main className="app-shell">
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="app-shell__inner">
        <header className="app-header">
          <div>
            <p className="eyebrow">Karachi Coup</p>
            <h1>Mobile-first room shell for host, lobby, and play flows.</h1>
            <p className="lede">
              Hash-based navigation keeps GitHub Pages happy while the PeerJS wrappers hold the network state shape
              for future gameplay wiring.
            </p>
          </div>
          <div className="app-header__meta">
            <Pill tone={phaseTone(hostSnapshot?.phase ?? clientSnapshot?.phase ?? 'idle')}>
              {hostSnapshot?.phase ?? clientSnapshot?.phase ?? 'idle'}
            </Pill>
            <Pill tone={statusTone(session.turn)}>{session.turn}</Pill>
          </div>
        </header>

        <section className="screen-switcher">
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
            <Button variant={route === 'lobby' ? 'primary' : 'secondary'} onClick={() => navigate('lobby', session.roomId || roomId || undefined)}>
              Lobby
            </Button>
          </Row>
        </section>

        {route === 'home' ? (
          <Stack gap="lg">
            <Panel eyebrow="Start here" title="Choose a room path">
              <Stack>
                <p>
                  Create a room as host or join with a room code. The shell keeps room state local and mirrors the
                  PeerJS snapshots for easy integration work.
                </p>
                <Row>
                  <Button onClick={() => navigate('host')}>Host a room</Button>
                  <Button variant="secondary" onClick={() => navigate('join')}>
                    Join a room
                  </Button>
                </Row>
              </Stack>
            </Panel>

            <Panel eyebrow="Current state" title="Session summary">
              <Stack gap="sm">
                <p>
                  Room: <strong>{session.roomId || '—'}</strong>
                </p>
                <p>
                  Players: <strong>{joinNames(session.members)}</strong>
                </p>
                <p>
                  Network: <strong>{hostSnapshot?.lastEvent ?? clientSnapshot?.lastMessage ?? 'idle'}</strong>
                </p>
              </Stack>
            </Panel>
          </Stack>
        ) : null}

        {route === 'host' ? (
          <Stack gap="lg">
            <Panel eyebrow="Host room" title="Create a public room">
              <Stack>
                <Field
                  label="Your name"
                  value={playerName}
                  onChange={setPlayerName}
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
            <Panel eyebrow="Networking" title="Host snapshot">
              <Stack gap="sm">
                <p>Room id: {session.roomId || roomId || 'Waiting for create room'}</p>
                <p>Peer id: {hostSnapshot?.peerId ?? 'Not opened yet'}</p>
                <p>Peers: {hostSnapshot?.peers.length ? hostSnapshot.peers.join(', ') : 'None connected'}</p>
                <p>Last event: {hostSnapshot?.lastEvent ?? 'Idle'}</p>
                {hostSnapshot?.error ? <p className="error-text">{hostSnapshot.error}</p> : null}
                <Row>
                  <Button variant="secondary" onClick={sendHostPing} disabled={!session.roomId}>
                    Broadcast ping
                  </Button>
                  <Button variant="ghost" onClick={() => addLobbyMember('Guest slot')}>
                    Add guest
                  </Button>
                </Row>
              </Stack>
            </Panel>
          </Stack>
        ) : null}

        {route === 'join' ? (
          <Stack gap="lg">
            <Panel eyebrow="Join room" title="Enter a room code">
              <Stack>
                <Field
                  label="Room code"
                  value={joinCode}
                  onChange={(value) => setJoinCode(value.toUpperCase())}
                  placeholder="AB12C"
                  inputMode="text"
                />
                <Field
                  label="Your name"
                  value={playerName}
                  onChange={setPlayerName}
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
            <Panel eyebrow="Networking" title="Client snapshot">
              <Stack gap="sm">
                <p>Target room: {joinCode || 'Waiting for code'}</p>
                <p>Peer id: {clientSnapshot?.peerId ?? 'Not opened yet'}</p>
                <p>Connected to: {clientSnapshot?.connectedTo ?? 'Not connected'}</p>
                <p>Last message: {clientSnapshot?.lastMessage ?? 'Idle'}</p>
                {clientSnapshot?.error ? <p className="error-text">{clientSnapshot.error}</p> : null}
                <Row>
                  <Button variant="secondary" onClick={sendClientReady} disabled={!session.roomId}>
                    Send ready
                  </Button>
                </Row>
              </Stack>
            </Panel>
          </Stack>
        ) : null}

        {route === 'lobby' ? (
          <Stack gap="lg">
            <Panel eyebrow="Lobby" title="Ready room">
              <Stack gap="sm">
                <Row>
                  <Pill tone="success">{session.role === 'host' ? 'Host' : session.role === 'player' ? 'Player' : 'Preview'}</Pill>
                  <Pill tone={phaseTone(hostSnapshot?.phase ?? clientSnapshot?.phase ?? 'idle')}>
                    {hostSnapshot?.phase ?? clientSnapshot?.phase ?? 'idle'}
                  </Pill>
                </Row>
                <p>
                  Room link: <strong>{roomLink || 'Create or join a room first'}</strong>
                </p>
                <p>Roster: {joinNames(session.members)}</p>
                <Row>
                  <Button onClick={() => go('game')} disabled={!session.roomId}>
                    Start game
                  </Button>
                  <Button variant="secondary" onClick={sendHostPing} disabled={session.role !== 'host'}>
                    Sync lobby
                  </Button>
                  <Button variant="ghost" onClick={() => addLobbyMember('New recruit')}>
                    Add player
                  </Button>
                  <Button variant="ghost" onClick={removeLobbyMember} disabled={session.members.length <= 1}>
                    Remove player
                  </Button>
                </Row>
              </Stack>
            </Panel>
            <Panel eyebrow="Log" title="Recent events">
              <ul className="event-list">
                {session.log.map((entry, index) => (
                  <li key={`${entry}-${index}`}>{entry}</li>
                ))}
              </ul>
            </Panel>
          </Stack>
        ) : null}

        {route === 'game' ? (
          <Stack gap="lg">
            <Panel eyebrow="Game" title="Table view">
              <Stack gap="sm">
                <Row>
                  <Pill tone="success">Turn: {session.turn}</Pill>
                  <Pill tone="neutral">Score: {session.score}</Pill>
                </Row>
                <p>This is the visual shell for the core game state. The actual game engine remains untouched.</p>
                <Row>
                  <Button onClick={() => go('burn')}>Go burn</Button>
                  <Button variant="secondary" onClick={() => markOutcome('Round resolved to return screen.', 'return')}>
                    Return card
                  </Button>
                </Row>
              </Stack>
            </Panel>
            <Panel eyebrow="Board" title="Players">
              <ul className="player-list">
                {session.members.map((member) => (
                  <li key={member.id}>
                    <span>{member.name}</span>
                    <small>{member.role}</small>
                  </li>
                ))}
              </ul>
            </Panel>
          </Stack>
        ) : null}

        {route === 'burn' ? (
          <Stack gap="lg">
            <Panel eyebrow="Burn" title="Choose a card to burn">
              <Stack gap="sm">
                <p>Two quick actions for the burn flow keep the shell testable before the game core is wired in.</p>
                <Row>
                  <Button onClick={() => markOutcome('Burned a card and moved to return.', 'return')}>Burn card</Button>
                  <Button variant="secondary" onClick={() => go('game')}>
                    Back to table
                  </Button>
                </Row>
              </Stack>
            </Panel>
          </Stack>
        ) : null}

        {route === 'return' ? (
          <Stack gap="lg">
            <Panel eyebrow="Jugaad return" title="Return from the side room">
              <Stack gap="sm">
                <p>The jugaad path is a lightweight return lane that keeps the shell navigation obvious.</p>
                <Row>
                  <Button onClick={() => markOutcome('Returned to the game-over screen.')}>Finish round</Button>
                  <Button variant="secondary" onClick={() => go('game')}>
                    Back to game
                  </Button>
                </Row>
              </Stack>
            </Panel>
          </Stack>
        ) : null}

        {route === 'game-over' ? (
          <Stack gap="lg">
            <Panel eyebrow="Game over" title="Round complete">
              <Stack gap="sm">
                <p>Final score: {session.score}</p>
                <p>Latest event: {session.log[0] ?? '—'}</p>
                <Row>
                  <Button onClick={() => navigate('lobby', session.roomId || roomId || undefined)}>Back to lobby</Button>
                  <Button variant="secondary" onClick={() => navigate('home')}>
                    Home
                  </Button>
                </Row>
              </Stack>
            </Panel>
          </Stack>
        ) : null}
      </div>
    </main>
  );
}
