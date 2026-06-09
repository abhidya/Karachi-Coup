export const ROLES = ['MALIK_SAAB', 'BHAI', 'POLICE_WALA', 'ZARDAAR_CHOR', 'MUMMA'] as const;
export type Role = (typeof ROLES)[number];

export const ACTION_TYPES = [
  'CHAI_PAISA',
  'RISHTEDAAR_HELP',
  'KIRAYA_COLLECTION',
  'POLICE_WALA_RAID',
  'BHAI_KA_SCENE',
  'ZARDAAR_JUGAAD',
  'FULL_BEIZZATI',
] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export const GAME_PHASES = [
  'LOBBY',
  'DEALING',
  'TURN_START',
  'ACTION_DECLARED',
  'CHALLENGE_WINDOW',
  'BLOCK_WINDOW',
  'AWAITING_BURN',
  'AWAITING_JUGAAD_RETURN',
  'RESOLVE_ACTION',
  'TURN_END',
  'GAME_OVER',
] as const;
export type GamePhase = (typeof GAME_PHASES)[number];

export type PlayerId = string & { readonly __brand: 'PlayerId' };
export type GameId = string & { readonly __brand: 'GameId' };
export type RoomCode = string & { readonly __brand: 'RoomCode' };
export type ConnectionCardId = string & { readonly __brand: 'ConnectionCardId' };
export type ClientNonce = string & { readonly __brand: 'ClientNonce' };

export interface ConnectionCard {
  id: ConnectionCardId;
  role: Role;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  clientNonce: ClientNonce;
  rupees: number;
  hiddenConnections: ConnectionCard[];
  revealedConnections: Role[];
  connected: boolean;
  eliminated: boolean;
}

export interface PendingAction {
  actionId: string;
  actorId: PlayerId;
  actionType: ActionType;
  targetId: PlayerId | null;
  claimedRole: Role | null;
  cost: number;
  challengeable: boolean;
  blockRoles: Role[];
  needsTarget: boolean;
}

export type ChallengeSource = 'action' | 'block';
export type ChallengeResponse = 'challenged' | 'passed';

export interface PendingChallenge {
  source: ChallengeSource;
  kind: ChallengeSource;
  actionId: string;
  claimantId: PlayerId;
  claimedRole: Role;
  challengerId: PlayerId | null;
  eligibleChallengers: PlayerId[];
  responses: Partial<Record<PlayerId, ChallengeResponse>>;
}

export interface PendingBlock {
  actionId: string;
  blockerId: PlayerId;
  blockingRole: Role;
  targetId: PlayerId | null;
  eligibleChallengers: PlayerId[];
  responses: Partial<Record<PlayerId, ChallengeResponse>>;
}

export interface PendingBurn {
  playerId: PlayerId;
  reason: 'challenge-loss' | 'action-loss' | 'full-beizzati' | 'coup' | 'assassinate';
  continueTo: 'continue_action' | 'continue_block' | 'turn_end' | 'game_over';
  actionId?: string;
}

export interface PendingJugaad {
  playerId: PlayerId;
  drawnConnections: ConnectionCard[];
  drawnCards: ConnectionCard[];
}

export type PrivatePrompt =
  | {
      type: 'CHALLENGE_ACTION';
      actionId: string;
      actorId: PlayerId;
      actionType: ActionType;
      claimedRole: Role;
      message: string;
    }
  | {
      type: 'BLOCK_ACTION';
      actionId: string;
      actorId: PlayerId;
      actionType: ActionType;
      targetId: PlayerId | null;
      legalBlockRoles: Role[];
      message: string;
    }
  | {
      type: 'CHALLENGE_BLOCK';
      actionId: string;
      blockerId: PlayerId;
      blockingRole: Role;
      message: string;
    }
  | {
      type: 'BURN_CONNECTION';
      playerId: PlayerId;
      message: string;
    }
  | {
      type: 'JUGAAD_RETURN';
      playerId: PlayerId;
      drawnConnections: ConnectionCard[];
      message: string;
    }
  | null;

export interface GameLogEntry {
  id: string;
  text: string;
}

export interface HostGameState {
  roomCode: RoomCode;
  roomId: string;
  gameId: GameId;
  seq: number;
  phase: GamePhase;
  playersById: Record<PlayerId, PlayerState>;
  turnOrder: PlayerId[];
  activePlayerId: PlayerId | null;
  deck: ConnectionCard[];
  discardPile: ConnectionCard[];
  pendingAction: PendingAction | null;
  pendingChallenge: PendingChallenge | null;
  pendingBlock: PendingBlock | null;
  pendingBurn: PendingBurn | null;
  pendingJugaad: PendingJugaad | null;
  /** Players who have declined to block during the current (multi-blocker) BLOCK_WINDOW. */
  blockPasses?: PlayerId[];
  log: GameLogEntry[];
  winnerId: PlayerId | null;
}

