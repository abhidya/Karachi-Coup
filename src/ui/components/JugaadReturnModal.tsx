import { Button, Pill, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { labels } from '../../game/theme';
import type { ConnectionCard } from '../../game/types';
import { ConnectionCard as Card } from './ConnectionCard';
import { Modal } from '../modals';

function roleAsset(role: ConnectionCard['role']) {
  switch (role) {
    case 'MALIK_SAAB':
      return GAME_ASSETS.roles.malik;
    case 'BHAI':
      return GAME_ASSETS.roles.bhai;
    case 'POLICE_WALA':
      return GAME_ASSETS.roles.police;
    case 'ZARDAAR_CHOR':
      return GAME_ASSETS.roles.zardaar;
    case 'MUMMA':
      return GAME_ASSETS.roles.mumma;
  }
}

type JugaadReturnModalProps = {
  hiddenConnections: ConnectionCard[];
  drawnConnections: ConnectionCard[];
  selectedIds: string[];
  onToggle: (connectionId: string) => void;
  onSubmit: () => void;
};

export function JugaadReturnModal({ hiddenConnections, drawnConnections, selectedIds, onToggle, onSubmit }: JugaadReturnModalProps) {
  return (
    <Modal title="Zardaar Jugaad" subtitle="Return exactly 2 Connections" onClose={() => undefined}>
      <Stack gap="sm">
        <p className="muted">
          Select 2 cards to return. Keep the rest. Drawn cards and hidden cards are shown together so the player can
          choose the exact return set.
        </p>
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
            src={roleAsset(card.role)}
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
