import type { ReactNode } from 'react';
import { Button } from '../components/Ui';

type ModalProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  dismissible?: boolean;
};

export function Modal({ title, subtitle, onClose, children, dismissible = true }: ModalProps) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <button className="modal__scrim" type="button" aria-label="Close modal" onClick={onClose} disabled={!dismissible} />
      <section className="modal__sheet">
        <header className="modal__header">
          <div>
            <p className="eyebrow">{subtitle}</p>
            <h3>{title}</h3>
          </div>
          {dismissible ? (
            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          ) : null}
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}
