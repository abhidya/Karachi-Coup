import { describe, expect, it } from 'vitest';
import { formatRoomLink } from '../src/routing';

describe('routing', () => {
  it('routing: formatRoomLink returns join route, not lobby route', () => {
    const link = formatRoomLink('U9UPH', '/', 'https://example.com');
    expect(link).toBe('https://example.com/#/join?room=U9UPH');
    expect(link).not.toContain('#/lobby?room=');
  });

  it('routing: formatRoomLink includes GitHub Pages base path', () => {
    const link = formatRoomLink('U9UPH', '/Karachi-Coup/', 'https://abhidya.github.io');
    expect(link).toBe('https://abhidya.github.io/Karachi-Coup/#/join?room=U9UPH');
  });

  it('routing: formatRoomLink URL-encodes room code', () => {
    const link = formatRoomLink('U9 U/H', '/Karachi-Coup/', 'https://abhidya.github.io');
    expect(link).toBe('https://abhidya.github.io/Karachi-Coup/#/join?room=U9%20U%2FH');
  });
});
