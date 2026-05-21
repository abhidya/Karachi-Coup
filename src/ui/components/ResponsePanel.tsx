import { Button, Panel, Row, Stack } from '../../components/Ui';
import { labels, rulesGuide } from '../../game/theme';
import type { PrivatePrompt, Role } from '../../game/types';
import { RESPONSE_IMAGE_BY_LABEL } from '../imageAssets';

type ResponsePanelProps = {
  prompt: PrivatePrompt;
  onChallenge: () => void;
  onPassChallenge: () => void;
  onPassBlock: () => void;
  onBlockRole: (role: Role) => void;
};

export function ResponsePanel({ prompt, onChallenge, onPassChallenge, onPassBlock, onBlockRole }: ResponsePanelProps) {
  if (!prompt) {
    return (
      <Panel eyebrow="Response" title="Waiting for the table">
        <p className="muted">{rulesGuide.peerRules[0]}</p>
      </Panel>
    );
  }

  if (prompt.type === 'BURN_CONNECTION') {
    return (
      <Panel eyebrow="Response" title="Burn Connection">
        <p className="muted">{prompt.message}</p>
      </Panel>
    );
  }

  if (prompt.type === 'JUGAAD_RETURN') {
    return (
      <Panel eyebrow="Response" title="Zardaar Jugaad">
        <p className="muted">{prompt.message}</p>
      </Panel>
    );
  }

  if (prompt.type === 'CHALLENGE_ACTION') {
    return (
      <Panel eyebrow="Response" title="Call Bakwaas?">
        <Stack gap="sm">
          <p className="muted">{prompt.message}</p>
          <Row>
            <Button onClick={onChallenge} data-testid="response-call-bakwaas">
              <img className="button-icon" src={RESPONSE_IMAGE_BY_LABEL.challenge} alt="" />
              {labels.responseLabels.CHALLENGE}
            </Button>
            <Button variant="secondary" onClick={onPassChallenge} data-testid="response-let-it-slide">
              <img className="button-icon" src={RESPONSE_IMAGE_BY_LABEL.pass} alt="" />
              {labels.responseLabels.PASS}
            </Button>
          </Row>
        </Stack>
      </Panel>
    );
  }

  if (prompt.type === 'BLOCK_ACTION') {
    return (
      <Panel eyebrow="Response" title="Use Setting?">
        <Stack gap="sm">
          <p className="muted">{prompt.message}</p>
          <Row>
            {prompt.legalBlockRoles.map((role) => (
              <Button key={role} onClick={() => onBlockRole(role)} data-testid={`response-block-${role}`}>
                <img className="button-icon" src={RESPONSE_IMAGE_BY_LABEL.block} alt="" />
                {labels.responseLabels.BLOCK}: {labels.roleTheme[role].label}
              </Button>
            ))}
            <Button variant="secondary" onClick={onPassBlock} data-testid="response-let-it-slide">
              <img className="button-icon" src={RESPONSE_IMAGE_BY_LABEL.pass} alt="" />
              {labels.responseLabels.PASS}
            </Button>
          </Row>
        </Stack>
      </Panel>
    );
  }

  return (
    <Panel
      eyebrow="Response"
      title={prompt.type === 'CHALLENGE_BLOCK' ? 'Call Bakwaas on the block?' : 'Waiting for the table'}
    >
      <Stack gap="sm">
        <p className="muted">{prompt.message}</p>
        {prompt.type === 'CHALLENGE_BLOCK' ? (
          <Row>
            <Button onClick={onChallenge} data-testid="response-call-bakwaas">
              <img className="button-icon" src={RESPONSE_IMAGE_BY_LABEL.challenge} alt="" />
              {labels.responseLabels.CHALLENGE}
            </Button>
            <Button variant="secondary" onClick={onPassChallenge} data-testid="response-let-it-slide">
              <img className="button-icon" src={RESPONSE_IMAGE_BY_LABEL.pass} alt="" />
              {labels.responseLabels.PASS}
            </Button>
          </Row>
        ) : null}
      </Stack>
    </Panel>
  );
}
