import { Button, Field, Panel, Row, Stack } from '../../components/Ui';

type JoinRoomScreenProps = {
  joinCode: string;
  displayName: string;
  onJoinCodeChange: (value: string) => void;
  onDisplayNameChange: (value: string) => void;
  onJoinRoom: () => void;
  onCreateRoom: () => void;
  onRequestResync: () => void;
  clientStatus: string;
  connectionIssue?: string | null;
  clientPlayerId: string;
};

export function JoinRoomScreen({
  joinCode,
  displayName,
  onJoinCodeChange,
  onDisplayNameChange,
  onJoinRoom,
  onCreateRoom,
  onRequestResync,
  clientStatus,
  connectionIssue,
  clientPlayerId,
}: JoinRoomScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Join room" title="Enter your friend's room code">
          <Stack gap="lg">
            <Field label="Room code" value={joinCode} onChange={onJoinCodeChange} placeholder="AB12C" inputMode="text" inputTestId="join-code-input" />
            <Field label="Your name" value={displayName} onChange={onDisplayNameChange} placeholder="Player name" inputTestId="display-name-input" />
            <p className="muted">Joining needs an active host. If you want to start the table on this device, create a new room instead.</p>
            <Row>
              <Button onClick={onJoinRoom} data-testid="join-submit-button">Join room</Button>
              <Button variant="secondary" onClick={onCreateRoom} data-testid="join-create-room-button">Create new room instead</Button>
            </Row>
          </Stack>
        </Panel>
        <Panel eyebrow="Connection" title="Client status">
          <Stack gap="sm">
            <p className="guidance-copy">
              After joining, this panel confirms whether the host found you, synced your private hand, and assigned your seat.
            </p>
            <p data-testid="client-status">{clientStatus}</p>
            {connectionIssue ? (
              <p className="error-text" data-testid="connection-issue">
                {connectionIssue}
              </p>
            ) : null}
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
