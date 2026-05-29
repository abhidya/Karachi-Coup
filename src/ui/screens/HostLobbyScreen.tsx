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
  onCreateRoom: () => void;
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
  onCreateRoom,
  onOpenRules,
}: HostLobbyScreenProps) {
  const hasRoom = Boolean(roomCode);

  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Host room" title="Invite players">
          <Stack gap="md">
            <img className="lobby-hero" src={GAME_ASSETS.lobby.hostHero} alt="Host lobby" />
            <p className="guidance-copy" data-testid="host-lobby-guidance">
              {hasRoom
                ? 'Share this code. Keep this tab open.'
                : 'Create a room to get a code.'}
            </p>
            <div className="room-code-card" data-testid="room-code">
              <span className="eyebrow">Room code</span>
              <strong>{roomCode || 'No room yet'}</strong>
            </div>
            <p className="mono" data-testid="room-link">
              {roomLink || 'Create a room to generate a join link.'}
            </p>
            <Row>
              {hasRoom ? (
                <Button variant="secondary" onClick={onCopyRoomLink} data-testid="copy-room-link">
                  Copy link
                </Button>
              ) : (
                <Button onClick={onCreateRoom} data-testid="host-create-room-button">
                  Create room
                </Button>
              )}
              <Button variant="ghost" onClick={onOpenRules}>
                Quick rules
              </Button>
            </Row>
          </Stack>
        </Panel>
        <Panel eyebrow="Host" title="Table status">
          <Stack gap="sm">
            <Row>
              <img className="badge-icon" src={GAME_ASSETS.badges.host} alt="Host" />
              <Pill tone={canStart ? 'success' : 'warn'} data-testid="host-status">
                {hostStatus}
              </Pill>
            </Row>
            <p className="muted">{hasRoom ? 'Keep this device open while friends play.' : 'Create a room before inviting friends.'}</p>
            <p className="muted">{hasRoom ? (canStart ? 'Ready to start.' : 'Need at least 2 players.') : 'Start unlocks after friends join.'}</p>
            <Row>
              <Button onClick={onStartGame} disabled={!hasRoom || !canStart} data-testid="start-game-button">
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
                  <small>{player.connected ? 'Connected' : 'Offline'}</small>
                </div>
                <div className="player-list__meta">
                  <span>{player.eliminated ? 'Eliminated' : 'Ready'}</span>
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
