import { Panel, Row, Stack } from '../../components/Ui';
import { ACTION_CONFIG } from '../../game/rules';
import { labels } from '../../game/theme';
import type { ActionType } from '../../game/types';
import { ConnectionCard } from './ConnectionCard';
import { GAME_ASSETS } from '../../game/assets';
import { isTargetedAction } from '../actionRouting';

type ActionPanelProps = {
  actions: ActionType[];
  onActionClick?: (actionType: ActionType) => void;
};

function actionAsset(actionType: ActionType) {
  switch (actionType) {
    case 'CHAI_PAISA':
      return GAME_ASSETS.actions.income;
    case 'RISHTEDAAR_HELP':
      return GAME_ASSETS.actions.foreignAid;
    case 'KIRAYA_COLLECTION':
      return GAME_ASSETS.actions.tax;
    case 'POLICE_WALA_RAID':
      return GAME_ASSETS.actions.steal;
    case 'BHAI_KA_SCENE':
      return GAME_ASSETS.actions.assassinate;
    case 'ZARDAAR_JUGAAD':
      return GAME_ASSETS.actions.exchange;
    case 'FULL_BEIZZATI':
      return GAME_ASSETS.actions.coup;
  }
}

export function ActionPanel({ actions, onActionClick }: ActionPanelProps) {
  return (
    <Panel eyebrow="Actions" title="Game controls">
      <Stack gap="sm">
        {actions.length ? (
          <Row>
            {actions.map((actionType) => (
              <ConnectionCard
                key={actionType}
                src={actionAsset(actionType)}
                title={labels.actionLabels[actionType]}
                subtitle={isTargetedAction(actionType) ? 'Choose a living target' : ACTION_CONFIG[actionType].challengeable ? 'Bakwaas possible' : 'No challenge'}
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
