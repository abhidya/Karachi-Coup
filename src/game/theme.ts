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
