import { useEffect, useRef, useState } from 'react';
import { Pill } from './components/Ui';
import { GAME_ASSETS } from './game/assets';
import { GAME_THEME, labels } from './game/theme';
import type {
  ActionType,
  ClientMessage,
  HostLobbyPlayerView,
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

function formatRoomLink(roomId: string) {
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#/lobby?room=${roomId}`;
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
    if (route !== 'home') return;

    const stored = readSessionStorage<StoredSession>(sessionStorageKey());
    if (!stored || stored.mode === 'idle') return;

    setDisplayName(stored.displayName);
    setRoomId(stored.roomId);
    setJoinCode(stored.roomId);
    setMode(stored.mode);
    navigate('lobby', stored.roomId);
  }, [navigate, route]);

  const activeSnapshot = mode === 'host' ? hostSnapshot : clientSnapshot;
  const publicState = activeSnapshot?.publicState ?? hostSnapshot?.publicState ?? clientSnapshot?.publicState ?? null;
  const privateState = clientSnapshot?.privateState ?? null;
  const hostPlayers = hostSnapshot?.players ?? buildLobbyPlayers(publicState);
  const roomLink = roomId ? formatRoomLink(roomId) : '';
  const isGamePhase = publicState?.phase && publicState.phase !== 'LOBBY';
  const turnOwner = publicState?.players.find((player) => player.isTurn);
  const currentPlayerId = privateState?.playerId ?? null;
  const livingOpponents =
    publicState?.players.filter((player) => player.id !== currentPlayerId && !player.eliminated) ?? [];
  const eligibleBlockRoles: Role[] =
    publicState?.pendingAction?.actionType === 'RISHTEDAAR_HELP'
      ? ['MALIK_SAAB']
      : publicState?.pendingAction?.actionType === 'POLICE_WALA_RAID'
        ? publicState?.pendingAction?.targetId === currentPlayerId
          ? ['POLICE_WALA', 'ZARDAAR_CHOR']
          : []
        : publicState?.pendingAction?.actionType === 'BHAI_KA_SCENE'
          ? publicState?.pendingAction?.targetId === currentPlayerId
            ? ['MUMMA']
            : []
          : [];
  const pendingChallenge = privateState?.pendingChallenge ?? null;
  const challengePrompt =
    pendingChallenge &&
    currentPlayerId &&
    pendingChallenge.claimantId !== currentPlayerId &&
    pendingChallenge.eligibleChallengers.includes(currentPlayerId)
      ? pendingChallenge
      : null;
  const canSeeBlockPrompt = Boolean(publicState?.phase === 'BLOCK_WINDOW' && eligibleBlockRoles.length);
  const activeBurnPrompt = privateState?.pendingBurn?.playerId === currentPlayerId ? privateState.pendingBurn : null;
  const activeJugaadPrompt = privateState?.pendingJugaad?.playerId === currentPlayerId ? privateState.pendingJugaad : null;
  const promptKind: 'idle' | 'challenge' | 'block' | 'block-challenge' =
    challengePrompt ? (publicState?.pendingChallenge?.kind === 'block' ? 'block-challenge' : 'challenge') : canSeeBlockPrompt ? 'block' : 'idle';
  const promptLabel =
    promptKind === 'challenge' && publicState?.pendingAction
      ? `Challenge ${labels.actionLabels[publicState.pendingAction.actionType]} from ${turnOwner?.name ?? 'the active player'}`
      : promptKind === 'block' && publicState?.pendingAction
        ? `Use Setting against ${labels.actionLabels[publicState.pendingAction.actionType]}`
        : promptKind === 'block-challenge' && publicState?.pendingBlock
          ? `Challenge ${labels.roleTheme[publicState.pendingBlock.blockingRole].label}`
          : undefined;
  const forcedActionType = privateState?.availableActions.length === 1 ? privateState.availableActions[0] ?? null : null;
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
    navigate('host', nextRoomId);
  };

  const joinRoom = () => {
    const nextRoomId = normalizeRoomCode(joinCode);
    if (!nextRoomId) return;

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
  const copyRoomLink = async () => {
    try {
      await navigator.clipboard.writeText(roomLink);
    } catch {
      window.prompt('Copy this link', roomLink);
    }
  };

  const sendClientMessage = (message: ClientMessage) => {
    clientHandleRef.current?.send(message);
  };

  const declareAction = (actionType: ActionType) => {
    if (!privateState?.availableActions.includes(actionType)) return;
    if (isTargetedAction(actionType)) {
      setPendingActionType(actionType);
      setPendingTargetId('');
      return;
    }
    sendClientMessage({ type: 'DECLARE_ACTION', actionType, targetId: null });
  };

  const confirmTargetAction = () => {
    if (!pendingActionType || !pendingTargetId) return;
    sendClientMessage({ type: 'DECLARE_ACTION', actionType: pendingActionType, targetId: pendingTargetId });
    setPendingActionType(null);
    setPendingTargetId('');
  };

  const challenge = () => sendClientMessage({ type: 'CHALLENGE' });
  const passChallenge = () => sendClientMessage({ type: 'PASS_CHALLENGE' });
  const passBlock = () => sendClientMessage({ type: 'PASS_BLOCK' });
  const chooseBurn = (connectionId: string) => sendClientMessage({ type: 'CHOOSE_CONNECTION_TO_BURN', connectionId });
  const chooseBlockRole = (role: Role) => sendClientMessage({ type: 'BLOCK', role });
  const submitJugaad = () => {
    if (jugaadReturnIds.length !== 2) return;
    sendClientMessage({ type: 'JUGAAD_RETURN', returnedConnectionIds: [jugaadReturnIds[0]!, jugaadReturnIds[1]!] });
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
              clean, and every response prompt is driven by the host-authoritative PeerJS room.
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
            canStart={hostPlayers.length >= 2}
            onCopyRoomLink={copyRoomLink}
            onStartGame={startGame}
            onResetRoom={resetRoom}
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
            onGoHost={() => navigate('host')}
            onRequestResync={requestResync}
            clientStatus={clientStatus}
            clientPlayerId={clientSnapshot?.playerId ?? ''}
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
            onStartGame={startGame}
            onResetRoom={resetRoom}
            onRequestResync={requestResync}
            onLeaveRoom={leaveRoom}
            onOpenRules={() => setShowRules(true)}
          />
        ) : null}

        {route === 'game' ? (
          <GameScreen
            currentScene={publicState?.currentScene ?? 'Waiting for sync'}
            phaseLabel={gamePhaseLabel(publicState?.phase ?? 'LOBBY')}
            publicPlayers={publicState?.players ?? []}
            activePlayerName={activePlayerName}
            privateState={privateState}
            eligibleBlockRoles={eligibleBlockRoles}
            activeBurnPrompt={activeBurnPrompt}
            activeJugaadPrompt={activeJugaadPrompt}
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
            promptKind={promptKind}
            promptLabel={promptLabel}
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
