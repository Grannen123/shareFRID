import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
  errorId?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, errorId, ...props }, ref) => {
    return (
      <textarea
        aria-invalid={error || undefined}
        aria-describedby={error && errorId ? errorId : undefined}
        className={cn(
          "flex min-h-[80px] w-full rounded-[var(--radius-md)] border bg-warm-white px-3 py-2 text-sm text-charcoal placeholder:text-ash transition-all duration-200 resize-none",
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

Textarea.displayName = "Textarea";

export { Textarea };
