import { Panel, Row, Stack } from '../../components/Ui';
import { ACTION_CONFIG } from '../../game/rules';
import { labels, rulesGuide } from '../../game/theme';
import type { ActionType } from '../../game/types';
import { ConnectionCard } from './ConnectionCard';
import { ACTION_IMAGE_BY_ACTION } from '../imageAssets';

type ActionPanelProps = {
  actions: ActionType[];
  onActionClick?: (actionType: ActionType) => void;
  forcedActionType?: ActionType | null;
  guidance?: string;
};

function actionSummary(actionType: ActionType) {
  return rulesGuide.actionSummaries.find((entry) => entry.action === actionType)?.summary ?? '';
}

function actionMeta(actionType: ActionType) {
  const config = ACTION_CONFIG[actionType];
  const parts = [`Cost ${config.cost}₹`];
  parts.push(config.needsTarget ? 'Choose a target' : 'No target');
  parts.push(config.claimedRole ? `Claims ${labels.roleTheme[config.claimedRole].label}` : 'No role claim');
  parts.push(config.challengeable ? 'Bakwaas allowed' : 'No Bakwaas');
  parts.push(config.blockRoles.length ? `Blocked by ${config.blockRoles.map((role) => labels.roleTheme[role].label).join(' / ')}` : 'No Setting block');
  return parts.join(' · ');
}

export function ActionPanel({ actions, onActionClick, forcedActionType, guidance }: ActionPanelProps) {
  return (
    <Panel eyebrow="Actions" title="Your move">
      <Stack gap="sm">
        {guidance ? <p className="guidance-copy" data-testid="action-guidance">{guidance}</p> : null}
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
          <p className="muted">No legal actions now.</p>
        )}
      </Stack>
    </Panel>
  );
}
