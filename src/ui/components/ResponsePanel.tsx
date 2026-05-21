import { Button, Panel, Row, Stack } from '../../components/Ui';
import { labels } from '../../game/theme';
import type { Role } from '../../game/types';

type ResponsePanelProps = {
  canChallenge: boolean;
  canBlock: boolean;
  blockRoles: Role[];
  onChallenge: () => void;
  onPassChallenge: () => void;
  onPassBlock: () => void;
  onBlockRole: (role: Role) => void;
};

export function ResponsePanel({ canChallenge, canBlock, blockRoles, onChallenge, onPassChallenge, onPassBlock, onBlockRole }: ResponsePanelProps) {
  return (
    <Panel eyebrow="Response" title="Prompt controls">
      <Stack gap="sm">
        {canChallenge ? (
          <Row>
            <Button onClick={onChallenge} data-testid="response-call-bakwaas">
              {labels.responseLabels.CHALLENGE}
            </Button>
            <Button variant="secondary" onClick={onPassChallenge} data-testid="response-let-it-slide">
              {labels.responseLabels.PASS}
            </Button>
          </Row>
        ) : null}

        {canBlock ? (
          <Stack gap="sm">
            <Row>
              {blockRoles.map((role) => (
                <Button key={role} onClick={() => onBlockRole(role)} data-testid={`response-block-${role}`}>
                  {labels.responseLabels.BLOCK} · {labels.roleTheme[role].label}
                </Button>
              ))}
              <Button variant="secondary" onClick={onPassBlock} data-testid="response-let-it-slide">
                {labels.responseLabels.PASS}
              </Button>
            </Row>
            <Button variant="ghost" onClick={() => undefined} data-testid="response-use-setting">
              {labels.responseLabels.BLOCK}
            </Button>
          </Stack>
        ) : null}
      </Stack>
    </Panel>
  );
}
