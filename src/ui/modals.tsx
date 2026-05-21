import type { ReactNode } from 'react';
import { Button } from '../components/Ui';

type ModalProps = {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, subtitle, onClose, children }: ModalProps) {
  return (
    <div className="modal" role="dialog" aria-modal="true">
      <button className="modal__scrim" type="button" aria-label="Close modal" onClick={onClose} />
      <section className="modal__sheet">
        <header className="modal__header">
          <div>
            <p className="eyebrow">{subtitle}</p>
            <h3>{title}</h3>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className="modal__body">{children}</div>
      </section>
    </div>
  );
}
