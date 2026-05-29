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
          eyebrow="Start here"
          title={
            <span data-testid="home-title" className="home-title">
              Start or join a table
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
              hint="Friends will see this name."
              inputTestId="display-name-input"
            />
            <div className="home-banner" style={{ backgroundImage: `linear-gradient(135deg, rgba(6, 10, 18, 0.72), rgba(6, 10, 18, 0.42)), url(${GAME_ASSETS.backgrounds.marketWall})` }}>
              <strong>Pick a path</strong>
              <p>Host creates the code. Join uses a friend’s code.</p>
            </div>
          </Stack>
        </Panel>

        <Panel eyebrow="Choose" title="What are you doing?">
          <Stack gap="sm">
            <ConnectionCard
              src={GAME_ASSETS.badges.host}
              title="Host a game"
              subtitle="Create a code and invite friends"
              layout="compact"
              onClick={onCreateRoom}
              dataTestId="create-room-button"
            />
            <ConnectionCard
              src={GAME_ASSETS.cards.back}
              title="Join a game"
              subtitle="Enter a friend’s room code"
              layout="compact"
              onClick={onJoinRoom}
              dataTestId="join-room-button"
            />
            <ConnectionCard
              src={GAME_ASSETS.rules.quick}
              title="Quick rules"
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
