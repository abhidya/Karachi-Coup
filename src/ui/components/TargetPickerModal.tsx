import { Button, Row, Stack } from '../../components/Ui';
import { Modal } from '../modals';
import type { PlayerPublicState } from '../../game/types';

type TargetPickerModalProps = {
  actionLabel: string;
  livingOpponents: PlayerPublicState[];
  selectedTargetId: string;
  onSelect: (playerId: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TargetPickerModal({ actionLabel, livingOpponents, selectedTargetId, onSelect, onConfirm, onCancel }: TargetPickerModalProps) {
  return (
    <Modal title={`Choose target for ${actionLabel}`} subtitle="Pick a living opponent" onClose={onCancel}>
      <Stack gap="sm">
        <div className="target-grid" data-testid="target-picker">
          {livingOpponents.map((player) => (
            <button
              key={player.id}
              type="button"
              className={`target-card ${selectedTargetId === player.id ? 'target-card--active' : ''}`}
              onClick={() => onSelect(player.id)}
              data-testid="target-option"
            >
              <strong>{player.name}</strong>
              <span>{player.rupees} Rupees</span>
              <span>{player.hiddenConnectionCount} Connections</span>
              <span>{player.eliminated ? 'Eliminated' : 'Alive'}</span>
            </button>
          ))}
        </div>
        <Row>
          <Button onClick={onConfirm} disabled={!selectedTargetId} data-testid="target-confirm-button">
            Confirm target
          </Button>
          <Button variant="secondary" onClick={onCancel} data-testid="target-cancel-button">
            Cancel
          </Button>
        </Row>
      </Stack>
    </Modal>
  );
}
