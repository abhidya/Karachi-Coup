import { Button, Panel, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { labels, rulesGuide } from '../../game/theme';
import { Modal } from '../modals';
import { ACTION_IMAGE_BY_ACTION } from '../imageAssets';

type RulesModalProps = {
  onClose: () => void;
};

export function RulesModal({ onClose }: RulesModalProps) {
  return (
    <Modal title="How to play Karachi Coup" subtitle="Quick rules, action guide, and PeerJS note" onClose={onClose}>
      <Stack gap="lg">
        <Panel eyebrow="Quick rules" title="The table basics">
          <Stack gap="sm">
            <img className="rules-art" src={GAME_ASSETS.rules.quick} alt="Quick rules" />
            <ul className="bullet-list">
              {rulesGuide.quickRules.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </Stack>
        </Panel>

        <Panel eyebrow="Actions" title="What each scene does">
          <div className="rules-grid">
            {rulesGuide.actionSummaries.map((entry) => (
              <article key={entry.action} className="rules-card">
                <img className="rules-card__art" src={ACTION_IMAGE_BY_ACTION[entry.action]} alt={labels.actionLabels[entry.action]} />
                <strong>{labels.actionLabels[entry.action]}</strong>
                <p>{entry.summary}</p>
              </article>
            ))}
          </div>
        </Panel>

        <Row align="start">
          <Panel eyebrow="Call Bakwaas" title="Challenge rules">
            <Stack gap="sm">
              <img className="rules-art" src={GAME_ASSETS.rules.challenge} alt="Challenge rules" />
              <ul className="bullet-list">
                {rulesGuide.challengeRules.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Stack>
          </Panel>
          <Panel eyebrow="Use Setting" title="Block rules">
            <Stack gap="sm">
              <img className="rules-art" src={GAME_ASSETS.rules.block} alt="Block rules" />
              <ul className="bullet-list">
                {rulesGuide.blockRules.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            </Stack>
          </Panel>
        </Row>

        <Panel eyebrow="Host note" title="PeerJS and table rules">
          <Stack gap="sm">
            <p className="muted">{rulesGuide.peerRules[0]}</p>
            <p className="muted">{rulesGuide.peerRules[1]}</p>
            <p className="muted">{rulesGuide.peerRules[2]}</p>
            <img className="rules-art" src={GAME_ASSETS.rules.actionReference} alt="Action reference" />
          </Stack>
        </Panel>

        <Row>
          <Button onClick={onClose}>Close rules</Button>
        </Row>
      </Stack>
    </Modal>
  );
}
