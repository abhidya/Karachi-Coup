import { useEffect, useRef, useState } from 'react';
import { Pill } from './components/Ui';
import { GAME_ASSETS } from './game/assets';
import { MAX_PLAYERS, MIN_PLAYERS } from './game/rules';
import { GAME_THEME, labels } from './game/theme';
import type {
  ActionType,
  ClientMessage,
  HostLobbyPlayerView,
  PrivatePlayerState,
  PublicGameState,
  Role,
} from './game/types';
import { isTargetedAction } from './ui/actionRouting';
import { StatusFooter } from './ui/components/StatusFooter';
import { GameOverScreen } from './ui/screens/GameOverScreen';
import { HomeScreen } from './ui/screens/HomeScreen';
import { HostLobbyScreen } from './ui/screens/HostLobbyScreen';
import { JoinRoomScreen } from './ui/screens/JoinRoomScreen';
import { LobbyScreen } from './ui/screens/LobbyScreen';
import { GameScreen } from './ui/screens/GameScreen';
import { RulesModal } from './ui/components/RulesModal';
import { formatRoomLink } from './routing';
import { createPeerClient, type ClientNetworkSnapshot, type PeerClientHandle } from './network/peerClient';
import { createPeerHost, type HostNetworkSnapshot, type PeerHostHandle } from './network/peerHost';
import { readSessionStorage, sessionStorageKey, writeSessionStorage } from './network/storage';
import { readNetworkDiagnostic } from './network/diagnostics';


type GameplayGuide = {
  instruction: string;
  waitingContext: string;
  nextStep: string;
  actionGuidance: string;
  responseGuidance: string;
};

function playerNameById(publicState: PublicGameState | null, playerId: string | null | undefined) {
  if (!playerId) return 'Someone';
  return publicState?.players.find((player) => player.id === playerId)?.name ?? 'Someone';
}

