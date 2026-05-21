import { useState } from 'react';
import { Button, Row } from '../../components/Ui';
import { Panel } from '../../components/Ui';
import type { GameLogEntry } from '../../game/types';

type ActionLogProps = {
  entries: GameLogEntry[] | null | undefined;
};

export function ActionLog({ entries }: ActionLogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Panel eyebrow="Log" title="Action log" testId="action-log">
      <Row>
        <Button variant="ghost" onClick={() => setOpen((value) => !value)}>
          {open ? 'Collapse log' : 'Expand log'}
        </Button>
      </Row>
      {open ? (
        <ul className="event-list">
          {entries?.length ? entries.map((entry) => <li key={entry.id}>{entry.text}</li>) : <li>Waiting for room sync.</li>}
        </ul>
      ) : (
        <p className="muted">Recent scene history is tucked away to save space.</p>
      )}
    </Panel>
  );
}
