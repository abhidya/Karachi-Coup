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
              Karachi Coup
            </span>
          }
          footer={<img className="badge-icon" src={GAME_ASSETS.badges.currentScene} alt="Current scene" />}
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
              Create a room and play as Player 1. Friends join by room code. Hidden Connections stay private.
            </p>
            <div className="home-banner" style={{ backgroundImage: `linear-gradient(135deg, rgba(6, 10, 18, 0.72), rgba(6, 10, 18, 0.42)), url(${GAME_ASSETS.backgrounds.marketWall})` }}>
              <strong>What you do here</strong>
              <p>Call Bakwaas. Use Setting. Burn Connections. Keep your Rupees.</p>
            </div>
          </Stack>
        </Panel>

        <Panel eyebrow="How it works" title="3 simple moves">
          <Stack gap="sm">
            <ConnectionCard
              src={GAME_ASSETS.badges.host}
              title="Create Room"
              subtitle="Host the table and share the code"
              layout="compact"
              onClick={onCreateRoom}
              dataTestId="create-room-button"
            />
            <ConnectionCard
              src={GAME_ASSETS.cards.back}
              title="Join Room"
              subtitle="Enter a room code and your name"
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
