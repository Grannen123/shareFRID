import * as React from "react";
import { cn } from "@/lib/utils";

type TableDensity = "dense" | "comfortable" | "spacious";

interface TableContextValue {
  density: TableDensity;
  hoverable: boolean;
}

const TableContext = React.createContext<TableContextValue>({
  density: "comfortable",
  hoverable: true,
});

function useTableContext() {
  return React.useContext(TableContext);
}

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  /**
   * Density variant for row padding
   * - `dense`: Compact rows (py-2) - More data, less whitespace
   * - `comfortable`: Standard rows (py-4) - Default balance
   * - `spacious`: Relaxed rows (py-6) - More breathing room
   */
  density?: TableDensity;
  /**
   * Whether to show zebra stripes
   */
  striped?: boolean;
  /**
   * Whether rows should highlight on hover
   */
  hoverable?: boolean;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  (
    { className, density = "comfortable", striped, hoverable = true, ...props },
    ref,
  ) => (
    <TableContext.Provider value={{ density, hoverable }}>
      <div className="relative w-full overflow-auto">
        <table
          ref={ref}
          className={cn(
            "w-full caption-bottom text-sm",
            striped && "[&_tbody_tr:nth-child(odd)]:bg-sand-light/50",
            className,
          )}
          {...props}
        />
      </div>
    </TableContext.Provider>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />
));
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody
    ref={ref}
    className={cn("[&_tr:last-child]:border-0", className)}
    {...props}
  />
));
TableBody.displayName = "TableBody";

const TableFooter = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tfoot
    ref={ref}
    className={cn(
      "border-t bg-sand/50 font-medium [&>tr]:last:border-b-0",
      className,
    )}
    {...props}
  />
));
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => {
  const { hoverable } = useTableContext();

  return (
    <tr
      ref={ref}
      className={cn(
        "border-b border-sand transition-colors data-[state=selected]:bg-sage/10",
        hoverable && "hover:bg-sage/5 cursor-pointer",
        className,
      )}
      {...props}
    />
  );
});
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, scope = "col", ...props }, ref) => {
  const { density } = useTableContext();

  return (
    <th
      ref={ref}
      scope={scope}
      className={cn(
        "text-left align-middle font-medium text-ash [&:has([role=checkbox])]:pr-0",
        // Density-based height and padding
        density === "dense" && "h-8 px-3 text-xs",
        density === "comfortable" && "h-10 px-4 text-sm",
        density === "spacious" && "h-12 px-4 text-sm",
        className,
      )}
      {...props}
    />
  );
});
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => {
  const { density } = useTableContext();

  return (
    <td
      ref={ref}
      className={cn(
        "align-middle [&:has([role=checkbox])]:pr-0",
        // Density-based padding
        density === "dense" && "px-3 py-2 text-xs",
        density === "comfortable" && "px-4 py-3 text-sm",
        density === "spacious" && "px-4 py-4 text-sm",
        className,
      )}
      {...props}
    />
  );
});
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<
  HTMLTableCaptionElement,
  React.HTMLAttributes<HTMLTableCaptionElement>
>(({ className, ...props }, ref) => (
  <caption
    ref={ref}
    className={cn("mt-4 text-sm text-ash", className)}
    {...props}
  />
));
TableCaption.displayName = "TableCaption";

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
};
