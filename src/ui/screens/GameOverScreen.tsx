import { Button, Panel, Pill, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import type { PlayerPublicState, PlayerId } from '../../game/types';

type GameOverScreenProps = {
  winnerId: PlayerId | null;
  players: PlayerPublicState[];
  winnerName: string;
  onNewGame?: () => void;
  onBackHome?: () => void;
};

export function GameOverScreen({ winnerId, players, winnerName, onNewGame, onBackHome }: GameOverScreenProps) {
  return (
    <Panel eyebrow="Game over" title="Winner declared" testId="game-over-screen">
      <Stack gap="md">
        <Row>
          <img className="badge-icon badge-icon--large" src={GAME_ASSETS.badges.winner} alt="Winner" />
          <div>
            <p className="eyebrow">Winner</p>
            <h3 data-testid="winner-name">{winnerName || 'Unknown'}</h3>
            <p className="muted">Last Connection standing.</p>
          </div>
        </Row>
        <ul className="player-list">
          {players.map((player) => (
            <li key={player.id} className="player-list__row">
              <div className="player-list__identity">
                <strong>{player.name}</strong>
                <small>{player.eliminated ? 'Eliminated' : 'Alive'}</small>
              </div>
              <div className="player-list__meta">
                <Pill tone={player.id === winnerId ? 'success' : player.eliminated ? 'danger' : 'neutral'}>
                  {player.id === winnerId ? 'Winner' : player.eliminated ? 'Out' : 'Alive'}
                </Pill>
                <span className="rupee-chip">{player.rupees} Rupees</span>
              </div>
            </li>
          ))}
        </ul>
        <Row>
          {onNewGame ? <Button onClick={onNewGame}>New game</Button> : null}
          {onBackHome ? (
            <Button variant="secondary" onClick={onBackHome}>
              Back home
            </Button>
          ) : null}
        </Row>
      </Stack>
    </Panel>
  );
}
