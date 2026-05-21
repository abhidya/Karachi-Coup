import { Button, Panel, Row, Stack } from '../../components/Ui';
import { labels, rulesGuide } from '../../game/theme';
import type { Role } from '../../game/types';
import { RESPONSE_IMAGE_BY_LABEL } from '../imageAssets';

type ResponsePanelProps = {
  promptKind: 'idle' | 'challenge' | 'block' | 'block-challenge';
  promptLabel?: string;
  blockRoles: Role[];
  onChallenge: () => void;
  onPassChallenge: () => void;
  onPassBlock: () => void;
  onBlockRole: (role: Role) => void;
};

export function ResponsePanel({ promptKind, promptLabel, blockRoles, onChallenge, onPassChallenge, onPassBlock, onBlockRole }: ResponsePanelProps) {
  const activePrompt =
    promptKind === 'challenge'
      ? {
          eyebrow: 'Challenge window',
          title: 'Call Bakwaas?',
          helper: promptLabel ?? 'A claimed role is waiting to be tested.',
        }
      : promptKind === 'block'
        ? {
            eyebrow: 'Block window',
            title: 'Use Setting?',
            helper: promptLabel ?? 'Choose a legal block role.',
          }
        : promptKind === 'block-challenge'
          ? {
              eyebrow: 'Block challenge',
              title: 'Call Bakwaas?',
              helper: promptLabel ?? 'A blocker claims a role.',
            }
          : null;

  return (
    <Panel eyebrow={activePrompt?.eyebrow ?? 'Response'} title={activePrompt?.title ?? 'Waiting for a prompt'}>
      <Stack gap="sm">
        {activePrompt ? <p className="muted">{activePrompt.helper}</p> : <p className="muted">{rulesGuide.peerRules[0]}</p>}

        {promptKind === 'challenge' ? (
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

        {promptKind === 'block' ? (
          <Stack gap="sm">
            <Row>
              {blockRoles.map((role) => (
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
            <p className="muted">Use only the listed setting roles.</p>
          </Stack>
        ) : null}

        {promptKind === 'block-challenge' ? (
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
