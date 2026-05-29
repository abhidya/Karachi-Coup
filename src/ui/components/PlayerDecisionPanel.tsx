import { Button, Panel, Row, Stack } from '../../components/Ui';
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
  const parts = actionMetaParts(actionType);
  return parts.filter((part) => part.startsWith('Cost') || part === 'Choose a target' || part === 'No target').join(' · ');
}

function hasResponseChoice(prompt: PrivatePrompt) {
  return prompt?.type === 'CHALLENGE_ACTION' || prompt?.type === 'BLOCK_ACTION' || prompt?.type === 'CHALLENGE_BLOCK';
}

function decisionTitle(prompt: PrivatePrompt, actions: ActionType[]) {
  if (hasResponseChoice(prompt)) return 'Your response';
  if (prompt?.type === 'BURN_CONNECTION') return 'Burn a slot';
  if (prompt?.type === 'JUGAAD_RETURN') return 'Return cards';
  if (actions.length) return 'Your move';
  return 'Watch the table';
}

function primaryLabel(prompt: PrivatePrompt, actions: ActionType[]) {
  if (hasResponseChoice(prompt)) return 'Choose a reply';
  if (prompt?.type === 'BURN_CONNECTION') return 'Choose a hidden slot in the popup';
  if (prompt?.type === 'JUGAAD_RETURN') return 'Pick exactly 2 cards in the popup';
  if (actions.length) return 'Tap one move card';
  return 'Nothing needed from you';
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
  const needsResponse = hasResponseChoice(prompt) || prompt?.type === 'BURN_CONNECTION' || prompt?.type === 'JUGAAD_RETURN';

  return (
    <Panel eyebrow={phaseLabel} title={decisionTitle(prompt, actions)} className="player-decision-panel player-decision-panel--simple">
      <div className="player-decision" data-testid="player-decision-panel">
        <section className="turn-focus" aria-label="Current turn summary">
          <div className="turn-focus__copy">
            <p className="turn-focus__kicker">Now</p>
            <h2 data-testid="current-scene">{tableInstruction}</h2>
            <p className="turn-focus__subtext" data-testid="table-instruction">{waitingContext}</p>
          </div>
          <div className="turn-focus__side">
            <span className="turn-focus__next" data-testid="table-next-step">{primaryLabel(prompt, actions)}</span>
            <span className="turn-focus__mini">Turn: <strong data-testid="active-player-name">{activePlayerName ?? 'Waiting'}</strong></span>
            <span className="turn-focus__mini">Scene: {currentScene}</span>
            <Button variant="ghost" onClick={onOpenRules}>Rules</Button>
          </div>
        </section>

        {needsResponse ? (
          <div className="player-decision__choices player-decision__choices--single player-decision__choices--response-first">
            <section className="decision-card decision-card--response">
              <p className="eyebrow">Reply</p>
              <ResponseDecision
                prompt={prompt}
                guidance={responseGuidance}
                onChallenge={onChallenge}
                onPassChallenge={onPassChallenge}
                onPassBlock={onPassBlock}
                onBlockRole={onBlockRole}
              />
            </section>
          </div>
        ) : actions.length ? (
          <div className="player-decision__choices player-decision__choices--single">
            <section className="decision-card decision-card--actions">
              <p className="eyebrow">Moves</p>
              {actionGuidance ? <p className="guidance-copy guidance-copy--simple" data-testid="action-guidance">{actionGuidance}</p> : null}
              {forcedActionType ? <p className="muted">10+ Rupees: Full Beizzati is mandatory.</p> : null}
              <div className="action-card-grid" aria-label="Available moves">
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
              </div>
            </section>
          </div>
        ) : (
          <div className="player-decision__choices player-decision__choices--single">
            <section className="decision-card">
              <p className="eyebrow">Status</p>
              <p className="muted">No move or reply needed from you.</p>
            </section>
          </div>
        )}

        <p className="turn-focus__quiet-next">Next: {nextStep}</p>
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
        {guidance ? <p className="guidance-copy guidance-copy--simple" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">No reply needed.</p>
      </Stack>
    );
  }

  if (prompt.type === 'BURN_CONNECTION') {
    return (
      <Stack gap="xs">
        {guidance ? <p className="guidance-copy guidance-copy--simple" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">{prompt.message}</p>
      </Stack>
    );
  }

  if (prompt.type === 'JUGAAD_RETURN') {
    return (
      <Stack gap="xs">
        {guidance ? <p className="guidance-copy guidance-copy--simple" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">{prompt.message}</p>
      </Stack>
    );
  }

  if (prompt.type === 'CHALLENGE_ACTION') {
    return (
      <Stack gap="sm">
        {guidance ? <p className="guidance-copy guidance-copy--simple" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">Wrong caller burns. Correct caller makes the claimant burn.</p>
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
        {guidance ? <p className="guidance-copy guidance-copy--simple" data-testid="response-guidance">{guidance}</p> : null}
        <p className="muted">Block with Setting, or let it happen.</p>
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
      {guidance ? <p className="guidance-copy guidance-copy--simple" data-testid="response-guidance">{guidance}</p> : null}
      <p className="muted">Challenge only if the Setting claim feels false.</p>
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
  );
}
