import { Button, Panel, Row, Stack } from '../../components/Ui';
import { GAME_ASSETS } from '../../game/assets';
import { ACTION_CONFIG } from '../../game/rules';
import { labels, rulesGuide } from '../../game/theme';
import type { ActionType, PrivatePrompt, Role } from '../../game/types';
import { actionMetaParts } from '../gameGuidance';
import { ACTION_IMAGE_BY_ACTION, RESPONSE_IMAGE_BY_LABEL } from '../imageAssets';
import { ConnectionCard } from './ConnectionCard';

type PlayerDecisionPanelProps = {
  currentScene: string;
  phaseLabel: string;
  tableInstruction: string;
  waitingContext: string;
  nextStep: string;
  activePlayerName: string | null;
  actions: ActionType[];
  prompt: PrivatePrompt;
  onActionClick?: (actionType: ActionType) => void;
  forcedActionType?: ActionType | null;
  actionGuidance?: string;
  responseGuidance?: string;
  onChallenge: () => void;
  onPassChallenge: () => void;
  onPassBlock: () => void;
  onBlockRole: (role: Role) => void;
  onOpenRules: () => void;
};

function actionSummary(actionType: ActionType) {
  return rulesGuide.actionSummaries.find((entry) => entry.action === actionType)?.summary ?? '';
}

function actionMeta(actionType: ActionType) {
  return actionMetaParts(actionType).join(' · ');
}

function hasResponseChoice(prompt: PrivatePrompt) {
  return prompt?.type === 'CHALLENGE_ACTION' || prompt?.type === 'BLOCK_ACTION' || prompt?.type === 'CHALLENGE_BLOCK';
}

function decisionTitle(prompt: PrivatePrompt, actions: ActionType[]) {
  if (hasResponseChoice(prompt)) return 'Respond now';
  if (prompt?.type === 'BURN_CONNECTION') return 'Burn required';
  if (prompt?.type === 'JUGAAD_RETURN') return 'Return cards';
  if (actions.length) return 'Your move';
  return 'Waiting for the table';
}

export function PlayerDecisionPanel({
  currentScene,
  phaseLabel,
  tableInstruction,
  waitingContext,
  nextStep,
  activePlayerName,
  actions,
  prompt,
  onActionClick,
  forcedActionType,
  actionGuidance,
  responseGuidance,
  onChallenge,
  onPassChallenge,
  onPassBlock,
  onBlockRole,
  onOpenRules,
}: PlayerDecisionPanelProps) {
  return (
    <Panel eyebrow={phaseLabel} title={decisionTitle(prompt, actions)} className="player-decision-panel">
      <div className="stack stack--md player-decision" data-testid="player-decision-panel">
        <section className="player-decision__scene scene-banner__copy">
          <Row align="center" wrap>
            <img className="badge-icon badge-icon--large" src={GAME_ASSETS.badges.currentScene} alt="Current scene" />
            <div className="player-decision__scene-copy">
              <p className="eyebrow">Current scene</p>
              <h2 data-testid="current-scene">{tableInstruction}</h2>
              <p className="scene-banner__detail" data-testid="table-instruction">{waitingContext}</p>
              <div className="player-decision__chips" aria-label="Current table status">
                <span className="status-pill" data-testid="table-next-step">Next: {nextStep}</span>
                <span className="status-pill">Turn: <strong data-testid="active-player-name">{activePlayerName ?? 'Waiting'}</strong></span>
                <span className="status-pill">Scene: {currentScene}</span>
              </div>
            </div>
            <Button variant="secondary" onClick={onOpenRules}>Rules</Button>
          </Row>
        </section>

        <div className="player-decision__choices">
          <section className="player-decision__response">
            <p className="eyebrow">Required response</p>
            <ResponseDecision
              prompt={prompt}
              guidance={responseGuidance}
              onChallenge={onChallenge}
              onPassChallenge={onPassChallenge}
              onPassBlock={onPassBlock}
              onBlockRole={onBlockRole}
            />
          </section>

          <section className="player-decision__actions">
            <p className="eyebrow">Turn actions</p>
            {actionGuidance ? <p className="guidance-copy" data-testid="action-guidance">{actionGuidance}</p> : null}
            {forcedActionType ? <p className="muted">10+ Rupees: Full Beizzati is mandatory. Choose a target and resolve the burn.</p> : null}
            {actions.length ? (
              <Row>
                {actions.map((actionType) => (
                  <ConnectionCard
                    key={actionType}
                    src={ACTION_IMAGE_BY_ACTION[actionType]}
                    title={labels.actionLabels[actionType]}
                    subtitle={
                      <>
                        <span>{actionSummary(actionType) || (ACTION_CONFIG[actionType].challengeable ? 'Bakwaas possible' : 'No challenge')}</span>
                        <span className="art-card__meta">{actionMeta(actionType)}</span>
                      </>
                    }
                    active={forcedActionType === actionType}
                    onClick={onActionClick ? () => onActionClick(actionType) : undefined}
                    dataTestId={`action-button-${actionType}`}
                  />
                ))}
              </Row>
            ) : (
              <p className="muted">No legal turn actions now. Check the response area above for anything required from you.</p>
            )}
          </section>
        </div>
      </div>
    </Panel>
  );
}

type ResponseDecisionProps = {
  prompt: PrivatePrompt;
  guidance?: string;
  onChallenge: () => void;
  onPassChallenge: () => void;
  onPassBlock: () => void;
  onBlockRole: (role: Role) => void;
};

function ResponseDecision({ prompt, guidance, onChallenge, onPassChallenge, onPassBlock, onBlockRole }: ResponseDecisionProps) {
  if (!prompt) {
    return (
      <Stack gap="xs">
        {guidance ? <p className="guidance-copy" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">No Bakwaas, Setting, burn, or return decision is waiting on you.</p>
      </Stack>
    );
  }

  if (prompt.type === 'BURN_CONNECTION') {
    return (
      <Stack gap="xs">
        {guidance ? <p className="guidance-copy" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">{prompt.message}</p>
        <p className="muted">Choose a hidden slot in the modal. You will not see the character card before confirming.</p>
      </Stack>
    );
  }

  if (prompt.type === 'JUGAAD_RETURN') {
    return (
      <Stack gap="xs">
        {guidance ? <p className="guidance-copy" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">{prompt.message}</p>
      </Stack>
    );
  }

  if (prompt.type === 'CHALLENGE_ACTION') {
    return (
      <Stack gap="sm">
        {guidance ? <p className="guidance-copy" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">{prompt.message}</p>
        <p className="muted">
          Call Bakwaas if you think they do not have {labels.roleTheme[prompt.claimedRole].label}. If you are wrong, you burn; if you are right, they burn and the scene stops.
        </p>
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
    );
  }

  if (prompt.type === 'BLOCK_ACTION') {
    return (
      <Stack gap="sm">
        {guidance ? <p className="guidance-copy" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">{prompt.message}</p>
        <p className="muted">Use Setting claims a blocker role. If someone calls Bakwaas and you cannot prove it, you burn one Connection.</p>
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
    );
  }

  return (
    <Stack gap="sm">
      {guidance ? <p className="guidance-copy" data-testid="response-guidance">{guidance}</p> : null}
      <p className="muted">{prompt.message}</p>
      {prompt.type === 'CHALLENGE_BLOCK' ? (
        <>
          <p className="muted">Challenge the block only if you think the blocker cannot prove {labels.roleTheme[prompt.blockingRole].label}.</p>
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
        </>
      ) : null}
    </Stack>
  );
}
