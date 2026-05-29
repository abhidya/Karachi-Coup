import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { BurnConnectionModal } from '../src/ui/components/BurnConnectionModal';
import { PrivateHand } from '../src/ui/components/PrivateHand';
import { toConnectionCardId, toPlayerId } from '../src/game/utils';
import type { ConnectionCard } from '../src/game/types';

const hiddenCards: ConnectionCard[] = [
  { id: toConnectionCardId('c1'), role: 'MALIK_SAAB' },
  { id: toConnectionCardId('c2'), role: 'BHAI' },
];

describe('burn connection UI privacy', () => {
  it('burn modal offers hidden slots without revealing character names', () => {
    const html = renderToStaticMarkup(React.createElement(BurnConnectionModal, { hiddenConnections: hiddenCards, onBurn: () => undefined }));

    expect(html).toContain('Hidden Connection 1');
    expect(html).toContain('Hidden Connection 2');
    expect(html).toContain('connection-back.png');
    expect(html).not.toContain('Malik Saab');
    expect(html).not.toContain('Bhai');
    expect(html).not.toContain('malik-saab.png');
    expect(html).not.toContain('bhai.png');
    expect(html).not.toContain('Close</span>');
  });

  it('private hand masks card identities while a burn choice is pending', () => {
    const html = renderToStaticMarkup(
      React.createElement(PrivateHand, {
        playerId: toPlayerId('p1'),
        rupees: 2,
        hiddenConnections: hiddenCards,
        availableActions: [],
        isTurn: false,
        eliminated: false,
        pendingBurn: true,
        pendingJugaad: false,
      }),
    );

    expect(html).toContain('Hidden Connection 1');
    expect(html).toContain('Hidden Connection 2');
    expect(html).not.toContain('Malik Saab');
    expect(html).not.toContain('Bhai');
  });
});
