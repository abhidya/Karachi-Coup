import type { ActionType, GamePhase, Role } from './types';

export const GAME_THEME = {
  title: 'Karachi Coup',
  subtitle: 'Pure core logic for cards, coins, and turn resolution.',
} as const;

export const ROLE_THEME: Readonly<Record<Role, { label: string; color: string; description: string }>> = {
  MALIK_SAAB: { label: 'Malik Saab', color: '#6f42c1', description: 'Claims tax and economic control.' },
  BHAI: { label: 'Bhai', color: '#d73a49', description: 'Handles forceful scenes and pressure.' },
  POLICE_WALA: { label: 'Police Wala', color: '#0366d6', description: 'Carries out raids and theft.' },
  MUMMA: { label: 'Mumma', color: '#b83280', description: 'Blocks unruly actions.' },
  ZARDAAR_CHOR: { label: 'Zardaar Chor', color: '#2f855a', description: 'Deals with clever exchanges.' },
};

export const labels = {
  roleTheme: ROLE_THEME,
  actionLabels: {
    CHAI_PAISA: 'Chai Paisa',
    RISHTEDAAR_HELP: 'Rishtedaar Help',
    KIRAYA_COLLECTION: 'Kiraya Collection',
    POLICE_WALA_RAID: 'Police Wala Raid',
    BHAI_KA_SCENE: 'Bhai Ka Scene',
    ZARDAAR_JUGAAD: 'Zardaar Jugaad',
    FULL_BEIZZATI: 'Full Beizzati',
  } satisfies Record<ActionType, string>,
  responseLabels: {
    CHALLENGE: 'Call Bakwaas',
    PASS: 'Let It Slide',
    BLOCK: 'Use Setting',
    BURN: 'Burn Connection',
  },
  phaseLabels: {
    LOBBY: 'Lobby',
    DEALING: 'Dealing',
    TURN_START: 'Turn Start',
    ACTION_DECLARED: 'Action Declared',
    CHALLENGE_WINDOW: 'Call Bakwaas Window',
    BLOCK_WINDOW: 'Block Window',
    AWAITING_BURN: 'Burn Connection',
    AWAITING_JUGAAD_RETURN: 'Zardaar Jugaad Return',
    RESOLVE_ACTION: 'Resolve Action',
    TURN_END: 'Turn End',
    GAME_OVER: 'Game Over',
  } satisfies Record<GamePhase, string>,
} as const;

export const rulesGuide = {
  quickRules: [
    '2 to 6 friends. Everyone starts with 2 hidden Connections and 2 Rupees.',
    'If you lose your last Connection, you are out.',
    'On your turn, pick a Scene. Other players may Call Bakwaas or Use Setting when the rules allow it.',
    'If you reach 10 or more Rupees at the start of your turn, Full Beizzati is mandatory.',
  ],
  actionSummaries: [
    { action: 'CHAI_PAISA', summary: 'Take 1 Rupee. No challenge. No block.' },
    { action: 'RISHTEDAAR_HELP', summary: 'Take 2 Rupees. Malik Saab can block.' },
    { action: 'KIRAYA_COLLECTION', summary: 'Claim Malik Saab, take 3 Rupees.' },
    { action: 'POLICE_WALA_RAID', summary: 'Claim Police Wala, target a player, steal up to 2 Rupees.' },
    { action: 'BHAI_KA_SCENE', summary: 'Claim Bhai, pay 3 Rupees, target burns a Connection.' },
    { action: 'ZARDAAR_JUGAAD', summary: 'Claim Zardaar Chor, draw 2, return 2.' },
    { action: 'FULL_BEIZZATI', summary: 'Pay 7 Rupees, target burns a Connection. No challenge or block.' },
  ] as const,
  challengeRules: [
    'Calling Bakwaas challenges a claimed role.',
    'Choose Call Bakwaas only when you think the claimant cannot prove the named role.',
    'If the claimant proves the role, the challenger burns a Connection and play continues.',
    'If the claimant fails, the claimant burns a Connection and the action or block fails.',
    'Burn choices are by hidden slot: character identities stay covered until after the burn is confirmed.',
    'A proven Connection returns to the deck after showing it briefly.',
  ],
  blockRules: [
    'Rishtedaar Help can be blocked by Malik Saab.',
    'Police Wala Raid can be blocked by Police Wala or Zardaar Chor.',
    'Bhai Ka Scene can be blocked by Mumma.',
    'Full Beizzati, Chai Paisa, Kiraya Collection, and Zardaar Jugaad cannot be blocked.',
  ],
  peerRules: [
    'Host-authoritative Trystero P2P. The host owns hidden state and validates every intent.',
    'Host creates the room and joins as Player 1 automatically. Other players join by room code. Reconnect is best-effort.',
    'This is for friends and local play, not ranked or competitive play.',
  ],
} as const;
