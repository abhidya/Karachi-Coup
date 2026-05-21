import { Panel, Pill, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { labels } from '../../game/theme';
import type { ActionType, ConnectionCard, PendingBurn, PendingJugaad, PlayerId } from '../../game/types';
import { ConnectionCard as Card } from './ConnectionCard';

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
    <Panel eyebrow="Private" title="Your snapshot" testId="private-panel">
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
              src={roleAsset(card.role)}
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