function listNames(publicState: PublicGameState | null, playerIds: readonly string[]) {
  const names = playerIds.map((playerId) => playerNameById(publicState, playerId));
  if (names.length === 0) return 'the table';
  if (names.length === 1) return names[0]!;
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

function pendingChallengeWaiters(publicState: PublicGameState) {
  const challenge = publicState.pendingChallenge;
  if (!challenge) return [];
  return challenge.eligibleChallengers.filter((playerId) => challenge.responses[playerId] == null);
}

function buildGameplayGuide(publicState: PublicGameState | null, privateState: PrivatePlayerState | null): GameplayGuide {
  if (!publicState) {
    return {
      instruction: 'Waiting for the host.',
      waitingContext: 'Room sync has not arrived yet.',
      nextStep: 'Keep this tab open.',
      actionGuidance: 'Your move appears here.',
      responseGuidance: 'Replies appear only when needed.',
    };
  }

  const actorName = playerNameById(publicState, publicState.pendingAction?.actorId ?? publicState.activePlayerId);
  const targetName = playerNameById(publicState, publicState.pendingAction?.targetId);
  const actionLabel = publicState.pendingAction ? labels.actionLabels[publicState.pendingAction.actionType] : 'scene';
  const waiters = pendingChallengeWaiters(publicState);
  const waiterNames = listNames(publicState, waiters);
  const prompt = privateState?.prompt ?? null;

  if (prompt?.type === 'BURN_CONNECTION') {
    return {
      instruction: 'Burn one hidden slot.',
      waitingContext: `Everyone is waiting on ${playerNameById(publicState, prompt.playerId)} to choose a hidden slot.`,
      nextStep: 'Pick a slot; then play continues.',
      actionGuidance: 'Burn first.',
      responseGuidance: 'Choose by slot. Card identity stays hidden.',
    };
  }

  if (prompt?.type === 'JUGAAD_RETURN') {
    return {
      instruction: 'Return 2 cards.',
      waitingContext: `Everyone is waiting on ${playerNameById(publicState, prompt.playerId)} to return cards.`,
      nextStep: 'Return 2; then play continues.',
      actionGuidance: 'Finish Jugaad first.',
      responseGuidance: 'Pick exactly 2 cards.',
    };
  }

  if (prompt?.type === 'CHALLENGE_ACTION') {
    return {
      instruction: 'Call Bakwaas?',
      waitingContext: `Waiting on ${waiterNames} to answer the Bakwaas window.`,
      nextStep: 'Call or pass.',
      actionGuidance: 'Respond first.',
      responseGuidance: `Call Bakwaas if you doubt ${actorName}'s ${labels.roleTheme[prompt.claimedRole].label}; wrong caller burns, failed claimant burns.`,
    };
  }

  if (prompt?.type === 'BLOCK_ACTION') {
    return {
      instruction: 'Use Setting?',
      waitingContext: `Waiting on ${targetName === 'Someone' ? 'eligible blockers' : targetName} to answer the Setting window.`,
      nextStep: 'Block or pass.',
      actionGuidance: 'Respond first.',
      responseGuidance: `Use Setting claims ${prompt.legalBlockRoles.map((role) => labels.roleTheme[role].label).join(' or ')}; if challenged and false, you burn.`,
    };
  }

  if (prompt?.type === 'CHALLENGE_BLOCK') {
    return {
      instruction: 'Challenge the Setting?',
      waitingContext: `Waiting on ${waiterNames} to answer the block challenge window.`,
      nextStep: 'Call or pass.',
      actionGuidance: 'Respond first.',
      responseGuidance: `Challenge only if you doubt the blocker has ${labels.roleTheme[prompt.blockingRole].label}; the losing side burns.`,
    };
  }

  if (privateState?.availableActions.length) {
    return {
      instruction: privateState.availableActions.length === 1 && privateState.availableActions[0] === 'FULL_BEIZZATI'
        ? 'You have 10+ Rupees: Full Beizzati is mandatory.'
        : 'Your turn. Pick one move.',
      waitingContext: 'Everyone is waiting for you.',
      nextStep: 'Pick a move. Target if asked.',
      actionGuidance: 'Tap a move card.',
      responseGuidance: 'No reply needed. Make your move.',
    };
  }

  if (publicState.pendingBurn) {
    return {
      instruction: `${playerNameById(publicState, publicState.pendingBurn.playerId)} must burn one hidden slot.`,
      waitingContext: `Waiting on ${playerNameById(publicState, publicState.pendingBurn.playerId)}; card identity remains hidden until they confirm.`,
      nextStep: 'After the burn, play continues.',
      actionGuidance: 'Paused for burn.',
      responseGuidance: 'Only the burning player acts.',
    };
  }

  if (publicState.pendingChallenge) {
    return {
      instruction: publicState.pendingChallenge.kind === 'block' ? 'Setting can be challenged.' : 'Action can be challenged.',
      waitingContext: `Waiting on ${waiterNames} to Call Bakwaas or Let It Slide.`,
      nextStep: 'Call or pass.',
      actionGuidance: 'Paused for replies.',
      responseGuidance: 'Only eligible challengers reply.',
    };
  }

  if (publicState.phase === 'BLOCK_WINDOW' && publicState.pendingAction) {
    return {
      instruction: `${actionLabel} can be stopped with Setting.`,
      waitingContext: publicState.pendingAction.targetId ? `Waiting on ${targetName} to Use Setting or pass.` : 'Waiting on eligible non-actors to Use Setting or pass.',
      nextStep: 'Block or pass.',
      actionGuidance: 'Paused for Setting.',
      responseGuidance: 'Only eligible blockers reply.',
    };
  }

  if (publicState.phase === 'TURN_START') {
    return {
      instruction: `${actorName} is choosing a move.`,
      waitingContext: `Waiting on ${actorName} to declare an action.`,
      nextStep: 'Then replies appear if needed.',
      actionGuidance: 'Only active player moves.',
      responseGuidance: 'No response is required until a claim or block is declared.',
    };
  }

  if (publicState.phase === 'GAME_OVER') {
    return {
      instruction: 'Game over. The winner is locked in.',
      waitingContext: 'No more responses are pending.',
      nextStep: 'Host can reset for another game.',
      actionGuidance: 'Game is done.',
      responseGuidance: 'Game is done.',
    };
  }

  return {
    instruction: `${gamePhaseLabel(publicState.phase)} resolving.`,
    waitingContext: publicState.currentScene,
    nextStep: 'Play continues automatically.',
    actionGuidance: 'Wait for your turn.',
    responseGuidance: 'Reply buttons appear when needed.',
  };
}

type RouteName = 'home' | 'host' | 'join' | 'lobby' | 'game';
type ConnectionMode = 'idle' | 'host' | 'client';

type StoredSession = {
  mode: ConnectionMode;
  roomId: string;
  displayName: string;
};

const ALL_ROUTES: RouteName[] = ['home', 'host', 'join', 'lobby', 'game'];

function readHashRoute(): { route: RouteName; roomId: string } {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path = '', query = ''] = raw.split('?');
  const params = new URLSearchParams(query);
  const route = (ALL_ROUTES as readonly string[]).includes(path) ? (path as RouteName) : 'home';
  return { route, roomId: params.get('room') ?? '' };
}

