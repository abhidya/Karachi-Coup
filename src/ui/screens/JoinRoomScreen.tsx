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

function friendlyStatus(status: string) {
  if (/error/i.test(status)) return 'Could not join yet';
  if (/synced|joined|connected|ready/i.test(status)) return 'Joined table';
  if (/connecting|open/i.test(status)) return 'Finding host…';
  return 'Ready to join';
}

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
}: JoinRoomScreenProps) {
  const joined = /synced|joined|connected|ready/i.test(clientStatus);
  const joining = /connecting|open/i.test(clientStatus);

  return (
    <Stack gap="lg">
      <section className="hero-grid">
        <Panel eyebrow="Join room" title="Enter a room code">
          <Stack gap="lg">
            <Field label="Room code" value={joinCode} onChange={onJoinCodeChange} placeholder="AB12C" inputMode="text" inputTestId="join-code-input" />
            <Field label="Your name" value={displayName} onChange={onDisplayNameChange} placeholder="Player name" hint="Friends will see this name." inputTestId="display-name-input" />
            <Row>
              <Button onClick={onJoinRoom} data-testid="join-submit-button">Join room</Button>
              <Button variant="ghost" onClick={onCreateRoom} data-testid="join-create-room-button">Host instead</Button>
            </Row>
          </Stack>
        </Panel>
        <Panel eyebrow="Status" title={friendlyStatus(clientStatus)}>
          <Stack gap="sm">
            <p className="guidance-copy guidance-copy--simple" data-testid="client-status">
              {connectionIssue ? 'Ask the host to keep their tab open, then try again.' : joined ? 'You are in. Wait for the host to start or continue the game.' : joining ? 'Looking for the host tab now.' : 'Enter the code your host shared.'}
            </p>
            {connectionIssue ? (
              <p className="error-text" data-testid="connection-issue">
                {connectionIssue}
              </p>
            ) : null}
            {(joined || connectionIssue) ? (
              <Row>
                <Button variant="secondary" onClick={onRequestResync} data-testid="request-resync-button">Try sync again</Button>
              </Row>
            ) : null}
          </Stack>
        </Panel>
      </section>
    </Stack>
  );
}
