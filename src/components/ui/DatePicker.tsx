import { forwardRef, InputHTMLAttributes } from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  error?: boolean;
}

const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div className="relative">
        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ash pointer-events-none" />
        <input
          type="date"
          className={cn(
            "flex h-10 w-full rounded-[var(--radius-md)] border bg-warm-white pl-10 pr-3 py-2 text-sm text-charcoal transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-0",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "[&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:cursor-pointer",
            error
              ? "border-terracotta focus-visible:border-terracotta focus-visible:shadow-[var(--shadow-focus-error)]"
              : "border-sand focus-visible:border-sage focus-visible:shadow-[var(--shadow-focus)]",
            className,
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  },
);

DatePicker.displayName = "DatePicker";

export { DatePicker };
