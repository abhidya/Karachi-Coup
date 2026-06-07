/**
 * Shared PeerJS options.
 *
 * Do not add a STUN-only `config` here. A STUN-only config removes relay fallback
 * behavior and makes mobile/WebRTC joins less reliable.
 *
 * For production TURN, add a real authenticated TURN server here later, with both
 * UDP and TCP/TLS TURN URLs.
 */
export const peerOptions = {
  debug: 0,
} satisfies Record<string, unknown>;
