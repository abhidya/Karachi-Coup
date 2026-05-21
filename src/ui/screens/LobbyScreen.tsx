import { Button, Panel, Pill, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import type { HostLobbyPlayerView } from '../../game/types';

type LobbyScreenProps = {
  roomCode: string;
  roomLink: string;
  currentScene: string;
  players: HostLobbyPlayerView[];
  phaseLabel: string;
  turnOwnerName: string;
  mode: string;
  onStartGame: () => void;
  onResetRoom: () => void;
  onRequestResync: () => void;
  onLeaveRoom: () => void;
  onOpenRules: () => void;
};

export function LobbyScreen({
  roomCode,
  roomLink,
  currentScene,
  players,
  phaseLabel,
  turnOwnerName,
  mode,
  onStartGame,
  onResetRoom,
  onRequestResync,
  onLeaveRoom,
  onOpenRules,
}: LobbyScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Room" title="Live snapshot">
          <Stack gap="sm">
            <Row>
              <Pill tone="neutral">Room {roomCode || '—'}</Pill>
              <Pill tone="neutral">Turn {turnOwnerName || 'Waiting'}</Pill>
              <Pill tone="neutral">{phaseLabel}</Pill>
            </Row>
            <p className="current-scene-banner">
              <img className="badge-icon" src={GAME_ASSETS.badges.currentScene} alt="Current scene" />
              <span data-testid="current-scene">{currentScene || 'Waiting for sync'}</span>
            </p>
            <p className="mono" data-testid="room-link">
              {roomLink || 'Create or join a room first'}
            </p>
            <Row>
              <Button variant="ghost" onClick={onOpenRules}>
                Quick rules
              </Button>
              {mode === 'host' ? (
                <>
                  <Button onClick={onStartGame}>Start game</Button>
                  <Button variant="secondary" onClick={onResetRoom}>
                    Reset room
                  </Button>
                </>
              ) : null}
              {mode === 'client' ? (
                <>
                  <Button onClick={onRequestResync} data-testid="request-resync-button">
                    Request resync
                  </Button>
                  <Button variant="secondary" onClick={onLeaveRoom} data-testid="leave-room-button">
                    Leave room
                  </Button>
                </>
              ) : null}
            </Row>
          </Stack>
        </Panel>
      </section>
      <Panel eyebrow="Players" title="Connected players">
        <ul className="player-list">
          {players.map((player) => (
            <li key={player.playerId} className="player-list__row">
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
          ))}
        </ul>
      </Panel>
    </Stack>
  );
}
