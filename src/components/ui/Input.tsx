import { forwardRef, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  errorId?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorId, ...props }, ref) => {
    return (
      <input
        type={type}
        aria-invalid={error || undefined}
        aria-describedby={error && errorId ? errorId : undefined}
        className={cn(
          "flex h-10 w-full rounded-[var(--radius-md)] border bg-warm-white px-3 py-2 text-sm text-charcoal placeholder:text-ash transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-0",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error
            ? "border-terracotta focus-visible:border-terracotta focus-visible:shadow-[var(--shadow-focus-error)]"
            : "border-sand focus-visible:border-sage focus-visible:shadow-[var(--shadow-focus)]",
          className,
        )}
        ref={ref}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
