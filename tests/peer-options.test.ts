import { describe, expect, it } from 'vitest';
import { peerOptions } from '../src/network/peerOptions';

describe('peerOptions', () => {
  it('does not override PeerJS defaults with a STUN-only ICE config', () => {
    expect(peerOptions).toMatchObject({ debug: 0 });
    expect('config' in peerOptions).toBe(false);
  });
});
