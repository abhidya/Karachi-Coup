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
};

function actionSummary(actionType: ActionType) {
  return rulesGuide.actionSummaries.find((entry) => entry.action === actionType)?.summary ?? '';
}

export function ActionPanel({ actions, onActionClick, forcedActionType }: ActionPanelProps) {
  return (
    <Panel eyebrow="Actions" title="Your move">
      <Stack gap="sm">
        {forcedActionType ? <p className="muted">10+ Rupees: Full Beizzati is mandatory.</p> : null}
        {actions.length ? (
          <Row>
            {actions.map((actionType) => (
              <ConnectionCard
                key={actionType}
                src={ACTION_IMAGE_BY_ACTION[actionType]}
                title={labels.actionLabels[actionType]}
                subtitle={actionSummary(actionType) || (ACTION_CONFIG[actionType].challengeable ? 'Bakwaas possible' : 'No challenge')}
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
