import { Panel } from '../../components/Ui';
import type { GameLogEntry } from '../../game/types';

type ActionLogProps = {
  entries: GameLogEntry[] | null | undefined;
};

export function ActionLog({ entries }: ActionLogProps) {
  return (
    <Panel eyebrow="Log" title="Recent events" testId="action-log">
      <ul className="event-list">
        {entries?.length ? entries.map((entry) => <li key={entry.id}>{entry.text}</li>) : <li>Waiting for room sync.</li>}
      </ul>
    </Panel>
  );
}
