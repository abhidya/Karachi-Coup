export const trysteroConfig = {
  appId: 'io.github.abhidya.karachi-coup.v1',
  relayConfig: {
    // Trystero's Nostr strategy defaults to 5 relays. In the 6-client profile
    // that created 35 signaling WebSockets. Three known-working relays preserve
    // redundancy while cutting relay fanout by 40%.
    urls: [
      'wss://bucket.coracle.social',
      'wss://communities.nos.social',
      'wss://x.kojira.io',
    ],
  },
  // ICE servers for the actual WebRTC data path. relayConfig above is only the
  // Nostr *signaling* transport (how peers find each other and trade SDP);
  // without iceServers there is no STUN for NAT traversal and no TURN relay, so
  // peers behind strict/symmetric NATs fail right after exchanging SDP. STUN
  // covers most NATs; the Open Relay Project free public TURN servers relay
  // traffic when direct/STUN paths are blocked. Trystero forwards rtcConfig
  // straight to the RTCPeerConnection constructor. Ports 80/443 plus 443/tcp
  // maximize success through restrictive firewalls (TCP/443 often survives
  // where UDP is blocked). These are intentionally public demo credentials.
  rtcConfig: {
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
      },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
      },
    ],
  },
};

export const CLIENT_ACTION = 'karachi-coup-client-v1';
export const SERVER_ACTION = 'karachi-coup-server-v1';