function routeHash(route: RouteName, roomId?: string) {
  const params = new URLSearchParams();
  if (roomId) params.set('room', roomId);
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

function snapshotActivity(snapshot: HostNetworkSnapshot | ClientNetworkSnapshot | null) {
  if (!snapshot) return 'idle';
  if ('lastMessage' in snapshot) return snapshot.lastMessage ?? 'idle';
  return snapshot.lastEvent ?? 'idle';
}

function gamePhaseLabel(phase: PublicGameState['phase'] | null | undefined) {
  return phase ? labels.phaseLabels[phase] : 'Waiting';
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
    if (!enabled || !roomId) return undefined;

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
    if (!enabled || !roomId) return undefined;

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

function buildLobbyPlayers(publicState: PublicGameState | null): HostLobbyPlayerView[] {
  return publicState?.players.map((player) => ({
    playerId: player.id,
    name: player.name,
    connected: player.connected,
    rupees: player.rupees,
    hiddenConnectionCount: player.hiddenConnectionCount,
    eliminated: player.eliminated,
  })) ?? [];
}

export function App() {
  const { route, roomId: routeRoomId, navigate } = useHashRoute();
  const [mode, setMode] = useState<ConnectionMode>('idle');
  const [displayName, setDisplayName] = useState('Player');
  const [roomId, setRoomId] = useState(routeRoomId);
  const [joinCode, setJoinCode] = useState(routeRoomId);
  const [hostSnapshot, setHostSnapshot] = useState<HostNetworkSnapshot | null>(null);
  const [clientSnapshot, setClientSnapshot] = useState<ClientNetworkSnapshot | null>(null);
  const [hostPlayerId, setHostPlayerId] = useState<string | null>(null);
  const [pendingActionType, setPendingActionType] = useState<ActionType | null>(null);
  const [pendingTargetId, setPendingTargetId] = useState('');
  const [jugaadReturnIds, setJugaadReturnIds] = useState<string[]>([]);
  const [showRules, setShowRules] = useState(false);

  const hostHandleRef = usePeerHost(roomId || null, mode === 'host', setHostSnapshot);
  const clientHandleRef = usePeerClient(roomId || null, mode === 'client', displayName, setClientSnapshot);

  useEffect(() => {
    if (routeRoomId) {
      setRoomId(routeRoomId);
      setJoinCode(routeRoomId);
    }
  }, [routeRoomId]);

  useEffect(() => {
    const stored = readSessionStorage<StoredSession>(sessionStorageKey());
    const storedMatchesRoute = Boolean(stored?.roomId && (!routeRoomId || stored.roomId === routeRoomId));

    if ((route === 'lobby' || route === 'game') && routeRoomId && stored?.roomId && stored.roomId !== routeRoomId) {
      setMode('idle');
      setRoomId(routeRoomId);
      setJoinCode(routeRoomId);
      setHostPlayerId(null);
      navigate('join', routeRoomId);
      return;
    }

    if (stored && stored.mode !== 'idle' && storedMatchesRoute) {
      setDisplayName(stored.displayName);
      setRoomId(stored.roomId);
      setJoinCode(stored.roomId);
      setMode(stored.mode);
      if (route === 'home') {
        navigate('lobby', stored.roomId);
      }
      return;
    }

    if ((route === 'lobby' || route === 'game') && routeRoomId && mode === 'idle') {
      navigate('join', routeRoomId);
    }
  }, [mode, navigate, route, routeRoomId]);

  const activeSnapshot = mode === 'host' ? hostSnapshot : clientSnapshot;
  const publicState = activeSnapshot?.publicState ?? hostSnapshot?.publicState ?? clientSnapshot?.publicState ?? null;
  const privateState = mode === 'host' ? (hostPlayerId ? hostSnapshot?.privateStates[hostPlayerId] ?? null : null) : clientSnapshot?.privateState ?? null;
  const hostPlayers = hostSnapshot?.players ?? buildLobbyPlayers(publicState);
  const roomLink = roomId ? formatRoomLink(roomId) : '';
  const isGamePhase = publicState?.phase && publicState.phase !== 'LOBBY';
  const turnOwner = publicState?.players.find((player) => player.isTurn);
  const currentPlayerId = privateState?.playerId ?? null;
  const livingOpponents =
    publicState?.players.filter((player) => player.id !== currentPlayerId && !player.eliminated) ?? [];
  const prompt = privateState?.prompt ?? null;
  const forcedActionType = privateState?.availableActions.length === 1 ? privateState.availableActions[0] ?? null : null;
  const gameplayGuide = buildGameplayGuide(publicState, privateState);
  const canStartGame = hostPlayers.length >= MIN_PLAYERS && hostPlayers.length <= MAX_PLAYERS;
  const roomLimitMessage =
    mode === 'host' && hostPlayers.length > MAX_PLAYERS
      ? `Game supports up to ${MAX_PLAYERS} players. Ask extra players to leave or reset the room before starting.`
      : null;
  const screenBackground =
    route === 'home'
      ? GAME_ASSETS.backgrounds.home
      : route === 'game' && publicState?.phase === 'GAME_OVER'
        ? GAME_ASSETS.backgrounds.gameOver
        : route === 'game'
          ? GAME_ASSETS.backgrounds.table
          : GAME_ASSETS.backgrounds.lobby;

  useEffect(() => {
    if (isGamePhase && route !== 'game') {
      navigate('game', roomId);
    }
  }, [isGamePhase, navigate, route, roomId]);

  useEffect(() => {
    if (!privateState?.pendingJugaad) {
      setJugaadReturnIds([]);
    }
  }, [privateState?.pendingJugaad]);

  useEffect(() => {
    if (pendingActionType && !privateState?.availableActions.includes(pendingActionType)) {
      setPendingActionType(null);
      setPendingTargetId('');
    }
  }, [pendingActionType, privateState?.availableActions]);

  useEffect(() => {
    if (mode !== 'host' || hostPlayerId) return;
    const handle = hostHandleRef.current;
    if (!handle || !displayName) return;
    const joinedId = handle.joinHostPlayer(displayName);
    setHostPlayerId((current) => (current === joinedId ? current : joinedId));
  }, [displayName, hostHandleRef, hostPlayerId, mode, hostSnapshot]);

  useEffect(() => {
    if (mode !== 'client') return undefined;

    const requestAutomaticResync = () => clientHandleRef.current?.requestResync();
    const requestWhenVisible = () => {
      if (document.visibilityState === 'visible') {
        requestAutomaticResync();
      }
    };
    const requestAfterPageRestore = (event: PageTransitionEvent) => {
      if (event.persisted) {
        requestAutomaticResync();
      }
    };

    window.addEventListener('online', requestAutomaticResync);
    window.addEventListener('pageshow', requestAfterPageRestore);
    document.addEventListener('visibilitychange', requestWhenVisible);

    return () => {
      window.removeEventListener('online', requestAutomaticResync);
      window.removeEventListener('pageshow', requestAfterPageRestore);
      document.removeEventListener('visibilitychange', requestWhenVisible);
    };
  }, [clientHandleRef, mode]);

  const createRoom = () => {
    const nextRoomId = generateRoomId();
    setRoomId(nextRoomId);
    setJoinCode(nextRoomId);
    setHostPlayerId(null);
    setMode('host');
    writeSessionStorage<StoredSession>(sessionStorageKey(), {
      mode: 'host',
      roomId: nextRoomId,
      displayName,
    });
    navigate('host', nextRoomId);
  };

  const joinRoom = () => {
    const nextRoomId = normalizeRoomCode(joinCode);
    if (!nextRoomId) return;

    setRoomId(nextRoomId);
    setHostPlayerId(null);
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
    setHostPlayerId(null);
    writeSessionStorage<StoredSession>(sessionStorageKey(), {
      mode: 'idle',
      roomId: '',
      displayName,
    });
    navigate('home');
  };

  const startGame = () => hostHandleRef.current?.startGame();
  const resetRoom = () => hostHandleRef.current?.resetRoom();
  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
    } catch {
      window.prompt('Copy this link', roomLink);
    }
  };

  const sendIntent = (message: ClientMessage) => {
    if (mode === 'host') {
      hostHandleRef.current?.sendLocal(message);
      return;
    }
    clientHandleRef.current?.send(message);
  };

  const declareAction = (actionType: ActionType) => {
    if (!privateState?.availableActions.includes(actionType)) return;
    if (isTargetedAction(actionType)) {
      setPendingActionType(actionType);
      setPendingTargetId('');
      return;
    }
    sendIntent({ type: 'DECLARE_ACTION', actionType, targetId: null });
  };

  const confirmTargetAction = () => {
    if (!pendingActionType || !pendingTargetId) return;
    sendIntent({ type: 'DECLARE_ACTION', actionType: pendingActionType, targetId: pendingTargetId });
    setPendingActionType(null);
    setPendingTargetId('');
  };

  const challenge = () => sendIntent({ type: 'CHALLENGE' });
  const passChallenge = () => sendIntent({ type: 'PASS_CHALLENGE' });
  const passBlock = () => sendIntent({ type: 'PASS_BLOCK' });
  const chooseBurn = (connectionId: string) => sendIntent({ type: 'CHOOSE_CONNECTION_TO_BURN', connectionId });
  const chooseBlockRole = (role: Role) => sendIntent({ type: 'BLOCK', role });
  const submitJugaad = () => {
    if (jugaadReturnIds.length !== 2) return;
    sendIntent({ type: 'JUGAAD_RETURN', returnedConnectionIds: [jugaadReturnIds[0]!, jugaadReturnIds[1]!] });
    setJugaadReturnIds([]);
  };
  const toggleJugaadCard = (connectionId: string) => {
    setJugaadReturnIds((current) => {
      if (current.includes(connectionId)) return current.filter((id) => id !== connectionId);
      if (current.length >= 2) return current;
      return [...current, connectionId];
    });
  };
  const cancelTargetPicker = () => {
    setPendingActionType(null);
    setPendingTargetId('');
  };

  const publicSummary = publicState ? `${gamePhaseLabel(publicState.phase)} · ${publicState.currentScene}` : 'Waiting for room sync';
  const connectionIssue = (() => {
    if (mode === 'client' && clientSnapshot?.phase === 'error') {
      const baseErr = clientSnapshot.error || 'Could not reach the room host. Ask the host to keep their tab open, then retry or create a new room.';
      const diagnostic = readNetworkDiagnostic();
      if (diagnostic) {
        return `${baseErr} Last network stage: ${diagnostic.stage} at ${diagnostic.at}`;
      }
      return baseErr;
    }
    return null;
  })();
  const activePlayerName = turnOwner?.name ?? null;
  const hostStatus = hostSnapshot ? `${hostSnapshot.phase} · ${snapshotActivity(hostSnapshot)}` : 'Not opened yet';
  const clientStatus = clientSnapshot ? `${clientSnapshot.phase} · ${snapshotActivity(clientSnapshot)}` : 'Not opened yet';

  return (
    <main className="app-shell" style={{ backgroundImage: `linear-gradient(180deg, rgba(6, 10, 18, 0.62), rgba(6, 10, 18, 0.86)), url(${screenBackground})` }}>
      <div className="app-shell__backdrop" aria-hidden="true" />
      <div className="app-shell__inner">
        <header className="app-header">
          <div className="app-header__hero">
            <p className="eyebrow">{GAME_THEME.title}</p>
            <h1>Bluff. Setting. Rupees. Full Beizzati.</h1>
            <p className="lede">
              Host runs the table. Players join by room code. Hidden Connections stay private, public snapshots stay
              clean, and every response prompt is driven by the host-authoritative P2P room.
            </p>
          </div>
          <div className="app-header__meta">
            <Pill tone={phaseTone(activeSnapshot?.phase ?? mode)}>{activeSnapshot?.phase ?? mode}</Pill>
            <Pill tone={statusTone(publicState?.phase ?? null)}>{publicSummary}</Pill>
            <Pill tone={statusTone(snapshotActivity(activeSnapshot))}>{snapshotActivity(activeSnapshot)}</Pill>
          </div>
        </header>

        {route === 'home' ? (
          <HomeScreen
            displayName={displayName}
            onDisplayNameChange={setDisplayName}
            onCreateRoom={createRoom}
            onJoinRoom={() => navigate('join')}
            onOpenRules={() => setShowRules(true)}
          />
        ) : null}

        {route === 'host' ? (
          <HostLobbyScreen
            roomCode={roomId}
            roomLink={roomLink}
            players={hostPlayers}
            hostStatus={hostStatus}
            canStart={canStartGame}
            onCopyRoomLink={copyRoomLink}
            onStartGame={startGame}
            onResetRoom={resetRoom}
            onCreateRoom={createRoom}
            onOpenRules={() => setShowRules(true)}
          />
        ) : null}

        {route === 'join' ? (
          <JoinRoomScreen
            joinCode={joinCode}
            displayName={displayName}
            onJoinCodeChange={(value) => setJoinCode(normalizeRoomCode(value))}
            onDisplayNameChange={setDisplayName}
            onJoinRoom={joinRoom}
            onCreateRoom={createRoom}
            clientStatus={clientStatus}
            connectionIssue={connectionIssue}
          />
        ) : null}

        {route === 'lobby' ? (
          <LobbyScreen
            roomCode={roomId}
            roomLink={roomLink}
            currentScene={publicState?.currentScene ?? 'Waiting for sync'}
            players={hostPlayers}
            phaseLabel={gamePhaseLabel(publicState?.phase ?? 'LOBBY')}
            turnOwnerName={activePlayerName ?? 'Waiting'}
            mode={mode}
            connectionIssue={connectionIssue}
            canStartGame={canStartGame}
            roomLimitMessage={roomLimitMessage}
            onStartGame={startGame}
            onResetRoom={resetRoom}
            onLeaveRoom={leaveRoom}
            onOpenRules={() => setShowRules(true)}
          />
        ) : null}

        {route === 'game' ? (
          <GameScreen
            currentScene={publicState?.currentScene ?? 'Waiting for sync'}
            phaseLabel={gamePhaseLabel(publicState?.phase ?? 'LOBBY')}
            publicState={publicState}
            tableInstruction={gameplayGuide.instruction}
            waitingContext={gameplayGuide.waitingContext}
            nextStep={gameplayGuide.nextStep}
            actionGuidance={gameplayGuide.actionGuidance}
            responseGuidance={gameplayGuide.responseGuidance}
            publicPlayers={publicState?.players ?? []}
            activePlayerName={activePlayerName}
            privateState={privateState}
            prompt={prompt}
            pendingActionType={pendingActionType}
            pendingTargetId={pendingTargetId}
            livingOpponents={livingOpponents}
            publicLog={publicState?.log ?? []}
            mode={mode}
            jugaadSelectedIds={jugaadReturnIds}
            onActionClick={declareAction}
            onChallenge={challenge}
            onPassChallenge={passChallenge}
            onPassBlock={passBlock}
            onChooseBlockRole={chooseBlockRole}
            onChooseBurn={chooseBurn}
            onToggleJugaad={toggleJugaadCard}
            onSubmitJugaad={submitJugaad}
            onSelectTarget={setPendingTargetId}
            onConfirmTarget={confirmTargetAction}
            onCancelTarget={cancelTargetPicker}
            onLeaveRoom={leaveRoom}
            onOpenRules={() => setShowRules(true)}
            forcedActionType={forcedActionType}
          />
        ) : null}

        {publicState?.phase === 'GAME_OVER' ? (
          <GameOverScreen
            winnerId={publicState.winnerId}
            players={publicState.players}
            winnerName={publicState.players.find((player) => player.id === publicState.winnerId)?.name ?? 'Unknown'}
            onNewGame={mode === 'host' ? resetRoom : undefined}
            onBackHome={() => navigate('home')}
          />
        ) : null}

        {route === 'home' ? null : <StatusFooter mode={mode} onLeaveRoom={leaveRoom} />}
        {showRules ? <RulesModal onClose={() => setShowRules(false)} /> : null}
      </div>
    </main>
  );
}
