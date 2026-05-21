import { useState } from 'react';
import { Button, Row, Stack } from '../../components/Ui';
import { labels } from '../../game/theme';
import type { ConnectionCard } from '../../game/types';
import { ConnectionCard as Card } from './ConnectionCard';
import { Modal } from '../modals';
import { ROLE_IMAGE_BY_ROLE } from '../imageAssets';

type BurnConnectionModalProps = {
  hiddenConnections: ConnectionCard[];
  onBurn: (connectionId: string) => void;
};

export function BurnConnectionModal({ hiddenConnections, onBurn }: BurnConnectionModalProps) {
  const [selectedId, setSelectedId] = useState<string>('');

  return (
    <Modal title="Burn one Connection" subtitle="Choose one hidden Connection to reveal" onClose={() => undefined}>
      <Stack gap="sm">
        <p className="muted">Your setting took a hit. Pick one unrevealed Connection, then confirm.</p>
        <div className="hand-grid" data-testid="burn-modal">
          {hiddenConnections.map((card) => (
            <Card
              key={card.id}
              src={ROLE_IMAGE_BY_ROLE[card.role]}
              title={labels.roleTheme[card.role].label}
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
