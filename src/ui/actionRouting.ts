import type { ActionType } from '../game/types';

export const TARGET_ACTIONS: readonly ActionType[] = ['POLICE_WALA_RAID', 'BHAI_KA_SCENE', 'FULL_BEIZZATI'];

export function isTargetedAction(actionType: ActionType) {
  return TARGET_ACTIONS.includes(actionType);
}
