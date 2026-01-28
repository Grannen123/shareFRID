import { forwardRef, ButtonHTMLAttributes } from "react";
import { Slot } from "@radix-ui/react-slot";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  asChild?: boolean;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      asChild = false,
      loading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : "button";
    const isDisabled = disabled || loading;

    return (
      <Comp
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2 font-medium",
          "rounded-[var(--radius-md)] transition-all",
          // Timing
          "duration-200 ease-out",
          // Focus styles
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          // Disabled styles
          "disabled:pointer-events-none disabled:opacity-50",
          // Active/pressed state
          "active:scale-[0.98]",
          {
            // Variants with improved hover states
            "bg-sage text-white hover:bg-sage-dark hover:shadow-md focus-visible:ring-sage active:bg-sage-900":
              variant === "primary",
            "bg-sand text-charcoal hover:bg-sand-light hover:shadow-sm focus-visible:ring-sage active:bg-cream":
              variant === "secondary",
            "border-2 border-sage text-sage bg-transparent hover:bg-sage/10 hover:border-sage-dark focus-visible:ring-sage active:bg-sage/20":
              variant === "outline",
            "text-charcoal bg-transparent hover:bg-sand hover:text-sage-dark focus-visible:ring-sage active:bg-sand-light":
              variant === "ghost",
            "bg-terracotta text-white hover:bg-terracotta-dark hover:shadow-md focus-visible:ring-terracotta active:bg-terracotta-900":
              variant === "danger",
            // Sizes with consistent 8px grid
            "h-8 px-3 text-xs": size === "sm",
            "h-10 px-4 text-sm": size === "md",
            "h-12 px-6 text-base": size === "lg",
          },
          className,
        )}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            <span className="sr-only">Laddar...</span>
            {children}
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </Comp>
    );
  },
);

Button.displayName = "Button";

export { Button };
