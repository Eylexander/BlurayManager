import React, { ReactNode } from 'react';

interface FieldProps {
  label?: ReactNode;
  /** Small icon shown before the label */
  icon?: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Label + control + hint/error, the layout shared by every form field.
 * Pair it with the `.input` class (or <Input />) for the control itself.
 */
export function Field({ label, icon, htmlFor, hint, error, className = '', children }: FieldProps) {
  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label
          htmlFor={htmlFor}
          className="flex items-center gap-1.5 mb-1.5 text-sm font-medium text-foreground/80 [&_svg]:w-3.5 [&_svg]:h-3.5 [&_svg]:text-muted-foreground"
        >
          {icon}
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs text-destructive">{error}</p>
      ) : (
        hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
