import { Button, Field, Panel, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';

type HomeScreenProps = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onGoHost: () => void;
  onGoJoin: () => void;
  onLeaveRoom: () => void;
  mode: string;
  roomId: string;
};

export function HomeScreen({
  displayName,
  onDisplayNameChange,
  onCreateRoom,
  onJoinRoom,
  onGoHost,
  onGoJoin,
  onLeaveRoom,
  mode,
  roomId,
}: HomeScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Start here" title={<span data-testid="home-title">Karachi Coup</span>} footer={<img className="badge-icon" src={GAME_ASSETS.badges.currentScene} alt="Current scene" />}>
          <Stack gap="lg">
            <p>Bluff. Setting. Rupees. Full Beizzati.</p>
            <Field label="Your name" value={displayName} onChange={onDisplayNameChange} placeholder="Player name" inputTestId="display-name-input" />
            <Row>
              <Button onClick={onCreateRoom} data-testid="create-room-button">Create room</Button>
              <Button variant="secondary" onClick={onJoinRoom} data-testid="join-room-button">Join a room</Button>
              <Button variant="ghost" onClick={onGoHost} data-testid="host-room-button">Host a room</Button>
              <Button variant="ghost" onClick={onGoJoin}>Join screen</Button>
              <Button variant="ghost" onClick={onLeaveRoom} disabled={mode === 'idle'}>Leave current room</Button>
            </Row>
          </Stack>
        </Panel>
        <Panel eyebrow="Session" title="Restore or start over">
          <Stack gap="sm">
            <p>Mode: <strong>{mode}</strong></p>
            <p>Room: <strong>{roomId || '—'}</strong></p>
            <p>Name: <strong>{displayName}</strong></p>
          </Stack>
        </Panel>
      </section>
    </Stack>
  );
}
