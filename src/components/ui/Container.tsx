import * as React from "react";
import { cn } from "@/lib/utils";

export interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Maximum width variant
   * - `sm`: 640px - Forms and narrow content
   * - `md`: 768px - Medium content
   * - `lg`: 1024px - Standard pages
   * - `xl`: 1280px - Wide content (default)
   * - `full`: 100% - Full width
   */
  size?: "sm" | "md" | "lg" | "xl" | "full";
  /**
   * Horizontal padding
   */
  padding?: boolean;
  /**
   * Center the container
   */
  center?: boolean;
}

/**
 * Container - Constrains content width with consistent padding
 *
 * @example
 * <Container size="lg">
 *   <PageHeader title="Kunder" />
 *   <CustomerList />
 * </Container>
 *
 * @example
 * // Form container
 * <Container size="sm">
 *   <CustomerForm />
 * </Container>
 */
export function Container({
  size = "xl",
  padding = true,
  center = true,
  className,
  children,
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        // Max width variants
        size === "sm" && "max-w-[640px]",
        size === "md" && "max-w-[768px]",
        size === "lg" && "max-w-[1024px]",
        size === "xl" && "max-w-[1280px]",
        size === "full" && "max-w-full",
        // Padding
        padding && "px-4 sm:px-6 lg:px-8",
        // Centering
        center && "mx-auto",
        // Full width
        "w-full",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface ContentAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Adds vertical spacing between children
   */
  spacing?: "none" | "sm" | "md" | "lg";
}

/**
 * ContentArea - Adds consistent vertical spacing for page content
 *
 * @example
 * <ContentArea spacing="md">
 *   <Card>...</Card>
 *   <Card>...</Card>
 * </ContentArea>
 */
export function ContentArea({
  spacing = "md",
  className,
  children,
  ...props
}: ContentAreaProps) {
  return (
    <div
      className={cn(
        spacing === "sm" && "space-y-4",
        spacing === "md" && "space-y-6",
        spacing === "lg" && "space-y-8",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export interface SplitLayoutProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Width ratio of sidebar
   */
  sidebarWidth?: "narrow" | "default" | "wide";
  /**
   * Side of the sidebar
   */
  sidebarPosition?: "left" | "right";
  /**
   * Reverse order on mobile
   */
  mobileReverse?: boolean;
}

/**
 * SplitLayout - Two-column layout with sidebar
 *
 * @example
 * <SplitLayout sidebarWidth="narrow" sidebarPosition="right">
 *   <div>Main content</div>
 *   <div>Sidebar</div>
 * </SplitLayout>
 */
export function SplitLayout({
  sidebarWidth = "default",
  sidebarPosition = "left",
  mobileReverse = false,
  className,
  children,
  ...props
}: SplitLayoutProps) {
  const [main, sidebar] = React.Children.toArray(children);

  return (
    <div
      className={cn(
        "grid gap-6 lg:gap-8",
        // Grid columns based on sidebar width
        sidebarWidth === "narrow" && "lg:grid-cols-[240px_1fr]",
        sidebarWidth === "default" && "lg:grid-cols-[280px_1fr]",
        sidebarWidth === "wide" && "lg:grid-cols-[320px_1fr]",
        // Sidebar position
        sidebarPosition === "right" &&
          sidebarWidth === "narrow" &&
          "lg:grid-cols-[1fr_240px]",
        sidebarPosition === "right" &&
          sidebarWidth === "default" &&
          "lg:grid-cols-[1fr_280px]",
        sidebarPosition === "right" &&
          sidebarWidth === "wide" &&
          "lg:grid-cols-[1fr_320px]",
        className,
      )}
      {...props}
    >
      {sidebarPosition === "left" ? (
        <>
          <div className={cn(mobileReverse && "order-2 lg:order-1")}>
            {sidebar}
          </div>
          <div className={cn(mobileReverse && "order-1 lg:order-2")}>
            {main}
          </div>
        </>
      ) : (
        <>
          <div className={cn(mobileReverse && "order-2 lg:order-1")}>
            {main}
          </div>
          <div className={cn(mobileReverse && "order-1 lg:order-2")}>
            {sidebar}
          </div>
        </>
      )}
    </div>
  );
}
