import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

const inputBase =
  'w-full rounded-lg border bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition-colors focus:outline-none focus:ring-2';

const normalState = 'border-slate-200 focus:ring-indigo-500/40 focus:border-indigo-400';
const errorState = 'border-rose-500 focus:ring-rose-400/40 focus:border-rose-400';

export interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  /** When set, renders below the control in rose and switches the child input to error styling via context-free class. */
  error?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, hint, required, error, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-xs font-semibold text-slate-600 uppercase tracking-wide">
        {label}
        {required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : (
        hint && <p className="text-xs text-slate-400">{hint}</p>
      )}
    </div>
  );
}

/** Merge base + state classes; `invalid` swaps to the rose error styling. */
function fieldClass(invalid: boolean | undefined, extra: string): string {
  return `${inputBase} ${invalid ? errorState : normalState} ${extra}`;
}

export interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function TextInput({ className = '', invalid, ...rest }: TextInputProps) {
  return <input aria-invalid={invalid || undefined} className={fieldClass(invalid, className)} {...rest} />;
}

export interface NumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
}

export function NumberInput({ className = '', invalid, ...rest }: NumberInputProps) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      step="any"
      aria-invalid={invalid || undefined}
      className={fieldClass(invalid, `tabular-nums ${className}`)}
      {...rest}
    />
  );
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  invalid?: boolean;
}

export function Select({ className = '', invalid, children, ...rest }: SelectProps) {
  return (
    <select
      aria-invalid={invalid || undefined}
      className={fieldClass(invalid, `appearance-none bg-no-repeat pr-8 ${className}`)}
      {...rest}
    >
      {children}
    </select>
  );
}

export interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export function TextArea({ className = '', invalid, ...rest }: TextAreaProps) {
  return <textarea aria-invalid={invalid || undefined} className={fieldClass(invalid, `resize-none ${className}`)} rows={3} {...rest} />;
}
