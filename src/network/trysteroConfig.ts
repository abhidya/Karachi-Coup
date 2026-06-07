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
};

export const CLIENT_ACTION = 'karachi-coup-client-v1';
export const SERVER_ACTION = 'karachi-coup-server-v1';
