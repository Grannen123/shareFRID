import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "sage"
    | "terracotta"
    | "lavender"
    | "warning"
    | "outline";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors",
        {
          "bg-sand text-charcoal": variant === "default",
          "bg-sage/15 text-sage-dark": variant === "sage",
          "bg-terracotta/15 text-terracotta-dark": variant === "terracotta",
          "bg-lavender/15 text-lavender": variant === "lavender",
          "bg-warning/15 text-warning": variant === "warning",
          "border border-sand text-ash": variant === "outline",
        },
        className,
      )}
      {...props}
    />
  );
}

export { Badge };
