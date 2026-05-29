import { ACTION_CONFIG } from '../game/rules';
import { labels } from '../game/theme';
import type { ActionType, PlayerPublicState, PublicGameState } from '../game/types';

export type GuideTone = 'neutral' | 'success' | 'warn' | 'danger';

export function actionMetaParts(actionType: ActionType): string[] {
  const config = ACTION_CONFIG[actionType];
  return [
    `Cost ${config.cost}₹`,
    config.needsTarget ? 'Choose a target' : 'No target',
    config.claimedRole ? `Claims ${labels.roleTheme[config.claimedRole].label}` : 'No role claim',
    config.challengeable ? 'Bakwaas allowed' : 'No Bakwaas',
    config.blockRoles.length ? `Setting: ${config.blockRoles.map((role) => labels.roleTheme[role].label).join(' / ')}` : 'No Setting block',
  ];
}

export function publicPlayerStatus(player: PlayerPublicState, publicState: PublicGameState | null | undefined): { label: string; tone: GuideTone } {
  if (player.eliminated) return { label: 'Out', tone: 'danger' };
  if (publicState?.pendingBurn?.playerId === player.id) return { label: 'Burning', tone: 'danger' };

  const challenge = publicState?.pendingChallenge;
  if (challenge) {
    if (challenge.claimantId === player.id) return { label: 'Claiming', tone: 'warn' };
    if (challenge.challengerId === player.id) return { label: 'Called Bakwaas', tone: 'danger' };
    if (challenge.responses[player.id] === 'passed') return { label: 'Passed', tone: 'neutral' };
    if (challenge.eligibleChallengers.includes(player.id)) return { label: 'Can challenge', tone: 'warn' };
  }

  const block = publicState?.pendingBlock;
  if (block) {
    if (block.blockerId === player.id) return { label: 'Setting', tone: 'warn' };
    if (block.eligibleChallengers.includes(player.id)) return { label: 'Can challenge', tone: 'warn' };
  }

  if (publicState?.pendingAction?.targetId === player.id) return { label: 'Targeted', tone: 'warn' };
  if (player.isTurn) return { label: 'Turn', tone: 'success' };
  return { label: 'Ready', tone: 'neutral' };
}
