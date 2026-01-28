import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  separator?: React.ReactNode;
  showHomeIcon?: boolean;
  className?: string;
  maxItems?: number;
}

/**
 * Breadcrumbs - Navigation breadcrumb trail
 *
 * @example
 * <Breadcrumbs
 *   items={[
 *     { label: "Kunder", href: "/customers" },
 *     { label: "Acme AB", href: "/customers/123" },
 *     { label: "Redigera" },
 *   ]}
 * />
 */
export function Breadcrumbs({
  items,
  separator,
  showHomeIcon = true,
  className,
  maxItems,
}: BreadcrumbsProps) {
  // Handle collapsing for long breadcrumb trails
  const displayItems = React.useMemo(() => {
    if (!maxItems || items.length <= maxItems) {
      return items;
    }

    // Show first item, ellipsis, and last (maxItems - 2) items
    const firstItem = items[0];
    const lastItems = items.slice(-(maxItems - 2));

    return [
      firstItem,
      { label: "...", href: undefined } as BreadcrumbItem,
      ...lastItems,
    ];
  }, [items, maxItems]);

  const defaultSeparator = (
    <ChevronRight className="h-4 w-4 text-ash shrink-0" aria-hidden="true" />
  );

  return (
    <nav aria-label="Breadcrumb" className={cn("mb-4", className)}>
      <ol className="flex items-center flex-wrap gap-1.5 text-sm">
        {showHomeIcon && (
          <>
            <li>
              <Link
                to="/"
                className="text-ash hover:text-sage transition-colors p-1 rounded hover:bg-sage/5"
                aria-label="Hem"
              >
                <Home className="h-4 w-4" />
              </Link>
            </li>
            <li className="flex items-center" aria-hidden="true">
              {separator || defaultSeparator}
            </li>
          </>
        )}

        {displayItems.map((item, index) => {
          const isLast = index === displayItems.length - 1;
          const isEllipsis = item.label === "...";

          return (
            <React.Fragment key={index}>
              <li>
                {isEllipsis ? (
                  <span className="text-ash px-1">...</span>
                ) : isLast || !item.href ? (
                  <span
                    className={cn(
                      "text-charcoal font-medium",
                      !isLast && "text-ash",
                    )}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.icon && (
                      <span className="mr-1.5 inline-flex">{item.icon}</span>
                    )}
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.href}
                    className="text-ash hover:text-sage transition-colors hover:underline underline-offset-4"
                  >
                    {item.icon && (
                      <span className="mr-1.5 inline-flex">{item.icon}</span>
                    )}
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li className="flex items-center" aria-hidden="true">
                  {separator || defaultSeparator}
                </li>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Helper to generate breadcrumb items from URL path
 *
 * @example
 * const items = generateBreadcrumbs("/customers/123/edit", {
 *   customers: "Kunder",
 *   "123": "Acme AB",
 *   edit: "Redigera",
 * });
 */
export function generateBreadcrumbs(
  pathname: string,
  labels: Record<string, string>,
): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean);

  return segments.map((segment, index) => {
    const href = "/" + segments.slice(0, index + 1).join("/");
    const isLast = index === segments.length - 1;

    return {
      label: labels[segment] || segment,
      href: isLast ? undefined : href,
    };
  });
}
