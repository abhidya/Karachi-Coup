import React from 'react';
import ReactDOM, { type Root } from 'react-dom/client';
import { App } from './App';
import { setupWebRTCSimulation } from './network/webrtcSimulation';
import './styles.css';

// Run simulation check before React app starts
setupWebRTCSimulation();

declare global {
  interface Window {
    __karachiCoupRoot?: Root;
    __karachiCoupRendered?: boolean;
  }
}

const container = document.getElementById('root');

if (container && !window.__karachiCoupRendered) {
  window.__karachiCoupRoot = window.__karachiCoupRoot ?? ReactDOM.createRoot(container);
  window.__karachiCoupRendered = true;
  window.__karachiCoupRoot.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
