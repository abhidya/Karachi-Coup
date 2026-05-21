import type { ReactNode } from 'react';

type ConnectionCardProps = {
  src: string;
  title: string;
  subtitle?: ReactNode;
  active?: boolean;
  tone?: 'neutral' | 'success' | 'warn' | 'danger';
  onClick?: () => void;
  disabled?: boolean;
  dataTestId?: string;
};

export function ConnectionCard({
  src,
  title,
  subtitle,
  active,
  tone = 'neutral',
  onClick,
  disabled,
  dataTestId,
}: ConnectionCardProps) {
  return (
    <button
      type="button"
      className={`art-card art-card--${tone} ${active ? 'art-card--active' : ''}`}
      onClick={onClick}
      disabled={disabled || !onClick}
      data-testid={dataTestId}
    >
      <img className="art-card__image" src={src} alt={title} />
      <span className="art-card__title">{title}</span>
      {subtitle ? <span className="art-card__subtitle">{subtitle}</span> : null}
    </button>
  );
}
