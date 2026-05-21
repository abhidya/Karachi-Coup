import { Button, Panel, Pill, Row, Stack } from '../../components/Ui';
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
};

export function LobbyScreen({ roomCode, roomLink, currentScene, players, phaseLabel, turnOwnerName, mode, onStartGame, onResetRoom, onRequestResync, onLeaveRoom }: LobbyScreenProps) {
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
            <p>Scene: <strong>{currentScene || 'Waiting for sync'}</strong></p>
            <p>Room link: <strong>{roomLink || 'Create or join a room first'}</strong></p>
            <Row>
              {mode === 'host' ? (
                <>
                  <Button onClick={onStartGame}>Start game</Button>
                  <Button variant="secondary" onClick={onResetRoom}>Rebuild lobby</Button>
                </>
              ) : null}
              {mode === 'client' ? (
                <>
                  <Button onClick={onRequestResync}>Request resync</Button>
                  <Button variant="secondary" onClick={onLeaveRoom}>Leave room</Button>
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
