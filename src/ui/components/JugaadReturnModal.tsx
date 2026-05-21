import { Button, Pill, Row, Stack } from '../../components/Ui';
import { labels } from '../../game/theme';
import type { ConnectionCard } from '../../game/types';
import { ConnectionCard as Card } from './ConnectionCard';
import { Modal } from '../modals';
import { ROLE_IMAGE_BY_ROLE } from '../imageAssets';

type JugaadReturnModalProps = {
  hiddenConnections: ConnectionCard[];
  drawnConnections: ConnectionCard[];
  selectedIds: string[];
  onToggle: (connectionId: string) => void;
  onSubmit: () => void;
};

export function JugaadReturnModal({ hiddenConnections, drawnConnections, selectedIds, onToggle, onSubmit }: JugaadReturnModalProps) {
  return (
    <Modal title="Zardaar Jugaad" subtitle="Return exactly 2 Connections to the deck" onClose={() => undefined}>
      <Stack gap="sm">
        <p className="muted">Pick 2 cards to return. The other 2 stay hidden in your hand.</p>
        <Row>
          <Pill tone="neutral">Selected {selectedIds.length}/2</Pill>
          <Button onClick={onSubmit} disabled={selectedIds.length !== 2} data-testid="jugaad-submit-return">
            Return 2 Connections
          </Button>
        </Row>
        <div className="hand-grid" data-testid="jugaad-modal">
          {[...hiddenConnections, ...drawnConnections].map((card) => (
            <Card
              key={card.id}
              src={ROLE_IMAGE_BY_ROLE[card.role]}
              title={labels.roleTheme[card.role].label}
              subtitle={selectedIds.includes(card.id) ? 'Returning' : 'Keep?'}
              active={selectedIds.includes(card.id)}
              tone={selectedIds.includes(card.id) ? 'warn' : 'neutral'}
              onClick={() => onToggle(card.id)}
              dataTestId="jugaad-return-option"
            />
          ))}
        </div>
      </Stack>
    </Modal>
  );
}
