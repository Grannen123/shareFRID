import { ReactNode } from "react";
import { AlertTriangle, Info, CheckCircle, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertBannerProps {
  variant?: "info" | "warning" | "success" | "error";
  title?: string;
  children: ReactNode;
  className?: string;
}

const icons = {
  info: Info,
  warning: AlertTriangle,
  success: CheckCircle,
  error: XCircle,
};

const variants = {
  info: "bg-lavender/10 border-lavender/30 text-lavender",
  warning: "bg-warning/10 border-warning/30 text-warning",
  success: "bg-sage/10 border-sage/30 text-sage-dark",
  error: "bg-terracotta/10 border-terracotta/30 text-terracotta",
};

export function AlertBanner({
  variant = "info",
  title,
  children,
  className,
}: AlertBannerProps) {
  const Icon = icons[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-[var(--radius-md)] border p-4",
        variants[variant],
        className,
      )}
    >
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div className="flex-1">
        {title && <p className="font-medium mb-1">{title}</p>}
        <div className="text-sm opacity-90">{children}</div>
      </div>
    </div>
  );
}
