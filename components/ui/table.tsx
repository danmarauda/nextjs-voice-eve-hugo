import * as React from "react";
import { tableVariants } from "@heroui/styles";
import { cn } from "@/lib/utils";

// Keep native table semantics for existing colspan detail and empty-state rows.
const slots = tableVariants({ variant: "secondary" });

export function Table({ className, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className={slots.base()}>
      <div className={slots.scrollContainer({ className: "scroll-thin" })}>
        <table className={slots.content({ className: cn("caption-bottom", className) })} {...props} />
      </div>
    </div>
  );
}

export function THead({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        slots.header(),
        "text-left text-xs uppercase tracking-wide text-text-muted font-mono",
        className,
      )}
      {...props}
    />
  );
}

export function TBody({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(slots.body(), "divide-y divide-border", className)} {...props} />;
}

export function TR({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={cn(slots.row(), "transition-colors hover:bg-surface-elevated/50", className)} {...props} />
  );
}

export function TH({ className, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return <th className={cn(slots.column(), "px-3 py-2.5 font-medium", className)} {...props} />;
}

export function TD({ className, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn(slots.cell(), "px-3 py-2.5 align-middle text-text-secondary", className)} {...props} />;
}
