import { Panel, Pill, Row, Stack } from '../../components/Ui';
import { labels } from '../../game/theme';
import type { ActionType, ConnectionCard, PendingBurn, PendingJugaad, PlayerId } from '../../game/types';
import { ConnectionCard as Card } from './ConnectionCard';
import { ROLE_IMAGE_BY_ROLE } from '../imageAssets';

type PrivateHandProps = {
  playerId: PlayerId;
  rupees: number;
  hiddenConnections: ConnectionCard[];
  availableActions: ActionType[];
  isTurn: boolean;
  eliminated: boolean;
  pendingBurn: PendingBurn | null;
  pendingJugaad: PendingJugaad | null;
};

export function PrivateHand({
  playerId,
  rupees,
  hiddenConnections,
  availableActions,
  isTurn,
  eliminated,
  pendingBurn,
  pendingJugaad,
}: PrivateHandProps) {
  return (
    <Panel eyebrow="Private" title="Your Connections" testId="private-panel">
      <Stack gap="sm">
        <Row>
          <Pill tone="neutral" data-testid="private-player-id">
            {playerId}
          </Pill>
          <Pill tone="neutral" data-testid="private-rupees">
            {rupees}₹
          </Pill>
          <Pill tone="neutral" data-testid="private-hidden-count">
            {hiddenConnections.length} hidden
          </Pill>
        </Row>
        <p>
          Elimination: <strong>{eliminated ? 'Eliminated' : 'Alive'}</strong>
        </p>
        <p>Actions: <strong>{availableActions.length ? availableActions.map((action) => labels.actionLabels[action]).join(', ') : 'None'}</strong></p>
        <div className="hand-grid">
          {hiddenConnections.map((card) => (
            <Card
              key={card.id}
              src={ROLE_IMAGE_BY_ROLE[card.role]}
              title={labels.roleTheme[card.role].label}
              dataTestId="private-connection-card"
            />
          ))}
        </div>
        {isTurn ? <p className="muted">Your turn.</p> : <p className="muted">Waiting for your turn.</p>}
        {pendingBurn ? <p className="muted">Burn Connection modal waiting below.</p> : null}
        {pendingJugaad ? <p className="muted">Return 2 Connections from your active Jugaad draw.</p> : null}
      </Stack>
    </Panel>
  );
}
