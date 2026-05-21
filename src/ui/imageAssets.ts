import { GAME_ASSETS } from '../game/assets';
import type { ActionType, Role } from '../game/types';

export const ROLE_IMAGE_BY_ROLE: Readonly<Record<Role, string>> = {
  MALIK_SAAB: GAME_ASSETS.roles.malik,
  BHAI: GAME_ASSETS.roles.bhai,
  POLICE_WALA: GAME_ASSETS.roles.police,
  ZARDAAR_CHOR: GAME_ASSETS.roles.zardaar,
  MUMMA: GAME_ASSETS.roles.mumma,
};

export const ACTION_IMAGE_BY_ACTION: Readonly<Record<ActionType, string>> = {
  CHAI_PAISA: GAME_ASSETS.actions.income,
  RISHTEDAAR_HELP: GAME_ASSETS.actions.foreignAid,
  KIRAYA_COLLECTION: GAME_ASSETS.actions.tax,
  POLICE_WALA_RAID: GAME_ASSETS.actions.steal,
  BHAI_KA_SCENE: GAME_ASSETS.actions.assassinate,
  ZARDAAR_JUGAAD: GAME_ASSETS.actions.exchange,
  FULL_BEIZZATI: GAME_ASSETS.actions.coup,
};

export const RESPONSE_IMAGE_BY_LABEL = {
  challenge: GAME_ASSETS.responses.challenge,
  pass: GAME_ASSETS.responses.pass,
  block: GAME_ASSETS.responses.block,
  burn: GAME_ASSETS.responses.burn,
} as const;
