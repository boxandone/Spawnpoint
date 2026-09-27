import {
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/cn';

interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  children: (ids: { id: string; describedBy?: string }) => ReactNode;
  className?: string;
}

function FieldShell({ label, hint, error, children, className }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errId = `${id}-err`;
  const describedBy = [hint && hintId, error && errId].filter(Boolean).join(' ') || undefined;
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="px-0.5 text-sm font-bold">
        {label}
      </label>
      {children({ id, describedBy })}
      {hint && (
        <p id={hintId} className="px-0.5 text-sm text-ink-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errId} role="alert" className="px-0.5 text-sm font-bold text-ink">
          <span className="mr-1 inline-block rounded-full bg-danger px-1.5 text-on-danger">!</span>
          {error}
        </p>
      )}
    </div>
  );
}

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: string;
  error?: string;
};

export function TextField({ label, hint, error, className, ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {({ id, describedBy }) => (
        <input
          id={id}
          aria-describedby={describedBy}
          aria-invalid={!!error || undefined}
          className="sp-input"
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string; hint?: string };

export function TextArea({ label, hint, className, ...rest }: TextAreaProps) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      {({ id, describedBy }) => (
        <textarea
          id={id}
          aria-describedby={describedBy}
          className="sp-input min-h-[88px] resize-y"
          {...rest}
        />
      )}
    </FieldShell>
  );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  hint?: string;
  children: ReactNode;
};

export function Select({ label, hint, className, children, ...rest }: SelectProps) {
  return (
    <FieldShell label={label} hint={hint} className={className}>
      {({ id, describedBy }) => (
        <select
          id={id}
          aria-describedby={describedBy}
          className="sp-input appearance-none bg-surface"
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
}

interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  className?: string;
}

/** A row of mutually exclusive options (radio group semantics). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: SegmentedProps<T>) {
  const name = useId();
  return (
    <fieldset className={cn('flex flex-col gap-1.5', className)}>
      <legend className="mb-1.5 px-0.5 text-sm font-bold">{label}</legend>
      <div className="flex gap-1 rounded-theme bg-surface-2 p-1">
        {options.map((o) => (
          <label
            key={o.value}
            className={cn(
              'relative flex min-h-[40px] flex-1 cursor-pointer items-center justify-center rounded-theme-sm px-2 text-center text-sm font-bold transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-[3px] has-[:focus-visible]:outline-primary',
              value === o.value
                ? 'bg-surface text-ink shadow-card'
                : 'text-ink-muted hover:text-ink',
            )}
          >
            <input
              type="radio"
              name={name}
              value={o.value}
              checked={value === o.value}
              onChange={() => onChange(o.value)}
              className="sr-only"
            />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

interface SwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function Switch({ label, description, checked, onChange, disabled }: SwitchProps) {
  const id = useId();
  return (
    <div className="flex min-h-[48px] items-center gap-3">
      <div className="min-w-0 flex-1">
        <label htmlFor={id} className="font-bold">
          {label}
        </label>
        {description && <p className="text-sm text-ink-muted">{description}</p>}
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-8 w-14 shrink-0 rounded-full transition-colors disabled:opacity-50',
          checked ? 'bg-primary' : 'bg-surface-2 shadow-[inset_0_0_0_2px_var(--line)]',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-6 w-6 rounded-full shadow transition-all',
            checked ? 'left-7 bg-primary-ink' : 'left-1 bg-ink-muted',
          )}
          aria-hidden
        />
      </button>
    </div>
  );
}
