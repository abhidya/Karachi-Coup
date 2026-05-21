import { Button, Panel, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import type { HostLobbyPlayerView } from '../../game/types';

type HostLobbyScreenProps = {
  roomCode: string;
  roomLink: string;
  players: HostLobbyPlayerView[];
  hostStatus: string;
  onCopyRoomLink: () => void;
  onStartGame: () => void;
  onResetRoom: () => void;
};

export function HostLobbyScreen({ roomCode, roomLink, players, hostStatus, onCopyRoomLink, onStartGame, onResetRoom }: HostLobbyScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Host room" title="Invite players">
          <Stack gap="sm">
            <p data-testid="room-code">Room code: <strong>{roomCode || 'Waiting for create room'}</strong></p>
            <p data-testid="room-link" className="mono">{roomLink || 'Create a room first'}</p>
            <Row>
              <Button variant="secondary" onClick={onCopyRoomLink} data-testid="copy-room-link">Copy link</Button>
              <Button variant="ghost" onClick={onResetRoom} data-testid="reset-room-button">Reset room</Button>
            </Row>
          </Stack>
        </Panel>
        <Panel eyebrow="Networking" title="Host status">
          <Stack gap="sm">
            <p data-testid="host-status">{hostStatus}</p>
            <p>Host device must stay open.</p>
            <Row>
              <Button onClick={onStartGame} data-testid="start-game-button">Start game</Button>
              <img className="badge-icon" src={GAME_ASSETS.badges.host} alt="Host" />
            </Row>
          </Stack>
        </Panel>
      </section>

      <Panel eyebrow="Players" title="Connected players">
        <ul className="player-list" data-testid="connected-player-list">
          {players.map((player) => (
            <li key={player.playerId} className="player-list__row" data-testid="connected-player-row">
              <div>
                <strong>{player.name}</strong>
                <small>{player.playerId}</small>
              </div>
              <div className="player-list__meta">
                <span className="rupee-chip">{player.rupees} Rupees</span>
                <span>{player.hiddenConnectionCount} Connections</span>
                <span>{player.connected ? 'Connected' : 'Offline'}</span>
                <span>{player.eliminated ? 'Eliminated' : 'Alive'}</span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </Stack>
  );
}
