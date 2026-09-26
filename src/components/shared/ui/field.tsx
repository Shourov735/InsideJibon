/**
 * Field — labeled form field with description + error state.
 *
 * Use this everywhere instead of hand-rolling `<label><input/></label>`
 * patterns. Pairs with the actual <Input>/<Textarea>/<Select>
 * primitives (defined inline here for now to keep surface small).
 */

import { forwardRef, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

interface FieldShellProps {
  id?: string;
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function FieldShell({
  id,
  label,
  description,
  error,
  required,
  children,
  className,
}: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label ? (
        <label
          htmlFor={id}
          className="flex items-center gap-1 text-sm font-medium text-ink-900"
        >
          <span>{label}</span>
          {required ? (
            <span aria-hidden className="text-[color:var(--color-danger)]">*</span>
          ) : null}
        </label>
      ) : null}
      {children}
      {description && !error ? (
        <p className="text-xs text-ink-500">{description}</p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs font-medium text-[color:var(--color-danger)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputBase =
  "block w-full rounded-xl border border-outline-variant bg-surface-0 px-3.5 py-2.5 text-base text-ink-900 placeholder:text-ink-300 " +
  "transition-[border,box-shadow] duration-150 " +
  "focus:border-[color:var(--color-info)] focus:outline-none focus:ring-2 focus:ring-[color:var(--color-info)]/30 " +
  "disabled:cursor-not-allowed disabled:bg-surface-1";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, description, error, fieldClassName, className, id, required, ...rest },
  ref,
) {
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={fieldClassName}
    >
      <input
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(inputBase, error ? "border-[color:var(--color-danger)]" : null, className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, description, error, fieldClassName, className, id, required, ...rest },
  ref,
) {
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={fieldClassName}
    >
      <textarea
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(inputBase, "min-h-[96px] resize-y", error ? "border-[color:var(--color-danger)]" : null, className)}
        {...rest}
      />
    </FieldShell>
  );
});

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  fieldClassName?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, description, error, fieldClassName, className, id, required, children, ...rest },
  ref,
) {
  return (
    <FieldShell
      id={id}
      label={label}
      description={description}
      error={error}
      required={required}
      className={fieldClassName}
    >
      <select
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        className={cn(inputBase, "appearance-none pr-10 bg-[length:16px] bg-no-repeat bg-[right_0.75rem_center]", error ? "border-[color:var(--color-danger)]" : null, className)}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%2356565e'><path fill-rule='evenodd' d='M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 011.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z' clip-rule='evenodd'/></svg>\")",
        }}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
});
