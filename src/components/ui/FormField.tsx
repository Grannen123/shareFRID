import * as React from "react";
import { Label } from "./Label";
import { Input, InputProps } from "./Input";
import { cn } from "@/lib/utils";

export interface FormFieldProps extends Omit<InputProps, "error" | "errorId"> {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
}

/**
 * FormField - A composed form field with label, input, hint, and error message
 *
 * @example
 * <FormField
 *   label="E-postadress"
 *   type="email"
 *   placeholder="namn@exempel.se"
 *   required
 *   error={errors.email?.message}
 * />
 */
const FormField = React.forwardRef<HTMLInputElement, FormFieldProps>(
  (
    { label, error, hint, required, optional, className, id, ...props },
    ref,
  ) => {
    const generatedId = React.useId();
    const fieldId = id || generatedId;
    const errorId = `${fieldId}-error`;
    const hintId = `${fieldId}-hint`;

    const describedBy = [error && errorId, hint && hintId]
      .filter(Boolean)
      .join(" ");

    return (
      <div className={cn("space-y-1.5", className)}>
        <div className="flex items-baseline justify-between gap-2">
          <Label htmlFor={fieldId} error={!!error}>
            {label}
            {required && (
              <span className="text-terracotta ml-0.5" aria-hidden="true">
                *
              </span>
            )}
          </Label>
          {optional && (
            <span className="text-xs text-ash font-normal">Valfritt</span>
          )}
        </div>

        <Input
          ref={ref}
          id={fieldId}
          error={!!error}
          errorId={error ? errorId : undefined}
          aria-describedby={describedBy || undefined}
          aria-required={required}
          {...props}
        />

        {hint && !error && (
          <p id={hintId} className="text-xs text-ash">
            {hint}
          </p>
        )}

        {error && (
          <p
            id={errorId}
            className="text-xs text-terracotta flex items-center gap-1"
            role="alert"
          >
            <svg
              className="h-3.5 w-3.5 shrink-0"
              viewBox="0 0 16 16"
              fill="currentColor"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M8 16A8 8 0 108 0a8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zm-.75 8a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
      </div>
    );
  },
);

FormField.displayName = "FormField";

export { FormField };
