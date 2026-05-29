import { Panel, Pill, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { labels } from '../../game/theme';
import type { PlayerPublicState, PublicGameState } from '../../game/types';
import { ROLE_IMAGE_BY_ROLE } from '../imageAssets';
import { publicPlayerStatus } from '../gameGuidance';

type PublicPlayerTableProps = {
  currentScene: string;
  players: PlayerPublicState[] | undefined;
  publicState?: PublicGameState | null;
};

export function PublicPlayerTable({ currentScene, players, publicState }: PublicPlayerTableProps) {
  return (
    <Panel eyebrow="Public table" title="Table roster" testId="public-player-table">
      <Stack gap="sm">
        <Row>
          <img className="badge-icon" src={GAME_ASSETS.badges.currentScene} alt="Current scene" />
          <p className="current-scene-text">{currentScene}</p>
        </Row>
        <ul className="player-list">
          {players?.map((player) => {
            const status = publicPlayerStatus(player, publicState);
            return (
              <li
                key={player.id}
                className={player.isTurn ? 'player-list__row player-list__row--active' : 'player-list__row'}
                data-testid="public-player-row"
              >
                <div className="player-list__identity">
                  <strong>{player.name}</strong>
                  <small>{player.id}</small>
                </div>
                <div className="player-list__meta">
                  <Pill tone={status.tone} data-testid="player-table-status">
                    {status.label}
                  </Pill>
                <span className="rupee-chip" data-testid="player-rupees">
                  {player.rupees} Rupees
                </span>
                <span className="slot-row slot-row--hidden" data-testid="player-hidden-count" aria-label={`${player.hiddenConnectionCount} hidden connections`}>
                  {Array.from({ length: player.hiddenConnectionCount }).map((_, index) => (
                    <span key={`${player.id}-hidden-${index}`} className="card-stack card-stack--hidden" aria-hidden="true">
                      <img className="card-stack__slot" src={GAME_ASSETS.slots.hidden} alt="" />
                      <img className="card-stack__back" src={GAME_ASSETS.cards.back} alt="" />
                    </span>
                  ))}
                </span>
                <span className="slot-row" data-testid="player-revealed-connections" aria-label={`${player.revealedConnections.length} revealed connections`}>
                  {player.revealedConnections.map((role, index) => (
                    <span key={`${player.id}-revealed-${index}`} className="card-stack card-stack--revealed">
                      <img className="card-stack__slot" src={GAME_ASSETS.slots.revealed} alt="" />
                      <img className="card-stack__art" src={ROLE_IMAGE_BY_ROLE[role]} alt={labels.roleTheme[role].label} />
                      <img className="card-stack__burned" src={GAME_ASSETS.slots.burned} alt="" />
                    </span>
                  ))}
                </span>
                  {player.eliminated ? <img className="badge-icon" src={GAME_ASSETS.badges.eliminated} alt="Eliminated" /> : null}
                </div>
              </li>
            );
          }) ?? <li>No players yet</li>}
        </ul>
      </Stack>
    </Panel>
  );
}
