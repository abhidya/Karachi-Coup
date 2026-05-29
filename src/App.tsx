import { useEffect, useRef, useState } from 'react';
import { Pill } from './components/Ui';
import { GAME_ASSETS } from './game/assets';
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
      instruction: 'Waiting for the host to sync the table.',
      waitingContext: 'No public table snapshot yet.',
      nextStep: 'Stay on this screen; the host will push the latest state.',
      actionGuidance: 'Actions appear here when your private turn snapshot arrives.',
      responseGuidance: 'Response buttons appear here when the host asks you to react.',
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
      instruction: 'You must burn one hidden Connection slot.',
      waitingContext: `Everyone is waiting on ${playerNameById(publicState, prompt.playerId)} to choose a hidden slot.`,
      nextStep: 'After the burn is confirmed, the host resolves the scene or moves to the next turn.',
      actionGuidance: 'No action is available while your burn decision is pending.',
      responseGuidance: 'Pick by slot only; role/card identity stays hidden until after confirmation.',
    };
  }

  if (prompt?.type === 'JUGAAD_RETURN') {
    return {
      instruction: 'Return exactly 2 Connections to finish Zardaar Jugaad.',
      waitingContext: `Everyone is waiting on ${playerNameById(publicState, prompt.playerId)} to return cards.`,
      nextStep: 'When two cards are returned, play advances to the next turn.',
      actionGuidance: 'No new action is available until Jugaad finishes.',
      responseGuidance: 'Choose exactly two cards from the Jugaad modal, then submit them together.',
    };
  }

  if (prompt?.type === 'CHALLENGE_ACTION') {
    return {
      instruction: 'Decide now: Call Bakwaas or let the action stand.',
      waitingContext: `Waiting on ${waiterNames} to answer the Bakwaas window.`,
      nextStep: 'If nobody calls Bakwaas, the table checks Setting blocks or resolves the action.',
      actionGuidance: 'You cannot declare an action during another player’s Bakwaas window.',
      responseGuidance: `Call Bakwaas only if you doubt ${actorName}'s ${labels.roleTheme[prompt.claimedRole].label}; wrong caller burns, failed claimant burns.`,
    };
  }

  if (prompt?.type === 'BLOCK_ACTION') {
    return {
      instruction: 'You may Use Setting or let the action through.',
      waitingContext: `Waiting on ${targetName === 'Someone' ? 'eligible blockers' : targetName} to answer the Setting window.`,
      nextStep: 'A Setting claim opens its own Bakwaas window; passing lets the action resolve.',
      actionGuidance: 'You cannot declare an action while deciding whether to block.',
      responseGuidance: `Use Setting claims ${prompt.legalBlockRoles.map((role) => labels.roleTheme[role].label).join(' or ')}; if challenged and false, you burn.`,
    };
  }

  if (prompt?.type === 'CHALLENGE_BLOCK') {
    return {
      instruction: 'Decide whether to Call Bakwaas on this Setting block.',
      waitingContext: `Waiting on ${waiterNames} to answer the block challenge window.`,
      nextStep: 'If the block survives, the action is stopped; if Bakwaas succeeds, the action continues.',
      actionGuidance: 'You cannot declare an action during a Setting Bakwaas window.',
      responseGuidance: `Challenge only if you doubt the blocker has ${labels.roleTheme[prompt.blockingRole].label}; the losing side burns.`,
    };
  }

  if (privateState?.availableActions.length) {
    return {
      instruction: privateState.availableActions.length === 1 && privateState.availableActions[0] === 'FULL_BEIZZATI'
        ? 'You have 10+ Rupees: Full Beizzati is mandatory.'
        : 'It is your turn. Choose one legal scene to declare.',
      waitingContext: 'The table is waiting on your action declaration.',
      nextStep: 'Choose a target when required, then the host opens Bakwaas/Setting windows if the rules allow.',
      actionGuidance: 'Pick one highlighted action. Each card shows cost, target, role claim, Bakwaas, and Setting consequences.',
      responseGuidance: 'No response is required from you right now; act from the Actions panel.',
    };
  }

  if (publicState.pendingBurn) {
    return {
      instruction: `${playerNameById(publicState, publicState.pendingBurn.playerId)} must burn one hidden Connection slot.`,
      waitingContext: `Waiting on ${playerNameById(publicState, publicState.pendingBurn.playerId)}; card identity remains hidden until they confirm.`,
      nextStep: 'After the burn, the host continues the current resolution path.',
      actionGuidance: 'Actions are paused while the burn is pending.',
      responseGuidance: 'No response is available unless this burn prompt is assigned to you.',
    };
  }

  if (publicState.pendingChallenge) {
    return {
      instruction: publicState.pendingChallenge.kind === 'block' ? 'A Setting claim can be challenged.' : 'An action claim can be challenged.',
      waitingContext: `Waiting on ${waiterNames} to Call Bakwaas or Let It Slide.`,
      nextStep: 'All passes continue the scene; one Bakwaas call forces proof and a burn.',
      actionGuidance: 'Actions are paused until the response window closes.',
      responseGuidance: 'No response is available unless you are an eligible challenger.',
    };
  }

  if (publicState.phase === 'BLOCK_WINDOW' && publicState.pendingAction) {
    return {
      instruction: `${actionLabel} may be stopped with Setting.`,
      waitingContext: publicState.pendingAction.targetId ? `Waiting on ${targetName} to Use Setting or pass.` : 'Waiting on eligible non-actors to Use Setting or pass.',
      nextStep: 'Passing resolves the action; using Setting may trigger Bakwaas on the blocker.',
      actionGuidance: 'Actions are paused while the Setting window is open.',
      responseGuidance: 'No response is available unless you are eligible to block.',
    };
  }

  if (publicState.phase === 'TURN_START') {
    return {
      instruction: `${actorName} is choosing a scene.`,
      waitingContext: `Waiting on ${actorName} to declare an action.`,
      nextStep: 'After declaration, the table will show who can Call Bakwaas or Use Setting.',
      actionGuidance: 'Actions appear only for the active player.',
      responseGuidance: 'No response is required until a claim or block is declared.',
    };
  }

  if (publicState.phase === 'GAME_OVER') {
    return {
      instruction: 'Game over. The winner is locked in.',
      waitingContext: 'No more responses are pending.',
      nextStep: 'Host can reset for another game.',
      actionGuidance: 'No actions are available after game over.',
      responseGuidance: 'No responses are available after game over.',
    };
  }

  return {
    instruction: `${gamePhaseLabel(publicState.phase)} is resolving.`,
    waitingContext: publicState.currentScene,
    nextStep: 'The host will advance the table after this step resolves.',
    actionGuidance: 'Actions are paused until your next turn.',
    responseGuidance: 'Response buttons appear here when you are the required responder.',
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
  const requestResync = () => clientHandleRef.current?.requestResync();
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
