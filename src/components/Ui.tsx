import type { HTMLAttributes, ReactNode } from 'react';

type PanelProps = {
  title?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
};

export function Panel({ title, eyebrow, children, footer }: PanelProps) {
  return (
    <section className="panel">
      {(eyebrow || title) && (
        <header className="panel__header">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          {title ? <h2>{title}</h2> : null}
        </header>
      )}
      <div className="panel__body">{children}</div>
      {footer ? <footer className="panel__footer">{footer}</footer> : null}
    </section>
  );
}

type ButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
};

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
}: ButtonProps) {
  return (
    <button className={`button button--${variant}`} type={type} onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode'];
  hint?: string;
};

export function Field({ label, value, onChange, placeholder, type = 'text', inputMode, hint }: FieldProps) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
      />
      {hint ? <span className="field__hint">{hint}</span> : null}
    </label>
  );
}

type PillProps = {
  children: ReactNode;
  tone?: 'neutral' | 'success' | 'warn' | 'danger';
};

export function Pill({ children, tone = 'neutral' }: PillProps) {
  return <span className={`pill pill--${tone}`}>{children}</span>;
}

type RowProps = {
  children: ReactNode;
  align?: 'start' | 'center' | 'end' | 'stretch';
  gap?: 'xs' | 'sm' | 'md';
  wrap?: boolean;
};

export function Row({ children, align = 'center', gap = 'md', wrap = true }: RowProps) {
  return <div className={`row row--${align} row--${gap} ${wrap ? 'row--wrap' : ''}`.trim()}>{children}</div>;
}

type StackProps = {
  children: ReactNode;
  gap?: 'xs' | 'sm' | 'md' | 'lg';
};

export function Stack({ children, gap = 'md' }: StackProps) {
  return <div className={`stack stack--${gap}`}>{children}</div>;
}
