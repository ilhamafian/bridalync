import { IconBan, IconFlame } from "@tabler/icons-react";

import { cn } from "@/lib/utils";

export function BlockedMarker({
  className,
  label = true,
}: {
  className?: string;
  label?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-destructive",
        className
      )}
    >
      <IconBan className="size-3.5 shrink-0" aria-hidden />
      {label ? <span>Blocked</span> : <span className="sr-only">Blocked</span>}
    </span>
  );
}

export function HotMarker({
  className,
  label = true,
}: {
  className?: string;
  label?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-amber-700 dark:text-amber-400",
        className
      )}
    >
      <IconFlame className="size-3.5 shrink-0" aria-hidden />
      {label ? <span>Hot date</span> : <span className="sr-only">Hot date</span>}
    </span>
  );
}
