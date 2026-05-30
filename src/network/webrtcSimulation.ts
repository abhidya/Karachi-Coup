/**
 * WebRTC Simulation Utility
 * Allows simulating different network/client configurations (like WAN STUN-only
 * or TURN relay-only) via the URL query parameter `webrtc_mode`.
 */

export function setupWebRTCSimulation(): void {
  if (typeof window === 'undefined' || typeof window.RTCPeerConnection === 'undefined') {
    return;
  }

  // Parse mode from both location search and hash query params
  const searchParams = new URLSearchParams(window.location.search);
  const hashParts = window.location.hash.split('?');
  const hashParams = new URLSearchParams(hashParts[1] ?? '');

  const rawMode = searchParams.get('webrtc_mode') || hashParams.get('webrtc_mode') || 
                  searchParams.get('webrtc-mode') || hashParams.get('webrtc-mode');
  
  if (!rawMode) {
    return; // No simulation mode requested
  }

  const mode = rawMode.toLowerCase();
  console.warn(`[WebRTC Simulation] Activating WebRTC simulation mode: "${mode}"`);

  const OriginalRTCPeerConnection = window.RTCPeerConnection;

  // Helper to filter "typ host" lines from SDP
  const filterSDP = (sdp: string): string => {
    return sdp
      .split('\r\n')
      .filter((line) => {
        if (line.includes('candidate:') && line.includes('typ host')) {
          console.log('[WebRTC Simulation] Filtered host candidate line from SDP:', line);
          return false;
        }
        return true;
      })
      .join('\r\n');
  };

  class SimulatedRTCPeerConnection extends OriginalRTCPeerConnection {
    constructor(config?: RTCConfiguration) {
      const updatedConfig = { ...config };

      if (mode === 'relay' || mode === 'relay-only') {
        console.log('[WebRTC Simulation] Forcing iceTransportPolicy: "relay"');
        updatedConfig.iceTransportPolicy = 'relay';
      }

      super(updatedConfig);

      // Listen for ICE candidates to filter them if in WAN/STUN mode
      if (mode === 'wan' || mode === 'stun' || mode === 'stun-only') {
        this.addEventListener('icecandidate', (event) => {
          if (event.candidate && event.candidate.candidate.includes('typ host')) {
            console.log('[WebRTC Simulation] Intercepted and ignored local host candidate:', event.candidate.candidate);
          }
        });
      }
    }

    override async setLocalDescription(desc?: RTCLocalSessionDescriptionInit): Promise<void> {
      if (desc && desc.sdp && (mode === 'wan' || mode === 'stun' || mode === 'stun-only')) {
        desc.sdp = filterSDP(desc.sdp);
      }
      return super.setLocalDescription(desc);
    }

    override async setRemoteDescription(desc: RTCSessionDescriptionInit): Promise<void> {
      if (desc && desc.sdp && (mode === 'wan' || mode === 'stun' || mode === 'stun-only')) {
        desc.sdp = filterSDP(desc.sdp);
      }
      return super.setRemoteDescription(desc);
    }

    override addIceCandidate(candidate?: RTCIceCandidateInit | null): Promise<void> {
      if (candidate && (mode === 'wan' || mode === 'stun' || mode === 'stun-only')) {
        const candStr = candidate.candidate ?? '';
        if (candStr && candStr.includes('typ host')) {
          console.log('[WebRTC Simulation] Discarded incoming host candidate:', candStr);
          return Promise.resolve();
        }
      }
      return super.addIceCandidate(candidate ?? undefined);
    }
  }

  // Override globally
  Object.defineProperty(window, 'RTCPeerConnection', {
    value: SimulatedRTCPeerConnection,
    writable: true,
    configurable: true,
  });
}
