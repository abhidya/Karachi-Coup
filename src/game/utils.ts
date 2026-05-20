import type { ConnectionCard, ConnectionCardId, GameId, PlayerId, RoomCode, Role } from './types';

let connectionCounter = 0;
let actionCounter = 0;

export function toPlayerId(value: string): PlayerId {
  return value as PlayerId;
}

export function toGameId(value: string): GameId {
  return value as GameId;
}

export function toRoomCode(value: string): RoomCode {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8) as RoomCode;
}

export function toConnectionCardId(value: string): ConnectionCardId {
  return value as ConnectionCardId;
}

export function createConnectionCard(role: Role): ConnectionCard {
  connectionCounter += 1;
  return { id: toConnectionCardId(`connection-${connectionCounter}`), role };
}

export function createActionId(): string {
  actionCounter += 1;
  return `action-${actionCounter}`;
}

export function createDeck(): ConnectionCard[] {
  const deck: ConnectionCard[] = [];
  for (const role of ['MALIK_SAAB', 'BHAI', 'POLICE_WALA', 'ZARDAAR_CHOR', 'MUMMA'] as const) {
    for (let index = 0; index < 3; index += 1) {
      deck.push(createConnectionCard(role));
    }
  }
  return deck;
}

export function createBasePlayer(id: PlayerId, name: string) {
  return {
    id,
    name,
    clientNonce: `nonce-${id}` as const,
    rupees: 0,
    hiddenConnections: [],
    revealedConnections: [],
    connected: true,
    eliminated: false,
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededShuffle<T>(values: readonly T[], seed: string): T[] {
  const result = [...values];
  const random = mulberry32(hashSeed(seed));
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex]!, result[index]!];
  }
  return result;
}

export function drawCards<T>(values: readonly T[], count: number): { drawn: T[]; remaining: T[] } {
  return { drawn: values.slice(0, count), remaining: values.slice(count) };
}

export function cloneConnectionCard<T extends ConnectionCard>(card: T): T {
  return { ...card };
}

export function deepFreeze<T>(value: T): T {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }
  Object.freeze(value);
  for (const key of Object.keys(value as Record<string, unknown>)) {
    const nested = (value as Record<string, unknown>)[key];
    if (nested !== null && typeof nested === 'object') {
      deepFreeze(nested);
    }
  }
  return value;
}
