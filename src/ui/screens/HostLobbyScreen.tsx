import { Button, Panel, Pill, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import type { HostLobbyPlayerView } from '../../game/types';

type HostLobbyScreenProps = {
  roomCode: string;
  roomLink: string;
  players: HostLobbyPlayerView[];
  hostStatus: string;
  canStart: boolean;
  onCopyRoomLink: () => void;
  onStartGame: () => void;
  onResetRoom: () => void;
  onOpenRules: () => void;
};

export function HostLobbyScreen({
  roomCode,
  roomLink,
  players,
  hostStatus,
  canStart,
  onCopyRoomLink,
  onStartGame,
  onResetRoom,
  onOpenRules,
}: HostLobbyScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Host room" title="Invite players">
          <Stack gap="md">
            <img className="lobby-hero" src={GAME_ASSETS.lobby.hostHero} alt="Host lobby" />
            <p className="guidance-copy" data-testid="host-lobby-guidance">
              Share this room code, wait for at least 2 players, then start. Keep this host tab open; it runs the table and validates every move.
            </p>
            <div className="room-code-card" data-testid="room-code">
              <span className="eyebrow">Room code</span>
              <strong>{roomCode || 'Waiting for create room'}</strong>
            </div>
            <p className="mono" data-testid="room-link">
              {roomLink || 'Create a room first'}
            </p>
            <Row>
              <Button variant="secondary" onClick={onCopyRoomLink} data-testid="copy-room-link">
                Copy link
              </Button>
              <Button variant="ghost" onClick={onOpenRules}>
                Quick rules
              </Button>
            </Row>
          </Stack>
        </Panel>
        <Panel eyebrow="Networking" title="Host status">
          <Stack gap="sm">
            <Row>
              <img className="badge-icon" src={GAME_ASSETS.badges.host} alt="Host" />
              <Pill tone={canStart ? 'success' : 'warn'} data-testid="host-status">
                {hostStatus}
              </Pill>
            </Row>
            <p className="muted">You are Player 1 and the room host. Keep this device open so every player stays synced.</p>
            <p className="muted">{canStart ? 'Ready: enough players are seated.' : 'Waiting: at least 2 players are needed before Start game unlocks.'}</p>
            <Row>
              <Button onClick={onStartGame} disabled={!canStart} data-testid="start-game-button">
                Start game
              </Button>
              <Button variant="ghost" onClick={onResetRoom} data-testid="reset-room-button">
                Reset room
              </Button>
            </Row>
          </Stack>
        </Panel>
      </section>

      <Panel eyebrow="Players" title="Connected players">
        <ul className="player-list" data-testid="connected-player-list">
          {players.length ? (
            players.map((player) => (
              <li key={player.playerId} className="player-list__row player-list__row--lobby" data-testid="connected-player-row">
                <div className="player-list__identity">
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
            ))
          ) : (
            <li className="player-list__empty">Waiting for players to join.</li>
          )}
        </ul>
      </Panel>
    </Stack>
  );
}
