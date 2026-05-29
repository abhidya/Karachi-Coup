import { useState } from 'react';
import { Button, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import type { ConnectionCard } from '../../game/types';
import { ConnectionCard as Card } from './ConnectionCard';
import { Modal } from '../modals';

type BurnConnectionModalProps = {
  hiddenConnections: ConnectionCard[];
  onBurn: (connectionId: string) => void;
};

export function BurnConnectionModal({ hiddenConnections, onBurn }: BurnConnectionModalProps) {
  const [selectedId, setSelectedId] = useState<string>('');

  return (
    <Modal title="Burn one Connection" subtitle="Choose a hidden slot; identities stay covered" onClose={() => undefined} dismissible={false}>
      <Stack gap="sm">
        <p className="muted">
          Pick by position only. Character names and art stay hidden until after you confirm the permanent burn.
        </p>
        <div className="hand-grid" data-testid="burn-modal">
          {hiddenConnections.map((card, index) => (
            <Card
              key={card.id}
              src={GAME_ASSETS.cards.back}
              title={`Hidden Connection ${index + 1}`}
              subtitle={selectedId === card.id ? 'Selected to burn' : 'Tap to select'}
              tone={selectedId === card.id ? 'danger' : 'neutral'}
              active={selectedId === card.id}
              onClick={() => setSelectedId(card.id)}
              dataTestId="burn-connection-option"
            />
          ))}
        </div>
        <Row>
          <Button variant="danger" disabled={!selectedId} onClick={() => onBurn(selectedId)}>
            Confirm burn
          </Button>
          <p className="muted">Burning is permanent.</p>
        </Row>
      </Stack>
    </Modal>
  );
}
