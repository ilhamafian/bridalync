import { cn } from "@/lib/utils";

/**
 * Stacks on phones; on wide dashboards `primary` sits on the left and
 * `secondary` (summary + submit) in a sticky column on the right.
 */
export function SplitColumns({
  primary,
  secondary,
  className,
}: {
  primary: React.ReactNode;
  secondary: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 @4xl/main:grid @4xl/main:grid-cols-2 @4xl/main:items-start @4xl/main:gap-8",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-4">{primary}</div>
      <div className="flex min-w-0 flex-col gap-4 @4xl/main:sticky @4xl/main:top-4">
        {secondary}
      </div>
    </div>
  );
}
