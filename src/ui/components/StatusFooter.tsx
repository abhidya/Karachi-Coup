import { Button, Pill } from '../../components/Ui';

type StatusFooterProps = {
  mode: string;
  onLeaveRoom: () => void;
};

export function StatusFooter({ mode, onLeaveRoom }: StatusFooterProps) {
  return (
    <footer className="screen-footer">
      <Button variant="ghost" onClick={onLeaveRoom} disabled={mode === 'idle'} data-testid="leave-room-button">
        Leave room
      </Button>
      <Pill tone="neutral">{mode}</Pill>
    </footer>
  );
}
