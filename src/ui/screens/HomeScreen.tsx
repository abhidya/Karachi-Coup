import { Field, Panel, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { ConnectionCard } from '../components/ConnectionCard';
import { rulesGuide } from '../../game/theme';

type HomeScreenProps = {
  displayName: string;
  onDisplayNameChange: (value: string) => void;
  onCreateRoom: () => void;
  onJoinRoom: () => void;
  onOpenRules: () => void;
};

export function HomeScreen({ displayName, onDisplayNameChange, onCreateRoom, onJoinRoom, onOpenRules }: HomeScreenProps) {
  return (
    <Stack gap="lg">
      <section className="hero-grid home-hero">
        <Panel
          eyebrow="Step 1"
          title={
            <span data-testid="home-title" className="home-title">
              Enter your table name
            </span>
          }
          footer={<img className="badge-icon" src={GAME_ASSETS.badges.host} alt="Choose host or join" />}
        >
          <Stack gap="md">
            <p className="home-tagline">Bluff. Setting. Rupees. Full Beizzati.</p>
            <Field
              label="Your name"
              value={displayName}
              onChange={onDisplayNameChange}
              placeholder="Player name"
              inputTestId="display-name-input"
            />
            <p className="muted">
              Type the name friends should see, then choose a path: create a room if this device will host, or join with a code from a friend.
            </p>
            <div className="home-banner" style={{ backgroundImage: `linear-gradient(135deg, rgba(6, 10, 18, 0.72), rgba(6, 10, 18, 0.42)), url(${GAME_ASSETS.backgrounds.marketWall})` }}>
              <strong>What happens after this</strong>
              <p>Create Room makes you Player 1 and shows a share code. Join Room asks for a friend's code.</p>
            </div>
          </Stack>
        </Panel>

        <Panel eyebrow="Step 2" title="Choose your path">
          <Stack gap="sm">
            <ConnectionCard
              src={GAME_ASSETS.badges.host}
              title="Create Room"
              subtitle="Start a new table, become Player 1, then share the room code"
              layout="compact"
              onClick={onCreateRoom}
              dataTestId="create-room-button"
            />
            <ConnectionCard
              src={GAME_ASSETS.cards.back}
              title="Join Room"
              subtitle="Use a room code from a friend who already created the table"
              layout="compact"
              onClick={onJoinRoom}
              dataTestId="join-room-button"
            />
            <ConnectionCard
              src={GAME_ASSETS.rules.quick}
              title="How to Play"
              subtitle={rulesGuide.quickRules[0]}
              layout="compact"
              onClick={onOpenRules}
              dataTestId="open-rules-button"
            />
          </Stack>
        </Panel>
      </section>
    </Stack>
  );
}
