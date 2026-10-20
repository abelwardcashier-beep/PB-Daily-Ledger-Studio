import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  /** Shows an inline spinner and disables the button while true. */
  loading?: boolean;
  isLoading?: boolean;
}

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-on-dark hover:bg-primary-deep active:bg-primary-deep shadow-sm focus-visible:ring-primary',
  secondary: 'bg-bg-card text-ink-soft ring-1 ring-inset ring-border-subtle hover:bg-bg-hover shadow-sm focus-visible:ring-primary',
  success: 'bg-income text-on-dark hover:bg-income-deep shadow-sm focus-visible:ring-income/60',
  danger: 'bg-expense text-on-dark hover:bg-expense-deep shadow-sm focus-visible:ring-expense/60',
  warning: 'bg-gilded text-on-dark hover:bg-gilded-deep shadow-sm focus-visible:ring-gilded/60',
  ghost: 'bg-transparent text-ink-soft hover:bg-bg-hover focus-visible:ring-border-default',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5',
  md: 'px-3.5 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-sm gap-2',
};

export function Button({
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  isLoading,
  disabled,
  className = '',
  children,
  ...rest
}: ButtonProps) {
  const busy = loading || Boolean(isLoading);
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ${VARIANTS[variant]} ${SIZES[size]} ${className}`}
      disabled={disabled || busy}
      {...rest}
    >
      {busy ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
        </svg>
      ) : (
        icon
      )}
      {children}
    </button>
  );
}
