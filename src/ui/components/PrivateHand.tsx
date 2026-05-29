import { Panel, Pill, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { labels } from '../../game/theme';
import type { ActionType, ConnectionCard, PlayerId } from '../../game/types';
import { ConnectionCard as Card } from './ConnectionCard';
import { ROLE_IMAGE_BY_ROLE } from '../imageAssets';

type PrivateHandProps = {
  playerId: PlayerId;
  rupees: number;
  hiddenConnections: ConnectionCard[];
  availableActions: ActionType[];
  isTurn: boolean;
  eliminated: boolean;
  pendingBurn: boolean;
  pendingJugaad: boolean;
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
        <p className="private-hand__status">
          <strong>{eliminated ? 'Eliminated' : isTurn ? 'Your turn' : 'Alive'}</strong>
          <span>{availableActions.length ? `${availableActions.length} move${availableActions.length === 1 ? '' : 's'} ready` : 'No move right now'}</span>
        </p>
        <div className="hand-grid">
          {hiddenConnections.map((card, index) => (
            <Card
              key={card.id}
              src={pendingBurn ? GAME_ASSETS.cards.back : ROLE_IMAGE_BY_ROLE[card.role]}
              title={pendingBurn ? `Hidden Connection ${index + 1}` : labels.roleTheme[card.role].label}
              dataTestId="private-connection-card"
            />
          ))}
        </div>
        {pendingBurn ? <p className="muted">Burn by hidden slot. Card identity stays covered until you confirm.</p> : null}
        {pendingJugaad ? <p className="muted">Return exactly 2 cards.</p> : null}
      </Stack>
    </Panel>
  );
}
