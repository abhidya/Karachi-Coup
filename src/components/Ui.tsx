import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react';

type PanelProps = {
  title?: ReactNode;
  eyebrow?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  testId?: string;
};

export function Panel({ title, eyebrow, children, footer, className = '', testId }: PanelProps) {
  return (
    <section className={`panel ${className}`.trim()} data-testid={testId}>
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
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button className={`button button--${variant} ${className}`.trim()} type={type} onClick={onClick} disabled={disabled} {...props}>
      <span className="button__content">{children}</span>
    </button>
  );
}

type FieldProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode'];
  hint?: string;
  inputTestId?: string;
  className?: string;
};

export function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  inputMode,
  hint,
  inputTestId,
  className = '',
  ...props
}: FieldProps) {
  return (
    <label className={`field ${className}`.trim()} {...props}>
      <span className="field__label">{label}</span>
      <input
        className="field__input"
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(event) => onChange(event.target.value)}
        data-testid={inputTestId}
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
