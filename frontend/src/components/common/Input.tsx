"use client";

import React, { ReactNode, useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff } from "lucide-react";
import { Field } from "./Field";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  /** Small icon shown before the label */
  labelIcon?: ReactNode;
  error?: string;
  helperText?: ReactNode;
  /** For password fields: adds a show/hide toggle */
  revealable?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, labelIcon, error, helperText, revealable, className = "", id, type, ...props }, ref) => {
    const t = useTranslations();
    const generatedId = useId();
    const inputId = id || generatedId;
    const [revealed, setRevealed] = useState(false);

    const input = (
      <input
        ref={ref}
        id={inputId}
        type={revealable && revealed ? "text" : type}
        aria-invalid={error ? true : undefined}
        className={`input ${revealable ? "pr-11" : ""} ${error ? "border-destructive focus:border-destructive focus:ring-destructive/30" : ""} ${className}`}
        {...props}
      />
    );

    return (
      <Field label={label} icon={labelIcon} htmlFor={inputId} hint={helperText} error={error}>
        {revealable ? (
          <div className="relative">
            {input}
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              aria-label={revealed ? t("auth.hidePassword") : t("auth.showPassword")}
              aria-pressed={revealed}
              className="absolute right-1.5 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            >
              {revealed ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        ) : (
          input
        )}
      </Field>
    );
  },
);

Input.displayName = "Input";
