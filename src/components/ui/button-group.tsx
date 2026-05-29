import * as React from "react";

import { cn } from "@/lib/utils";

function ButtonGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group"
      role="group"
      className={cn(
        "inline-flex items-center rounded-md shadow-xs [&>[data-slot=button]:not(:first-child)]:rounded-l-none [&>[data-slot=button]:not(:first-child)]:border-l-0 [&>[data-slot=button]:not(:last-child)]:rounded-r-none [&>[data-slot=dropdown-menu-trigger]:not(:first-child)]:rounded-l-none [&>[data-slot=dropdown-menu-trigger]:not(:first-child)]:border-l-0 [&>[data-slot=dropdown-menu-trigger]:not(:last-child)]:rounded-r-none",
        className,
      )}
      {...props}
    />
  );
}

function ButtonGroupText({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="button-group-text"
      className={cn(
        "flex h-9 items-center border border-input bg-background px-3 text-sm text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

function ButtonGroupSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="button-group-separator"
      aria-hidden="true"
      className={cn("h-6 w-px bg-border", className)}
      {...props}
    />
  );
}

export { ButtonGroup, ButtonGroupSeparator, ButtonGroupText };