export interface ActionEvent {
  type: 'DECLARE_ACTION';
  action: PendingAction;
}

export interface BlockEvent {
  type: 'BLOCK';
  block: PendingBlock;
}

export interface PlayerPublicState {
  id: PlayerId;
  name: string;
  rupees: number;
  hiddenConnectionCount: number;
  revealedConnections: Role[];
  connected: boolean;
  eliminated: boolean;
  isTurn: boolean;
}

export interface PublicGameState {
  roomCode: RoomCode;
  gameId: GameId;
  seq: number;
  phase: GamePhase;
  activePlayerId: PlayerId | null;
  players: PlayerPublicState[];
  turnOrder: PlayerId[];
  log: GameLogEntry[];
  currentScene: string;
  pendingAction: PendingAction | null;
  pendingChallenge: PendingChallenge | null;
  pendingBlock: PendingBlock | null;
  pendingBurn: PendingBurn | null;
  winnerId: PlayerId | null;
}

export interface PrivatePlayerState {
  roomCode: RoomCode;
  gameId: GameId;
  seq: number;
  phase: GamePhase;
  playerId: PlayerId;
  hiddenConnections: ConnectionCard[];
  rupees: number;
  connected: boolean;
  eliminated: boolean;
  isTurn: boolean;
  availableActions: ActionType[];
  prompt: PrivatePrompt;
  pendingAction: PendingAction | null;
  pendingChallenge: PendingChallenge | null;
  pendingBlock: PendingBlock | null;
  pendingBurn: PendingBurn | null;
  pendingJugaad: PendingJugaad | null;
}

export interface HostLobbyPlayerView {
  playerId: PlayerId;
  name: string;
  connected: boolean;
  rupees: number;
  hiddenConnectionCount: number;
  eliminated: boolean;
}

export interface ClientJoinMessage {
  type: 'JOIN';
  roomCode: string;
  displayName: string;
  clientNonce: string;
}

export interface ClientDeclareActionMessage {
  type: 'DECLARE_ACTION';
  actionType: ActionType;
  targetId?: string | null;
}

export interface ClientChallengeMessage {
  type: 'CHALLENGE';
}

export interface ClientPassChallengeMessage {
  type: 'PASS_CHALLENGE';
}

export interface ClientBlockMessage {
  type: 'BLOCK';
  role: Role;
}

export interface ClientPassBlockMessage {
  type: 'PASS_BLOCK';
}

export interface ClientBurnMessage {
  type: 'CHOOSE_CONNECTION_TO_BURN';
  connectionId: string;
}

export interface ClientJugaadReturnMessage {
  type: 'JUGAAD_RETURN';
  returnedConnectionIds: [string, string];
}

export interface ClientResyncMessage {
  type: 'REQUEST_RESYNC';
}

export type ClientMessage =
  | ClientJoinMessage
  | ClientDeclareActionMessage
  | ClientChallengeMessage
  | ClientPassChallengeMessage
  | ClientBlockMessage
  | ClientPassBlockMessage
  | ClientBurnMessage
  | ClientJugaadReturnMessage
  | ClientResyncMessage;

export interface ServerWelcomeMessage {
  type: 'WELCOME';
  roomCode: RoomCode;
  playerId: PlayerId;
}

export interface ServerPublicStateMessage {
  type: 'PUBLIC_STATE';
  state: PublicGameState;
}

export interface ServerPrivateStateMessage {
  type: 'PRIVATE_STATE';
  state: PrivatePlayerState;
}

export interface ServerErrorMessage {
  type: 'ERROR';
  message: string;
}

export type ServerMessage = ServerWelcomeMessage | ServerPublicStateMessage | ServerPrivateStateMessage | ServerErrorMessage;

export type GameEvent =
  | { type: 'START_GAME' }
  | { type: 'RESET_GAME' }
  | ActionEvent
  | { type: 'CHALLENGE'; challengerId: PlayerId }
  | { type: 'PASS_CHALLENGE'; playerId: PlayerId }
  | BlockEvent
  | { type: 'PASS_BLOCK'; playerId: PlayerId }
  | { type: 'CHOOSE_CONNECTION_TO_BURN'; playerId: PlayerId; connectionId: ConnectionCardId }
  | { type: 'JUGAAD_RETURN'; playerId: PlayerId; returnedConnectionIds: [ConnectionCardId, ConnectionCardId] }
  | { type: 'REQUEST_RESYNC' };

export interface ValidationIssue {
  path: string;
  message: string;
}

export interface ValidationResult {
  ok: true;
  event: GameEvent;
}

export interface ValidationError {
  ok: false;
  error: string;
}

export type ValidationOutcome = ValidationResult | ValidationError;

export interface ClientMessageResult {
  ok: boolean;
  reason?: string;
}
