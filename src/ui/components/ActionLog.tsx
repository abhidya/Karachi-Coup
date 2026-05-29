import { useState } from 'react';
import { Button, Row } from '../../components/Ui';
import { Panel } from '../../components/Ui';
import type { GameLogEntry } from '../../game/types';

type ActionLogProps = {
  entries: GameLogEntry[] | null | undefined;
};

export function ActionLog({ entries }: ActionLogProps) {
  const [open, setOpen] = useState(false);
  const recentEntries = entries?.slice(-3).reverse() ?? [];

  return (
    <Panel eyebrow="Log" title="Action log" testId="action-log">
      <Row>
        <Button variant="ghost" onClick={() => setOpen((value) => !value)}>
          {open ? 'Collapse log' : 'Expand log'}
        </Button>
      </Row>
      {open ? (
        <ul className="event-list event-list--full">
          {entries?.length ? entries.slice().reverse().map((entry) => <li key={entry.id}>{entry.text}</li>) : <li>Waiting for room sync.</li>}
        </ul>
      ) : (
        <ul className="event-list">
          {recentEntries.length ? recentEntries.map((entry) => <li key={entry.id}>{entry.text}</li>) : <li>Waiting for room sync.</li>}
        </ul>
      )}
    </Panel>
  );
}
