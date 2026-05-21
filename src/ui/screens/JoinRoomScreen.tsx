import { Button, Field, Panel, Row, Stack } from '../../components/Ui';

type JoinRoomScreenProps = {
  joinCode: string;
  displayName: string;
  onJoinCodeChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onJoinRoom: () => void;
  onGoHost: () => void;
  onRequestResync: () => void;
  clientStatus: string;
  clientPlayerId: string;
};

export function JoinRoomScreen({
  joinCode,
  displayName,
  onJoinCodeChange,
  onDisplayNameChange,
  onJoinRoom,
  onGoHost,
  onRequestResync,
  clientStatus,
  clientPlayerId,
}: JoinRoomScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Join room" title="Enter a room code">
          <Stack gap="lg">
            <Field label="Room code" value={joinCode} onChange={onJoinCodeChange} placeholder="AB12C" inputMode="text" inputTestId="join-code-input" />
            <Field label="Your name" value={displayName} onChange={onDisplayNameChange} placeholder="Player name" inputTestId="display-name-input" />
            <Row>
              <Button onClick={onJoinRoom} data-testid="join-submit-button">Join room</Button>
              <Button variant="secondary" onClick={onGoHost}>Host instead</Button>
            </Row>
          </Stack>
        </Panel>
        <Panel eyebrow="Connection" title="Client status">
          <Stack gap="sm">
            <p className="muted">Waiting for sync</p>
            <p data-testid="client-status">{clientStatus}</p>
            <p data-testid="private-player-id">Player id: {clientPlayerId || 'Unassigned'}</p>
            <Row>
              <Button variant="secondary" onClick={onRequestResync} data-testid="request-resync-button">Request resync</Button>
            </Row>
          </Stack>
        </Panel>
      </section>
    </Stack>
  );
}
