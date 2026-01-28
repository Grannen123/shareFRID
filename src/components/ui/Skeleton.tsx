import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Animation variant
   */
  animation?: "pulse" | "wave" | "none";
}

/**
 * Skeleton - Base skeleton loading placeholder
 *
 * @example
 * <Skeleton className="h-4 w-32" />
 */
function Skeleton({ className, animation = "pulse", ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "bg-sand rounded-md",
        animation === "pulse" && "animate-pulse",
        animation === "wave" &&
          "relative overflow-hidden after:absolute after:inset-0 after:translate-x-[-100%] after:animate-[shimmer_2s_infinite] after:bg-gradient-to-r after:from-transparent after:via-white/20 after:to-transparent",
        className,
      )}
      {...props}
    />
  );
}

/**
 * SkeletonText - Text line skeleton
 */
function SkeletonText({
  lines = 1,
  className,
  lastLineWidth = "75%",
  ...props
}: SkeletonProps & {
  lines?: number;
  lastLineWidth?: string;
}) {
  return (
    <div className={cn("space-y-2", className)} {...props}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4"
          style={{
            width: i === lines - 1 && lines > 1 ? lastLineWidth : "100%",
          }}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonAvatar - Circular avatar skeleton
 */
function SkeletonAvatar({
  size = "md",
  className,
  ...props
}: SkeletonProps & {
  size?: "sm" | "md" | "lg" | "xl";
}) {
  return (
    <Skeleton
      className={cn(
        "rounded-full shrink-0",
        size === "sm" && "h-8 w-8",
        size === "md" && "h-10 w-10",
        size === "lg" && "h-12 w-12",
        size === "xl" && "h-16 w-16",
        className,
      )}
      {...props}
    />
  );
}

/**
 * SkeletonButton - Button skeleton
 */
function SkeletonButton({
  size = "md",
  className,
  ...props
}: SkeletonProps & {
  size?: "sm" | "md" | "lg";
}) {
  return (
    <Skeleton
      className={cn(
        "rounded-md",
        size === "sm" && "h-8 w-20",
        size === "md" && "h-10 w-24",
        size === "lg" && "h-12 w-28",
        className,
      )}
      {...props}
    />
  );
}

/**
 * SkeletonCard - Card skeleton with optional header and content
 */
function SkeletonCard({
  hasHeader = true,
  lines = 3,
  className,
  ...props
}: SkeletonProps & {
  hasHeader?: boolean;
  lines?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-sand bg-warm-white p-6 space-y-4",
        className,
      )}
      {...props}
    >
      {hasHeader && (
        <div className="space-y-2">
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      )}
      <SkeletonText lines={lines} />
    </div>
  );
}

/**
 * SkeletonTable - Table skeleton
 */
function SkeletonTable({
  rows = 5,
  columns = 4,
  hasHeader = true,
  className,
  ...props
}: SkeletonProps & {
  rows?: number;
  columns?: number;
  hasHeader?: boolean;
}) {
  return (
    <div
      className={cn("rounded-[var(--radius-lg)] border border-sand", className)}
      {...props}
    >
      {hasHeader && (
        <div className="flex items-center gap-4 p-4 border-b border-sand bg-sand-light/30">
          {Array.from({ length: columns }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-4"
              style={{ width: `${100 / columns}%` }}
            />
          ))}
        </div>
      )}
      <div className="divide-y divide-sand">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="flex items-center gap-4 p-4">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className="h-4"
                style={{ width: `${100 / columns}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * SkeletonList - List item skeletons
 */
function SkeletonList({
  items = 5,
  hasAvatar = false,
  className,
  ...props
}: SkeletonProps & {
  items?: number;
  hasAvatar?: boolean;
}) {
  return (
    <div className={cn("space-y-3", className)} {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div key={i} className="flex items-center gap-3">
          {hasAvatar && <SkeletonAvatar size="md" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonKPI - KPI card skeleton
 */
function SkeletonKPI({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border border-sand bg-warm-white p-4 space-y-3",
        className,
      )}
      {...props}
    >
      <div className="flex items-center justify-between">
        <Skeleton className="h-10 w-10 rounded-lg" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-7 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonAvatar,
  SkeletonButton,
  SkeletonCard,
  SkeletonTable,
  SkeletonList,
  SkeletonKPI,
};
