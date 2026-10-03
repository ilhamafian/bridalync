import type { Icon } from "@tabler/icons-react";

import { glassCardClassName } from "@/components/dashboard/HomeBookingCard";
import { cn } from "@/lib/utils";

export const settingsCardClassName = cn(
  glassCardClassName,
  "flex flex-col gap-4 p-4 text-sm"
);

export const settingsListClassName = cn(
  glassCardClassName,
  "flex flex-col gap-0 divide-y divide-white/50 overflow-hidden dark:divide-white/10"
);

export const settingsRowClassName =
  "flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors hover:bg-white/20 focus-visible:bg-white/20 focus-visible:outline-none dark:hover:bg-white/5 dark:focus-visible:bg-white/5";

export function SettingsSection({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function IconBadge({
  icon: Icon,
  className,
}: {
  icon: Icon;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-white/50 text-primary dark:bg-white/10",
        className
      )}
    >
      <Icon className="size-4.5" aria-hidden />
    </span>
  );
}

export function RowText({
  title,
  description,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
}) {
  return (
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <span className="truncate text-sm font-medium">{title}</span>
      {description ? (
        <span className="text-xs text-muted-foreground">{description}</span>
      ) : null}
    </span>
  );
}

export function SettingsFeedback({
  error,
  success,
}: {
  error?: string | null;
  success?: string | null;
}) {
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (success) return <p className="text-sm text-muted-foreground">{success}</p>;
  return null;
}
