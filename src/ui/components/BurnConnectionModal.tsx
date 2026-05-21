import { Stack } from '../../components/Ui';
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

type BurnConnectionModalProps = {
  hiddenConnections: ConnectionCard[];
  onBurn: (connectionId: string) => void;
};

export function BurnConnectionModal({ hiddenConnections, onBurn }: BurnConnectionModalProps) {
  return (
    <Modal title="Burn Connection" subtitle="Choose one unrevealed connection" onClose={() => undefined}>
      <Stack gap="sm">
        <p className="muted">Choose one of your own hidden Connections to burn.</p>
        <div className="hand-grid" data-testid="burn-modal">
          {hiddenConnections.map((card) => (
            <Card
              key={card.id}
              src={roleAsset(card.role)}
              title={labels.roleTheme[card.role].label}
              subtitle="Burn it"
              tone="danger"
              onClick={() => onBurn(card.id)}
              dataTestId="burn-connection-option"
            />
          ))}
        </div>
      </Stack>
    </Modal>
  );
}
