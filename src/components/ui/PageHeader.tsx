import * as React from "react";
import { cn } from "@/lib/utils";

export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  backButton?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

/**
 * PageHeader - Consistent page header with title, description, and actions
 *
 * @example
 * <PageHeader
 *   title="Kunder"
 *   description="Hantera dina kunder och deras avtal"
 *   actions={
 *     <Button>
 *       <Plus className="h-4 w-4 mr-2" />
 *       Ny kund
 *     </Button>
 *   }
 * />
 */
export function PageHeader({
  title,
  description,
  children,
  actions,
  backButton,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-6", className)}>
      {backButton && <div className="mb-4">{backButton}</div>}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-bold text-charcoal tracking-tight">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-sm text-ash max-w-2xl">{description}</p>
          )}
          {children}
        </div>

        {actions && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}

export interface PageHeaderActionsProps {
  children: React.ReactNode;
}

/**
 * PageHeaderActions - Wrapper for action buttons in PageHeader
 */
export function PageHeaderActions({ children }: PageHeaderActionsProps) {
  return <div className="flex flex-wrap items-center gap-2">{children}</div>;
}

export interface PageHeaderTabsProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * PageHeaderTabs - Tab navigation below page header
 */
export function PageHeaderTabs({ children, className }: PageHeaderTabsProps) {
  return (
    <div
      className={cn(
        "mt-4 border-b border-sand flex items-center gap-1 overflow-x-auto",
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface PageHeaderTabProps {
  children: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

/**
 * PageHeaderTab - Individual tab in PageHeaderTabs
 */
export function PageHeaderTab({
  children,
  active,
  onClick,
  disabled,
}: PageHeaderTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors",
        "border-b-2 -mb-px",
        active
          ? "border-sage text-sage"
          : "border-transparent text-ash hover:text-charcoal hover:border-sand",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      {children}
    </button>
  );
}
